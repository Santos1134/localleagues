'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type League = {
  id: string
  name: string
  sport: string
  season_start: string
  season_end: string
  is_active: boolean
  description: string
}

export default function ArchivesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeLeagues, setActiveLeagues] = useState<League[]>([])
  const [archivedLeagues, setArchivedLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    checkAuth()
    fetchLeagues()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      router.push('/')
    }
  }

  const fetchLeagues = async () => {
    setLoading(true)

    // Fetch active leagues
    const { data: active } = await supabase
      .from('leagues')
      .select('*')
      .eq('is_active', true)
      .order('season_start', { ascending: false })

    if (active) setActiveLeagues(active)

    // Fetch archived leagues
    const { data: archived } = await supabase
      .from('leagues')
      .select('*')
      .eq('is_active', false)
      .order('season_end', { ascending: false })

    if (archived) setArchivedLeagues(archived)

    setLoading(false)
  }

  const archiveLeague = async (leagueId: string, leagueName: string) => {
    if (!confirm(`Archive "${leagueName}"? This will deactivate the league and all its divisions.`)) {
      return
    }

    setError('')
    setSuccess('')

    const { error: updateError } = await supabase
      .from('leagues')
      .update({ is_active: false })
      .eq('id', leagueId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(`${leagueName} has been archived successfully!`)
      fetchLeagues()
    }
  }

  const restoreLeague = async (leagueId: string, leagueName: string) => {
    if (!confirm(`Restore "${leagueName}"? This will reactivate the league.`)) {
      return
    }

    setError('')
    setSuccess('')

    const { error: updateError } = await supabase
      .from('leagues')
      .update({ is_active: true })
      .eq('id', leagueId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(`${leagueName} has been restored successfully!`)
      fetchLeagues()
    }
  }

  const getSportIcon = (sport: string) => {
    switch (sport.toLowerCase()) {
      case 'football': return '⚽'
      case 'basketball': return '🏀'
      case 'volleyball': return '🏐'
      default: return '🏅'
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
          <h1 className="text-3xl font-bold mb-2">Season Archives</h1>
          <p className="text-blue-100">Manage active and archived seasons</p>
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

        {/* Active Seasons */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Active Seasons</h2>
            <Link
              href="/admin/leagues"
              className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-4 rounded text-sm"
            >
              + New League
            </Link>
          </div>

          {activeLeagues.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No active seasons
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeLeagues.map((league) => (
                <div key={league.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{getSportIcon(league.sport)}</span>
                        <div>
                          <h3 className="font-bold text-lg">{league.name}</h3>
                          <p className="text-blue-100 text-sm">{league.sport}</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-liberia-red text-white text-xs font-semibold rounded">
                        ACTIVE
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-gray-700 text-sm mb-4">{league.description}</p>
                    <div className="text-sm text-gray-600 mb-4">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Start:</span>
                        <span>{new Date(league.season_start).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">End:</span>
                        <span>{new Date(league.season_end).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/admin/leagues`}
                        className="flex-1 bg-liberia-blue hover:bg-liberia-blue-dark text-white font-bold py-2 px-4 rounded text-center text-sm"
                      >
                        Manage
                      </Link>
                      <button
                        onClick={() => archiveLeague(league.id, league.name)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded text-sm"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Archived Seasons */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Archived Seasons</h2>

          {archivedLeagues.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No archived seasons
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">League</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sport</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Season</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {archivedLeagues.map((league) => (
                      <tr key={league.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getSportIcon(league.sport)}</span>
                            <span className="font-medium text-gray-900">{league.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{league.sport}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(league.season_start).getFullYear()} - {new Date(league.season_end).getFullYear()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-200 text-gray-700">
                            ARCHIVED
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => restoreLeague(league.id, league.name)}
                            className="text-liberia-blue hover:text-liberia-blue-dark font-medium mr-4"
                          >
                            Restore
                          </button>
                          <Link
                            href={`/standings`}
                            className="text-gray-600 hover:text-gray-800 font-medium"
                          >
                            View Stats
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
