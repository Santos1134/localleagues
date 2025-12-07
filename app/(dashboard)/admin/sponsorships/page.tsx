'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface SponsorshipInquiry {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone: string
  sponsorship_interest: string
  budget_range: string
  message: string
  status: 'new' | 'contacted' | 'in_progress' | 'completed' | 'declined'
  created_at: string
}

export default function SponsorshipsManagementPage() {
  const [inquiries, setInquiries] = useState<SponsorshipInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchInquiries()
  }, [filter])

  const fetchInquiries = async () => {
    setLoading(true)
    let query = supabase
      .from('sponsorship_inquiries')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data } = await query
    if (data) setInquiries(data as SponsorshipInquiry[])
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('sponsorship_inquiries')
      .update({ status })
      .eq('id', id)

    if (!error) {
      fetchInquiries()
    }
  }

  const getInterestLabel = (interest: string) => {
    const labels: Record<string, string> = {
      league_naming: 'League Naming Rights',
      division: 'Division Sponsorship',
      feature: 'Feature Sponsorship',
      team: 'Team Sponsorship',
      multiple: 'Multiple Opportunities',
      other: 'Other'
    }
    return labels[interest] || interest
  }

  const getBudgetLabel = (budget: string) => {
    const labels: Record<string, string> = {
      under_1000: 'Under $1,000',
      '1000_5000': '$1,000 - $5,000',
      '5000_10000': '$5,000 - $10,000',
      '10000_plus': '$10,000+'
    }
    return labels[budget] || budget || 'Not specified'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      declined: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Sponsorship Inquiries</h1>
          <p className="text-blue-100">Manage sponsorship opportunities and leads</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex overflow-x-auto">
            {[
              { value: 'all', label: 'All' },
              { value: 'new', label: 'New' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'declined', label: 'Declined' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-6 py-4 font-medium border-b-2 transition ${
                  filter === tab.value
                    ? 'border-liberia-red text-liberia-red'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.value !== 'all' && (
                  <span className="ml-2 text-xs">
                    ({inquiries.filter(i => i.status === tab.value).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Inquiries List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">
              {filter === 'all' ? 'All Inquiries' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Inquiries`}
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : inquiries.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No inquiries found
            </div>
          ) : (
            <div className="divide-y">
              {inquiries.map((inquiry) => (
                <div key={inquiry.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{inquiry.company_name}</h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(inquiry.status)}`}>
                          {inquiry.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-1">Contact: {inquiry.contact_name}</p>
                      <p className="text-sm text-gray-500">
                        Submitted {new Date(inquiry.created_at).toLocaleDateString()} at{' '}
                        {new Date(inquiry.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <a href={`mailto:${inquiry.email}`} className="text-liberia-blue hover:underline">
                        {inquiry.email}
                      </a>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <a href={`tel:${inquiry.phone}`} className="text-liberia-blue hover:underline">
                        {inquiry.phone}
                      </a>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Interest</p>
                      <p className="font-medium">{getInterestLabel(inquiry.sponsorship_interest)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Budget Range</p>
                      <p className="font-medium">{getBudgetLabel(inquiry.budget_range)}</p>
                    </div>
                  </div>

                  {inquiry.message && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-1">Message</p>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{inquiry.message}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <select
                      value={inquiry.status}
                      onChange={(e) => updateStatus(inquiry.id, e.target.value)}
                      className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-blue"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="declined">Declined</option>
                    </select>

                    <a
                      href={`mailto:${inquiry.email}?subject=Re: Sponsorship Inquiry - ${inquiry.company_name}`}
                      className="px-4 py-2 bg-liberia-blue text-white rounded-lg hover:bg-liberia-blue-dark"
                    >
                      Send Email
                    </a>

                    <a
                      href={`https://wa.me/${inquiry.phone.replace(/\D/g, '')}?text=Hello ${inquiry.contact_name}, thank you for your sponsorship inquiry for ${inquiry.company_name}.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mt-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {inquiries.filter(i => i.status === 'new').length}
            </div>
            <div className="text-gray-600">New Inquiries</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {inquiries.filter(i => i.status === 'in_progress').length}
            </div>
            <div className="text-gray-600">In Progress</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {inquiries.filter(i => i.status === 'completed').length}
            </div>
            <div className="text-gray-600">Completed</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-liberia-blue mb-2">
              {inquiries.length}
            </div>
            <div className="text-gray-600">Total Inquiries</div>
          </div>
        </div>
      </div>
    </div>
  )
}
