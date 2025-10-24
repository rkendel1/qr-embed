-- Step 1: Drop the is_admin column from the embeds table
ALTER TABLE embeds DROP COLUMN is_admin;

-- Step 2: Add the new role_id column to the embeds table
-- This links an embed to a specific role. If the role is deleted, the link is set to NULL.
ALTER TABLE embeds ADD COLUMN role_id UUID REFERENCES roles(id) ON DELETE SET NULL;