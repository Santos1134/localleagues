-- Debug and fix admin login issues

-- 1. Check all profiles to see what roles exist
SELECT id, email, role, managed_league_id, managed_cup_id, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 3. If you see your admin user above with role = NULL or 'fan', update it:
-- Replace 'your-admin-email@example.com' with the actual admin email
UPDATE profiles
SET role = 'league_admin'
WHERE email = 'your-admin-email@example.com'
  AND (role IS NULL OR role = 'fan');

-- 4. Verify the update worked
SELECT id, email, role, managed_cup_id
FROM profiles
WHERE email = 'your-admin-email@example.com';

-- 5. If profiles table SELECT is blocked by RLS, add this policy:
-- First check if policy exists:
SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'SELECT';

-- If no SELECT policy exists or if authenticated users can't read their own profile, add:
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 6. Also ensure authenticated users can read all profiles (needed for admin checks)
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON profiles;
CREATE POLICY "Authenticated users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);
