'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import LogoutButton from '@/components/admin/LogoutButton'

interface Cup {
  id: string
  name: string
  description: string | null
  season: string | null
  total_teams: number
  teams_per_group: number
  status: 'draft' | 'group_stage' | 'knockout' | 'completed'
  start_date: string | null
  end_date: string | null
}

interface CupTeam {
  cup_team_id: string
  id: string
  name: string
  short_name: string | null
  logo_url: string | null
  stadium: string | null
  city: string | null
  coach: string | null
  group_id: string | null
  group_name: string | null
  points: number
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
}

interface Player {
  id: string
  name: string
  position: string | null
}

interface CupPlayer {
  id: string
  player_id: string
  player_name: string
  position: string | null
  jersey_number: number | null
  is_captain: boolean
}

interface Group {
  id: string
  group_name: string
  group_order: number
  teams: CupTeam[]
}

interface Match {
  id: string
  home_team_id: string
  away_team_id: string
  home_team_name: string
  away_team_name: string
  match_date: string | null
  venue: string | null
  home_score: number | null
  away_score: number | null
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled'
  stage: 'group' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final'
  group_id: string | null
  group_name: string | null
}

type TabType = 'overview' | 'teams' | 'players' | 'groups' | 'fixtures' | 'knockout' | 'standings'

export default function CupDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const cupId = params.id as string
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [cup, setCup] = useState<Cup | null>(null)
  const [cupTeams, setCupTeams] = useState<CupTeam[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Team management
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [newTeamForm, setNewTeamForm] = useState({
    name: '',
    short_name: '',
    logo_url: '',
    stadium: '',
    city: '',
    coach: ''
  })
  const [editTeamForm, setEditTeamForm] = useState<CupTeam | null>(null)

  // Group management
  const [showManualGrouping, setShowManualGrouping] = useState(false)
  const [manualGroupName, setManualGroupName] = useState('')
  const [selectedTeamsForGroup, setSelectedTeamsForGroup] = useState<string[]>([])

  // Player management
  const [selectedTeamForPlayers, setSelectedTeamForPlayers] = useState('')
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([])
  const [cupPlayers, setCupPlayers] = useState<CupPlayer[]>([])
  const [showAddPlayers, setShowAddPlayers] = useState(false)

  // Fixture management
  const [showAddFixture, setShowAddFixture] = useState(false)
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null)
  const [newFixtureForm, setNewFixtureForm] = useState({
    home_team_id: '',
    away_team_id: '',
    group_id: '',
    match_date: '',
    venue: ''
  })
  const [editMatchForm, setEditMatchForm] = useState<any>(null)

  useEffect(() => {
    fetchCupData()
  }, [cupId])

  const fetchCupData = async () => {
    setLoading(true)

    // Fetch cup details
    const { data: cupData } = await supabase
      .from('cups')
      .select('*')
      .eq('id', cupId)
      .single()

    if (cupData) {
      setCup(cupData)

      // Fetch teams in this cup from independent registry
      const { data: teamsData } = await supabase
        .from('cup_teams')
        .select(`
          id,
          cup_id,
          cup_team_id,
          group_id,
          points,
          played,
          won,
          drawn,
          lost,
          goals_for,
          goals_against,
          goal_difference,
          cup_team:cup_teams_registry (
            id,
            name,
            short_name,
            logo_url,
            stadium,
            city,
            coach
          ),
          cup_groups (
            id,
            group_name
          )
        `)
        .eq('cup_id', cupId)

      const formattedTeams = teamsData?.map((ct: any) => ({
        cup_team_id: ct.id,
        id: ct.cup_team?.id || ct.cup_team_id,
        name: ct.cup_team?.name || 'Unknown Team',
        short_name: ct.cup_team?.short_name || null,
        logo_url: ct.cup_team?.logo_url || null,
        stadium: ct.cup_team?.stadium || null,
        city: ct.cup_team?.city || null,
        coach: ct.cup_team?.coach || null,
        group_id: ct.group_id,
        group_name: ct.cup_groups?.group_name || null,
        points: ct.points,
        played: ct.played,
        won: ct.won,
        drawn: ct.drawn,
        lost: ct.lost,
        goals_for: ct.goals_for,
        goals_against: ct.goals_against,
        goal_difference: ct.goal_difference
      })) || []

      setCupTeams(formattedTeams)

      // Fetch groups
      const { data: groupsData } = await supabase
        .from('cup_groups')
        .select('*')
        .eq('cup_id', cupId)
        .order('group_order')

      if (groupsData) {
        const groupsWithTeams = groupsData.map((group: any) => ({
          ...group,
          teams: formattedTeams.filter((t: CupTeam) => t.group_id === group.id)
        }))
        setGroups(groupsWithTeams)
      }

      // Fetch matches
      const { data: matchesData } = await supabase
        .from('cup_matches')
        .select(`
          *,
          home_team:cup_teams_registry!cup_matches_home_cup_team_id_fkey(id, name),
          away_team:cup_teams_registry!cup_matches_away_cup_team_id_fkey(id, name),
          cup_groups(group_name)
        `)
        .eq('cup_id', cupId)

      if (matchesData) {
        const formattedMatches = matchesData.map((m: any) => ({
          id: m.id,
          home_team_id: m.home_cup_team_id,
          away_team_id: m.away_cup_team_id,
          home_team_name: m.home_team?.name || 'TBD',
          away_team_name: m.away_team?.name || 'TBD',
          match_date: m.match_date,
          venue: m.venue,
          home_score: m.home_score,
          away_score: m.away_score,
          status: m.status,
          stage: m.stage,
          group_id: m.group_id,
          group_name: m.cup_groups?.group_name || null
        }))
        .sort((a: any, b: any) => {
          // Matches without dates go to the end
          if (!a.match_date && !b.match_date) return 0
          if (!a.match_date) return 1
          if (!b.match_date) return -1

          // Sort by date/time (earliest first)
          const dateA = new Date(a.match_date).getTime()
          const dateB = new Date(b.match_date).getTime()
          return dateA - dateB
        })

        setMatches(formattedMatches)
      }
    }

    setLoading(false)
  }

  const addTeamToCup = async () => {
    if (!newTeamForm.name.trim()) {
      setError('Please enter a team name')
      return
    }

    // First, create the team in the registry
    const { data: newTeam, error: registryError } = await supabase
      .from('cup_teams_registry')
      .insert({
        cup_id: cupId,
        name: newTeamForm.name.trim(),
        short_name: newTeamForm.short_name.trim() || null,
        logo_url: newTeamForm.logo_url.trim() || null,
        stadium: newTeamForm.stadium.trim() || null,
        city: newTeamForm.city.trim() || null,
        coach: newTeamForm.coach.trim() || null
      })
      .select()
      .single()

    if (registryError) {
      setError(registryError.message)
      return
    }

    // Then, add it to cup_teams for stats tracking
    const { error: cupTeamsError } = await supabase
      .from('cup_teams')
      .insert({
        cup_id: cupId,
        cup_team_id: newTeam.id
      })

    if (cupTeamsError) {
      setError(cupTeamsError.message)
    } else {
      setSuccess(`Team "${newTeamForm.name}" added successfully`)
      setNewTeamForm({
        name: '',
        short_name: '',
        logo_url: '',
        stadium: '',
        city: '',
        coach: ''
      })
      setShowAddTeam(false)
      fetchCupData()
    }
  }

  const updateTeam = async () => {
    if (!editTeamForm || !editTeamForm.name.trim()) {
      setError('Please enter a team name')
      return
    }

    const { error: updateError } = await supabase
      .from('cup_teams_registry')
      .update({
        name: editTeamForm.name.trim(),
        short_name: editTeamForm.short_name?.trim() || null,
        logo_url: editTeamForm.logo_url?.trim() || null,
        stadium: editTeamForm.stadium?.trim() || null,
        city: editTeamForm.city?.trim() || null,
        coach: editTeamForm.coach?.trim() || null
      })
      .eq('id', editTeamForm.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(`Team "${editTeamForm.name}" updated successfully`)
      setEditingTeam(null)
      setEditTeamForm(null)
      fetchCupData()
    }
  }

  const removeTeamFromCup = async (cupTeamId: string, teamName: string) => {
    if (!confirm(`Remove ${teamName} from this cup?`)) return

    const { error: deleteError } = await supabase
      .from('cup_teams')
      .delete()
      .eq('id', cupTeamId)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setSuccess('Team removed successfully')
      fetchCupData()
    }
  }

  const generateGroups = async () => {
    if (cupTeams.length < cup!.total_teams) {
      setError(`Please add all ${cup!.total_teams} teams before generating groups`)
      return
    }

    if (!confirm('Auto-generate groups? This will randomly assign teams to groups.')) return

    // Delete existing groups
    await supabase.from('cup_groups').delete().eq('cup_id', cupId)

    // Calculate number of groups
    const numberOfGroups = Math.ceil(cupTeams.length / cup!.teams_per_group)

    // Create groups
    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const createdGroups = []

    for (let i = 0; i < numberOfGroups; i++) {
      const { data: newGroup } = await supabase
        .from('cup_groups')
        .insert({
          cup_id: cupId,
          group_name: `Group ${groupNames[i]}`,
          group_order: i + 1
        })
        .select()
        .single()

      if (newGroup) createdGroups.push(newGroup)
    }

    // Shuffle teams randomly
    const shuffled = [...cupTeams].sort(() => Math.random() - 0.5)

    // Assign teams to groups
    for (let i = 0; i < shuffled.length; i++) {
      const groupIndex = i % createdGroups.length
      await supabase
        .from('cup_teams')
        .update({ group_id: createdGroups[groupIndex].id })
        .eq('id', shuffled[i].cup_team_id)
    }

    setSuccess('Groups auto-generated successfully!')
    fetchCupData()
  }

  const createManualGroup = async () => {
    if (!manualGroupName.trim()) {
      setError('Please enter a group name')
      return
    }

    if (selectedTeamsForGroup.length === 0) {
      setError('Please select at least one team for the group')
      return
    }

    // Create the group
    const { data: newGroup, error: groupError } = await supabase
      .from('cup_groups')
      .insert({
        cup_id: cupId,
        group_name: manualGroupName.trim(),
        group_order: groups.length + 1
      })
      .select()
      .single()

    if (groupError) {
      setError(groupError.message)
      return
    }

    // Assign selected teams to the group
    for (const teamId of selectedTeamsForGroup) {
      await supabase
        .from('cup_teams')
        .update({ group_id: newGroup.id })
        .eq('id', teamId)
    }

    setSuccess(`Group "${manualGroupName}" created with ${selectedTeamsForGroup.length} teams!`)
    setManualGroupName('')
    setSelectedTeamsForGroup([])
    setShowManualGrouping(false)
    fetchCupData()
  }

  const deleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Delete ${groupName}? Teams will be unassigned from this group.`)) return

    // Unassign teams from group
    await supabase
      .from('cup_teams')
      .update({ group_id: null })
      .eq('group_id', groupId)

    // Delete group
    const { error } = await supabase
      .from('cup_groups')
      .delete()
      .eq('id', groupId)

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Group deleted successfully')
      fetchCupData()
    }
  }

  const generateGroupFixtures = async () => {
    if (groups.length === 0) {
      setError('Please generate groups first')
      return
    }

    if (!confirm('Generate fixtures for group stage? This will create round-robin matches for each group.')) return

    try {
      // Delete existing group stage matches
      const { error: deleteError } = await supabase
        .from('cup_matches')
        .delete()
        .eq('cup_id', cupId)
        .eq('stage', 'group')

      if (deleteError) {
        console.error('Delete error:', deleteError)
        setError(`Failed to delete existing fixtures: ${deleteError.message}`)
        return
      }

      // Generate round-robin fixtures for each group
      for (const group of groups) {
        const teams = group.teams

        if (teams.length < 2) {
          console.warn(`Group ${group.group_name} has less than 2 teams, skipping`)
          continue
        }

        // Round-robin algorithm
        for (let i = 0; i < teams.length; i++) {
          for (let j = i + 1; j < teams.length; j++) {
            const { error: insertError } = await supabase
              .from('cup_matches')
              .insert({
                cup_id: cupId,
                group_id: group.id,
                home_cup_team_id: teams[i].id,
                away_cup_team_id: teams[j].id,
                stage: 'group',
                status: 'scheduled'
              })

            if (insertError) {
              console.error('Insert error:', insertError)
              setError(`Failed to create fixture: ${insertError.message}`)
              return
            }
          }
        }
      }

      setSuccess('Group stage fixtures generated successfully!')
      fetchCupData()
    } catch (err: any) {
      console.error('Generation error:', err)
      setError(`Failed to generate fixtures: ${err.message}`)
    }
  }

  const createManualFixture = async () => {
    if (!newFixtureForm.home_team_id || !newFixtureForm.away_team_id) {
      setError('Please select both home and away teams')
      return
    }

    if (newFixtureForm.home_team_id === newFixtureForm.away_team_id) {
      setError('Home and away teams must be different')
      return
    }

    try {
      const { error: insertError } = await supabase
        .from('cup_matches')
        .insert({
          cup_id: cupId,
          group_id: newFixtureForm.group_id || null,
          home_cup_team_id: newFixtureForm.home_team_id,
          away_cup_team_id: newFixtureForm.away_team_id,
          match_date: newFixtureForm.match_date || null,
          venue: newFixtureForm.venue || null,
          stage: newFixtureForm.group_id ? 'group' : 'round_of_16',
          status: 'scheduled'
        })

      if (insertError) {
        setError(`Failed to create fixture: ${insertError.message}`)
        return
      }

      setSuccess('Fixture created successfully!')
      setNewFixtureForm({
        home_team_id: '',
        away_team_id: '',
        group_id: '',
        match_date: '',
        venue: ''
      })
      setShowAddFixture(false)
      fetchCupData()
    } catch (err: any) {
      setError(`Failed to create fixture: ${err.message}`)
    }
  }

  const recalculateStandings = async (groupId?: string) => {
    try {
      // Get all completed matches for this cup (or specific group)
      let query = supabase
        .from('cup_matches')
        .select('*')
        .eq('cup_id', cupId)
        .eq('status', 'completed')

      if (groupId) {
        query = query.eq('group_id', groupId)
      }

      const { data: completedMatches } = await query

      if (!completedMatches || completedMatches.length === 0) return

      // Get all teams in this cup
      const { data: teamsData } = await supabase
        .from('cup_teams')
        .select('id, cup_team_id, group_id')
        .eq('cup_id', cupId)

      if (!teamsData) return

      // Calculate stats for each team
      const teamStats: Record<string, any> = {}

      teamsData.forEach(team => {
        teamStats[team.cup_team_id] = {
          id: team.id,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0
        }
      })

      // Process each completed match
      completedMatches.forEach(match => {
        const homeTeamId = match.home_cup_team_id
        const awayTeamId = match.away_cup_team_id
        const homeScore = match.home_score || 0
        const awayScore = match.away_score || 0

        if (teamStats[homeTeamId]) {
          teamStats[homeTeamId].played++
          teamStats[homeTeamId].goals_for += homeScore
          teamStats[homeTeamId].goals_against += awayScore

          if (homeScore > awayScore) {
            teamStats[homeTeamId].won++
            teamStats[homeTeamId].points += 3
          } else if (homeScore === awayScore) {
            teamStats[homeTeamId].drawn++
            teamStats[homeTeamId].points += 1
          } else {
            teamStats[homeTeamId].lost++
          }
        }

        if (teamStats[awayTeamId]) {
          teamStats[awayTeamId].played++
          teamStats[awayTeamId].goals_for += awayScore
          teamStats[awayTeamId].goals_against += homeScore

          if (awayScore > homeScore) {
            teamStats[awayTeamId].won++
            teamStats[awayTeamId].points += 3
          } else if (awayScore === homeScore) {
            teamStats[awayTeamId].drawn++
            teamStats[awayTeamId].points += 1
          } else {
            teamStats[awayTeamId].lost++
          }
        }
      })

      // Update each team's stats in the database
      for (const [teamId, stats] of Object.entries(teamStats)) {
        stats.goal_difference = stats.goals_for - stats.goals_against

        await supabase
          .from('cup_teams')
          .update({
            played: stats.played,
            won: stats.won,
            drawn: stats.drawn,
            lost: stats.lost,
            goals_for: stats.goals_for,
            goals_against: stats.goals_against,
            goal_difference: stats.goal_difference,
            points: stats.points
          })
          .eq('id', stats.id)
      }
    } catch (err: any) {
      console.error('Failed to recalculate standings:', err)
    }
  }

  const updateMatch = async () => {
    if (!editMatchForm) return

    try {
      const updateData: any = {
        match_date: editMatchForm.match_date || null,
        venue: editMatchForm.venue || null,
        status: editMatchForm.status
      }

      // Add scores if match is completed or live
      if (editMatchForm.status === 'completed' || editMatchForm.status === 'live') {
        updateData.home_score = parseInt(editMatchForm.home_score) || 0
        updateData.away_score = parseInt(editMatchForm.away_score) || 0
      }

      const { error: updateError } = await supabase
        .from('cup_matches')
        .update(updateData)
        .eq('id', editMatchForm.id)

      if (updateError) {
        setError(`Failed to update match: ${updateError.message}`)
        return
      }

      // Recalculate standings if match is completed
      if (editMatchForm.status === 'completed') {
        await recalculateStandings()
      }

      setSuccess('Match updated successfully! Standings recalculated.')
      setEditingMatchId(null)
      setEditMatchForm(null)
      fetchCupData()
    } catch (err: any) {
      setError(`Failed to update match: ${err.message}`)
    }
  }

  const deleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this fixture?')) return

    try {
      const { error: deleteError } = await supabase
        .from('cup_matches')
        .delete()
        .eq('id', matchId)

      if (deleteError) {
        setError(`Failed to delete match: ${deleteError.message}`)
        return
      }

      setSuccess('Match deleted successfully!')
      fetchCupData()
    } catch (err: any) {
      setError(`Failed to delete match: ${err.message}`)
    }
  }

  const updateCupStatus = async (newStatus: Cup['status']) => {
    const { error: updateError } = await supabase
      .from('cups')
      .update({ status: newStatus })
      .eq('id', cupId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(`Cup status updated to ${newStatus}`)
      fetchCupData()
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-xl">Loading...</div>
    </div>
  }

  if (!cup) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Cup Not Found</h2>
        <button
          onClick={() => router.push('/admin/cups')}
          className="text-liberia-blue hover:underline"
        >
          Back to Cups
        </button>
      </div>
    </div>
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'teams', label: `Teams (${cupTeams.length}/${cup.total_teams})` },
    { id: 'players', label: 'Players' },
    { id: 'groups', label: `Groups (${groups.length})` },
    { id: 'fixtures', label: `Fixtures (${matches.filter(m => m.stage === 'group').length})` },
    { id: 'knockout', label: 'Knockout' },
    { id: 'standings', label: 'Standings' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-start mb-4">
            <button
              onClick={() => router.push('/admin/cups')}
              className="text-blue-100 hover:text-white flex items-center"
            >
              ← Back to Cups
            </button>
            <LogoutButton />
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{cup.name}</h1>
              <p className="text-blue-100">
                {cup.season && `${cup.season} • `}
                {cupTeams.length} / {cup.total_teams} teams • Status: {cup.status.replace('_', ' ')}
              </p>
            </div>
            <div className="flex gap-2">
              {cup.status === 'draft' && cupTeams.length === cup.total_teams && (
                <button
                  onClick={() => updateCupStatus('group_stage')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Start Group Stage
                </button>
              )}
              {cup.status === 'group_stage' && (
                <button
                  onClick={() => updateCupStatus('knockout')}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Start Knockout Stage
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-semibold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'border-b-4 border-liberia-red text-liberia-blue'
                    : 'text-gray-600 hover:text-liberia-blue'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Cup Information</h2>
              <div className="space-y-3">
                <div>
                  <span className="font-semibold">Name:</span> {cup.name}
                </div>
                {cup.description && (
                  <div>
                    <span className="font-semibold">Description:</span> {cup.description}
                  </div>
                )}
                {cup.season && (
                  <div>
                    <span className="font-semibold">Season:</span> {cup.season}
                  </div>
                )}
                <div>
                  <span className="font-semibold">Total Teams:</span> {cup.total_teams}
                </div>
                <div>
                  <span className="font-semibold">Teams per Group:</span> {cup.teams_per_group}
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{' '}
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                    {cup.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('teams')}
                  className="w-full bg-liberia-blue hover:bg-liberia-blue-dark text-white font-bold py-3 px-4 rounded-lg transition text-left"
                  disabled={cupTeams.length >= cup.total_teams}
                >
                  {cupTeams.length >= cup.total_teams ? '✓ All Teams Added' : '+ Add Teams'}
                </button>
                <button
                  onClick={generateGroups}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition text-left"
                  disabled={cupTeams.length < cup.total_teams || groups.length > 0}
                >
                  {groups.length > 0 ? '✓ Groups Generated' : 'Generate Groups'}
                </button>
                <button
                  onClick={generateGroupFixtures}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg transition text-left"
                  disabled={groups.length === 0}
                >
                  Generate Group Fixtures
                </button>
                <button
                  onClick={() => setActiveTab('fixtures')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition text-left"
                >
                  View & Manage Fixtures
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Teams in Cup</h2>
                {cupTeams.length < cup.total_teams && (
                  <button
                    onClick={() => setShowAddTeam(!showAddTeam)}
                    className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    {showAddTeam ? 'Cancel' : '+ Add Team'}
                  </button>
                )}
              </div>

              {showAddTeam && (
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h3 className="font-semibold mb-4 text-lg">Create New Team for Cup</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newTeamForm.name}
                        onChange={(e) => setNewTeamForm({...newTeamForm, name: e.target.value})}
                        placeholder="e.g., Monrovia United"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Short Name
                      </label>
                      <input
                        type="text"
                        value={newTeamForm.short_name}
                        onChange={(e) => setNewTeamForm({...newTeamForm, short_name: e.target.value})}
                        placeholder="e.g., MON"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stadium
                      </label>
                      <input
                        type="text"
                        value={newTeamForm.stadium}
                        onChange={(e) => setNewTeamForm({...newTeamForm, stadium: e.target.value})}
                        placeholder="e.g., Samuel Kanyon Doe Stadium"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={newTeamForm.city}
                        onChange={(e) => setNewTeamForm({...newTeamForm, city: e.target.value})}
                        placeholder="e.g., Monrovia"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Coach
                      </label>
                      <input
                        type="text"
                        value={newTeamForm.coach}
                        onChange={(e) => setNewTeamForm({...newTeamForm, coach: e.target.value})}
                        placeholder="e.g., John Doe"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Logo URL
                      </label>
                      <input
                        type="url"
                        value={newTeamForm.logo_url}
                        onChange={(e) => setNewTeamForm({...newTeamForm, logo_url: e.target.value})}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={addTeamToCup}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition"
                    >
                      Create & Add Team
                    </button>
                    <button
                      onClick={() => {
                        setShowAddTeam(false)
                        setNewTeamForm({name: '', short_name: '', logo_url: '', stadium: '', city: '', coach: ''})
                      }}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {cupTeams.map((team) => (
                  <div key={team.cup_team_id}>
                    {editingTeam === team.id ? (
                      // Edit Mode
                      <div className="bg-blue-50 p-6 rounded-lg border-2 border-liberia-blue">
                        <h3 className="font-semibold mb-4 text-lg">Edit Team Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Team Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={editTeamForm?.name || ''}
                              onChange={(e) => setEditTeamForm(editTeamForm ? {...editTeamForm, name: e.target.value} : null)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Short Name
                            </label>
                            <input
                              type="text"
                              value={editTeamForm?.short_name || ''}
                              onChange={(e) => setEditTeamForm(editTeamForm ? {...editTeamForm, short_name: e.target.value} : null)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Stadium
                            </label>
                            <input
                              type="text"
                              value={editTeamForm?.stadium || ''}
                              onChange={(e) => setEditTeamForm(editTeamForm ? {...editTeamForm, stadium: e.target.value} : null)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              City
                            </label>
                            <input
                              type="text"
                              value={editTeamForm?.city || ''}
                              onChange={(e) => setEditTeamForm(editTeamForm ? {...editTeamForm, city: e.target.value} : null)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Coach
                            </label>
                            <input
                              type="text"
                              value={editTeamForm?.coach || ''}
                              onChange={(e) => setEditTeamForm(editTeamForm ? {...editTeamForm, coach: e.target.value} : null)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Logo URL
                            </label>
                            <input
                              type="url"
                              value={editTeamForm?.logo_url || ''}
                              onChange={(e) => setEditTeamForm(editTeamForm ? {...editTeamForm, logo_url: e.target.value} : null)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={updateTeam}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => {
                              setEditingTeam(null)
                              setEditTeamForm(null)
                            }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Team Logo */}
                          {team.logo_url ? (
                            <img
                              src={team.logo_url}
                              alt={team.name}
                              className="w-12 h-12 object-contain rounded"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-500 font-bold text-lg">
                              {team.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}

                          {/* Team Info */}
                          <div className="flex-1">
                            <div className="font-semibold text-lg">{team.name}</div>
                            <div className="text-sm text-gray-600 space-y-0.5">
                              {team.short_name && <div>Short: {team.short_name}</div>}
                              {team.stadium && <div>🏟️ {team.stadium}</div>}
                              {team.city && <div>📍 {team.city}</div>}
                              {team.coach && <div>👤 Coach: {team.coach}</div>}
                              {team.group_name && <div className="font-medium text-liberia-blue mt-1">{team.group_name}</div>}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingTeam(team.id)
                              setEditTeamForm(team)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => removeTeamFromCup(team.cup_team_id, team.name)}
                            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Player Registration</h2>
            <p className="text-gray-600 mb-6">Register players for each team in the cup competition</p>

            <div className="text-center text-gray-500 py-12">
              <p className="text-lg mb-4">Player registration feature coming soon...</p>
              <p className="text-sm">Teams will be able to register specific players for cup matches</p>
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Cup Groups</h2>
                <div className="flex gap-2">
                  {cupTeams.length >= cup.teams_per_group && (
                    <>
                      <button
                        onClick={() => setShowManualGrouping(!showManualGrouping)}
                        className="bg-liberia-blue hover:bg-liberia-blue-dark text-white font-bold py-2 px-4 rounded-lg transition"
                      >
                        {showManualGrouping ? 'Cancel' : '+ Manual Group'}
                      </button>
                      {groups.length === 0 && cupTeams.length === cup.total_teams && (
                        <button
                          onClick={generateGroups}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition"
                        >
                          🎲 Auto-Generate
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Manual Group Creation Form */}
              {showManualGrouping && (
                <div className="bg-blue-50 p-6 rounded-lg mb-6">
                  <h3 className="font-semibold mb-4 text-lg">Create Group Manually</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Group Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualGroupName}
                        onChange={(e) => setManualGroupName(e.target.value)}
                        placeholder="e.g., Group A, Pool 1, etc."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Teams <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                        {cupTeams.filter(t => !t.group_id).map(team => (
                          <label key={team.cup_team_id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={selectedTeamsForGroup.includes(team.cup_team_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTeamsForGroup([...selectedTeamsForGroup, team.cup_team_id])
                                } else {
                                  setSelectedTeamsForGroup(selectedTeamsForGroup.filter(id => id !== team.cup_team_id))
                                }
                              }}
                              className="w-4 h-4 text-liberia-blue focus:ring-liberia-blue border-gray-300 rounded"
                            />
                            <span className="text-sm">{team.name}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedTeamsForGroup.length} team(s) selected
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={createManualGroup}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition"
                      >
                        Create Group
                      </button>
                      <button
                        onClick={() => {
                          setShowManualGrouping(false)
                          setManualGroupName('')
                          setSelectedTeamsForGroup([])
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {groups.length === 0 && !showManualGrouping ? (
                <div className="text-center text-gray-500 py-12">
                  <p className="text-lg mb-4">No groups created yet</p>
                  <p className="text-sm">
                    {cupTeams.length < cup.teams_per_group
                      ? `Add at least ${cup.teams_per_group} teams to create groups`
                      : 'Use Auto-Generate for random groups or Manual Group for custom grouping'}
                  </p>
                </div>
              ) : groups.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groups.map(group => (
                    <div key={group.id} className="border rounded-lg p-4 relative">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-bold text-liberia-blue">{group.group_name}</h3>
                        <button
                          onClick={() => deleteGroup(group.id, group.group_name)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          title="Delete group"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="space-y-2">
                        {group.teams.length > 0 ? (
                          group.teams.map(team => (
                            <div key={team.id} className="text-sm flex items-center gap-2">
                              {team.logo_url ? (
                                <img src={team.logo_url} alt={team.name} className="w-6 h-6 object-contain" />
                              ) : (
                                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                                  {team.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span>{team.name}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400 italic">No teams assigned</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Fixtures Tab */}
        {activeTab === 'fixtures' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Group Stage Fixtures</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddFixture(!showAddFixture)}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  {showAddFixture ? 'Cancel' : '+ Add Fixture'}
                </button>
                {groups.length > 0 && matches.filter(m => m.stage === 'group').length === 0 && (
                  <button
                    onClick={generateGroupFixtures}
                    className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    🎲 Auto-Generate
                  </button>
                )}
              </div>
            </div>

            {/* Manual Fixture Creation Form */}
            {showAddFixture && (
              <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-bold mb-4">Create New Fixture</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Home Team *
                    </label>
                    <select
                      value={newFixtureForm.home_team_id}
                      onChange={(e) => setNewFixtureForm({...newFixtureForm, home_team_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue"
                    >
                      <option value="">Select home team</option>
                      {cupTeams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Away Team *
                    </label>
                    <select
                      value={newFixtureForm.away_team_id}
                      onChange={(e) => setNewFixtureForm({...newFixtureForm, away_team_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue"
                    >
                      <option value="">Select away team</option>
                      {cupTeams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Group (Optional)
                    </label>
                    <select
                      value={newFixtureForm.group_id}
                      onChange={(e) => setNewFixtureForm({...newFixtureForm, group_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue"
                    >
                      <option value="">No group (Knockout)</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.group_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Match Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={newFixtureForm.match_date}
                      onChange={(e) => setNewFixtureForm({...newFixtureForm, match_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Venue (Optional)
                    </label>
                    <input
                      type="text"
                      value={newFixtureForm.venue}
                      onChange={(e) => setNewFixtureForm({...newFixtureForm, venue: e.target.value})}
                      placeholder="e.g., Samuel Kanyon Doe Sports Complex"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={createManualFixture}
                    className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded-lg transition"
                  >
                    Create Fixture
                  </button>
                  <button
                    onClick={() => {
                      setShowAddFixture(false)
                      setNewFixtureForm({
                        home_team_id: '',
                        away_team_id: '',
                        group_id: '',
                        match_date: '',
                        venue: ''
                      })
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {matches.filter(m => m.stage === 'group').length === 0 && !showAddFixture ? (
              <div className="text-center text-gray-500 py-12">
                <p className="text-lg mb-4">No fixtures created yet</p>
                <p className="text-sm">Use "+ Add Fixture" to create manually or "🎲 Auto-Generate" for round-robin matches</p>
              </div>
            ) : matches.filter(m => m.stage === 'group').length > 0 && (
              <div className="space-y-6">
                {groups.map(group => {
                  const groupMatches = matches.filter(m => m.group_id === group.id)
                  if (groupMatches.length === 0) return null
                  return (
                    <div key={group.id}>
                      <h3 className="text-xl font-bold mb-3 text-liberia-blue">{group.group_name}</h3>
                      <div className="space-y-2">
                        {groupMatches.map(match => (
                          <div key={match.id}>
                            {editingMatchId === match.id ? (
                              // Edit Mode
                              <div className="bg-blue-50 p-4 border-2 border-liberia-blue rounded-lg">
                                <h4 className="font-bold mb-3">Edit Match</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Home Score</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={editMatchForm?.home_score ?? ''}
                                      onChange={(e) => setEditMatchForm({...editMatchForm, home_score: e.target.value})}
                                      className="w-full px-3 py-2 border rounded-lg"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Away Score</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={editMatchForm?.away_score ?? ''}
                                      onChange={(e) => setEditMatchForm({...editMatchForm, away_score: e.target.value})}
                                      className="w-full px-3 py-2 border rounded-lg"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Status</label>
                                    <select
                                      value={editMatchForm?.status}
                                      onChange={(e) => setEditMatchForm({...editMatchForm, status: e.target.value})}
                                      className="w-full px-3 py-2 border rounded-lg"
                                    >
                                      <option value="scheduled">Scheduled</option>
                                      <option value="live">Live</option>
                                      <option value="completed">Completed</option>
                                      <option value="postponed">Postponed</option>
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Match Date</label>
                                    <input
                                      type="datetime-local"
                                      value={editMatchForm?.match_date ? new Date(editMatchForm.match_date).toISOString().slice(0, 16) : ''}
                                      onChange={(e) => setEditMatchForm({...editMatchForm, match_date: e.target.value})}
                                      className="w-full px-3 py-2 border rounded-lg"
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Venue</label>
                                    <input
                                      type="text"
                                      value={editMatchForm?.venue ?? ''}
                                      onChange={(e) => setEditMatchForm({...editMatchForm, venue: e.target.value})}
                                      className="w-full px-3 py-2 border rounded-lg"
                                      placeholder="Stadium name"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={updateMatch}
                                    className="bg-liberia-red hover:bg-liberia-blue text-white px-4 py-2 rounded-lg font-semibold"
                                  >
                                    Save Changes
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingMatchId(null)
                                      setEditMatchForm(null)
                                    }}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-semibold"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => deleteMatch(match.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold ml-auto"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // View Mode
                              <div className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                                <div className="flex-1">
                                  <span className="font-semibold">{match.home_team_name}</span>
                                  {match.status === 'completed' && match.home_score !== null && (
                                    <span className="mx-2 text-liberia-red font-bold">
                                      {match.home_score} - {match.away_score}
                                    </span>
                                  )}
                                  {match.status !== 'completed' && <span className="mx-2">vs</span>}
                                  <span className="font-semibold">{match.away_team_name}</span>
                                  {match.match_date && (
                                    <span className="ml-3 text-xs text-gray-500">
                                      {new Date(match.match_date).toLocaleDateString()} {new Date(match.match_date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                    </span>
                                  )}
                                  {match.venue && (
                                    <span className="ml-2 text-xs text-gray-500">📍 {match.venue}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    match.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    match.status === 'live' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {match.status}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingMatchId(match.id)
                                      setEditMatchForm({
                                        id: match.id,
                                        home_score: match.home_score ?? '',
                                        away_score: match.away_score ?? '',
                                        status: match.status,
                                        match_date: match.match_date,
                                        venue: match.venue ?? ''
                                      })
                                    }}
                                    className="text-liberia-blue hover:underline text-sm font-semibold"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Knockout Tab */}
        {activeTab === 'knockout' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Knockout Stage</h2>
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg mb-4">Knockout stage feature coming soon...</p>
              <p className="text-sm">Bracket generation and knockout matches will be available here</p>
            </div>
          </div>
        )}

        {/* Standings Tab */}
        {activeTab === 'standings' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Group Standings</h2>
              <button
                onClick={async () => {
                  await recalculateStandings()
                  setSuccess('Standings recalculated successfully!')
                  fetchCupData()
                }}
                className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-4 rounded-lg transition"
              >
                🔄 Recalculate Standings
              </button>
            </div>

            {groups.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <p className="text-lg mb-4">No standings available yet</p>
                <p className="text-sm">Generate groups and play matches to see standings</p>
              </div>
            ) : (
              <div className="space-y-8">
                {groups.map(group => (
                  <div key={group.id}>
                    <h3 className="text-xl font-bold mb-3 text-liberia-blue">{group.group_name}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Pos</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Team</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">P</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">W</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">D</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">L</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">GF</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">GA</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">GD</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.teams
                            .sort((a, b) => {
                              if (b.points !== a.points) return b.points - a.points
                              if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
                              return b.goals_for - a.goals_for
                            })
                            .map((team, index) => (
                              <tr key={team.id} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-3 text-center font-semibold">{index + 1}</td>
                                <td className="px-4 py-3 font-semibold">{team.name}</td>
                                <td className="px-4 py-3 text-center">{team.played}</td>
                                <td className="px-4 py-3 text-center">{team.won}</td>
                                <td className="px-4 py-3 text-center">{team.drawn}</td>
                                <td className="px-4 py-3 text-center">{team.lost}</td>
                                <td className="px-4 py-3 text-center">{team.goals_for}</td>
                                <td className="px-4 py-3 text-center">{team.goals_against}</td>
                                <td className="px-4 py-3 text-center font-semibold">{team.goal_difference}</td>
                                <td className="px-4 py-3 text-center font-bold text-liberia-blue">{team.points}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
