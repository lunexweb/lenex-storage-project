-- Add POPIA consent columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS popia_consent boolean DEFAULT false;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS popia_consent_date timestamptz;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS terms_consent boolean DEFAULT false;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS terms_consent_date timestamptz;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS consent_ip text;
