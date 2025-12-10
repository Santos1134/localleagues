'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { DivisionWithLeague, Team, Match, Profile } from '@/lib/types/database.types'
import LogoutButton from '@/components/admin/LogoutButton'

export default function MatchesManagementPage() {
  const [divisions, setDivisions] = useState<DivisionWithLeague[]>([])
  const [selectedDivision, setSelectedDivision] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [matchOfficials, setMatchOfficials] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showFixtureGenerator, setShowFixtureGenerator] = useState(false)
  const [formData, setFormData] = useState({
    home_team_id: '',
    away_team_id: '',
    match_date: '',
    match_time: '',
    venue: '',
    referee_id: '',
    round_number: 1
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchDivisions()
    fetchMatchOfficials()
  }, [])

  useEffect(() => {
    if (selectedDivision) {
      fetchTeamsAndMatches()
    }
  }, [selectedDivision])

  const fetchDivisions = async () => {
    const { data } = await supabase
      .from('divisions')
      .select(`
        *,
        league:leagues(name)
      `)
      .order('tier', { ascending: true })

    if (data) setDivisions(data as DivisionWithLeague[])
    setLoading(false)
  }

  const fetchMatchOfficials = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'match_official')
      .order('full_name')

    if (data) setMatchOfficials(data as Profile[])
  }

  const fetchTeamsAndMatches = async () => {
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .eq('division_id', selectedDivision)
      .order('name')

    if (teamsData) setTeams(teamsData as Team[])

    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(id, name, short_name),
        away_team:teams!matches_away_team_id_fkey(id, name, short_name),
        referee:profiles(full_name)
      `)
      .eq('division_id', selectedDivision)
      .order('match_date', { ascending: true })

    if (matchesData) setMatches(matchesData as Match[])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.home_team_id || !formData.away_team_id || !formData.match_date || !formData.match_time) {
      setError('Please fill in all required fields')
      return
    }

    if (formData.home_team_id === formData.away_team_id) {
      setError('Home and away teams must be different')
      return
    }

    const matchDateTime = new Date(`${formData.match_date}T${formData.match_time}`)

    const { error: insertError } = await supabase
      .from('matches')
      .insert({
        division_id: selectedDivision,
        home_team_id: formData.home_team_id,
        away_team_id: formData.away_team_id,
        match_date: matchDateTime.toISOString(),
        venue: formData.venue || null,
        referee_id: formData.referee_id || null,
        round_number: formData.round_number,
        status: 'scheduled'
      })

    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess('Match created successfully!')
      setFormData({
        home_team_id: '',
        away_team_id: '',
        match_date: '',
        match_time: '',
        venue: '',
        referee_id: '',
        round_number: 1
      })
      setShowForm(false)
      fetchTeamsAndMatches()
    }
  }

  const generateFixtures = async () => {
    if (teams.length < 2) {
      setError('Need at least 2 teams to generate fixtures')
      return
    }

    setError('')
    setSuccess('')

    // Round-robin algorithm
    const teamsList = [...teams]
    if (teamsList.length % 2 !== 0) {
      teamsList.push({ id: 'BYE', name: 'BYE' } as Team)
    }

    const numTeams = teamsList.length
    const numRounds = numTeams - 1
    const matchesPerRound = numTeams / 2

    const fixtures: any[] = []

    for (let round = 0; round < numRounds; round++) {
      for (let match = 0; match < matchesPerRound; match++) {
        const home = (round + match) % (numTeams - 1)
        const away = (numTeams - 1 - match + round) % (numTeams - 1)

        let homeTeamIndex: number
        let awayTeamIndex: number

        if (match === 0) {
          homeTeamIndex = home
          awayTeamIndex = numTeams - 1
        } else {
          homeTeamIndex = home
          awayTeamIndex = away
        }

        if (teamsList[homeTeamIndex].id !== 'BYE' && teamsList[awayTeamIndex].id !== 'BYE') {
          fixtures.push({
            division_id: selectedDivision,
            home_team_id: teamsList[homeTeamIndex].id,
            away_team_id: teamsList[awayTeamIndex].id,
            round_number: round + 1,
            status: 'scheduled',
            match_date: new Date(Date.now() + (round * 7 + match) * 24 * 60 * 60 * 1000).toISOString(),
            home_score: 0,
            away_score: 0
          })
        }
      }
    }

    const { error: insertError } = await supabase
      .from('matches')
      .insert(fixtures)

    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess(`Generated ${fixtures.length} fixtures successfully!`)
      setShowFixtureGenerator(false)
      fetchTeamsAndMatches()
    }
  }

  const deleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId)

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Match deleted successfully')
      fetchTeamsAndMatches()
    }
  }

  const deleteAllMatches = async () => {
    if (!selectedDivision) {
      setError('Please select a division first')
      return
    }

    if (!confirm('Are you sure you want to DELETE ALL matches in this division? This action cannot be undone!')) return

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('division_id', selectedDivision)

    if (error) {
      setError(error.message)
    } else {
      setSuccess('All matches deleted successfully')
      fetchTeamsAndMatches()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Match Management</h1>
              <p className="text-blue-100">Schedule and manage fixtures</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-blue-100 border border-liberia-blue text-liberia-blue px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Division
          </label>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
          >
            <option value="">Choose a division...</option>
            {divisions.map((div) => (
              <option key={div.id} value={div.id}>
                {div.name} - {div.league.name}
              </option>
            ))}
          </select>
        </div>

        {selectedDivision && (
          <>
            <div className="mb-6 flex gap-4 flex-wrap">
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded"
              >
                {showForm ? 'Cancel' : '+ Schedule Single Match'}
              </button>
              <button
                onClick={() => setShowFixtureGenerator(!showFixtureGenerator)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
              >
                {showFixtureGenerator ? 'Cancel' : 'Generate Full Fixtures'}
              </button>
              {matches.length > 0 && (
                <button
                  onClick={deleteAllMatches}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded"
                >
                  Delete All Matches
                </button>
              )}
            </div>

            {showFixtureGenerator && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">Generate Round-Robin Fixtures</h2>
                <p className="text-gray-600 mb-4">
                  This will automatically generate a complete round-robin schedule for all {teams.length} teams in this division.
                  Each team will play every other team once.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={generateFixtures}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
                  >
                    Generate Fixtures ({teams.length * (teams.length - 1) / 2} matches)
                  </button>
                  <button
                    onClick={() => setShowFixtureGenerator(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showForm && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">Schedule New Match</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Home Team *
                      </label>
                      <select
                        value={formData.home_team_id}
                        onChange={(e) => setFormData({ ...formData, home_team_id: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                        required
                      >
                        <option value="">Select home team</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Away Team *
                      </label>
                      <select
                        value={formData.away_team_id}
                        onChange={(e) => setFormData({ ...formData, away_team_id: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                        required
                      >
                        <option value="">Select away team</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Match Date *
                      </label>
                      <input
                        type="date"
                        value={formData.match_date}
                        onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Match Time *
                      </label>
                      <input
                        type="time"
                        value={formData.match_time}
                        onChange={(e) => setFormData({ ...formData, match_time: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Venue
                      </label>
                      <input
                        type="text"
                        value={formData.venue}
                        onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                        placeholder="e.g., SKD Stadium"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Match Official
                      </label>
                      <select
                        value={formData.referee_id}
                        onChange={(e) => setFormData({ ...formData, referee_id: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                      >
                        <option value="">Select official (optional)</option>
                        {matchOfficials.map((official) => (
                          <option key={official.id} value={official.id}>
                            {official.full_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Round Number
                      </label>
                      <input
                        type="number"
                        value={formData.round_number}
                        onChange={(e) => setFormData({ ...formData, round_number: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded"
                    >
                      Schedule Match
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-bold">Scheduled Matches</h2>
              </div>
              {matches.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  No matches scheduled yet. Create a match or generate fixtures.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Round
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Match
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Venue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {matches.map((match) => (
                        <tr key={match.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm">{match.round_number}</td>
                          <td className="px-6 py-4 text-sm">
                            {new Date(match.match_date).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium">
                              {(match as any).home_team?.name} vs {(match as any).away_team?.name}
                            </div>
                            {match.status === 'completed' && (
                              <div className="text-sm text-gray-500">
                                {match.home_score} - {match.away_score}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">{match.venue || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${
                              match.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                              match.status === 'live' ? 'bg-blue-100 text-liberia-red-dark' :
                              match.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {match.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => router.push(`/admin/matches/${match.id}`)}
                              className="text-liberia-red hover:text-liberia-red-dark mr-4"
                            >
                              Manage
                            </button>
                            <button
                              onClick={() => deleteMatch(match.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
