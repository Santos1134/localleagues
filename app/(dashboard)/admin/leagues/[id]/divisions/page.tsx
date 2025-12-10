'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Division, League } from '@/lib/types/database.types'

export default function DivisionsPage() {
  const params = useParams()
  const leagueId = params.id as string
  const [league, setLeague] = useState<League | null>(null)
  const [divisions, setDivisions] = useState<Division[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDivision, setEditingDivision] = useState<Division | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tier: 1,
    max_teams: 16,
    promotion_spots: 2,
    relegation_spots: 2
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchLeagueAndDivisions()
  }, [leagueId])

  const fetchLeagueAndDivisions = async () => {
    setLoading(true)

    const { data: leagueData } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single()

    if (leagueData) setLeague(leagueData as League)

    const { data: divisionsData } = await supabase
      .from('divisions')
      .select('*')
      .eq('league_id', leagueId)
      .order('tier', { ascending: true })

    if (divisionsData) {
      // Fetch team counts for each division
      const divisionsWithCounts = await Promise.all(
        divisionsData.map(async (division) => {
          const { count } = await supabase
            .from('teams')
            .select('*', { count: 'exact', head: true })
            .eq('division_id', division.id)

          return {
            ...division,
            team_count: count || 0
          }
        })
      )
      setDivisions(divisionsWithCounts as Division[])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name) {
      setError('Division name is required')
      return
    }

    if (editingDivision) {
      // Update existing division
      const { error: updateError } = await supabase
        .from('divisions')
        .update(formData)
        .eq('id', editingDivision.id)

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess('Division updated successfully!')
        setEditingDivision(null)
        setFormData({
          name: '',
          description: '',
          tier: divisions.length + 1,
          max_teams: 16,
          promotion_spots: 2,
          relegation_spots: 2
        })
        setShowForm(false)
        fetchLeagueAndDivisions()
      }
    } else {
      // Create new division
      const { error: insertError } = await supabase
        .from('divisions')
        .insert({
          ...formData,
          league_id: leagueId
        })

      if (insertError) {
        setError(insertError.message)
      } else {
        setSuccess('Division created successfully!')
        setFormData({
          name: '',
          description: '',
          tier: divisions.length + 1,
          max_teams: 16,
          promotion_spots: 2,
          relegation_spots: 2
        })
        setShowForm(false)
        fetchLeagueAndDivisions()
      }
    }
  }

  const handleEdit = (division: Division) => {
    setEditingDivision(division)
    setFormData({
      name: division.name,
      description: division.description || '',
      tier: division.tier,
      max_teams: division.max_teams || 16,
      promotion_spots: division.promotion_spots || 2,
      relegation_spots: division.relegation_spots || 2
    })
    setShowForm(true)
  }

  const deleteDivision = async (divisionId: string) => {
    if (!confirm('Are you sure? This will delete all associated teams and matches.')) return

    const { error } = await supabase
      .from('divisions')
      .delete()
      .eq('id', divisionId)

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Division deleted successfully')
      fetchLeagueAndDivisions()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-8">
        <div className="container mx-auto px-4">
          <button
            onClick={() => router.push('/admin/leagues')}
            className="text-blue-100 hover:text-white mb-2 flex items-center"
          >
            ← Back to Leagues
          </button>
          <h1 className="text-3xl font-bold mb-2">
            {league?.name} - Divisions
          </h1>
          <p className="text-blue-100">Manage divisions and tiers</p>
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
                setEditingDivision(null)
                setFormData({
                  name: '',
                  description: '',
                  tier: divisions.length + 1,
                  max_teams: 16,
                  promotion_spots: 2,
                  relegation_spots: 2
                })
              }
            }}
            className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded"
          >
            {showForm ? 'Cancel' : '+ Create New Division'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">{editingDivision ? 'Edit Division' : 'Create New Division'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Division Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    placeholder="e.g., First Division"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tier Level *
                  </label>
                  <input
                    type="number"
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">1 = Top tier</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Teams
                  </label>
                  <input
                    type="number"
                    value={formData.max_teams}
                    onChange={(e) => setFormData({ ...formData, max_teams: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    min="4"
                    max="32"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Promotion Spots
                  </label>
                  <input
                    type="number"
                    value={formData.promotion_spots}
                    onChange={(e) => setFormData({ ...formData, promotion_spots: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    min="0"
                    max="8"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relegation Spots
                  </label>
                  <input
                    type="number"
                    value={formData.relegation_spots}
                    onChange={(e) => setFormData({ ...formData, relegation_spots: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    min="0"
                    max="8"
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
                    placeholder="Brief description..."
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded"
                >
                  {editingDivision ? 'Update Division' : 'Create Division'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingDivision(null)
                    setFormData({
                      name: '',
                      description: '',
                      tier: divisions.length + 1,
                      max_teams: 16,
                      promotion_spots: 2,
                      relegation_spots: 2
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
            <h2 className="text-xl font-bold">Divisions</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : divisions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No divisions created yet. Click "Create New Division" to get started.
            </div>
          ) : (
            <div className="divide-y">
              {divisions.map((division) => (
                <div key={division.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{division.name}</h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                          Tier {division.tier}
                        </span>
                      </div>
                      {division.description && (
                        <p className="text-gray-600 mb-3">{division.description}</p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Max Teams:</span>
                          <span className="ml-2 font-medium">{division.max_teams}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Promotion:</span>
                          <span className="ml-2 font-medium">{division.promotion_spots}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Relegation:</span>
                          <span className="ml-2 font-medium">{division.relegation_spots}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Current Teams:</span>
                          <span className="ml-2 font-medium">
                            {(division as any).team_count || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleEdit(division)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => router.push(`/admin/divisions/${division.id}/teams`)}
                        className="text-liberia-red hover:text-liberia-red-dark font-medium"
                      >
                        Manage Teams
                      </button>
                      <button
                        onClick={() => deleteDivision(division.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </div>
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
