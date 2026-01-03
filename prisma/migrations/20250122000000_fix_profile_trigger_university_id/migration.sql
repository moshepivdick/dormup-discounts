-- Fix handle_new_user trigger to handle missing university_id
-- The trigger was failing because university_id is NOT NULL but trigger tried to insert without it
-- This causes HTTP 500 errors during OTP verification

-- Step 1: Make university_id nullable in profiles table if it's not already
DO $$ 
BEGIN
  -- Check if university_id column exists and is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'university_id' 
    AND is_nullable = 'NO'
    AND table_schema = 'public'
  ) THEN
    -- Make it nullable
    ALTER TABLE public.profiles ALTER COLUMN university_id DROP NOT NULL;
    RAISE NOTICE 'Made university_id nullable';
  ELSE
    RAISE NOTICE 'university_id is already nullable or does not exist';
  END IF;
END $$;

-- Step 2: Update handle_new_user function to handle missing university_id gracefully
-- This function MUST NOT fail even if profile creation fails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert profile, but ignore if it already exists (idempotent)
  -- Note: university_id is nullable and will be set later via API
  -- Use COALESCE to ensure we have a valid email
  BEGIN
    INSERT INTO public.profiles (id, email, created_at, updated_at, verified_student, university_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      NOW(),
      NOW(),
      FALSE,
      NULL  -- university_id will be set later via API
    )
    ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, profiles.email),
        updated_at = NOW();
  EXCEPTION
    WHEN OTHERS THEN
      -- CRITICAL: Log the error but NEVER fail the user creation
      -- If this function raises an exception, it will cause the INSERT into auth.users to fail
      -- which results in HTTP 500 during OTP verification
      RAISE WARNING 'handle_new_user: Failed to create profile for user %: % (SQLSTATE: %)', 
        NEW.id, SQLERRM, SQLSTATE;
      -- Return NEW to allow user creation to succeed even if profile creation fails
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Step 4: Ensure the trigger exists and is enabled
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Verify RLS policies allow the trigger to work
-- The trigger uses SECURITY DEFINER, so it runs with the function owner's privileges
-- But we should ensure RLS policies exist for manual inserts
DO $$
BEGIN
  -- Check if insert policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can insert their own profile'
    AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Creating missing RLS policy for profile inserts';
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles
      FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

