-- Create independent team registry for cups
-- Cups will have their own teams, completely separate from league teams

-- Create cup_teams_registry table (independent teams for cups)
CREATE TABLE IF NOT EXISTS cup_teams_registry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cup_id UUID REFERENCES cups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  logo_url TEXT,
  founded_year INTEGER,
  stadium TEXT,
  city TEXT,
  coach TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(cup_id, name)
);

-- Create cup_players_registry table (players specific to cup teams)
CREATE TABLE IF NOT EXISTS cup_players_registry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cup_team_id UUID REFERENCES cup_teams_registry(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  jersey_number INTEGER,
  position TEXT,
  date_of_birth DATE,
  nationality TEXT,
  is_captain BOOLEAN DEFAULT false,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(cup_team_id, jersey_number)
);

-- Update cup_teams table to reference cup_teams_registry instead of teams
-- First, drop the old foreign key
ALTER TABLE cup_teams DROP CONSTRAINT IF EXISTS cup_teams_team_id_fkey;

-- Rename team_id to cup_team_id for clarity
ALTER TABLE cup_teams RENAME COLUMN team_id TO cup_team_id;

-- Add new foreign key to cup_teams_registry
ALTER TABLE cup_teams
ADD CONSTRAINT cup_teams_cup_team_id_fkey
FOREIGN KEY (cup_team_id) REFERENCES cup_teams_registry(id) ON DELETE CASCADE;

-- Update cup_matches to use cup_teams_registry
ALTER TABLE cup_matches DROP CONSTRAINT IF EXISTS cup_matches_home_team_id_fkey;
ALTER TABLE cup_matches DROP CONSTRAINT IF EXISTS cup_matches_away_team_id_fkey;

ALTER TABLE cup_matches RENAME COLUMN home_team_id TO home_cup_team_id;
ALTER TABLE cup_matches RENAME COLUMN away_team_id TO away_cup_team_id;

ALTER TABLE cup_matches
ADD CONSTRAINT cup_matches_home_cup_team_id_fkey
FOREIGN KEY (home_cup_team_id) REFERENCES cup_teams_registry(id) ON DELETE CASCADE;

ALTER TABLE cup_matches
ADD CONSTRAINT cup_matches_away_cup_team_id_fkey
FOREIGN KEY (away_cup_team_id) REFERENCES cup_teams_registry(id) ON DELETE CASCADE;

-- Drop old cup_players table (was referencing league players)
DROP TABLE IF EXISTS cup_players CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cup_teams_registry_cup_id ON cup_teams_registry(cup_id);
CREATE INDEX IF NOT EXISTS idx_cup_players_registry_cup_team_id ON cup_players_registry(cup_team_id);

-- Enable RLS
ALTER TABLE cup_teams_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE cup_players_registry ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cup_teams_registry
CREATE POLICY "Anyone can view cup teams registry"
  ON cup_teams_registry FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage cup teams registry"
  ON cup_teams_registry FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        -- Super admin
        (p.role = 'admin' AND p.managed_league_id IS NULL AND p.managed_cup_id IS NULL) OR
        -- League admin (not cup-specific)
        (p.role = 'league_admin' AND p.managed_cup_id IS NULL) OR
        -- Cup admin managing this specific cup
        (p.role = 'league_admin' AND p.managed_cup_id = cup_teams_registry.cup_id)
      )
    )
  );

-- RLS Policies for cup_players_registry
CREATE POLICY "Anyone can view cup players registry"
  ON cup_players_registry FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage cup players registry"
  ON cup_players_registry FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      LEFT JOIN cup_teams_registry ctr ON ctr.id = cup_players_registry.cup_team_id
      WHERE p.id = auth.uid()
      AND (
        -- Super admin
        (p.role = 'admin' AND p.managed_league_id IS NULL AND p.managed_cup_id IS NULL) OR
        -- League admin (not cup-specific)
        (p.role = 'league_admin' AND p.managed_cup_id IS NULL) OR
        -- Cup admin managing this specific cup
        (p.role = 'league_admin' AND p.managed_cup_id = ctr.cup_id)
      )
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_cup_teams_registry_updated_at
  BEFORE UPDATE ON cup_teams_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cup_players_registry_updated_at
  BEFORE UPDATE ON cup_players_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE cup_teams_registry IS 'Independent teams registered for cup competitions (not linked to league teams)';
COMMENT ON TABLE cup_players_registry IS 'Players belonging to cup teams (independent from league players)';
