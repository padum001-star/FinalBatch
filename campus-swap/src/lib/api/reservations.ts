import * as demo from '@/lib/demo/demo-data';
import { DEMO_MODE } from '@/lib/demo/demo-mode';
import { supabase } from '@/lib/supabase';
import type { Reservation, ReservationStatus, ReservationWithBuyer, ReservationWithListing } from '@/types/database';

export async function createReservation(listingId: string, quantity: number): Promise<Reservation> {
  if (DEMO_MODE) return demo.createReservation(listingId, quantity);
  const { data, error } = await supabase.rpc('create_reservation', {
    p_listing_id: listingId,
    p_quantity: quantity,
  });
  if (error) throw error;
  return data as unknown as Reservation;
}

export async function updateReservationStatus(
  reservationId: string,
  status: ReservationStatus,
): Promise<Reservation> {
  if (DEMO_MODE) return demo.updateReservationStatus(reservationId, status);
  const { data, error } = await supabase.rpc('update_reservation_status', {
    p_reservation_id: reservationId,
    p_status: status,
  });
  if (error) throw error;
  return data as unknown as Reservation;
}

// Both reservations SELECT policies are permissive, so Postgres ORs them
// together: an account that both owns listings and reserves things matches on
// either side and would see the two sets merged in both tabs. These queries
// filter explicitly and leave RLS as a backstop rather than the filter.

export async function fetchMyReservations(buyerId: string): Promise<ReservationWithListing[]> {
  if (DEMO_MODE) return demo.fetchMyReservations(buyerId);
  const { data, error } = await supabase
    .from('reservations')
    .select('*, listing:listings(*)')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ReservationWithListing[];
}

export async function fetchOrdersForBusiness(
  businessId: string,
): Promise<(ReservationWithListing & ReservationWithBuyer)[]> {
  if (DEMO_MODE) return demo.fetchOrdersForBusiness(businessId);
  const { data, error } = await supabase
    .from('reservations')
    // !inner is what makes the listing.business_id filter narrow the
    // reservations themselves -- on a plain embed it would only filter the
    // embedded listing and still return every reservation row.
    .select('*, listing:listings!inner(*), buyer:profiles(id, full_name, phone)')
    .eq('listing.business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as (ReservationWithListing & ReservationWithBuyer)[];
}
