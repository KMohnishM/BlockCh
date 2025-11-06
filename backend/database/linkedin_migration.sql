-- Migration: Add LinkedIn OAuth support to profiles table
-- Add this to your Supabase SQL editor to enable LinkedIn authentication

-- Add LinkedIn-specific columns to profiles table
ALTER TABLE profiles 
ADD COLUMN linkedin_id VARCHAR(255) UNIQUE,
ADD COLUMN linkedin_profile_url TEXT,
ADD COLUMN picture TEXT;

-- Update the auth_method check constraint to include linkedin
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_method_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_auth_method_check 
CHECK (auth_method IN ('email', 'web3', 'linkedin'));

-- Create index for LinkedIn ID lookups
CREATE INDEX IF NOT EXISTS idx_profiles_linkedin_id ON profiles(linkedin_id);

-- Update RLS policies to allow LinkedIn users
-- (Existing policies should work, but we can add specific ones if needed)

-- Optional: Update existing users to have null LinkedIn fields
-- UPDATE profiles SET linkedin_id = NULL, linkedin_profile_url = NULL, picture = NULL 
-- WHERE linkedin_id IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('linkedin_id', 'linkedin_profile_url', 'picture')
ORDER BY column_name;