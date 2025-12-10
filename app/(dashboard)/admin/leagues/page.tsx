'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { League } from '@/lib/types/database.types'
import LogoutButton from '@/components/admin/LogoutButton'

export default function LeaguesManagementPage() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLeague, setEditingLeague] = useState<League | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    sport: 'football' as 'football' | 'basketball' | 'volleyball',
    description: '',
    season_start_date: '',
    season_end_date: '',
    logo_url: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchLeagues()
  }, [])

  const fetchLeagues = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('leagues')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setLeagues(data as League[])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!formData.name || !formData.season_start_date || !formData.season_end_date) {
      setError('Please fill in all required fields')
      return
    }

    if (new Date(formData.season_start_date) >= new Date(formData.season_end_date)) {
      setError('Season end date must be after start date')
      return
    }

    if (editingLeague) {
      // Update existing league
      const { error: updateError } = await supabase
        .from('leagues')
        .update({
          name: formData.name,
          sport: formData.sport,
          description: formData.description,
          season_start_date: formData.season_start_date,
          season_end_date: formData.season_end_date,
          logo_url: formData.logo_url || null
        })
        .eq('id', editingLeague.id)

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess('League updated successfully!')
        setEditingLeague(null)
        setFormData({
          name: '',
          sport: 'football',
          description: '',
          season_start_date: '',
          season_end_date: '',
          logo_url: ''
        })
        setShowForm(false)
        fetchLeagues()
      }
    } else {
      // Create new league
      const { data: userData } = await supabase.auth.getUser()

      const { error: insertError } = await supabase
        .from('leagues')
        .insert({
          ...formData,
          created_by: userData.user?.id
        })

      if (insertError) {
        setError(insertError.message)
      } else {
        setSuccess('League created successfully!')
        setFormData({
          name: '',
          sport: 'football',
          description: '',
          season_start_date: '',
          season_end_date: '',
          logo_url: ''
        })
        setShowForm(false)
        fetchLeagues()
      }
    }
  }

  const handleEdit = (league: League) => {
    setEditingLeague(league)
    setFormData({
      name: league.name,
      sport: league.sport,
      description: league.description || '',
      season_start_date: league.season_start_date,
      season_end_date: league.season_end_date,
      logo_url: league.logo_url || ''
    })
    setShowForm(true)
  }

  const toggleLeagueStatus = async (leagueId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('leagues')
      .update({ is_active: !currentStatus })
      .eq('id', leagueId)

    if (!error) {
      fetchLeagues()
    }
  }

  const deleteLeague = async (leagueId: string, leagueName: string) => {
    if (!confirm(`Are you sure you want to DELETE "${leagueName}"? This will permanently remove the league and all its divisions, teams, players, and matches. This action cannot be undone!`)) {
      return
    }

    setError('')
    setSuccess('')

    const { error: deleteError } = await supabase
      .from('leagues')
      .delete()
      .eq('id', leagueId)

    if (deleteError) {
      setError(`Failed to delete league: ${deleteError.message}`)
    } else {
      setSuccess(`League "${leagueName}" has been permanently deleted.`)
      fetchLeagues()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">League Management</h1>
              <p className="text-blue-100">Create and manage sports leagues</p>
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

        <div className="mb-6">
          <button
            onClick={() => {
              setShowForm(!showForm)
              if (showForm) {
                setEditingLeague(null)
                setFormData({
                  name: '',
                  sport: 'football',
                  description: '',
                  season_start_date: '',
                  season_end_date: '',
                  logo_url: ''
                })
              }
            }}
            className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded"
          >
            {showForm ? 'Cancel' : '+ Create New League'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">{editingLeague ? 'Edit League' : 'Create New League'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    League Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    placeholder="e.g., Liberia Premier League"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sport *
                  </label>
                  <select
                    value={formData.sport}
                    onChange={(e) => setFormData({ ...formData, sport: e.target.value as any })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                  >
                    <option value="football">Football</option>
                    <option value="basketball">Basketball</option>
                    <option value="volleyball">Volleyball</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Season Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.season_start_date}
                    onChange={(e) => setFormData({ ...formData, season_start_date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Season End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.season_end_date}
                    onChange={(e) => setFormData({ ...formData, season_end_date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    rows={3}
                    placeholder="Brief description of the league..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded"
                >
                  {editingLeague ? 'Update League' : 'Create League'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingLeague(null)
                    setFormData({
                      name: '',
                      sport: 'football',
                      description: '',
                      season_start_date: '',
                      season_end_date: '',
                      logo_url: ''
                    })
                  }}
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
            <h2 className="text-xl font-bold">Existing Leagues</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : leagues.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No leagues created yet. Click "Create New League" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      League Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sport
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Season
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
                  {leagues.map((league) => (
                    <tr key={league.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{league.name}</div>
                        {league.description && (
                          <div className="text-sm text-gray-500">{league.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 capitalize text-sm">{league.sport}</td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(league.season_start_date).toLocaleDateString()} -{' '}
                        {new Date(league.season_end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            league.is_active
                              ? 'bg-blue-100 text-liberia-red-dark'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {league.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleEdit(league)}
                          className="text-blue-600 hover:text-blue-800 mr-4 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleLeagueStatus(league.id, league.is_active)}
                          className="text-blue-600 hover:text-blue-800 mr-4"
                        >
                          {league.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => router.push(`/admin/leagues/${league.id}/divisions`)}
                          className="text-liberia-blue hover:text-liberia-blue-dark mr-4"
                        >
                          Manage Divisions
                        </button>
                        <button
                          onClick={() => deleteLeague(league.id, league.name)}
                          className="text-red-600 hover:text-red-800 font-medium"
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
      </div>
    </div>
  )
}
