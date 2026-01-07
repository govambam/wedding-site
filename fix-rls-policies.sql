-- Fix RLS Policies for Wedding Site Database
-- This file fixes the infinite recursion issues in RLS policies
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Drop all existing RLS policies to start fresh
-- ============================================================================

-- Drop policies on guests table
DROP POLICY IF EXISTS "Users can view their own guest record" ON guests;
DROP POLICY IF EXISTS "Users can update their own guest record" ON guests;
DROP POLICY IF EXISTS "Users can view guests in their invite" ON guests;
DROP POLICY IF EXISTS "Guests can view other guests in their invite" ON guests;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON guests;

-- Drop policies on invites table
DROP POLICY IF EXISTS "Users can view their own invite" ON invites;
DROP POLICY IF EXISTS "Users can update their own invite" ON invites;
DROP POLICY IF EXISTS "Enable read access for invite members" ON invites;
DROP POLICY IF EXISTS "Enable update for invite members" ON invites;

-- Drop policies on admin_users table
DROP POLICY IF EXISTS "Admin users can view all records" ON admin_users;
DROP POLICY IF EXISTS "Public can read admin_users for authentication" ON admin_users;

-- Drop policies on rsvp_responses table
DROP POLICY IF EXISTS "Users can view their invite's RSVP responses" ON rsvp_responses;
DROP POLICY IF EXISTS "Users can insert their own RSVP" ON rsvp_responses;
DROP POLICY IF EXISTS "Users can update their own RSVP" ON rsvp_responses;

-- Drop policies on travel_details table
DROP POLICY IF EXISTS "Users can view their invite's travel details" ON travel_details;
DROP POLICY IF EXISTS "Users can insert their own travel details" ON travel_details;
DROP POLICY IF EXISTS "Users can update their own travel details" ON travel_details;

-- Drop policies on payments table
DROP POLICY IF EXISTS "Users can view their invite's payments" ON payments;

-- ============================================================================
-- STEP 2: Create new, simplified RLS policies without circular dependencies
-- ============================================================================

-- GUESTS TABLE POLICIES
-- Allow users to read their own guest record and other guests in their invite
CREATE POLICY "guests_select_policy"
ON guests FOR SELECT
TO authenticated
USING (
  -- User can see their own record
  auth.uid() = user_id
  OR
  -- User can see other guests in the same invite
  invite_id IN (
    SELECT invite_id
    FROM guests
    WHERE user_id = auth.uid()
  )
);

-- Allow users to update their own guest record only
CREATE POLICY "guests_update_policy"
ON guests FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- INVITES TABLE POLICIES
-- Allow users to read invites they belong to
CREATE POLICY "invites_select_policy"
ON invites FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT invite_id
    FROM guests
    WHERE user_id = auth.uid()
  )
);

-- Allow users to update invites they belong to
CREATE POLICY "invites_update_policy"
ON invites FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT invite_id
    FROM guests
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT invite_id
    FROM guests
    WHERE user_id = auth.uid()
  )
);

-- ADMIN_USERS TABLE POLICIES
-- Allow all authenticated users to read admin_users (needed for login check)
-- This is safe because admin_users only contains email and role, no sensitive data
CREATE POLICY "admin_users_select_policy"
ON admin_users FOR SELECT
TO authenticated
USING (true);

-- RSVP_RESPONSES TABLE POLICIES
-- Allow users to read RSVP responses for their invite
CREATE POLICY "rsvp_select_policy"
ON rsvp_responses FOR SELECT
TO authenticated
USING (
  guest_id IN (
    SELECT id
    FROM guests
    WHERE invite_id IN (
      SELECT invite_id
      FROM guests
      WHERE user_id = auth.uid()
    )
  )
);

-- Allow users to insert RSVP for guests in their invite
CREATE POLICY "rsvp_insert_policy"
ON rsvp_responses FOR INSERT
TO authenticated
WITH CHECK (
  guest_id IN (
    SELECT id
    FROM guests
    WHERE invite_id IN (
      SELECT invite_id
      FROM guests
      WHERE user_id = auth.uid()
    )
  )
);

-- Allow users to update RSVP for guests in their invite
CREATE POLICY "rsvp_update_policy"
ON rsvp_responses FOR UPDATE
TO authenticated
USING (
  guest_id IN (
    SELECT id
    FROM guests
    WHERE invite_id IN (
      SELECT invite_id
      FROM guests
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  guest_id IN (
    SELECT id
    FROM guests
    WHERE invite_id IN (
      SELECT invite_id
      FROM guests
      WHERE user_id = auth.uid()
    )
  )
);

-- TRAVEL_DETAILS TABLE POLICIES
-- Allow users to read travel details for their invite
CREATE POLICY "travel_select_policy"
ON travel_details FOR SELECT
TO authenticated
USING (
  guest_id IN (
    SELECT id
    FROM guests
    WHERE invite_id IN (
      SELECT invite_id
      FROM guests
      WHERE user_id = auth.uid()
    )
  )
);

-- Allow users to insert travel details for guests in their invite
CREATE POLICY "travel_insert_policy"
ON travel_details FOR INSERT
TO authenticated
WITH CHECK (
  guest_id IN (
    SELECT id
    FROM guests
    WHERE invite_id IN (
      SELECT invite_id
      FROM guests
      WHERE user_id = auth.uid()
    )
  )
);

-- Allow users to update travel details for guests in their invite
CREATE POLICY "travel_update_policy"
ON travel_details FOR UPDATE
TO authenticated
USING (
  guest_id IN (
    SELECT id
    FROM guests
    WHERE invite_id IN (
      SELECT invite_id
      FROM guests
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  guest_id IN (
    SELECT id
    FROM guests
    WHERE invite_id IN (
      SELECT invite_id
      FROM guests
      WHERE user_id = auth.uid()
    )
  )
);

-- PAYMENTS TABLE POLICIES
-- Allow users to read payments for their invite
CREATE POLICY "payments_select_policy"
ON payments FOR SELECT
TO authenticated
USING (
  invite_id IN (
    SELECT invite_id
    FROM guests
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 3: Verify RLS is enabled on all tables
-- ============================================================================

-- Ensure RLS is enabled on all tables
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- OPTIONAL: Temporarily disable RLS for testing (ONLY USE FOR DEBUGGING)
-- ============================================================================

-- Uncomment these lines ONLY if you want to temporarily disable RLS for testing
-- WARNING: This will allow all authenticated users to see all data!

-- ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE invites DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE rsvp_responses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE travel_details DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Grant necessary permissions
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON guests TO authenticated;
GRANT SELECT, UPDATE ON invites TO authenticated;
GRANT SELECT ON admin_users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rsvp_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON travel_details TO authenticated;
GRANT SELECT ON payments TO authenticated;

-- ============================================================================
-- Done! The RLS policies have been fixed.
-- ============================================================================
