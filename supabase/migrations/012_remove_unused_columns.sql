-- This migration removes columns that are no longer used by the application logic.

-- From the 'roles' table
ALTER TABLE roles DROP COLUMN IF EXISTS created_by;
ALTER TABLE roles DROP COLUMN IF EXISTS updated_by;

-- From the 'users' table
ALTER TABLE users DROP COLUMN IF EXISTS updated_at;

-- From the 'sessions' table
ALTER TABLE sessions DROP COLUMN IF EXISTS phone_otp;
ALTER TABLE sessions DROP COLUMN IF EXISTS phone_otp_expires_at;

-- From the 'route_permissions' table
ALTER TABLE route_permissions DROP COLUMN IF EXISTS updated_at;