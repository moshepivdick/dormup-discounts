-- Add is_admin field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = TRUE;

-- Update RLS policies to prevent users from modifying is_admin
-- Users can only read their own profile, but cannot update is_admin
-- Only service_role can update is_admin

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new update policy that excludes is_admin from user updates
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (
      -- Users can update their own profile, but NOT is_admin
      OLD.is_admin = NEW.is_admin
    )
  );

-- Add comment to column
COMMENT ON COLUMN public.profiles.is_admin IS 'Admin access flag. Only service_role can modify this field.';

