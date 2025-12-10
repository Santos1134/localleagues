'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Match, Player, MatchEvent } from '@/lib/types/database.types'

export default function OfficialMatchPage() {
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

  const quickScore = (team: 'home' | 'away') => {
    if (team === 'home') {
      setScoreData({ ...scoreData, home_score: scoreData.home_score + 1 })
    } else {
      setScoreData({ ...scoreData, away_score: scoreData.away_score + 1 })
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
            onClick={() => router.push('/official')}
            className="text-blue-100 hover:text-white mb-2 flex items-center"
          >
            ← Back to Dashboard
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

        {/* Live Score Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center">Live Score</h2>
          <div className="grid grid-cols-3 gap-4 items-center mb-6">
            <div className="text-center">
              <h3 className="font-bold text-xl mb-4">{(match as any).home_team?.name}</h3>
              <div className="flex flex-col items-center gap-2">
                <div className="text-6xl font-bold text-liberia-red">{scoreData.home_score}</div>
                <button
                  onClick={() => quickScore('home')}
                  className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-8 rounded-lg"
                >
                  + Goal
                </button>
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-gray-400 mb-4">VS</div>
              <div className="space-y-2">
                <select
                  value={scoreData.status}
                  onChange={(e) => setScoreData({ ...scoreData, status: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-liberia-red"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="live">🔴 Live</option>
                  <option value="completed">Completed</option>
                  <option value="postponed">Postponed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  onClick={updateScore}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                  Save Score
                </button>
              </div>
            </div>

            <div className="text-center">
              <h3 className="font-bold text-xl mb-4">{(match as any).away_team?.name}</h3>
              <div className="flex flex-col items-center gap-2">
                <div className="text-6xl font-bold text-liberia-red">{scoreData.away_score}</div>
                <button
                  onClick={() => quickScore('away')}
                  className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-8 rounded-lg"
                >
                  + Goal
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Match Events */}
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
                      Extra Time
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

                <button
                  type="submit"
                  className="bg-liberia-red hover:bg-liberia-blue text-white font-bold py-2 px-6 rounded"
                >
                  Add Event
                </button>
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
                  <div key={event.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="text-3xl">{getEventIcon(event.event_type)}</div>
                    <div className="flex-1">
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
