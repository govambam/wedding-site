-- Create or fix the admin_users table
-- Run this in your Supabase SQL Editor

-- Drop the existing table if it has the wrong structure
-- WARNING: This will delete existing admin users!
-- If you want to preserve data, skip this and manually add columns instead
DROP TABLE IF EXISTS admin_users CASCADE;

-- Create the admin_users table with correct structure
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'wedding_planner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read (needed for login check)
CREATE POLICY "admin_users_select_policy"
ON admin_users FOR SELECT
TO authenticated
USING (true);

-- Create an index on email for faster lookups
CREATE INDEX idx_admin_users_email ON admin_users(email);

-- Insert your admin user (replace with your actual email)
INSERT INTO admin_users (email, role)
VALUES ('josiejohnson@mac.com', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Optional: Add more admin users
-- INSERT INTO admin_users (email, role)
-- VALUES ('another@email.com', 'admin');

-- Verify the table was created correctly
SELECT * FROM admin_users;
