BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS vendors_user_unique ON vendors(user_id);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS published_by_vendor BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS original_price NUMERIC(8,2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS photo_key TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS pickup_start_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS pickup_end_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS marketplace_feed ON listings(pickup_window_end, created_at DESC) WHERE published_by_vendor AND status='active';
CREATE TABLE IF NOT EXISTS listing_uploads (
  upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  object_key TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size>0 AND byte_size<=8388608),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS upload_id UUID UNIQUE REFERENCES listing_uploads(upload_id);
CREATE TABLE IF NOT EXISTS reservations (
  reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  listing_id UUID NOT NULL REFERENCES listings(listing_id),
  request_id UUID NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity>0 AND quantity<=100),
  unit_price NUMERIC(8,2) NOT NULL CHECK(unit_price>=0),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','cancelled','collected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id,request_id)
);
CREATE INDEX IF NOT EXISTS reservations_user ON reservations(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS reservations_listing ON reservations(listing_id);
COMMIT;
