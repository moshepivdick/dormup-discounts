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
-- Note: In RLS policies, we can't use OLD/NEW directly, so we check that is_admin doesn't change
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (
      -- Allow update if is_admin is not being changed (stays false)
      -- This is enforced by checking that the new value matches the existing value
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = is_admin
      OR
      -- Or if user is trying to set is_admin to false (can't set to true)
      is_admin = false
    )
  );

-- Add comment to column
COMMENT ON COLUMN public.profiles.is_admin IS 'Admin access flag. Only service_role can modify this field.';

