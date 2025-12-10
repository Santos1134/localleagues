'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Match, Player, MatchEvent } from '@/lib/types/database.types'

export default function MatchManagementPage() {
  const params = useParams()
  const matchId = params.id as string
  const [match, setMatch] = useState<Match | null>(null)
  const [homePlayers, setHomePlayers] = useState<Player[]>([])
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventFormData, setEventFormData] = useState({
    team_id: '',
    player_id: '',
    event_type: '' as 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty' | 'own_goal' | '',
    minute: '',
    extra_time_minute: '0',
    description: ''
  })
  const [scoreData, setScoreData] = useState({
    home_score: 0,
    away_score: 0,
    status: 'scheduled' as 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled'
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchMatchData()
  }, [matchId])

  const fetchMatchData = async () => {
    setLoading(true)

    const { data: matchData } = await supabase
      .from('matches')
      .select(`
        *,
        division:divisions(
          *,
          league:leagues(*)
        ),
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*),
        referee:profiles(full_name)
      `)
      .eq('id', matchId)
      .single()

    if (matchData) {
      setMatch(matchData as Match)
      setScoreData({
        home_score: matchData.home_score,
        away_score: matchData.away_score,
        status: matchData.status as any
      })

      // Fetch players from both teams
      const { data: homePlayersData } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', matchData.home_team_id)
        .eq('is_active', true)
        .order('jersey_number')

      if (homePlayersData) setHomePlayers(homePlayersData as Player[])

      const { data: awayPlayersData } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', matchData.away_team_id)
        .eq('is_active', true)
        .order('jersey_number')

      if (awayPlayersData) setAwayPlayers(awayPlayersData as Player[])
    }

    const { data: eventsData } = await supabase
      .from('match_events')
      .select(`
        *,
        player:players(full_name, jersey_number),
        team:teams(name)
      `)
      .eq('match_id', matchId)
      .order('minute', { ascending: true })

    if (eventsData) setEvents(eventsData as MatchEvent[])

    setLoading(false)
  }

  const updateScore = async () => {
    setError('')
    setSuccess('')

    const { error: updateError } = await supabase
      .from('matches')
      .update({
        home_score: scoreData.home_score,
        away_score: scoreData.away_score,
        status: scoreData.status
      })
      .eq('id', matchId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Score updated successfully!')
      fetchMatchData()
    }
  }

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!eventFormData.team_id || !eventFormData.player_id || !eventFormData.event_type || !eventFormData.minute) {
      setError('Please fill in all required fields')
      return
    }

    const { error: insertError } = await supabase
      .from('match_events')
      .insert({
        match_id: matchId,
        team_id: eventFormData.team_id,
        player_id: eventFormData.player_id,
        event_type: eventFormData.event_type,
        minute: parseInt(eventFormData.minute),
        extra_time_minute: parseInt(eventFormData.extra_time_minute) || 0,
        description: eventFormData.description || null
      })

    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess('Event added successfully!')
      setEventFormData({
        team_id: '',
        player_id: '',
        event_type: '',
        minute: '',
        extra_time_minute: '0',
        description: ''
      })
      setShowEventForm(false)
      fetchMatchData()
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    const { error } = await supabase
      .from('match_events')
      .delete()
      .eq('id', eventId)

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Event deleted successfully')
      fetchMatchData()
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'goal': return '⚽'
      case 'penalty': return '⚽🎯'
      case 'own_goal': return '⚽❌'
      case 'yellow_card': return '🟨'
      case 'red_card': return '🟥'
      case 'substitution': return '🔄'
      default: return '📝'
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
  }

  if (!match) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Match not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-8">
        <div className="container mx-auto px-4">
          <button
            onClick={() => router.push('/admin/matches')}
            className="text-blue-100 hover:text-white mb-2 flex items-center"
          >
            ← Back to Matches
          </button>
          <h1 className="text-3xl font-bold mb-2">Match Management</h1>
          <p className="text-blue-100">
            {(match as any).home_team?.name} vs {(match as any).away_team?.name}
          </p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Match Score</h2>
            <div className="grid grid-cols-3 gap-4 items-center mb-6">
              <div className="text-center">
                <h3 className="font-bold text-lg mb-2">{(match as any).home_team?.name}</h3>
                <input
                  type="number"
                  value={scoreData.home_score}
                  onChange={(e) => setScoreData({ ...scoreData, home_score: parseInt(e.target.value) || 0 })}
                  className="w-full text-center text-4xl font-bold border-2 border-liberia-red rounded-lg py-2"
                  min="0"
                />
              </div>

              <div className="text-center text-2xl font-bold text-gray-400">VS</div>

              <div className="text-center">
                <h3 className="font-bold text-lg mb-2">{(match as any).away_team?.name}</h3>
                <input
                  type="number"
                  value={scoreData.away_score}
                  onChange={(e) => setScoreData({ ...scoreData, away_score: parseInt(e.target.value) || 0 })}
                  className="w-full text-center text-4xl font-bold border-2 border-liberia-red rounded-lg py-2"
                  min="0"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Match Status
              </label>
              <select
                value={scoreData.status}
                onChange={(e) => setScoreData({ ...scoreData, status: e.target.value as any })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
              >
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="postponed">Postponed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <button
              onClick={updateScore}
              className="w-full bg-liberia-red hover:bg-liberia-blue text-white font-bold py-3 rounded-lg"
            >
              Update Score & Status
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Match Info</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Date:</span>
                <div className="font-medium">{new Date(match.match_date).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-500">Venue:</span>
                <div className="font-medium">{match.venue || 'TBD'}</div>
              </div>
              <div>
                <span className="text-gray-500">Referee:</span>
                <div className="font-medium">{(match as any).referee?.full_name || 'TBD'}</div>
              </div>
              <div>
                <span className="text-gray-500">Round:</span>
                <div className="font-medium">Round {match.round_number}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">Match Events</h2>
            <button
              onClick={() => setShowEventForm(!showEventForm)}
              className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-4 rounded"
            >
              {showEventForm ? 'Cancel' : '+ Add Event'}
            </button>
          </div>

          {showEventForm && (
            <div className="p-6 border-b bg-gray-50">
              <form onSubmit={addEvent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team *
                    </label>
                    <select
                      value={eventFormData.team_id}
                      onChange={(e) => setEventFormData({ ...eventFormData, team_id: e.target.value, player_id: '' })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                      required
                    >
                      <option value="">Select team</option>
                      <option value={(match as any).home_team?.id}>{(match as any).home_team?.name}</option>
                      <option value={(match as any).away_team?.id}>{(match as any).away_team?.name}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Player *
                    </label>
                    <select
                      value={eventFormData.player_id}
                      onChange={(e) => setEventFormData({ ...eventFormData, player_id: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                      required
                      disabled={!eventFormData.team_id}
                    >
                      <option value="">Select player</option>
                      {eventFormData.team_id === (match as any).home_team?.id && homePlayers.map(player => (
                        <option key={player.id} value={player.id}>
                          #{player.jersey_number} {player.full_name}
                        </option>
                      ))}
                      {eventFormData.team_id === (match as any).away_team?.id && awayPlayers.map(player => (
                        <option key={player.id} value={player.id}>
                          #{player.jersey_number} {player.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Type *
                    </label>
                    <select
                      value={eventFormData.event_type}
                      onChange={(e) => setEventFormData({ ...eventFormData, event_type: e.target.value as any })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                      required
                    >
                      <option value="">Select type</option>
                      <option value="goal">⚽ Goal</option>
                      <option value="penalty">⚽🎯 Penalty Goal</option>
                      <option value="own_goal">⚽❌ Own Goal</option>
                      <option value="yellow_card">🟨 Yellow Card</option>
                      <option value="red_card">🟥 Red Card</option>
                      <option value="substitution">🔄 Substitution</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minute *
                    </label>
                    <input
                      type="number"
                      value={eventFormData.minute}
                      onChange={(e) => setEventFormData({ ...eventFormData, minute: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                      min="1"
                      max="120"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Extra Time (minutes)
                    </label>
                    <input
                      type="number"
                      value={eventFormData.extra_time_minute}
                      onChange={(e) => setEventFormData({ ...eventFormData, extra_time_minute: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                      min="0"
                      max="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={eventFormData.description}
                      onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                      placeholder="Optional details..."
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded"
                  >
                    Add Event
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEventForm(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="p-6">
            {events.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No events recorded yet. Click "Add Event" to record match events.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{getEventIcon(event.event_type)}</div>
                      <div>
                        <div className="font-medium">
                          {event.minute}' {event.extra_time_minute > 0 && `+${event.extra_time_minute}`} - {' '}
                          <span className="capitalize">{event.event_type.replace('_', ' ')}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {(event as any).player?.full_name} (#{(event as any).player?.jersey_number}) - {(event as any).team?.name}
                        </div>
                        {event.description && (
                          <div className="text-sm text-gray-500 italic">{event.description}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
