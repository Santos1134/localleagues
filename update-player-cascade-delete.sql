-- Update players table to cascade delete when team is deleted
-- This will automatically delete all players when their team is deleted

-- First, drop the existing foreign key constraint
ALTER TABLE players
DROP CONSTRAINT IF EXISTS players_team_id_fkey;

-- Add the new constraint with CASCADE DELETE
ALTER TABLE players
ADD CONSTRAINT players_team_id_fkey
FOREIGN KEY (team_id)
REFERENCES teams(id)
ON DELETE CASCADE;

-- Optional: Clean up existing orphaned players (players without a team)
-- Uncomment the line below if you want to remove players that already have NULL team_id
-- DELETE FROM players WHERE team_id IS NULL;
