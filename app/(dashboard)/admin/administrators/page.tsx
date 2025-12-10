'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import LogoutButton from '@/components/admin/LogoutButton'

interface Admin {
  id: string
  email: string
  full_name: string | null
  role: string
  managed_league_id: string | null
  managed_cup_id: string | null
  created_at: string
  league?: {
    id: string
    name: string
  }
  cup?: {
    id: string
    name: string
  }
}

interface League {
  id: string
  name: string
}

interface Cup {
  id: string
  name: string
}

export default function AdministratorsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [cups, setCups] = useState<Cup[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    admin_type: '', // 'league' or 'cup'
    managed_league_id: '',
    managed_cup_id: ''
  })

  const supabase = createClient()

  useEffect(() => {
    fetchAdmins()
    fetchLeagues()
    fetchCups()
  }, [])

  const fetchAdmins = async () => {
    setLoading(true)

    const { data } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        managed_league_id,
        managed_cup_id,
        created_at,
        league:leagues(id, name),
        cup:cups(id, name)
      `)
      .eq('role', 'league_admin')
      .order('created_at', { ascending: false })

    if (data) {
      setAdmins(data as any)
    }

    setLoading(false)
  }

  const fetchLeagues = async () => {
    const { data } = await supabase
      .from('leagues')
      .select('id, name')
      .order('name')

    if (data) {
      setLeagues(data)
    }
  }

  const fetchCups = async () => {
    const { data } = await supabase
      .from('cups')
      .select('id, name')
      .order('name')

    if (data) {
      setCups(data)
    }
  }

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Email and password are required')
      return
    }

    if (!formData.admin_type) {
      setError('Please select admin type (League or Cup)')
      return
    }

    if (formData.admin_type === 'league' && !formData.managed_league_id) {
      setError('Please select a league to manage')
      return
    }

    if (formData.admin_type === 'cup' && !formData.managed_cup_id) {
      setError('Please select a cup to manage')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      // Step 1: Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          emailRedirectTo: undefined
        }
      })

      if (signUpError) {
        console.error('SignUp Error:', signUpError)
        setError(`Signup failed: ${signUpError.message}`)
        return
      }

      if (!authData.user) {
        setError('User creation failed - no user returned')
        return
      }

      console.log('User created:', authData.user.id)

      // Step 2: Wait for profile trigger
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 3: Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .single()

      console.log('Existing profile:', existingProfile, 'Check error:', checkError)

      // Step 4: Insert or update profile
      if (!existingProfile) {
        // Profile doesn't exist, insert it
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: formData.email.trim().toLowerCase(),
            role: 'league_admin',
            managed_league_id: formData.admin_type === 'league' ? formData.managed_league_id : null,
            managed_cup_id: formData.admin_type === 'cup' ? formData.managed_cup_id : null,
            full_name: formData.full_name.trim() || null
          })

        if (insertError) {
          console.error('Insert Error:', insertError)
          setError(`Failed to create profile: ${insertError.message}`)
          return
        }
      } else {
        // Profile exists, update it
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: 'league_admin',
            managed_league_id: formData.admin_type === 'league' ? formData.managed_league_id : null,
            managed_cup_id: formData.admin_type === 'cup' ? formData.managed_cup_id : null,
            full_name: formData.full_name.trim() || null
          })
          .eq('id', authData.user.id)

        if (updateError) {
          console.error('Update Error:', updateError)
          setError(`Failed to update profile: ${updateError.message}`)
          return
        }
      }

      const managementType = formData.admin_type === 'league' ? 'league' : 'cup'
      setSuccess(`${managementType} admin created successfully! Email: ${formData.email}`)
      resetForm()
      fetchAdmins()
    } catch (err: any) {
      console.error('Unexpected error:', err)
      setError(`Unexpected error: ${err.message || 'Unknown error'}`)
    }
  }

  const removeAdmin = async (adminId: string, email: string) => {
    if (!confirm(`Remove admin access for ${email}?\n\nThis will change their role to 'fan' but will not delete their account.`)) {
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'fan',
        managed_league_id: null,
        managed_cup_id: null
      })
      .eq('id', adminId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Admin access removed successfully')
      fetchAdmins()
    }
  }

  const reassignAdmin = async (adminId: string, adminType: 'league' | 'cup', newId: string) => {
    const updateData = adminType === 'league'
      ? { managed_league_id: newId, managed_cup_id: null }
      : { managed_league_id: null, managed_cup_id: newId }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', adminId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Admin reassigned successfully')
      fetchAdmins()
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      admin_type: '',
      managed_league_id: '',
      managed_cup_id: ''
    })
    setShowForm(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Administrators</h1>
              <p className="text-blue-100">Create and manage league and cup administrators</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Messages */}
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

        {/* Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">About Administrators</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p className="mb-2">You can create two types of administrators:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>League Administrators:</strong> Manage a specific league including divisions, teams, players, and matches</li>
                  <li><strong>Cup Administrators:</strong> Manage a specific cup competition including teams, players, groups, and fixtures</li>
                </ul>
                <p className="mt-2">Each administrator can manage EITHER a league OR a cup, never both.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Button */}
        {!showForm && (
          <div className="mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-3 px-6 rounded-lg transition shadow-lg"
            >
              + Create Administrator
            </button>
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Create Administrator</h2>
              <button
                onClick={resetForm}
                className="text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={createAdmin} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="admin_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Administrator Type *
                </label>
                <select
                  id="admin_type"
                  value={formData.admin_type}
                  onChange={(e) => setFormData({ ...formData, admin_type: e.target.value, managed_league_id: '', managed_cup_id: '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                  required
                >
                  <option value="">Select type...</option>
                  <option value="league">League Administrator</option>
                  <option value="cup">Cup Administrator</option>
                </select>
              </div>

              {formData.admin_type === 'league' && (
                <div>
                  <label htmlFor="managed_league_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Assign League *
                  </label>
                  <select
                    id="managed_league_id"
                    value={formData.managed_league_id}
                    onChange={(e) => setFormData({ ...formData, managed_league_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                    required
                  >
                    <option value="">Select a league...</option>
                    {leagues.map(league => (
                      <option key={league.id} value={league.id}>
                        {league.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.admin_type === 'cup' && (
                <div>
                  <label htmlFor="managed_cup_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Cup *
                  </label>
                  <select
                    id="managed_cup_id"
                    value={formData.managed_cup_id}
                    onChange={(e) => setFormData({ ...formData, managed_cup_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-liberia-blue focus:border-transparent"
                    required
                  >
                    <option value="">Select a cup...</option>
                    {cups.map(cup => (
                      <option key={cup.id} value={cup.id}>
                        {cup.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-3 px-8 rounded-lg transition"
                >
                  Create Administrator
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-8 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Administrators List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-liberia-blue to-liberia-blue-dark">
            <h2 className="text-xl font-bold text-white">Current Administrators ({admins.length})</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <p>Loading administrators...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No administrators created yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manages
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map(admin => (
                    <tr key={admin.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold">{admin.full_name || 'No name'}</div>
                          <div className="text-sm text-gray-600">{admin.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          admin.managed_league_id ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {admin.managed_league_id ? 'League Admin' : 'Cup Admin'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {admin.league && <div className="font-medium">{admin.league.name}</div>}
                        {admin.cup && <div className="font-medium">{admin.cup.name}</div>}
                        {!admin.league && !admin.cup && <span className="text-gray-400">None assigned</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => removeAdmin(admin.id, admin.email)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Remove Access
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
