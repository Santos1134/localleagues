'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { TeamWithDivision, Player, Match } from '@/lib/types/database.types'

export default function TeamManagerDashboard() {
  const [team, setTeam] = useState<TeamWithDivision | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [recentMatches, setRecentMatches] = useState<Match[]>([])
  const [stats, setStats] = useState({
    total_players: 0,
    active_players: 0,
    next_match: null as Match | null,
    recent_form: [] as string[]
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchManagerData()
  }, [])

  const fetchManagerData = async () => {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push('/login')
      return
    }

    // Fetch team managed by this user
    const { data: teamData } = await supabase
      .from('teams')
      .select(`
        *,
        division:divisions(
          *,
          league:leagues(*)
        )
      `)
      .eq('manager_id', userData.user.id)
      .single()

    if (!teamData) {
      setError('You are not assigned to manage any team')
      setLoading(false)
      return
    }

    setTeam(teamData as TeamWithDivision)

    // Fetch players
    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamData.id)
      .order('jersey_number')

    if (playersData) {
      setPlayers(playersData as Player[])
      setStats(prev => ({
        ...prev,
        total_players: playersData.length,
        active_players: playersData.filter(p => p.is_active).length
      }))
    }

    // Fetch upcoming matches
    const { data: upcomingData } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, logo_url),
        venue
      `)
      .or(`home_team_id.eq.${teamData.id},away_team_id.eq.${teamData.id}`)
      .in('status', ['scheduled', 'live'])
      .order('match_date', { ascending: true })
      .limit(5)

    if (upcomingData) {
      setUpcomingMatches(upcomingData as Match[])
      if (upcomingData.length > 0) {
        setStats(prev => ({ ...prev, next_match: upcomingData[0] as Match }))
      }
    }

    // Fetch recent matches
    const { data: recentData } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
      `)
      .or(`home_team_id.eq.${teamData.id},away_team_id.eq.${teamData.id}`)
      .eq('status', 'completed')
      .order('match_date', { ascending: false })
      .limit(5)

    if (recentData) {
      setRecentMatches(recentData as Match[])

      // Calculate form (W/D/L for last 5 matches)
      const form = recentData.map((match: any) => {
        const isHome = match.home_team_id === teamData.id
        const teamScore = isHome ? match.home_score : match.away_score
        const opponentScore = isHome ? match.away_score : match.home_score

        if (teamScore > opponentScore) return 'W'
        if (teamScore < opponentScore) return 'L'
        return 'D'
      })
      setStats(prev => ({ ...prev, recent_form: form }))
    }

    setLoading(false)
  }

  const getFormColor = (result: string) => {
    switch (result) {
      case 'W': return 'bg-liberia-red text-white'
      case 'D': return 'bg-yellow-500 text-white'
      case 'L': return 'bg-red-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-red-600 text-lg font-bold mb-4">{error}</div>
          <p className="text-gray-600">Please contact an administrator to assign you to a team.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            {team?.logo_url && (
              <img src={team.logo_url} alt={team.name} className="w-16 h-16 rounded-full bg-white p-2" />
            )}
            <div>
              <h1 className="text-3xl font-bold mb-2">{team?.name}</h1>
              <p className="text-blue-100">Team Manager Dashboard</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Total Players</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total_players}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Active Players</div>
            <div className="text-3xl font-bold text-liberia-red">{stats.active_players}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Division</div>
            <div className="text-lg font-bold text-gray-900">{team?.division?.name}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Recent Form</div>
            <div className="flex gap-1">
              {stats.recent_form.length > 0 ? stats.recent_form.map((result, idx) => (
                <div key={idx} className={`w-8 h-8 rounded flex items-center justify-center font-bold ${getFormColor(result)}`}>
                  {result}
                </div>
              )) : (
                <div className="text-gray-400 text-sm">No matches yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Next Match */}
        {stats.next_match && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Next Match</h2>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="font-bold text-lg">{(stats.next_match as any).home_team?.name}</div>
              </div>
              <div className="text-center px-8">
                <div className="text-2xl font-bold text-gray-400">VS</div>
                <div className="text-sm text-gray-500 mt-2">
                  {new Date(stats.next_match.match_date).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(stats.next_match.match_date).toLocaleTimeString()}
                </div>
              </div>
              <div className="text-center flex-1">
                <div className="font-bold text-lg">{(stats.next_match as any).away_team?.name}</div>
              </div>
            </div>
            {stats.next_match.venue && (
              <div className="text-center mt-4 text-sm text-gray-600">
                📍 {stats.next_match.venue}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Squad List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Squad</h2>
              <button
                onClick={() => router.push(`/manager/players`)}
                className="text-liberia-red hover:text-liberia-red-dark font-medium"
              >
                Manage Squad →
              </button>
            </div>
            <div className="p-6">
              {players.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No players in squad</div>
              ) : (
                <div className="space-y-3">
                  {players.slice(0, 10).map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {player.photo_url ? (
                            <img src={player.photo_url} alt={player.full_name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="text-lg">👤</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{player.full_name}</div>
                          <div className="text-sm text-gray-500 capitalize">{player.position}</div>
                        </div>
                      </div>
                      <div className="font-bold text-gray-600">#{player.jersey_number}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Matches */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold">Recent Matches</h2>
            </div>
            <div className="p-6">
              {recentMatches.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No matches played yet</div>
              ) : (
                <div className="space-y-4">
                  {recentMatches.map((match: any) => {
                    const isHome = match.home_team_id === team?.id
                    const teamScore = isHome ? match.home_score : match.away_score
                    const opponentScore = isHome ? match.away_score : match.home_score
                    const opponent = isHome ? match.away_team : match.home_team
                    const result = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'D'

                    return (
                      <div key={match.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className={`w-8 h-8 rounded flex items-center justify-center font-bold ${getFormColor(result)}`}>
                          {result}
                        </div>
                        <div className="flex-1 mx-4">
                          <div className="font-medium">vs {opponent.name}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(match.match_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="font-bold text-lg">
                          {teamScore} - {opponentScore}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
