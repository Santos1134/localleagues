'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Division, Team } from '@/lib/types/database.types'

export default function TeamsManagementPage() {
  const params = useParams()
  const divisionId = params.id as string
  const [division, setDivision] = useState<Division | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    home_city: '',
    home_venue: '',
    founded_year: new Date().getFullYear(),
    logo_url: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [divisionId])

  const fetchData = async () => {
    setLoading(true)

    // Fetch division
    const { data: divisionData } = await supabase
      .from('divisions')
      .select(`
        *,
        league:leagues(*)
      `)
      .eq('id', divisionId)
      .single()

    if (divisionData) setDivision(divisionData as Division)

    // Fetch teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select(`
        *,
        _count:players(count)
      `)
      .eq('division_id', divisionId)
      .order('name')

    if (teamsData) setTeams(teamsData as Team[])

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name) {
      setError('Team name is required')
      return
    }

    if (editingTeam) {
      // Update existing team
      const { error: updateError } = await supabase
        .from('teams')
        .update(formData)
        .eq('id', editingTeam.id)

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess('Team updated successfully!')
        setEditingTeam(null)
        setFormData({
          name: '',
          short_name: '',
          home_city: '',
          home_venue: '',
          founded_year: new Date().getFullYear(),
          logo_url: ''
        })
        setShowForm(false)
        fetchData()
      }
    } else {
      // Create new team
      const { error: insertError } = await supabase
        .from('teams')
        .insert({
          ...formData,
          division_id: divisionId
        })

      if (insertError) {
        setError(insertError.message)
      } else {
        setSuccess('Team created successfully!')
        setFormData({
          name: '',
          short_name: '',
          home_city: '',
          home_venue: '',
          founded_year: new Date().getFullYear(),
          logo_url: ''
        })
        setShowForm(false)
        fetchData()
      }
    }
  }

  const handleEdit = (team: Team) => {
    setEditingTeam(team)
    setFormData({
      name: team.name,
      short_name: team.short_name || '',
      home_city: team.home_city || '',
      home_venue: team.home_venue || '',
      founded_year: team.founded_year || new Date().getFullYear(),
      logo_url: team.logo_url || ''
    })
    setShowForm(true)
  }

  const deleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure? This will delete all players and matches for this team.')) return

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Team deleted successfully')
      fetchData()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-8">
        <div className="container mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="text-blue-100 hover:text-white mb-2 flex items-center"
          >
            ← Back to Divisions
          </button>
          <h1 className="text-3xl font-bold mb-2">
            {division?.name} - Teams
          </h1>
          <p className="text-blue-100">Manage teams in this division</p>
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
            onClick={() => setShowForm(!showForm)}
            className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded"
          >
            {showForm ? 'Cancel' : '+ Add New Team'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">{editingTeam ? 'Edit Team' : 'Add New Team'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    placeholder="e.g., Mighty Barrolle"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Short Name
                  </label>
                  <input
                    type="text"
                    value={formData.short_name}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    placeholder="e.g., BAR"
                    maxLength={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Home City
                  </label>
                  <input
                    type="text"
                    value={formData.home_city}
                    onChange={(e) => setFormData({ ...formData, home_city: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    placeholder="e.g., Monrovia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Home Venue
                  </label>
                  <input
                    type="text"
                    value={formData.home_venue}
                    onChange={(e) => setFormData({ ...formData, home_venue: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    placeholder="e.g., SKD Stadium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Founded Year
                  </label>
                  <input
                    type="number"
                    value={formData.founded_year}
                    onChange={(e) => setFormData({ ...formData, founded_year: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    min="1900"
                    max={new Date().getFullYear()}
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
                  {editingTeam ? 'Update Team' : 'Add Team'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingTeam(null)
                    setFormData({
                      name: '',
                      short_name: '',
                      home_city: '',
                      home_venue: '',
                      founded_year: new Date().getFullYear(),
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
            <h2 className="text-xl font-bold">Teams in {division?.name}</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : teams.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No teams in this division yet. Click "Add New Team" to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {teams.map((team) => (
                <div key={team.id} className="border rounded-lg p-6 hover:shadow-lg transition">
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mr-4 flex items-center justify-center overflow-hidden">
                      {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">⚽</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{team.name}</h3>
                      {team.short_name && (
                        <p className="text-sm text-gray-500">{team.short_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    {team.home_city && (
                      <div className="flex items-center text-gray-600">
                        <span className="mr-2">📍</span>
                        <span>{team.home_city}</span>
                      </div>
                    )}
                    {team.home_venue && (
                      <div className="flex items-center text-gray-600">
                        <span className="mr-2">🏟️</span>
                        <span>{team.home_venue}</span>
                      </div>
                    )}
                    {team.founded_year && (
                      <div className="flex items-center text-gray-600">
                        <span className="mr-2">📅</span>
                        <span>Founded {team.founded_year}</span>
                      </div>
                    )}
                    <div className="flex items-center text-gray-600">
                      <span className="mr-2">👥</span>
                      <span>{(team as any)._count?.players || 0} players</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => router.push(`/admin/teams/${team.id}/players`)}
                      className="flex-1 bg-liberia-red hover:bg-liberia-blue text-white text-sm py-2 px-4 rounded"
                    >
                      Manage Players
                    </button>
                    <button
                      onClick={() => handleEdit(team)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTeam(team.id)}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-4 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
