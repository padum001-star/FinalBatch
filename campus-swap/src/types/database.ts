export type UserRole = 'shopper' | 'business';
export type ListingStatus = 'active' | 'sold_out' | 'archived';
export type ReservationStatus = 'pending' | 'ready' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  business_name: string | null;
  address: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  category: string;
  original_price: number;
  discounted_price: number;
  quantity_total: number;
  quantity_available: number;
  image_urls: string[];
  expires_at: string;
  pickup_notes: string | null;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  listing_id: string;
  buyer_id: string;
  quantity: number;
  total_price: number;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
}

export interface ListingWithBusiness extends Listing {
  business: Pick<Profile, 'id' | 'business_name' | 'address' | 'phone'> | null;
}

export interface ReservationWithListing extends Reservation {
  listing: Listing | null;
}

export interface ReservationWithBuyer extends Reservation {
  buyer: Pick<Profile, 'id' | 'full_name' | 'phone'> | null;
}
