'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface Competition {
  id: string
  name: string
  type: 'league' | 'cup'
}

interface Scorer {
  id: string
  name: string
  team: string
  goals: number
  assists: number
  matches: number
  position: string | null
}

export default function TopScorers() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null)
  const [scorers, setScorers] = useState<Scorer[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'goals' | 'assists'>('goals')
  const supabase = createClient()

  useEffect(() => {
    fetchCompetitions()
  }, [])

  useEffect(() => {
    if (selectedCompetition) {
      fetchScorers()
    }
  }, [selectedCompetition, view])

  const fetchCompetitions = async () => {
    // Fetch leagues
    const { data: leagues } = await supabase
      .from('leagues')
      .select('id, name')
      .order('name')

    // Fetch cups
    const { data: cups } = await supabase
      .from('cups')
      .select('id, name')
      .order('name')

    const allCompetitions: Competition[] = [
      ...(leagues || []).map(l => ({ id: l.id, name: l.name, type: 'league' as const })),
      ...(cups || []).map(c => ({ id: c.id, name: c.name, type: 'cup' as const }))
    ]

    setCompetitions(allCompetitions)
    if (allCompetitions.length > 0) {
      setSelectedCompetition(allCompetitions[0])
    }
  }

  const fetchScorers = async () => {
    if (!selectedCompetition) return

    setLoading(true)
    let scorersData: Scorer[] = []

    if (selectedCompetition.type === 'league') {
      // Fetch league players
      const { data } = await supabase
        .from('players')
        .select(`
          id,
          name,
          goals,
          assists,
          position,
          team:teams(name),
          team_id
        `)
        .gt(view === 'goals' ? 'goals' : 'assists', 0)
        .order(view === 'goals' ? 'goals' : 'assists', { ascending: false })
        .order('assists', { ascending: false })
        .limit(20)

      if (data) {
        // Filter players whose teams are in this league
        const { data: leagueTeams } = await supabase
          .from('teams')
          .select('id, division:divisions(league_id)')
          .eq('divisions.league_id', selectedCompetition.id)

        const leagueTeamIds = new Set(leagueTeams?.map(t => t.id))

        scorersData = data
          .filter((p: any) => leagueTeamIds.has(p.team_id))
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            team: p.team?.name || 'Unknown',
            goals: p.goals || 0,
            assists: p.assists || 0,
            matches: 0, // TODO: Calculate from match appearances
            position: p.position
          }))
      }
    } else {
      // Fetch cup players
      const { data } = await supabase
        .from('cup_players_registry')
        .select(`
          id,
          name,
          goals,
          assists,
          position,
          cup_team:cup_teams_registry(name, cup_id)
        `)
        .eq('cup_team.cup_id', selectedCompetition.id)
        .gt(view === 'goals' ? 'goals' : 'assists', 0)
        .order(view === 'goals' ? 'goals' : 'assists', { ascending: false })
        .order('assists', { ascending: false })
        .limit(20)

      if (data) {
        scorersData = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          team: p.cup_team?.name || 'Unknown',
          goals: p.goals || 0,
          assists: p.assists || 0,
          matches: 0,
          position: p.position
        }))
      }
    }

    setScorers(scorersData)
    setLoading(false)
  }

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-400 text-yellow-900'
      case 1:
        return 'bg-gray-300 text-gray-900'
      case 2:
        return 'bg-orange-400 text-orange-900'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-liberia-blue">Top Scorers</h2>
          <p className="text-gray-600 text-sm mt-1">Leading goal scorers and assist providers</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('goals')}
              className={`px-4 py-2 rounded-md font-semibold transition ${
                view === 'goals'
                  ? 'bg-liberia-blue text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Goals
            </button>
            <button
              onClick={() => setView('assists')}
              className={`px-4 py-2 rounded-md font-semibold transition ${
                view === 'assists'
                  ? 'bg-liberia-blue text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Assists
            </button>
          </div>

          {/* Competition Selector */}
          <select
            value={selectedCompetition?.id || ''}
            onChange={(e) => {
              const comp = competitions.find(c => c.id === e.target.value)
              setSelectedCompetition(comp || null)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg font-semibold focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
          >
            {competitions.map(comp => (
              <option key={comp.id} value={comp.id}>
                {comp.name} ({comp.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scorers List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liberia-blue"></div>
        </div>
      ) : scorers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No {view} recorded yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Stats will appear here once matches are played
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Player</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Team</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    {view === 'goals' ? '⚽ Goals' : '🎯 Assists'}
                  </th>
                  {view === 'goals' && (
                    <th className="px-4 py-3 text-center text-sm font-semibold">🎯 Assists</th>
                  )}
                  {view === 'assists' && (
                    <th className="px-4 py-3 text-center text-sm font-semibold">⚽ Goals</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {scorers.map((scorer, index) => (
                  <tr
                    key={scorer.id}
                    className={`hover:bg-gray-50 transition ${
                      index < 3 ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getMedalColor(
                            index
                          )}`}
                        >
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-semibold text-gray-900">{scorer.name}</div>
                        {scorer.position && (
                          <div className="text-xs text-gray-500">{scorer.position}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-700">{scorer.team}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="font-bold text-lg text-liberia-blue">
                        {view === 'goals' ? scorer.goals : scorer.assists}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-600">
                        {view === 'goals' ? scorer.assists : scorer.goals}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top 3 Podium (Optional) */}
          {scorers.length >= 3 && (
            <div className="bg-gray-50 p-6">
              <div className="flex justify-center items-end gap-4 max-w-2xl mx-auto">
                {/* 2nd Place */}
                <div className="flex-1 text-center">
                  <div className="bg-gray-300 rounded-t-lg p-4 h-32 flex flex-col justify-end">
                    <div className="text-3xl mb-2">🥈</div>
                    <div className="font-bold text-sm">{scorers[1].name}</div>
                    <div className="text-2xl font-bold text-gray-700">
                      {view === 'goals' ? scorers[1].goals : scorers[1].assists}
                    </div>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="flex-1 text-center">
                  <div className="bg-yellow-400 rounded-t-lg p-4 h-40 flex flex-col justify-end">
                    <div className="text-4xl mb-2">🥇</div>
                    <div className="font-bold">{scorers[0].name}</div>
                    <div className="text-3xl font-bold text-yellow-900">
                      {view === 'goals' ? scorers[0].goals : scorers[0].assists}
                    </div>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="flex-1 text-center">
                  <div className="bg-orange-400 rounded-t-lg p-4 h-24 flex flex-col justify-end">
                    <div className="text-2xl mb-2">🥉</div>
                    <div className="font-bold text-sm">{scorers[2].name}</div>
                    <div className="text-xl font-bold text-orange-900">
                      {view === 'goals' ? scorers[2].goals : scorers[2].assists}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {scorers.length > 0 && (
        <div className="flex justify-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
            <span>1st Place</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-300"></div>
            <span>2nd Place</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-400"></div>
            <span>3rd Place</span>
          </div>
        </div>
      )}
    </div>
  )
}
