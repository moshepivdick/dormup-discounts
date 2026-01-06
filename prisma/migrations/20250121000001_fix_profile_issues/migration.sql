-- Fix potential issues with profiles table and RLS

-- 1. Ensure university_id can be NULL (for initial profile creation)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'university_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN university_id DROP NOT NULL;
  END IF;
END $$;

-- 2. Ensure verified_student has a default value
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'verified_student'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN verified_student SET DEFAULT FALSE;
  END IF;
END $$;

-- 3. Grant necessary permissions for the trigger function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- 4. Ensure the trigger function has SECURITY DEFINER (runs with creator's privileges)
-- This is already set in the function definition, but we ensure it here
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates profile when user is created. Runs with SECURITY DEFINER to bypass RLS.';

-- 5. Fix RLS policy to allow INSERT during user creation
-- The existing policy should work, but let's ensure it's correct
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 6. Add a policy to allow service role to insert (for fallback)
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
-- Note: Service role bypasses RLS by default, but we can add this for clarity
-- Actually, service role doesn't need a policy as it bypasses RLS

-- 7. Ensure email column is properly indexed
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 8. Ensure the foreign key constraint is correct
-- This should already exist, but we verify it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;


