import { createClient } from '@/lib/supabase/server'
import type { DivisionStanding } from '@/lib/types/database.types'
import ExportButton from '@/components/ExportButton'
import TopScorers from '@/components/TopScorers'
import Image from 'next/image'

export default async function StandingsPage() {
  const supabase = await createClient()

  // Fetch all divisions
  const { data: divisions } = await supabase
    .from('divisions')
    .select(`
      id,
      name,
      league_id,
      leagues (
        name
      )
    `)
    .order('name')

  // Fetch standings for each division with team logos
  const standingsPromises =
    divisions?.map(async (division) => {
      const { data } = await supabase
        .from('division_standings')
        .select('*')
        .eq('division_id', division.id)
        .order('points', { ascending: false })
        .order('goal_difference', { ascending: false })
        .order('goals_for', { ascending: false })

      // Fetch team logos
      const standingsWithLogos = await Promise.all(
        (data || []).map(async (standing) => {
          const { data: team } = await supabase
            .from('teams')
            .select('logo_url')
            .eq('id', standing.team_id)
            .single()

          return {
            ...standing,
            logo_url: team?.logo_url
          }
        })
      )

      return {
        division,
        standings: standingsWithLogos as any[],
      }
    }) || []

  const allStandings = await Promise.all(standingsPromises)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">League Standings</h1>
          <p className="text-blue-100">Current positions across all divisions</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Top Scorers Section */}
        <div className="mb-12">
          <TopScorers />
        </div>

        {/* Standings Tables */}
        {allStandings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 text-5xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Standings Available</h3>
            <p className="text-gray-600">
              Standings will appear here once matches have been played
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {allStandings.map(({ division, standings }) => (
              <div key={division.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-liberia-blue text-white px-6 py-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">{division.name}</h2>
                    {division.leagues && (
                      <p className="text-blue-100 text-sm">
                        {(division.leagues as any).name}
                      </p>
                    )}
                  </div>
                  <ExportButton data={standings} divisionName={division.name} type="standings" />
                </div>

                {standings && standings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pos
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            P
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            W
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            D
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            L
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            GF
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            GA
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            GD
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider font-bold">
                            Pts
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {standings.map((team, index) => {
                          const position = index + 1
                          const isPromotion = position <= 2
                          const isRelegation = position > standings.length - 2

                          return (
                            <tr
                              key={team.team_id}
                              className={`hover:bg-gray-50 ${
                                isPromotion
                                  ? 'border-l-4 border-green-500'
                                  : isRelegation
                                  ? 'border-l-4 border-red-500'
                                  : 'border-l-4 border-transparent'
                              }`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {position}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                <div className="flex items-center gap-3">
                                  {(team as any).logo_url ? (
                                    <div className="w-8 h-8 relative flex-shrink-0">
                                      <Image
                                        src={(team as any).logo_url}
                                        alt={team.team_name}
                                        width={32}
                                        height={32}
                                        className="object-contain"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                                      {team.team_name.substring(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <span>{team.team_name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                {team.played}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                {team.wins}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                {team.draws}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                {team.losses}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                {team.goals_for}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                {team.goals_against}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                {team.goal_difference >= 0 ? '+' : ''}
                                {team.goal_difference}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                                {team.points}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No teams or matches in this division yet
                  </div>
                )}

                {standings && standings.length > 0 && (
                  <div className="bg-gray-50 px-6 py-4 border-t">
                    <div className="flex gap-6 text-xs text-gray-600">
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-l-4 border-green-500 mr-2"></div>
                        Promotion
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-l-4 border-red-500 mr-2"></div>
                        Relegation
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      P: Played, W: Won, D: Draw, L: Lost, GF: Goals For, GA: Goals Against,
                      GD: Goal Difference, Pts: Points
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
