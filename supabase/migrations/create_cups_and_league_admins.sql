-- Add league_admin role to the user_role enum type
DO $$
BEGIN
  -- Check if the enum value already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'league_admin'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    -- Add the new enum value
    ALTER TYPE user_role ADD VALUE 'league_admin';
  END IF;
END $$;

-- Add league_admin role and league assignment to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS managed_league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

COMMENT ON COLUMN profiles.managed_league_id IS 'For league_admin role: the specific league they can manage. NULL for super admins.';

-- Create cups/tournaments table
CREATE TABLE IF NOT EXISTS cups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  season TEXT,
  total_teams INTEGER NOT NULL CHECK (total_teams > 0),
  teams_per_group INTEGER NOT NULL CHECK (teams_per_group > 0),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'group_stage', 'knockout', 'completed')),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create cup groups table
CREATE TABLE IF NOT EXISTS cup_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cup_id UUID REFERENCES cups(id) ON DELETE CASCADE NOT NULL,
  group_name TEXT NOT NULL,
  group_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create cup teams (participants) table
CREATE TABLE IF NOT EXISTS cup_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cup_id UUID REFERENCES cups(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES cup_groups(id) ON DELETE SET NULL,
  points INTEGER DEFAULT 0,
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(cup_id, team_id)
);

-- Create cup matches table
CREATE TABLE IF NOT EXISTS cup_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cup_id UUID REFERENCES cups(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES cup_groups(id) ON DELETE SET NULL,
  home_team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  away_team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  match_date TIMESTAMP WITH TIME ZONE,
  venue TEXT,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'postponed', 'cancelled')),
  stage TEXT DEFAULT 'group' CHECK (stage IN ('group', 'round_of_16', 'quarter_final', 'semi_final', 'final')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX idx_cups_league_id ON cups(league_id);
CREATE INDEX idx_cups_status ON cups(status);
CREATE INDEX idx_cup_groups_cup_id ON cup_groups(cup_id);
CREATE INDEX idx_cup_teams_cup_id ON cup_teams(cup_id);
CREATE INDEX idx_cup_teams_group_id ON cup_teams(group_id);
CREATE INDEX idx_cup_matches_cup_id ON cup_matches(cup_id);
CREATE INDEX idx_cup_matches_group_id ON cup_matches(group_id);
CREATE INDEX idx_profiles_managed_league_id ON profiles(managed_league_id);

-- Enable Row Level Security
ALTER TABLE cups ENABLE ROW LEVEL SECURITY;
ALTER TABLE cup_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE cup_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE cup_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cups
CREATE POLICY "Anyone can view cups"
  ON cups FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Super admins can insert cups"
  ON cups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.managed_league_id IS NULL
    )
  );

CREATE POLICY "League admins can insert cups for their league"
  ON cups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'league_admin'
      AND profiles.managed_league_id = cups.league_id
    )
  );

CREATE POLICY "Super admins can update any cup"
  ON cups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.managed_league_id IS NULL
    )
  );

CREATE POLICY "League admins can update cups for their league"
  ON cups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'league_admin'
      AND profiles.managed_league_id = league_id
    )
  );

CREATE POLICY "Super admins can delete any cup"
  ON cups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.managed_league_id IS NULL
    )
  );

CREATE POLICY "League admins can delete cups for their league"
  ON cups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'league_admin'
      AND profiles.managed_league_id = league_id
    )
  );

-- RLS Policies for cup_groups (inherit from cups)
CREATE POLICY "Anyone can view cup groups"
  ON cup_groups FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage cup groups"
  ON cup_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      LEFT JOIN cups c ON c.id = cup_groups.cup_id
      WHERE p.id = auth.uid()
      AND (
        (p.role = 'admin' AND p.managed_league_id IS NULL)
        OR (p.role = 'league_admin' AND p.managed_league_id = c.league_id)
      )
    )
  );

-- RLS Policies for cup_teams
CREATE POLICY "Anyone can view cup teams"
  ON cup_teams FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage cup teams"
  ON cup_teams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      LEFT JOIN cups c ON c.id = cup_teams.cup_id
      WHERE p.id = auth.uid()
      AND (
        (p.role = 'admin' AND p.managed_league_id IS NULL)
        OR (p.role = 'league_admin' AND p.managed_league_id = c.league_id)
      )
    )
  );

-- RLS Policies for cup_matches
CREATE POLICY "Anyone can view cup matches"
  ON cup_matches FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage cup matches"
  ON cup_matches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      LEFT JOIN cups c ON c.id = cup_matches.cup_id
      WHERE p.id = auth.uid()
      AND (
        (p.role = 'admin' AND p.managed_league_id IS NULL)
        OR (p.role = 'league_admin' AND p.managed_league_id = c.league_id)
      )
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_cups_updated_at
  BEFORE UPDATE ON cups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cup_matches_updated_at
  BEFORE UPDATE ON cup_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE cups IS 'Cup/tournament competitions with group stages';
COMMENT ON TABLE cup_groups IS 'Groups within a cup competition';
COMMENT ON TABLE cup_teams IS 'Teams participating in a cup with their statistics';
COMMENT ON TABLE cup_matches IS 'Matches within cup competitions';
