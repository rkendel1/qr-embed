-- Add dedicated columns for social auth providers
ALTER TABLE embeds
ADD COLUMN google_auth_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN github_auth_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Migrate existing data from the component_props JSONB field
-- This ensures no data is lost for existing embeds
UPDATE embeds
SET google_auth_enabled = TRUE
WHERE component_props->'providers' @> '["google"]';

UPDATE embeds
SET github_auth_enabled = TRUE
WHERE component_props->'providers' @> '["github"]';