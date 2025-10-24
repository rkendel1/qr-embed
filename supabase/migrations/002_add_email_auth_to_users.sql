-- Add email and password columns to the users table
ALTER TABLE users
ADD COLUMN email TEXT,
ADD COLUMN password_hash TEXT;

-- Add a unique constraint to the email column
ALTER TABLE users
ADD CONSTRAINT users_email_key UNIQUE (email);

-- Make external_user_id nullable as users can now sign up with email/password
ALTER TABLE users
ALTER COLUMN external_user_id DROP NOT NULL;