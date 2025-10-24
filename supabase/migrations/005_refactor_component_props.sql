-- Add new columns for pricing card properties
ALTER TABLE embeds
ADD COLUMN card_title TEXT,
ADD COLUMN card_price TEXT,
ADD COLUMN card_features TEXT[],
ADD COLUMN card_button_text TEXT,
ADD COLUMN card_button_link TEXT,
ADD COLUMN card_badge TEXT,
ADD COLUMN card_featured BOOLEAN DEFAULT false;

-- Remove the old JSONB column
ALTER TABLE embeds
DROP COLUMN component_props;