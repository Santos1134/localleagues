'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Transfer = {
  id: string
  player_id: string
  from_team_id: string
  to_team_id: string
  transfer_date: string
  transfer_fee: number | null
  status: 'pending' | 'approved' | 'rejected'
  player?: { full_name: string; jersey_number: number }
  from_team?: { name: string }
  to_team?: { name: string }
}

export default function TransfersPage() {
  const router = useRouter()
  const supabase = createClient()
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    player_id: '',
    from_team_id: '',
    to_team_id: '',
    transfer_fee: '',
    transfer_date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    checkAuth()
    fetchData()
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

  const fetchData = async () => {
    // Fetch transfers
    const { data: transfersData } = await supabase
      .from('player_transfers')
      .select(`
        *,
        player:players(full_name, jersey_number),
        from_team:teams!player_transfers_from_team_id_fkey(name),
        to_team:teams!player_transfers_to_team_id_fkey(name)
      `)
      .order('transfer_date', { ascending: false })

    if (transfersData) setTransfers(transfersData)

    // Fetch active players
    const { data: playersData } = await supabase
      .from('players')
      .select('*, team:teams(name)')
      .eq('is_active', true)
      .order('full_name')

    if (playersData) setPlayers(playersData)

    // Fetch teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .order('name')

    if (teamsData) setTeams(teamsData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (formData.from_team_id === formData.to_team_id) {
      setError('Cannot transfer to the same team')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const transferData = {
      player_id: formData.player_id,
      from_team_id: formData.from_team_id,
      to_team_id: formData.to_team_id,
      transfer_date: formData.transfer_date,
      transfer_fee: formData.transfer_fee ? parseFloat(formData.transfer_fee) : null,
      status: 'approved' as const,
      approved_by: userData.user.id,
    }

    const { error: insertError } = await supabase
      .from('player_transfers')
      .insert(transferData)

    if (insertError) {
      setError(insertError.message)
    } else {
      // Update player's team
      await supabase
        .from('players')
        .update({ team_id: formData.to_team_id })
        .eq('id', formData.player_id)

      setSuccess('Transfer completed successfully!')
      setShowForm(false)
      setFormData({
        player_id: '',
        from_team_id: '',
        to_team_id: '',
        transfer_fee: '',
        transfer_date: new Date().toISOString().split('T')[0],
      })
      fetchData()
    }
  }

  const handlePlayerSelect = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    if (player) {
      setFormData({
        ...formData,
        player_id: playerId,
        from_team_id: player.team_id || '',
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-liberia-blue text-white'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Player Transfers</h1>
          <p className="text-blue-100">Manage player transfers between teams</p>
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
            {showForm ? 'Cancel' : '+ New Transfer'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Create Transfer</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Player *
                  </label>
                  <select
                    value={formData.player_id}
                    onChange={(e) => handlePlayerSelect(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    required
                  >
                    <option value="">Select player</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        #{player.jersey_number} {player.full_name} ({player.team?.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Team *
                  </label>
                  <input
                    type="text"
                    value={teams.find(t => t.id === formData.from_team_id)?.name || ''}
                    className="w-full px-4 py-2 border rounded-lg bg-gray-100"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Team *
                  </label>
                  <select
                    value={formData.to_team_id}
                    onChange={(e) => setFormData({ ...formData, to_team_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    required
                  >
                    <option value="">Select team</option>
                    {teams.filter(t => t.id !== formData.from_team_id).map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Date *
                  </label>
                  <input
                    type="date"
                    value={formData.transfer_date}
                    onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Fee (Optional)
                  </label>
                  <input
                    type="number"
                    value={formData.transfer_fee}
                    onChange={(e) => setFormData({ ...formData, transfer_fee: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded"
              >
                Complete Transfer
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">Transfer History</h2>
          </div>

          {transfers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No transfers yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(transfer.transfer_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        #{transfer.player?.jersey_number} {transfer.player?.full_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {transfer.from_team?.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {transfer.to_team?.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {transfer.transfer_fee ? `$${transfer.transfer_fee.toLocaleString()}` : 'Free'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(transfer.status)}`}>
                          {transfer.status.toUpperCase()}
                        </span>
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
