'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LogoutButton from '@/components/admin/LogoutButton'

interface Cup {
  id: string
  name: string
  description: string | null
  league_id: string | null
  season: string | null
  total_teams: number
  teams_per_group: number
  status: 'draft' | 'group_stage' | 'knockout' | 'completed'
  start_date: string | null
  end_date: string | null
  created_at: string
}

export default function CupsManagementPage() {
  const [cups, setCups] = useState<Cup[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingCup, setEditingCup] = useState<Cup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    season: new Date().getFullYear().toString(),
    total_teams: 16,
    teams_per_group: 4,
    start_date: '',
    end_date: ''
  })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchCupsAndLeagues()
  }, [])

  const fetchCupsAndLeagues = async () => {
    setLoading(true)

    // Fetch cups
    const { data: cupsData } = await supabase
      .from('cups')
      .select('*')
      .order('created_at', { ascending: false })

    if (cupsData) setCups(cupsData)

    setLoading(false)
  }

  const calculateGroups = (totalTeams: number, teamsPerGroup: number) => {
    const fullGroups = Math.floor(totalTeams / teamsPerGroup)
    const remainingTeams = totalTeams % teamsPerGroup

    if (remainingTeams === 0) {
      return {
        totalGroups: fullGroups,
        fullGroups: fullGroups,
        lastGroupSize: 0,
        distribution: `${fullGroups} groups of ${teamsPerGroup} teams`
      }
    } else {
      return {
        totalGroups: fullGroups + 1,
        fullGroups: fullGroups,
        lastGroupSize: remainingTeams,
        distribution: `${fullGroups} groups of ${teamsPerGroup} teams + 1 group of ${remainingTeams} team${remainingTeams > 1 ? 's' : ''}`
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!formData.name.trim()) {
      setError('Cup name is required')
      return
    }

    if (formData.total_teams < formData.teams_per_group) {
      setError('Total teams must be greater than or equal to teams per group')
      return
    }

    if (formData.teams_per_group < 2) {
      setError('Teams per group must be at least 2')
      return
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    const cupData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      league_id: null,  // Cups are independent, not associated with leagues
      season: formData.season || null,
      total_teams: formData.total_teams,
      teams_per_group: formData.teams_per_group,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      created_by: user?.id || null
    }

    if (editingCup) {
      // Update existing cup
      const { error: updateError } = await supabase
        .from('cups')
        .update(cupData)
        .eq('id', editingCup.id)

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess('Cup updated successfully')
        resetForm()
        fetchCupsAndLeagues()
      }
    } else {
      // Create new cup
      const { data: newCup, error: insertError } = await supabase
        .from('cups')
        .insert(cupData)
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
      } else if (newCup) {
        setSuccess('Cup created successfully')
        resetForm()
        fetchCupsAndLeagues()

        // Redirect to cup details to add teams
        setTimeout(() => {
          router.push(`/admin/cups/${newCup.id}`)
        }, 1000)
      }
    }
  }

  const handleEdit = (cup: Cup) => {
    setEditingCup(cup)
    setFormData({
      name: cup.name,
      description: cup.description || '',
      season: cup.season || new Date().getFullYear().toString(),
      total_teams: cup.total_teams,
      teams_per_group: cup.teams_per_group,
      start_date: cup.start_date || '',
      end_date: cup.end_date || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (cupId: string) => {
    if (!confirm('Are you sure you want to delete this cup? This will also delete all groups, teams, and matches associated with it.')) {
      return
    }

    const { error: deleteError } = await supabase
      .from('cups')
      .delete()
      .eq('id', cupId)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setSuccess('Cup deleted successfully')
      fetchCupsAndLeagues()
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      season: new Date().getFullYear().toString(),
      total_teams: 16,
      teams_per_group: 4,
      start_date: '',
      end_date: ''
    })
    setEditingCup(null)
    setShowForm(false)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      group_stage: 'bg-blue-100 text-blue-800',
      knockout: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800'
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const groupInfo = calculateGroups(formData.total_teams, formData.teams_per_group)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Cup Competitions</h1>
              <p className="text-blue-100">Create and manage tournament cups with group stages</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Success/Error Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Create Button */}
        {!showForm && (
          <div className="mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-3 px-6 rounded-lg transition shadow-lg"
            >
              + Create New Cup
            </button>
          </div>
        )}

        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {editingCup ? 'Edit Cup' : 'Create New Cup'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close form"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Cup Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                  placeholder="e.g., FA Cup, Champions Cup"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                  rows={3}
                  placeholder="Brief description of the cup competition"
                />
              </div>

              {/* Tournament Configuration */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Tournament Configuration</h3>

                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="total_teams" className="block text-sm font-medium text-gray-700 mb-2">
                      Total Teams *
                    </label>
                    <input
                      id="total_teams"
                      type="number"
                      min="2"
                      max="100"
                      value={formData.total_teams}
                      onChange={(e) => setFormData({ ...formData, total_teams: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="teams_per_group" className="block text-sm font-medium text-gray-700 mb-2">
                      Teams per Group *
                    </label>
                    <input
                      id="teams_per_group"
                      type="number"
                      min="2"
                      max="10"
                      value={formData.teams_per_group}
                      onChange={(e) => setFormData({ ...formData, teams_per_group: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="season" className="block text-sm font-medium text-gray-700 mb-2">
                      Season
                    </label>
                    <input
                      id="season"
                      type="text"
                      value={formData.season}
                      onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                      placeholder="e.g., 2024/25"
                    />
                  </div>
                </div>

                {/* Group Distribution Preview */}
                {formData.total_teams > 0 && formData.teams_per_group > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-blue-800">Group Distribution</h4>
                        <div className="mt-2 text-sm text-blue-700">
                          <p><strong>{groupInfo.totalGroups} total groups:</strong> {groupInfo.distribution}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Schedule</h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-3 px-8 rounded-lg transition"
                >
                  {editingCup ? 'Update Cup' : 'Create Cup'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Cups List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">All Cups</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liberia-blue mx-auto mb-4"></div>
              Loading cups...
            </div>
          ) : cups.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-lg mb-2">No cups created yet</p>
              <p className="text-sm">Create your first cup competition to get started</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {cups.map((cup) => {
                const groupDist = calculateGroups(cup.total_teams, cup.teams_per_group)
                return (
                  <div key={cup.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2">{cup.name}</h3>
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(cup.status)}`}>
                          {cup.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {cup.description && (
                      <p className="text-sm text-gray-600 mb-4">{cup.description}</p>
                    )}

                    <div className="space-y-2 text-sm text-gray-700 mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Season:</span>
                        <span className="font-medium">{cup.season || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Teams:</span>
                        <span className="font-medium">{cup.total_teams}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Groups:</span>
                        <span className="font-medium">{groupDist.totalGroups}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Per Group:</span>
                        <span className="font-medium">{cup.teams_per_group} teams</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <button
                        onClick={() => router.push(`/admin/cups/${cup.id}`)}
                        className="flex-1 bg-liberia-blue hover:bg-liberia-blue-dark text-white font-bold py-2 px-4 rounded transition text-sm"
                      >
                        Manage
                      </button>
                      <button
                        onClick={() => handleEdit(cup)}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cup.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
