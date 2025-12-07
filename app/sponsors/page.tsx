'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SponsorsPage() {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    sponsorship_interest: 'league_naming',
    budget_range: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Store sponsorship inquiry in database
    const { error: insertError } = await supabase
      .from('sponsorship_inquiries')
      .insert({
        ...formData,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      setError('Failed to submit inquiry. Please try again.')
    } else {
      setSuccess(true)
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        sponsorship_interest: 'league_naming',
        budget_range: '',
        message: ''
      })
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Become a Sponsor
            </h1>
            <p className="text-xl text-blue-100">
              Partner with Liberia's premier football league platform and reach thousands of passionate fans
            </p>
          </div>
        </div>
      </div>

      {/* Sponsorship Opportunities */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Sponsorship Opportunities</h2>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* League Naming Rights */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-bold mb-3">League Naming Rights</h3>
              <p className="text-gray-600 mb-4">
                Your brand as the title sponsor of an entire league
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ Logo on all league pages</li>
                <li>✓ Mentioned in all announcements</li>
                <li>✓ Social media promotion</li>
                <li>✓ Press release coverage</li>
              </ul>
              <p className="mt-4 text-2xl font-bold text-liberia-blue">
                $5,000-15,000/year
              </p>
            </div>

            {/* Division Sponsorship */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-4xl mb-4">⚽</div>
              <h3 className="text-xl font-bold mb-3">Division Sponsorship</h3>
              <p className="text-gray-600 mb-4">
                Sponsor a specific division and connect with dedicated fans
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ Division naming rights</li>
                <li>✓ Logo on standings page</li>
                <li>✓ Match reports mention</li>
                <li>✓ Digital branding</li>
              </ul>
              <p className="mt-4 text-2xl font-bold text-liberia-blue">
                $1,000-3,000/year
              </p>
            </div>

            {/* Feature Sponsorship */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-4xl mb-4">⭐</div>
              <h3 className="text-xl font-bold mb-3">Feature Sponsorship</h3>
              <p className="text-gray-600 mb-4">
                Sponsor popular features like Player of the Week
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ "Presented by" branding</li>
                <li>✓ Logo placement</li>
                <li>✓ Weekly social media posts</li>
                <li>✓ Fan engagement</li>
              </ul>
              <p className="mt-4 text-2xl font-bold text-liberia-blue">
                $500-1,500/year
              </p>
            </div>
          </div>

          {/* Platform Stats */}
          <div className="bg-liberia-blue text-white rounded-lg p-8 mb-16">
            <h3 className="text-2xl font-bold mb-6 text-center">Why Sponsor Us?</h3>
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">1000+</div>
                <div className="text-blue-100">Monthly Visitors</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">50+</div>
                <div className="text-blue-100">Teams</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">500+</div>
                <div className="text-blue-100">Players</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">100%</div>
                <div className="text-blue-100">Football Fans</div>
              </div>
            </div>
          </div>

          {/* Inquiry Form */}
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Submit Sponsorship Inquiry</h2>

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                Thank you for your interest! We will contact you within 24-48 hours.
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-blue"
                    placeholder="+231 XXX XXX XXX"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsorship Interest *
                  </label>
                  <select
                    value={formData.sponsorship_interest}
                    onChange={(e) => setFormData({ ...formData, sponsorship_interest: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-blue"
                    required
                  >
                    <option value="league_naming">League Naming Rights</option>
                    <option value="division">Division Sponsorship</option>
                    <option value="feature">Feature Sponsorship</option>
                    <option value="team">Team Sponsorship</option>
                    <option value="multiple">Multiple Opportunities</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Range
                  </label>
                  <select
                    value={formData.budget_range}
                    onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-blue"
                  >
                    <option value="">Select budget range</option>
                    <option value="under_1000">Under $1,000</option>
                    <option value="1000_5000">$1,000 - $5,000</option>
                    <option value="5000_10000">$5,000 - $10,000</option>
                    <option value="10000_plus">$10,000+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-blue"
                  rows={4}
                  placeholder="Tell us about your sponsorship goals and objectives..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-liberia-red hover:bg-liberia-blue text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Inquiry'}
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-2">Have questions? Contact us directly:</p>
            <div className="space-y-1">
              <p className="font-medium">
                <a href="mailto:sumomarky@gmail.com" className="text-liberia-blue hover:underline">
                  sumomarky@gmail.com
                </a>
              </p>
              <p className="font-medium">
                <a href="https://wa.me/231776428126" target="_blank" rel="noopener noreferrer" className="text-liberia-blue hover:underline">
                  +231 776 428 126 (WhatsApp)
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
