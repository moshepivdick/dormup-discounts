-- Create universities table
CREATE TABLE IF NOT EXISTS universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  email_domains TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create profiles table (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
  verified_student BOOLEAN NOT NULL DEFAULT FALSE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create university_requests table
CREATE TABLE IF NOT EXISTS university_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_name TEXT NOT NULL,
  requested_city TEXT,
  requested_domains TEXT[] NOT NULL DEFAULT '{}',
  requester_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  university_id UUID REFERENCES universities(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_universities_email_domains ON universities USING GIN (email_domains);
CREATE INDEX IF NOT EXISTS idx_profiles_university_id ON profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_university_requests_status ON university_requests(status);
CREATE INDEX IF NOT EXISTS idx_university_requests_requester_email ON university_requests(requester_email);

-- Enable RLS
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for universities
-- SELECT: public (anon + auth) allowed
CREATE POLICY "universities_select_public" ON universities
  FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: only admins
CREATE POLICY "universities_modify_admin" ON universities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for profiles
-- SELECT: only owner
CREATE POLICY "profiles_select_owner" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- UPDATE: only owner, but prevent role/verified_student changes from client
CREATE POLICY "profiles_update_owner" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND verified_student = (SELECT verified_student FROM profiles WHERE id = auth.uid())
  );

-- INSERT: only via server (service role) OR allow when auth.uid() = id and email matches
CREATE POLICY "profiles_insert_self" ON profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- RLS Policies for university_requests
-- INSERT: allow anon + auth
CREATE POLICY "university_requests_insert_public" ON university_requests
  FOR INSERT
  WITH CHECK (true);

-- SELECT/UPDATE/DELETE: only admins
CREATE POLICY "university_requests_modify_admin" ON university_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to sync verified_student when email is confirmed
CREATE OR REPLACE FUNCTION sync_profile_verified_student()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE profiles
    SET verified_student = TRUE
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update verified_student on email confirmation
CREATE TRIGGER sync_profile_on_email_confirm
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION sync_profile_verified_student();

