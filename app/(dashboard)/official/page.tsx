'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Match } from '@/lib/types/database.types'

export default function MatchOfficialDashboard() {
  const [assignedMatches, setAssignedMatches] = useState<Match[]>([])
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [completedMatches, setCompletedMatches] = useState<Match[]>([])
  const [stats, setStats] = useState({
    total_assigned: 0,
    upcoming: 0,
    completed: 0,
    today: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchOfficialData()
  }, [])

  const fetchOfficialData = async () => {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push('/login')
      return
    }

    // Fetch all matches assigned to this official
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        *,
        division:divisions(
          *,
          league:leagues(name)
        ),
        home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
      `)
      .eq('referee_id', userData.user.id)
      .order('match_date', { ascending: true })

    if (matchesData) {
      setAssignedMatches(matchesData as Match[])

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const upcoming = (matchesData as Match[]).filter(m =>
        ['scheduled', 'live'].includes(m.status) && new Date(m.match_date) >= now
      )
      const completed = (matchesData as Match[]).filter(m => m.status === 'completed')
      const todayMatches = (matchesData as Match[]).filter(m => {
        const matchDate = new Date(m.match_date)
        const matchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate())
        return matchDay.getTime() === today.getTime()
      })

      setUpcomingMatches(upcoming)
      setCompletedMatches(completed)
      setStats({
        total_assigned: matchesData.length,
        upcoming: upcoming.length,
        completed: completed.length,
        today: todayMatches.length
      })
    }

    setLoading(false)
  }

  const startMatch = async (matchId: string) => {
    const { error } = await supabase
      .from('matches')
      .update({ status: 'live' })
      .eq('id', matchId)

    if (!error) {
      router.push(`/official/matches/${matchId}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Match Official Dashboard</h1>
          <p className="text-blue-100">Your assigned matches</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Total Assigned</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total_assigned}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Upcoming</div>
            <div className="text-3xl font-bold text-blue-600">{stats.upcoming}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Completed</div>
            <div className="text-3xl font-bold text-liberia-red">{stats.completed}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Today</div>
            <div className="text-3xl font-bold text-orange-600">{stats.today}</div>
          </div>
        </div>

        {/* Upcoming Matches */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">Upcoming Matches</h2>
          </div>
          <div className="p-6">
            {upcomingMatches.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No upcoming matches assigned
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingMatches.map((match: any) => (
                  <div key={match.id} className="border rounded-lg p-6 hover:shadow-lg transition">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          match.status === 'live'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {match.status === 'live' ? '🔴 LIVE' : 'Scheduled'}
                        </span>
                        <span className="text-sm text-gray-500">
                          Round {match.round_number}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(match.match_date).toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center mb-4">
                      <div className="text-center">
                        <div className="font-bold text-lg">{match.home_team?.name}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-400">VS</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg">{match.away_team?.name}</div>
                      </div>
                    </div>

                    {match.venue && (
                      <div className="text-center text-sm text-gray-600 mb-4">
                        📍 {match.venue}
                      </div>
                    )}

                    <div className="text-center text-sm text-gray-500 mb-4">
                      {match.division?.name} - {match.division?.league?.name}
                    </div>

                    <div className="flex gap-3 justify-center">
                      {match.status === 'scheduled' && (
                        <button
                          onClick={() => startMatch(match.id)}
                          className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded"
                        >
                          Start Match
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/official/matches/${match.id}`)}
                        className={`font-bold py-2 px-6 rounded ${
                          match.status === 'live'
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {match.status === 'live' ? 'Manage Live Match' : 'View Details'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Completed Matches */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">Recent Completed Matches</h2>
          </div>
          <div className="p-6">
            {completedMatches.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No completed matches yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Match
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Division
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {completedMatches.slice(0, 10).map((match: any) => (
                      <tr key={match.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">
                          {new Date(match.match_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">
                            {match.home_team?.name} vs {match.away_team?.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-bold text-lg">
                            {match.home_score} - {match.away_score}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {match.division?.name}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => router.push(`/official/matches/${match.id}`)}
                            className="text-liberia-red hover:text-liberia-red-dark font-medium"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
