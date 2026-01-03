-- Update profiles table for OTP passwordless auth
-- Add missing columns if they don't exist

DO $$ 
BEGIN
  -- Add first_name if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
    ALTER TABLE profiles ADD COLUMN first_name TEXT;
  END IF;

  -- Rename verified_student to is_student_verified if needed, or add is_student_verified
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'profiles' AND column_name = 'verified_student') THEN
    -- Keep verified_student for now, but ensure is_student_verified exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'is_student_verified') THEN
      ALTER TABLE profiles ADD COLUMN is_student_verified BOOLEAN DEFAULT FALSE;
      -- Copy data from verified_student
      UPDATE profiles SET is_student_verified = verified_student WHERE verified_student IS NOT NULL;
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_student_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_student_verified BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add verified_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' AND column_name = 'verified_at') THEN
    ALTER TABLE profiles ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Make university_id nullable if it's not already
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'profiles' AND column_name = 'university_id' 
             AND is_nullable = 'NO') THEN
    ALTER TABLE profiles ALTER COLUMN university_id DROP NOT NULL;
  END IF;
END $$;

-- Create trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

