'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Match {
  id: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled'
  match_date: string | null
  venue: string | null
  competition: string
  competition_type: 'league' | 'cup'
  competition_id: string
}

interface LiveScoreProps {
  autoRefresh?: boolean
  refreshInterval?: number
  showUpcoming?: boolean
  showRecent?: boolean
  limit?: number
}

export default function LiveScore({
  autoRefresh = true,
  refreshInterval = 30000,
  showUpcoming = true,
  showRecent = true,
  limit = 20
}: LiveScoreProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const supabase = createClient()

  const fetchMatches = async () => {
    // Fetch league matches
    const leagueQuery = supabase
      .from('matches')
      .select(`
        id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        status,
        match_date,
        venue,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name),
        division:divisions(id, name, league:leagues(id, name))
      `)

    // Build status filter
    const statuses = ['live']
    if (showUpcoming) statuses.push('scheduled')
    if (showRecent) statuses.push('completed')

    const { data: leagueMatches } = await leagueQuery
      .in('status', statuses)
      .order('match_date', { ascending: false })
      .limit(limit)

    // Fetch cup matches
    const { data: cupMatches } = await supabase
      .from('cup_matches')
      .select(`
        id,
        home_cup_team_id,
        away_cup_team_id,
        home_score,
        away_score,
        status,
        match_date,
        venue,
        home_team:cup_teams_registry!cup_matches_home_cup_team_id_fkey(name),
        away_team:cup_teams_registry!cup_matches_away_cup_team_id_fkey(name),
        cup:cups(id, name)
      `)
      .in('status', statuses)
      .order('match_date', { ascending: false })
      .limit(limit)

    // Format league matches
    const formattedLeagueMatches: Match[] = (leagueMatches || []).map((m: any) => ({
      id: m.id,
      home_team: m.home_team?.name || 'Unknown',
      away_team: m.away_team?.name || 'Unknown',
      home_score: m.home_score,
      away_score: m.away_score,
      status: m.status,
      match_date: m.match_date,
      venue: m.venue,
      competition: m.division?.league?.name || 'Unknown League',
      competition_type: 'league' as const,
      competition_id: m.division?.league?.id || ''
    }))

    // Format cup matches
    const formattedCupMatches: Match[] = (cupMatches || []).map((m: any) => ({
      id: m.id,
      home_team: m.home_team?.name || 'Unknown',
      away_team: m.away_team?.name || 'Unknown',
      home_score: m.home_score,
      away_score: m.away_score,
      status: m.status,
      match_date: m.match_date,
      venue: m.venue,
      competition: m.cup?.name || 'Unknown Cup',
      competition_type: 'cup' as const,
      competition_id: m.cup?.id || ''
    }))

    // Combine and sort by date (live first, then by date)
    const allMatches = [...formattedLeagueMatches, ...formattedCupMatches]
      .sort((a, b) => {
        // Live matches first
        if (a.status === 'live' && b.status !== 'live') return -1
        if (b.status === 'live' && a.status !== 'live') return 1

        // Then by date
        const dateA = a.match_date ? new Date(a.match_date).getTime() : 0
        const dateB = b.match_date ? new Date(b.match_date).getTime() : 0
        return dateB - dateA
      })
      .slice(0, limit)

    setMatches(allMatches)
    setLastUpdate(new Date())
    setLoading(false)
  }

  useEffect(() => {
    fetchMatches()

    if (autoRefresh) {
      const interval = setInterval(fetchMatches, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, showUpcoming, showRecent, limit])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-600 text-white animate-pulse'
      case 'completed':
        return 'bg-green-600 text-white'
      case 'scheduled':
        return 'bg-blue-600 text-white'
      case 'postponed':
        return 'bg-yellow-600 text-white'
      case 'cancelled':
        return 'bg-gray-600 text-white'
      default:
        return 'bg-gray-400 text-white'
    }
  }

  const formatMatchDate = (dateString: string | null) => {
    if (!dateString) return 'TBD'
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.abs(now.getTime() - date.getTime()) / 36e5

    if (diffHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liberia-blue"></div>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-lg">No matches available at the moment</p>
        <p className="text-sm mt-2">Check back later for live scores and upcoming fixtures</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with last update time */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-liberia-blue">Live Scores</h2>
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
          {autoRefresh && (
            <span className="ml-2 inline-flex items-center">
              <span className="animate-pulse h-2 w-2 rounded-full bg-green-500 mr-1"></span>
              Auto-refresh
            </span>
          )}
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid gap-4">
        {matches.map((match) => (
          <div
            key={match.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200"
          >
            {/* Competition Header */}
            <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-700">
                  {match.competition}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(match.status)}`}>
                  {match.status.toUpperCase()}
                </span>
              </div>
              {match.match_date && (
                <span className="text-xs text-gray-500">
                  {formatMatchDate(match.match_date)}
                </span>
              )}
            </div>

            {/* Match Content */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                {/* Home Team */}
                <div className="flex-1 text-right">
                  <p className="font-semibold text-lg">{match.home_team}</p>
                </div>

                {/* Score */}
                <div className="mx-6 flex items-center space-x-2">
                  {match.status === 'live' || match.status === 'completed' ? (
                    <>
                      <span className="text-3xl font-bold text-liberia-blue">
                        {match.home_score ?? '-'}
                      </span>
                      <span className="text-2xl text-gray-400">:</span>
                      <span className="text-3xl font-bold text-liberia-blue">
                        {match.away_score ?? '-'}
                      </span>
                    </>
                  ) : (
                    <span className="text-xl text-gray-400 font-semibold">VS</span>
                  )}
                </div>

                {/* Away Team */}
                <div className="flex-1 text-left">
                  <p className="font-semibold text-lg">{match.away_team}</p>
                </div>
              </div>

              {/* Venue */}
              {match.venue && (
                <div className="mt-3 text-center text-sm text-gray-500">
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {match.venue}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <div className="text-center pt-4">
        <Link
          href="/fixtures"
          className="text-liberia-blue hover:text-liberia-red font-semibold inline-flex items-center"
        >
          View All Fixtures
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
