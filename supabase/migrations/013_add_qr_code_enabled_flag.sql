-- Add the qr_code_enabled column to the embeds table
ALTER TABLE embeds ADD COLUMN IF NOT EXISTS qr_code_enabled BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing data:
-- For any existing embed that uses the 'qr_auth' component type,
-- we assume the QR code functionality was intended to be enabled.
UPDATE embeds
SET qr_code_enabled = true
WHERE component_type = 'qr_auth';