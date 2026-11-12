BEGIN;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES users(user_id);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS removal_reason TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS photo_blocked_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS listing_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(listing_id),
  reporter_id UUID NOT NULL REFERENCES users(user_id),
  reason TEXT NOT NULL CHECK(reason IN ('inappropriate_image','unsafe_food','inaccurate_listing','other')),
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(listing_id,reporter_id)
);
CREATE TABLE IF NOT EXISTS moderation_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(listing_id),
  actor_id UUID NOT NULL REFERENCES users(user_id),
  action TEXT NOT NULL CHECK(action IN ('remove','dismiss_reports')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listing_reports_open ON listing_reports(listing_id) WHERE resolved_at IS NULL;
COMMIT;
