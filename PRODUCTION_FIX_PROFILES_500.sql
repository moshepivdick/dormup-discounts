-- ============================================================================
-- PRODUCTION FIX: "ERROR: relation 'profiles' does not exist" (500 error)
-- ============================================================================
-- 
-- PROBLEM: POST /verify returns 500 with "relation 'profiles' does not exist"
-- ROOT CAUSE: Trigger was disabled and profiles table may not exist in production
-- 
-- SOLUTION: Run this script in Supabase SQL Editor to fix immediately
-- 
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Create new query
-- 3. Paste this entire script
-- 4. Click "Run"
-- 5. Verify success messages in output
-- 
-- ============================================================================

BEGIN;

-- Step 1: Ensure profiles table exists in public schema
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  university_id UUID,
  verified_student BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ
);

-- Add foreign key constraint if universities table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'universities') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'profiles_university_id_fkey' 
      AND table_name = 'profiles'
    ) THEN
      ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_university_id_fkey 
      FOREIGN KEY (university_id) REFERENCES public.universities(id) ON UPDATE NO ACTION;
      RAISE NOTICE '✓ Added foreign key constraint to universities';
    END IF;
  ELSE
    RAISE NOTICE '⚠ universities table does not exist, skipping foreign key';
  END IF;
END $$;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_university_id ON public.profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity_at ON public.profiles(last_activity_at);

-- Step 3: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies (cleanup)
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;

-- Step 5: Create RLS policies
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 6: Create or replace handle_new_user function
-- This function MUST NOT fail even if profile creation fails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert profile, but ignore if it already exists (idempotent)
  -- university_id is nullable and will be set later via API
  BEGIN
    INSERT INTO public.profiles (id, email, created_at, updated_at, verified_student, university_id, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      NOW(),
      NOW(),
      FALSE,
      NULL,  -- university_id will be set later via API
      'user'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email),
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

-- Step 7: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Step 8: Drop and recreate trigger (ensures it's enabled)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 9: Verify trigger is enabled
DO $$
DECLARE
  trigger_enabled CHAR(1);
BEGIN
  SELECT tgenabled INTO trigger_enabled
  FROM pg_trigger 
  WHERE tgname = 'on_auth_user_created';
  
  IF trigger_enabled = 'D' THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created is DISABLED! This will cause 500 errors.';
  ELSIF trigger_enabled IS NULL THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created does not exist!';
  ELSE
    RAISE NOTICE '✓ Trigger on_auth_user_created is ENABLED';
  END IF;
END $$;

-- Step 10: Create updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

-- Final verification
DO $$
DECLARE
  table_exists BOOLEAN;
  trigger_exists BOOLEAN;
  trigger_enabled CHAR(1);
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) INTO table_exists;
  
  -- Check if trigger exists and is enabled
  SELECT tgenabled INTO trigger_enabled
  FROM pg_trigger 
  WHERE tgname = 'on_auth_user_created';
  
  trigger_exists := (trigger_enabled IS NOT NULL);
  
  RAISE NOTICE '';
  RAISE NOTICE '=== PRODUCTION FIX COMPLETE ===';
  RAISE NOTICE '✓ public.profiles table: %', CASE WHEN table_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '✓ on_auth_user_created trigger: %', CASE WHEN trigger_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '✓ Trigger status: %', CASE WHEN trigger_enabled = 'O' THEN 'ENABLED' WHEN trigger_enabled = 'D' THEN 'DISABLED' ELSE 'UNKNOWN' END;
  RAISE NOTICE '✓ RLS policies: CREATED';
  RAISE NOTICE '✓ Permissions: GRANTED';
  RAISE NOTICE '';
  RAISE NOTICE 'OTP verification should now work without 500 errors!';
  RAISE NOTICE 'Test by signing up with a new email and verifying the OTP code.';
  RAISE NOTICE '';
END $$;

