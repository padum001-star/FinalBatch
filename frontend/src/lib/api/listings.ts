import * as FileSystem from 'expo-file-system/legacy';

import * as demo from '@/lib/demo/demo-data';
import { DEMO_MODE } from '@/lib/demo/demo-mode';
import { supabase } from '@/lib/supabase';
import type { Listing, ListingWithBusiness } from '@/types/database';

const LISTING_SELECT = '*, business:profiles(id, business_name, address, phone)';

export interface BrowseFilters {
  category?: string | null;
  search?: string | null;
  sort?: 'expiring_soon' | 'newest' | 'price_low';
}

export async function fetchActiveListings(filters: BrowseFilters = {}): Promise<ListingWithBusiness[]> {
  if (DEMO_MODE) return demo.fetchActiveListings(filters);
  let query = supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString());

  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  switch (filters.sort) {
    case 'price_low':
      query = query.order('discounted_price', { ascending: true });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'expiring_soon':
    default:
      query = query.order('expires_at', { ascending: true });
      break;
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ListingWithBusiness[];
}

export async function fetchListingById(id: string): Promise<ListingWithBusiness> {
  if (DEMO_MODE) return demo.fetchListingById(id);
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as ListingWithBusiness;
}

export async function fetchMyListings(businessId: string): Promise<Listing[]> {
  if (DEMO_MODE) return demo.fetchMyListings(businessId);
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface NewListingInput {
  business_id: string;
  title: string;
  description: string | null;
  category: string;
  original_price: number;
  discounted_price: number;
  quantity_total: number;
  expires_at: string;
  pickup_notes: string | null;
  image_urls: string[];
}

export async function createListing(input: NewListingInput): Promise<Listing> {
  if (DEMO_MODE) return demo.createListing(input);
  const { data, error } = await supabase
    .from('listings')
    .insert({ ...input, quantity_available: input.quantity_total })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateListing(id: string, patch: Partial<Listing>): Promise<Listing> {
  if (DEMO_MODE) return demo.updateListing(id, patch);
  const { data, error } = await supabase
    .from('listings')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function archiveListing(id: string): Promise<void> {
  if (DEMO_MODE) return demo.archiveListing(id);
  const { error } = await supabase.from('listings').update({ status: 'archived' }).eq('id', id);
  if (error) throw error;
}

export async function reactivateListing(id: string): Promise<void> {
  if (DEMO_MODE) return demo.reactivateListing(id);
  const { error } = await supabase.from('listings').update({ status: 'active' }).eq('id', id);
  if (error) throw error;
}

export async function uploadListingImage(businessId: string, localUri: string): Promise<string> {
  if (DEMO_MODE) return demo.uploadListingImage(businessId, localUri);
  const extMatch = /\.(\w+)$/.exec(localUri);
  const ext = extMatch?.[1]?.toLowerCase() ?? 'jpg';
  const path = `${businessId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  const bytes = base64ToUint8Array(base64);

  const { error } = await supabase.storage.from('listing-images').upload(path, bytes, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('listing-images').getPublicUrl(path);
  return data.publicUrl;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
