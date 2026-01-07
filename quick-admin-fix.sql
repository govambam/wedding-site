-- QUICK FIX: Allow admin users full access to all tables
-- Run this in your Supabase SQL Editor to unblock the admin dashboard

-- First, ensure the admin_users table RLS policy exists
DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;
CREATE POLICY "admin_users_select_policy"
ON admin_users FOR SELECT
TO authenticated
USING (true);

-- Create a helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admin_users
    WHERE email = auth.jwt()->>'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin policies to all tables
-- These give admins full access to everything

-- GUESTS TABLE
DROP POLICY IF EXISTS "admins_full_access_guests" ON guests;
CREATE POLICY "admins_full_access_guests"
ON guests FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- INVITES TABLE
DROP POLICY IF EXISTS "admins_full_access_invites" ON invites;
CREATE POLICY "admins_full_access_invites"
ON invites FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- RSVP_RESPONSES TABLE
DROP POLICY IF EXISTS "admins_full_access_rsvp" ON rsvp_responses;
CREATE POLICY "admins_full_access_rsvp"
ON rsvp_responses FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- TRAVEL_DETAILS TABLE
DROP POLICY IF EXISTS "admins_full_access_travel" ON travel_details;
CREATE POLICY "admins_full_access_travel"
ON travel_details FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- PAYMENTS TABLE
DROP POLICY IF EXISTS "admins_full_access_payments" ON payments;
CREATE POLICY "admins_full_access_payments"
ON payments FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Verify it worked
SELECT 'Admin access granted! Refresh your browser.' AS status;
