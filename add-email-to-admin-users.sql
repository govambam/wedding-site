-- Alternative: Add email column to existing admin_users table
-- Use this if you want to keep existing data and just add the missing column

-- Check what columns currently exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

-- Add the email column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'admin_users'
        AND column_name = 'email'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN email TEXT;
    END IF;
END $$;

-- Make email NOT NULL and UNIQUE (after adding it)
-- First, update any existing rows with NULL email
UPDATE admin_users
SET email = 'admin@example.com'
WHERE email IS NULL;

-- Then add constraints
ALTER TABLE admin_users
ALTER COLUMN email SET NOT NULL;

ALTER TABLE admin_users
ADD CONSTRAINT admin_users_email_unique UNIQUE (email);

-- Update existing admin user with correct email
UPDATE admin_users
SET email = 'josiejohnson@mac.com'
WHERE id = (SELECT id FROM admin_users LIMIT 1);

-- Verify the changes
SELECT * FROM admin_users;
