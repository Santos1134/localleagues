# Implementation Plan: Independent Cup & League Systems + Livescore

## Current Issue

Currently, cups are trying to use teams from leagues. This is incorrect. The user wants:

1. **Complete Separation**: Leagues have their own teams, Cups have their own teams (no sharing)
2. **Livescore Section**: Homepage showing all live matches
3. **Top Scorers**: Separate top scorer charts for each league/cup with user selection

## Solution Overview

### Phase 1: Independent Cup Teams System ✅ (Migration Created)

**Migration File**: `supabase/migrations/create_independent_cup_teams.sql`

**What it does:**
- Creates `cup_teams_registry` table - Independent teams for cups (not linked to league teams)
- Creates `cup_players_registry` table - Players for cup teams (not linked to league players)
- Updates `cup_teams` table to reference `cup_teams_registry` instead of league teams
- Updates `cup_matches` to use cup teams
- Adds proper RLS policies

**Database Structure After Migration:**

```
Leagues System:
├── leagues
├── divisions
├── teams (league teams)
└── players (league players)

Cups System (INDEPENDENT):
├── cups
├── cup_teams_registry (cup teams - independent)
├── cup_players_registry (cup players - independent)
├── cup_teams (statistics/groups)
├── cup_groups
└── cup_matches
```

### Phase 2: Update Cup Management UI

**File to Update**: `app/(dashboard)/admin/cups/[id]/page.tsx`

**Changes Needed:**
1. Remove references to league teams (`teams` table)
2. Add "Create Team" functionality for cups
3. Fetch teams from `cup_teams_registry` instead of `teams`
4. Add team management (create, edit, delete cup teams)
5. Add player management for cup teams

**New Features:**
- Create teams directly in the cup
- Add players to cup teams
- Each cup has its own isolated team roster

### Phase 3: Livescore Homepage Section

**File to Create**: `app/livescores/page.tsx` OR add to homepage

**Features:**
1. Display all matches with status = 'live'
2. Real-time score updates
3. Group by competition (leagues and cups)
4. Show match time, teams, scores
5. Filter by league/cup
6. Auto-refresh every 30 seconds

**Database Query:**
```sql
SELECT
  m.*,
  home_team.name as home_team_name,
  away_team.name as away_team_name,
  d.name as division_name,
  l.name as league_name
FROM matches m
LEFT JOIN teams home_team ON m.home_team_id = home_team.id
LEFT JOIN teams away_team ON m.away_team_id = away_team.id
LEFT JOIN divisions d ON m.division_id = d.id
LEFT JOIN leagues l ON d.league_id = l.id
WHERE m.status = 'live'

UNION ALL

SELECT
  cm.*,
  home_cup_team.name as home_team_name,
  away_cup_team.name as away_team_name,
  c.name as cup_name
FROM cup_matches cm
LEFT JOIN cup_teams_registry home_cup_team ON cm.home_cup_team_id = home_cup_team.id
LEFT JOIN cup_teams_registry away_cup_team ON cm.away_cup_team_id = away_cup_team.id
LEFT JOIN cups c ON cm.cup_id = c.id
WHERE cm.status = 'live'
```

### Phase 4: Top Scorers Charts

**File to Create**: `app/stats/page.tsx` OR add to standings page

**Features:**
1. Dropdown to select competition (League or Cup)
2. Display top scorers for selected competition
3. Show: Player Name, Team, Goals, Assists
4. Separate tables for leagues vs cups

**For Leagues:**
```sql
SELECT
  p.name,
  p.goals,
  p.assists,
  t.name as team_name
FROM players p
JOIN teams t ON p.team_id = t.id
JOIN divisions d ON t.division_id = d.id
WHERE d.league_id = :selected_league_id
ORDER BY p.goals DESC, p.assists DESC
LIMIT 20
```

**For Cups:**
```sql
SELECT
  cpr.name,
  cpr.goals,
  cpr.assists,
  ctr.name as team_name
FROM cup_players_registry cpr
JOIN cup_teams_registry ctr ON cpr.cup_team_id = ctr.id
WHERE ctr.cup_id = :selected_cup_id
ORDER BY cpr.goals DESC, cpr.assists DESC
LIMIT 20
```

## Implementation Steps (In Order)

### Step 1: Run Migration ⚠️ IMPORTANT
```sql
-- Run this in Supabase SQL Editor
-- File: supabase/migrations/create_independent_cup_teams.sql
```

**WARNING**: This migration will:
- Modify `cup_teams` and `cup_matches` tables
- Drop old `cup_players` table
- Create new independent team system

**Backup your data first if you have existing cups!**

### Step 2: Update Cup Management Page
- Modify `app/(dashboard)/admin/cups/[id]/page.tsx`
- Add team creation UI
- Add player management UI
- Remove league team references

### Step 3: Create Livescore Page
- Create `app/livescores/page.tsx`
- Add to homepage or navigation
- Implement real-time updates

### Step 4: Create Top Scorers Page
- Create `app/stats/page.tsx`
- Add competition selector
- Display separate charts

### Step 5: Test Everything
- Create a new cup
- Add teams to the cup
- Add players to teams
- Generate groups
- Create fixtures
- Test livescores
- Test top scorers

## Files to Create/Modify

### New Files:
1. `supabase/migrations/create_independent_cup_teams.sql` ✅ CREATED
2. `app/livescores/page.tsx` - Livescore display
3. `app/stats/page.tsx` - Top scorers charts
4. `components/LiveScoreCard.tsx` - Reusable livescore component
5. `components/TopScorersTable.tsx` - Reusable top scorers component

### Files to Modify:
1. `app/(dashboard)/admin/cups/[id]/page.tsx` - Update for independent teams
2. `components/layout/Header.tsx` - Add Livescores link
3. `app/page.tsx` - Add livescore section to homepage (optional)

## Migration Risk Assessment

### Low Risk:
- Creating new tables (cup_teams_registry, cup_players_registry)
- Adding new RLS policies

### Medium Risk:
- Modifying cup_teams table (renaming team_id to cup_team_id)
- Modifying cup_matches table (renaming columns)

### High Risk:
- Dropping cup_players table (if it has data)
- Changing foreign key references (if existing data)

**Recommendation**: If you have existing cup data, export it first, then run migration, then manually recreate teams in new structure.

## Next Actions Required

1. **DECISION**: Do you have existing cup data that needs to be preserved?
   - YES: We need to create a data migration script
   - NO: Safe to run the migration as-is

2. **RUN MIGRATION**: Execute `create_independent_cup_teams.sql`

3. **UPDATE CODE**: Modify cup management page for new structure

4. **BUILD NEW FEATURES**: Create livescore and top scorers pages

5. **TEST**: Full system test with real data

## Expected Timeline

- Migration: 5 minutes
- Cup Management Updates: 2-3 hours
- Livescore Page: 1-2 hours
- Top Scorers Page: 1 hour
- Testing: 1 hour
- **Total**: ~5-7 hours of development

## Questions to Answer

1. Do you want livescores on the homepage or a separate page?
2. Should livescores auto-refresh? How often?
3. Do you want notifications when a goal is scored?
4. Should top scorers show all-time stats or season-specific?
5. Do you have existing cup data that needs migration?
