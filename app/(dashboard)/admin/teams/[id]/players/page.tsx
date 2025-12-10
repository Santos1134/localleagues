'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Team, Player } from '@/lib/types/database.types'

export default function PlayersManagementPage() {
  const params = useParams()
  const teamId = params.id as string
  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    jersey_number: '',
    position: '' as 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | 'substitute' | '',
    date_of_birth: '',
    nationality: 'Liberia',
    height_cm: '',
    weight_kg: '',
    photo_url: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [teamId])

  const fetchData = async () => {
    setLoading(true)

    const { data: teamData } = await supabase
      .from('teams')
      .select(`
        *,
        division:divisions(
          *,
          league:leagues(*)
        )
      `)
      .eq('id', teamId)
      .single()

    if (teamData) setTeam(teamData as Team)

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('jersey_number', { ascending: true })

    if (playersData) setPlayers(playersData as Player[])

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.full_name) {
      setError('Player name is required')
      return
    }

    const { error: insertError } = await supabase
      .from('players')
      .insert({
        full_name: formData.full_name,
        jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null,
        position: formData.position || null,
        date_of_birth: formData.date_of_birth || null,
        nationality: formData.nationality,
        height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
        photo_url: formData.photo_url || null,
        team_id: teamId
      })

    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess('Player added successfully!')
      setFormData({
        full_name: '',
        jersey_number: '',
        position: '',
        date_of_birth: '',
        nationality: 'Liberia',
        height_cm: '',
        weight_kg: '',
        photo_url: ''
      })
      setShowForm(false)
      fetchData()
    }
  }

  const deletePlayer = async (playerId: string) => {
    if (!confirm('Are you sure you want to remove this player?')) return

    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Player removed successfully')
      fetchData()
    }
  }

  const togglePlayerStatus = async (playerId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('players')
      .update({ is_active: !currentStatus })
      .eq('id', playerId)

    if (!error) {
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
            ← Back to Teams
          </button>
          <h1 className="text-3xl font-bold mb-2">
            {team?.name} - Players
          </h1>
          <p className="text-blue-100">Manage team roster</p>
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
            {showForm ? 'Cancel' : '+ Add New Player'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Add New Player</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    placeholder="e.g., George Weah"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jersey Number
                  </label>
                  <input
                    type="number"
                    value={formData.jersey_number}
                    onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    min="1"
                    max="99"
                    placeholder="e.g., 10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                  >
                    <option value="">Select position</option>
                    <option value="goalkeeper">Goalkeeper</option>
                    <option value="defender">Defender</option>
                    <option value="midfielder">Midfielder</option>
                    <option value="forward">Forward</option>
                    <option value="substitute">Substitute</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={formData.height_cm}
                    onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    min="100"
                    max="250"
                    placeholder="e.g., 180"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    min="40"
                    max="150"
                    placeholder="e.g., 75"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photo URL
                  </label>
                  <input
                    type="url"
                    value={formData.photo_url}
                    onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded"
                >
                  Add Player
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
            <h2 className="text-xl font-bold">Squad List</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : players.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No players in this team yet. Click "Add New Player" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Player
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Age
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nationality
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {players.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">
                          {player.jersey_number || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 flex items-center justify-center overflow-hidden">
                            {player.photo_url ? (
                              <img src={player.photo_url} alt={player.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">👤</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{player.full_name}</div>
                            {player.height_cm && player.weight_kg && (
                              <div className="text-sm text-gray-500">
                                {player.height_cm}cm / {player.weight_kg}kg
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 capitalize text-sm">
                        {player.position || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {player.date_of_birth
                          ? new Date().getFullYear() - new Date(player.date_of_birth).getFullYear()
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">{player.nationality}</td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => togglePlayerStatus(player.id, player.is_active)}
                          className="text-blue-600 hover:text-blue-800 mr-4"
                        >
                          {player.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deletePlayer(player.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
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
