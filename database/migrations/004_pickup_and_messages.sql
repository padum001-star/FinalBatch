BEGIN;
CREATE TABLE IF NOT EXISTS vendor_pickup_presets (
  preset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(vendor_id),
  name VARCHAR(40) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  end_next_day BOOLEAN NOT NULL DEFAULT FALSE,
  time_zone TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pickup_preset_name ON vendor_pickup_presets(vendor_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS pickup_preset_default ON vendor_pickup_presets(vendor_id) WHERE is_default;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check CHECK(status IN ('reserved','cancelled','collected','expired'));
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS closed_reason TEXT;
CREATE TABLE IF NOT EXISTS conversations (
  conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(listing_id),
  customer_id UUID NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id,customer_id)
);
CREATE TABLE IF NOT EXISTS messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(conversation_id),
  sender_id UUID NOT NULL REFERENCES users(user_id),
  client_message_id UUID NOT NULL,
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(conversation_id,sender_id,client_message_id)
);
CREATE INDEX IF NOT EXISTS conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS conversations_listing ON conversations(listing_id);
CREATE INDEX IF NOT EXISTS messages_timeline ON messages(conversation_id,created_at DESC,message_id DESC);
COMMIT;
