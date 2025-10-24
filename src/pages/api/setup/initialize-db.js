import { Client } from 'pg';

// This is a complete script to create all necessary tables from scratch.
// It's designed to be run once on a fresh database.
const SETUP_SQL = `
BEGIN;

-- Create all tables with IF NOT EXISTS to ensure idempotency
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS embeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  success_url_a TEXT,
  jwt_secret TEXT,
  mobile_otp_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credentials_enabled BOOLEAN DEFAULT false,
  google_auth_enabled BOOLEAN DEFAULT false,
  github_auth_enabled BOOLEAN DEFAULT false,
  qr_code_enabled BOOLEAN NOT NULL DEFAULT false,
  component_type TEXT DEFAULT 'qr_auth',
  card_title TEXT,
  card_price TEXT,
  card_features TEXT[],
  card_button_text TEXT,
  card_button_link TEXT,
  card_badge TEXT,
  card_featured BOOLEAN DEFAULT false,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  app_id UUID, -- Foreign key constraint added separately
  contact_form_recipient_email TEXT,
  founder_name TEXT,
  founder_title TEXT,
  founder_bio TEXT,
  founder_image_url TEXT,
  chatbot_welcome_message TEXT,
  chatbot_initial_questions TEXT[]
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL,
  embed_id UUID REFERENCES embeds(id) ON DELETE CASCADE,
  fingerprint TEXT,
  mobile_fingerprint TEXT,
  qr_url TEXT,
  success_url TEXT,
  client_origin TEXT,
  loaded_at TIMESTAMPTZ,
  scanned_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  external_user_id TEXT,
  external_user_email TEXT,
  external_user_name TEXT,
  user_role TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stripe_connections (
  id SERIAL PRIMARY KEY,
  stripe_account_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_path TEXT NOT NULL UNIQUE,
  role_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS known_routes (
  path TEXT PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS _app_meta (
  key TEXT PRIMARY KEY,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_configurations (
  app_id UUID PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns and constraints to existing tables to handle migrations gracefully
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='embeds' AND column_name='qr_code_enabled') THEN
    ALTER TABLE "public"."embeds" ADD COLUMN "qr_code_enabled" boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='client_origin') THEN
    ALTER TABLE "public"."sessions" ADD COLUMN "client_origin" TEXT;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='onboarding_completed_at') THEN
    ALTER TABLE "public"."users" ADD COLUMN "onboarding_completed_at" TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='embeds' AND column_name='app_id') THEN
    ALTER TABLE "public"."embeds" ADD COLUMN "app_id" UUID;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='embeds' AND column_name='contact_form_recipient_email') THEN ALTER TABLE "public"."embeds" ADD COLUMN "contact_form_recipient_email" TEXT; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='embeds' AND column_name='founder_name') THEN ALTER TABLE "public"."embeds" ADD COLUMN "founder_name" TEXT; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='embeds' AND column_name='founder_title') THEN ALTER TABLE "public"."embeds" ADD COLUMN "founder_title" TEXT; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='embeds' AND column_name='founder_bio') THEN ALTER TABLE "public"."embeds" ADD COLUMN "founder_bio" TEXT; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='embeds' AND column_name='founder_image_url') THEN ALTER TABLE "public"."embeds" ADD COLUMN "founder_image_url" TEXT; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='embeds' AND column_name='chatbot_welcome_message') THEN ALTER TABLE "public"."embeds" ADD COLUMN "chatbot_welcome_message" TEXT; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='embeds' AND column_name='chatbot_initial_questions') THEN ALTER TABLE "public"."embeds" ADD COLUMN "chatbot_initial_questions" TEXT[]; END IF;

  -- Add foreign key constraint for embeds.app_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'embeds_app_id_fkey' AND conrelid = 'public.embeds'::regclass
  ) THEN
    ALTER TABLE "public"."embeds" ADD CONSTRAINT "embeds_app_id_fkey" 
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Seed default roles, ignoring if they already exist
INSERT INTO roles (name, description, permissions) VALUES
  ('Admin', 'Has all permissions by default.', '{"*"}'),
  ('User', 'Default role for signed-up users.', '{"user:view-profile"}')
ON CONFLICT (name) DO NOTHING;

-- Mark setup as complete, ignoring if already marked
INSERT INTO _app_meta (key, value) VALUES
  ('db_initialized', jsonb_build_object('at', NOW()))
ON CONFLICT (key) DO NOTHING;

-- Notify PostgREST to reload its schema cache to recognize new relationships
NOTIFY pgrst, 'reload schema';

COMMIT;
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Use the standard Supabase variable, but fall back to the local dev DATABASE_URL.
  const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    const errorMessage = "CRITICAL: SUPABASE_DATABASE_URL or DATABASE_URL is not set in .env.local. Please get it from your Supabase project settings (Database > Connection string).";
    console.error(errorMessage);
    return res.status(500).json({ error: errorMessage });
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    await client.query(SETUP_SQL);
    res.status(200).json({ message: 'Database initialized successfully!' });
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({ error: `Failed to initialize database: ${error.message}` });
  } finally {
    await client.end();
  }
}