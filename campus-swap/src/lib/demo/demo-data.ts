// In-memory stand-in for Supabase. See demo-mode.ts -- this whole directory is
// meant to be deleted once the real project is wired up.
//
// The functions here mirror src/lib/api/* one for one, including the error
// messages the create_reservation / update_reservation_status RPCs raise, so
// the screens behave the same way against either backend.

import type { Session } from '@supabase/supabase-js';

import type { BrowseFilters, NewListingInput } from '@/lib/api/listings';
import type {
  Listing,
  ListingWithBusiness,
  Profile,
  Reservation,
  ReservationStatus,
  ReservationWithBuyer,
  ReservationWithListing,
} from '@/types/database';

export const DEMO_BUSINESS_ID = 'demo-business-000000000000000000001';
export const DEMO_SHOPPER_ID = 'demo-shopper-0000000000000000000001';

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

// Mimic a network hop so loading spinners and refresh states are exercised.
const latency = () => new Promise<void>((resolve) => setTimeout(resolve, 220));

let nextId = 100;
const newId = (prefix: string) => `demo-${prefix}-${nextId++}`;

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const profiles: Profile[] = [
  {
    id: DEMO_BUSINESS_ID,
    role: 'business',
    full_name: 'Wheelhouse Bakery',
    business_name: 'Wheelhouse Bakery',
    address: '412 College Ave',
    phone: '555-0142',
    avatar_url: null,
    created_at: hoursAgo(720),
    updated_at: hoursAgo(720),
  },
  {
    id: DEMO_SHOPPER_ID,
    role: 'shopper',
    full_name: 'Demo Shopper',
    business_name: null,
    address: null,
    phone: null,
    avatar_url: null,
    created_at: hoursAgo(500),
    updated_at: hoursAgo(500),
  },
];

const listings: Listing[] = [
  {
    id: 'demo-listing-1',
    business_id: DEMO_BUSINESS_ID,
    title: 'End-of-day sourdough loaves',
    description: 'Baked this morning. Still great toasted tomorrow.',
    category: 'bakery',
    original_price: 9,
    discounted_price: 3.5,
    quantity_total: 12,
    quantity_available: 7,
    image_urls: [],
    expires_at: hoursFromNow(5),
    pickup_notes: 'Pickup at the side counter, 6-8pm.',
    status: 'active',
    created_at: hoursAgo(6),
    updated_at: hoursAgo(6),
  },
  {
    id: 'demo-listing-2',
    business_id: DEMO_BUSINESS_ID,
    title: 'Assorted pastry box (6 ct)',
    description: 'Mixed croissants and danishes, baker picks.',
    category: 'bakery',
    original_price: 18,
    discounted_price: 7,
    quantity_total: 5,
    quantity_available: 2,
    image_urls: [],
    expires_at: hoursFromNow(3),
    pickup_notes: null,
    status: 'active',
    created_at: hoursAgo(3),
    updated_at: hoursAgo(3),
  },
  {
    id: 'demo-listing-3',
    business_id: DEMO_BUSINESS_ID,
    title: 'Overripe bananas, 2 lb bag',
    description: 'Perfect for banana bread.',
    category: 'produce',
    original_price: 4,
    discounted_price: 1,
    quantity_total: 10,
    quantity_available: 10,
    image_urls: [],
    expires_at: hoursFromNow(30),
    pickup_notes: 'Ask at the register.',
    status: 'active',
    created_at: hoursAgo(20),
    updated_at: hoursAgo(20),
  },
  {
    id: 'demo-listing-4',
    business_id: DEMO_BUSINESS_ID,
    title: 'Chicken pesto sandwiches',
    description: 'Made fresh at 11am today.',
    category: 'prepared_food',
    original_price: 12,
    discounted_price: 5,
    quantity_total: 8,
    quantity_available: 0,
    image_urls: [],
    expires_at: hoursFromNow(2),
    pickup_notes: null,
    status: 'sold_out',
    created_at: hoursAgo(8),
    updated_at: hoursAgo(1),
  },
  {
    id: 'demo-listing-5',
    business_id: DEMO_BUSINESS_ID,
    title: 'Cold brew growlers',
    description: 'Half gallon, brewed two days ago.',
    category: 'drinks',
    original_price: 22,
    discounted_price: 9,
    quantity_total: 4,
    quantity_available: 4,
    image_urls: [],
    expires_at: hoursFromNow(72),
    pickup_notes: 'Bring your own bag if you can.',
    status: 'active',
    created_at: hoursAgo(30),
    updated_at: hoursAgo(30),
  },
  {
    id: 'demo-listing-6',
    business_id: DEMO_BUSINESS_ID,
    title: 'Day-old bagels, dozen',
    description: null,
    category: 'bakery',
    original_price: 14,
    discounted_price: 4,
    quantity_total: 6,
    quantity_available: 6,
    image_urls: [],
    expires_at: hoursAgo(2),
    pickup_notes: null,
    status: 'archived',
    created_at: hoursAgo(50),
    updated_at: hoursAgo(2),
  },
];

const reservations: Reservation[] = [
  {
    id: 'demo-reservation-1',
    listing_id: 'demo-listing-1',
    buyer_id: DEMO_SHOPPER_ID,
    quantity: 2,
    total_price: 7,
    status: 'ready',
    created_at: hoursAgo(2),
    updated_at: hoursAgo(1),
  },
  {
    id: 'demo-reservation-2',
    listing_id: 'demo-listing-2',
    buyer_id: DEMO_SHOPPER_ID,
    quantity: 1,
    total_price: 7,
    status: 'pending',
    created_at: hoursAgo(1),
    updated_at: hoursAgo(1),
  },
];

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

// The real create_reservation() reads the buyer from auth.uid(); mirroring that
// here keeps the demo functions signature-compatible with src/lib/api/*.
let currentUserId: string = DEMO_SHOPPER_ID;

export function setCurrentDemoUser(id: string) {
  currentUserId = id;
}

export function demoSession(profile: Profile): Session {
  const email = profile.role === 'business' ? 'business@demo.test' : 'shopper@demo.test';
  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: profile.id,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      app_metadata: { provider: 'demo' },
      user_metadata: { role: profile.role, full_name: profile.full_name },
      created_at: profile.created_at,
    },
  } as unknown as Session;
}

export function demoProfileForRole(role: Profile['role']): Profile {
  const found = profiles.find((p) => p.role === role);
  if (!found) throw new Error(`No demo profile seeded for role ${role}`);
  return { ...found };
}

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------

export async function fetchProfile(id: string): Promise<Profile> {
  await latency();
  const found = profiles.find((p) => p.id === id);
  if (!found) throw new Error('Profile not found');
  return { ...found };
}

export async function updateProfile(id: string, patch: Partial<Profile>): Promise<Profile> {
  await latency();
  const found = profiles.find((p) => p.id === id);
  if (!found) throw new Error('Profile not found');
  Object.assign(found, patch, { updated_at: new Date().toISOString() });
  return { ...found };
}

// ---------------------------------------------------------------------------
// listings
// ---------------------------------------------------------------------------

function withBusiness(listing: Listing): ListingWithBusiness {
  const business = profiles.find((p) => p.id === listing.business_id) ?? null;
  return {
    ...listing,
    business: business
      ? {
          id: business.id,
          business_name: business.business_name,
          address: business.address,
          phone: business.phone,
        }
      : null,
  };
}

export async function fetchActiveListings(filters: BrowseFilters = {}): Promise<ListingWithBusiness[]> {
  await latency();
  const now = Date.now();
  let rows = listings.filter((l) => l.status === 'active' && new Date(l.expires_at).getTime() > now);

  if (filters.category) {
    rows = rows.filter((l) => l.category === filters.category);
  }
  if (filters.search) {
    const needle = filters.search.toLowerCase();
    rows = rows.filter((l) => l.title.toLowerCase().includes(needle));
  }

  const sorted = [...rows];
  switch (filters.sort) {
    case 'price_low':
      sorted.sort((a, b) => a.discounted_price - b.discounted_price);
      break;
    case 'newest':
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
      break;
    case 'expiring_soon':
    default:
      sorted.sort((a, b) => a.expires_at.localeCompare(b.expires_at));
      break;
  }

  return sorted.map(withBusiness);
}

export async function fetchListingById(id: string): Promise<ListingWithBusiness> {
  await latency();
  const found = listings.find((l) => l.id === id);
  if (!found) throw new Error('Listing not found');
  return withBusiness(found);
}

export async function fetchMyListings(businessId: string): Promise<Listing[]> {
  await latency();
  return listings
    .filter((l) => l.business_id === businessId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((l) => ({ ...l }));
}

export async function createListing(input: NewListingInput): Promise<Listing> {
  await latency();
  const now = new Date().toISOString();
  const listing: Listing = {
    ...input,
    id: newId('listing'),
    quantity_available: input.quantity_total,
    status: 'active',
    created_at: now,
    updated_at: now,
  };
  listings.unshift(listing);
  return { ...listing };
}

export async function updateListing(id: string, patch: Partial<Listing>): Promise<Listing> {
  await latency();
  const found = listings.find((l) => l.id === id);
  if (!found) throw new Error('Listing not found');
  Object.assign(found, patch, { updated_at: new Date().toISOString() });
  return { ...found };
}

export async function archiveListing(id: string): Promise<void> {
  await updateListing(id, { status: 'archived' });
}

export async function reactivateListing(id: string): Promise<void> {
  await updateListing(id, { status: 'active' });
}

export async function uploadListingImage(_businessId: string, localUri: string): Promise<string> {
  await latency();
  // Nothing to upload to -- the local file URI renders fine in <Image>.
  return localUri;
}

// ---------------------------------------------------------------------------
// reservations
// ---------------------------------------------------------------------------

export async function createReservation(listingId: string, quantity: number): Promise<Reservation> {
  await latency();
  if (quantity < 1) throw new Error('Quantity must be at least 1');

  const listing = listings.find((l) => l.id === listingId);
  if (!listing) throw new Error('Listing not found');
  if (listing.status !== 'active') throw new Error('Listing is no longer available');
  if (new Date(listing.expires_at).getTime() <= Date.now()) throw new Error('Listing has expired');
  if (listing.quantity_available < quantity) throw new Error('Not enough quantity available');

  listing.quantity_available -= quantity;
  if (listing.quantity_available <= 0) listing.status = 'sold_out';
  listing.updated_at = new Date().toISOString();

  const now = new Date().toISOString();
  const reservation: Reservation = {
    id: newId('reservation'),
    listing_id: listingId,
    buyer_id: currentUserId,
    quantity,
    total_price: listing.discounted_price * quantity,
    status: 'pending',
    created_at: now,
    updated_at: now,
  };
  reservations.unshift(reservation);
  return { ...reservation };
}

export async function updateReservationStatus(
  reservationId: string,
  status: ReservationStatus,
): Promise<Reservation> {
  await latency();
  const reservation = reservations.find((r) => r.id === reservationId);
  if (!reservation) throw new Error('Reservation not found');
  if (reservation.status === 'completed' || reservation.status === 'cancelled') {
    throw new Error('Reservation is already finalized');
  }

  reservation.status = status;
  reservation.updated_at = new Date().toISOString();

  if (status === 'cancelled') {
    const listing = listings.find((l) => l.id === reservation.listing_id);
    if (listing) {
      listing.quantity_available += reservation.quantity;
      // Same rule as the SQL: don't reopen an archived or expired listing.
      if (listing.status !== 'archived' && new Date(listing.expires_at).getTime() > Date.now()) {
        listing.status = 'active';
      }
      listing.updated_at = new Date().toISOString();
    }
  }

  return { ...reservation };
}

export async function fetchMyReservations(buyerId: string): Promise<ReservationWithListing[]> {
  await latency();
  return reservations
    .filter((r) => r.buyer_id === buyerId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => {
      const listing = listings.find((l) => l.id === r.listing_id) ?? null;
      return { ...r, listing: listing ? { ...listing } : null };
    });
}

export async function fetchOrdersForBusiness(
  businessId: string,
): Promise<(ReservationWithListing & ReservationWithBuyer)[]> {
  await latency();
  const ownListingIds = new Set(listings.filter((l) => l.business_id === businessId).map((l) => l.id));

  return reservations
    .filter((r) => ownListingIds.has(r.listing_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => {
      const buyer = profiles.find((p) => p.id === r.buyer_id) ?? null;
      const listing = listings.find((l) => l.id === r.listing_id) ?? null;
      return {
        ...r,
        listing: listing ? { ...listing } : null,
        buyer: buyer ? { id: buyer.id, full_name: buyer.full_name, phone: buyer.phone } : null,
      };
    });
}
