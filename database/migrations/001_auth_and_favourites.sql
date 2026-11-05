BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);
UPDATE users u SET full_name = c.full_name FROM consumers c WHERE c.user_id=u.user_id AND u.full_name IS NULL;
UPDATE users SET full_name = split_part(email, '@', 1) WHERE full_name IS NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('shopper','consumer','vendor','admin'));
-- Stop for review if pre-existing accounts differ only by email casing.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS consumers_user_unique ON consumers(user_id);
CREATE TABLE IF NOT EXISTS saved_places (
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, place_id)
);
CREATE TABLE IF NOT EXISTS oauth_codes (
  code_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS session_expire_idx ON session(expire);
COMMIT;
