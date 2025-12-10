'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Announcement = {
  id: string
  title: string
  content: string
  priority: 'low' | 'medium' | 'high'
  is_published: boolean
  published_at: string | null
  created_at: string
  league?: { id: string; name: string }
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [leagues, setLeagues] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    league_id: '',
    is_published: false,
  })

  useEffect(() => {
    checkAuth()
    fetchLeagues()
    fetchAnnouncements()
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
    const { data } = await supabase
      .from('leagues')
      .select('*')
      .order('name')

    if (data) setLeagues(data)
  }

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*, league:leagues(id, name)')
      .order('created_at', { ascending: false })

    if (data) setAnnouncements(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const announcementData = {
      ...formData,
      created_by: userData.user.id,
      published_at: formData.is_published ? new Date().toISOString() : null,
    }

    const { error: insertError } = await supabase
      .from('announcements')
      .insert(announcementData)

    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess('Announcement created successfully!')
      setShowForm(false)
      setFormData({
        title: '',
        content: '',
        priority: 'medium',
        league_id: '',
        is_published: false,
      })
      fetchAnnouncements()
    }
  }

  const togglePublish = async (id: string, currentStatus: boolean) => {
    const { error: updateError } = await supabase
      .from('announcements')
      .update({
        is_published: !currentStatus,
        published_at: !currentStatus ? new Date().toISOString() : null,
      })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Announcement updated!')
      fetchAnnouncements()
    }
  }

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement?')) return

    const { error: deleteError } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setSuccess('Announcement deleted!')
      fetchAnnouncements()
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Announcements</h1>
          <p className="text-blue-100">Manage league announcements and news</p>
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
            {showForm ? 'Cancel' : '+ New Announcement'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Create Announcement</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                  rows={5}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    League
                  </label>
                  <select
                    value={formData.league_id}
                    onChange={(e) => setFormData({ ...formData, league_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                  >
                    <option value="">All Leagues</option>
                    {leagues.map((league) => (
                      <option key={league.id} value={league.id}>
                        {league.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="h-4 w-4 text-liberia-red focus:ring-liberia-red border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Publish Now</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded"
              >
                Create Announcement
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">All Announcements</h2>
          </div>

          {announcements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No announcements yet. Create your first one!
            </div>
          ) : (
            <div className="divide-y">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{announcement.title}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority.toUpperCase()}
                        </span>
                        {announcement.is_published ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-liberia-blue text-white">
                            PUBLISHED
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-300 text-gray-700">
                            DRAFT
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">{announcement.content}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{announcement.league?.name || 'All Leagues'}</span>
                        <span>•</span>
                        <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => togglePublish(announcement.id, announcement.is_published)}
                        className="text-liberia-blue hover:text-liberia-blue-dark font-medium text-sm"
                      >
                        {announcement.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => deleteAnnouncement(announcement.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
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
