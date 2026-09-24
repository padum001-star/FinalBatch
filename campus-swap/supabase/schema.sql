-- Campus Swap database schema
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query) for a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum ('shopper', 'business');
create type listing_status as enum ('active', 'sold_out', 'archived');
create type reservation_status as enum ('pending', 'ready', 'completed', 'cancelled');

-- ---------------------------------------------------------------------------
-- profiles: one row per auth.users row, created automatically on sign up
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'shopper',
  full_name text,
  business_name text,
  address text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- Auto-create a profile row whenever someone signs up, reading role / name /
-- business details out of the signup metadata (see auth-context.tsx). Doing
-- it here -- rather than a client-side update right after signUp() -- means
-- it still works when "Confirm email" is enabled and the client has no
-- active session yet at signup time.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, business_name, address, phone)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'shopper'),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'business_name',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- listings: surplus / near-expiry items posted by a business
-- ---------------------------------------------------------------------------

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'other',
  original_price numeric(10, 2) not null check (original_price >= 0),
  discounted_price numeric(10, 2) not null check (discounted_price >= 0),
  quantity_total int not null check (quantity_total > 0),
  quantity_available int not null check (quantity_available >= 0),
  image_urls text[] not null default '{}',
  expires_at timestamptz not null,
  pickup_notes text,
  status listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quantity_available_within_total check (quantity_available <= quantity_total)
);

create index listings_status_expires_idx on public.listings (status, expires_at);
create index listings_business_idx on public.listings (business_id);

alter table public.listings enable row level security;

create policy "Listings are viewable by everyone"
  on public.listings for select
  using (true);

create policy "Businesses can insert their own listings"
  on public.listings for insert
  with check (
    auth.uid() = business_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'business')
  );

create policy "Businesses can update their own listings"
  on public.listings for update
  using (auth.uid() = business_id);

create policy "Businesses can delete their own listings"
  on public.listings for delete
  using (auth.uid() = business_id);

create trigger set_listings_updated_at
before update on public.listings
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reservations: a shopper claiming N units of a listing, picked up in person
-- ---------------------------------------------------------------------------

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  total_price numeric(10, 2) not null,
  status reservation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reservations_listing_idx on public.reservations (listing_id);
create index reservations_buyer_idx on public.reservations (buyer_id);

alter table public.reservations enable row level security;

create policy "Buyers can view their own reservations"
  on public.reservations for select
  using (auth.uid() = buyer_id);

create policy "Businesses can view reservations on their listings"
  on public.reservations for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = reservations.listing_id and l.business_id = auth.uid()
    )
  );

create trigger set_reservations_updated_at
before update on public.reservations
for each row execute procedure public.set_updated_at();

-- All writes to reservations go through these two functions so that
-- quantity_available on the listing always stays in sync (no overselling,
-- and cancelling restores stock). Both are SECURITY DEFINER so they can
-- update the listing row too, but they still check auth.uid() by hand.

create or replace function public.create_reservation(p_listing_id uuid, p_quantity int)
returns public.reservations
language plpgsql
security definer set search_path = public
as $$
declare
  v_listing public.listings;
  v_reservation public.reservations;
begin
  if p_quantity < 1 then
    raise exception 'Quantity must be at least 1';
  end if;

  select * into v_listing from public.listings where id = p_listing_id for update;

  if v_listing is null then
    raise exception 'Listing not found';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'Listing is no longer available';
  end if;

  if v_listing.expires_at <= now() then
    raise exception 'Listing has expired';
  end if;

  if v_listing.quantity_available < p_quantity then
    raise exception 'Not enough quantity available';
  end if;

  update public.listings
    set quantity_available = quantity_available - p_quantity,
        status = case when quantity_available - p_quantity <= 0 then 'sold_out' else status end
    where id = p_listing_id;

  insert into public.reservations (listing_id, buyer_id, quantity, total_price, status)
  values (p_listing_id, auth.uid(), p_quantity, v_listing.discounted_price * p_quantity, 'pending')
  returning * into v_reservation;

  return v_reservation;
end;
$$;

create or replace function public.update_reservation_status(p_reservation_id uuid, p_status reservation_status)
returns public.reservations
language plpgsql
security definer set search_path = public
as $$
declare
  v_reservation public.reservations;
  v_is_business boolean;
begin
  select * into v_reservation from public.reservations where id = p_reservation_id for update;

  if v_reservation is null then
    raise exception 'Reservation not found';
  end if;

  select exists (
    select 1 from public.listings l
    where l.id = v_reservation.listing_id and l.business_id = auth.uid()
  ) into v_is_business;

  -- A business can move a reservation through any status. A buyer may only cancel their own.
  if not v_is_business and not (auth.uid() = v_reservation.buyer_id and p_status = 'cancelled') then
    raise exception 'Not authorized to update this reservation';
  end if;

  if v_reservation.status in ('completed', 'cancelled') then
    raise exception 'Reservation is already finalized';
  end if;

  update public.reservations set status = p_status where id = p_reservation_id
    returning * into v_reservation;

  -- Give the stock back. Only reopen the listing if it's still sellable --
  -- a cancellation shouldn't un-archive one the business deliberately pulled,
  -- or resurrect one that has expired since the reservation was made.
  if p_status = 'cancelled' then
    update public.listings
      set quantity_available = quantity_available + v_reservation.quantity,
          status = case
                     when status = 'archived' then status
                     when expires_at <= now() then status
                     else 'active'
                   end
      where id = v_reservation.listing_id;
  end if;

  return v_reservation;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket for listing photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

create policy "Listing images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "Authenticated users can upload listing images"
  on storage.objects for insert
  with check (bucket_id = 'listing-images' and auth.role() = 'authenticated');

create policy "Owners can update their own listing images"
  on storage.objects for update
  using (bucket_id = 'listing-images' and owner = auth.uid());

create policy "Owners can delete their own listing images"
  on storage.objects for delete
  using (bucket_id = 'listing-images' and owner = auth.uid());
