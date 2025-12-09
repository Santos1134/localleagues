import Link from 'next/link'
import AnnouncementsFeed from '@/components/AnnouncementsFeed'
import LiveScore from '@/components/LiveScore'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  // Fetch real stats from database
  const [leaguesResult, divisionsResult, teamsResult, playersResult] = await Promise.all([
    supabase.from('leagues').select('id', { count: 'exact', head: true }),
    supabase.from('divisions').select('id', { count: 'exact', head: true }),
    supabase.from('teams').select('id', { count: 'exact', head: true }),
    supabase.from('players').select('id', { count: 'exact', head: true }),
  ])

  const stats = {
    leagues: leaguesResult.count || 0,
    divisions: divisionsResult.count || 0,
    teams: teamsResult.count || 0,
    players: playersResult.count || 0,
  }

  return (
    <div className="bg-gray-50">
      <section className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to Liberia Division League
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Your complete platform for managing and tracking Liberia's football leagues.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/standings"
                className="bg-yellow-500 text-liberia-blue-dark px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-400 transition"
              >
                View Standings
              </Link>
              <Link
                href="/fixtures"
                className="bg-white text-liberia-blue-dark px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition"
              >
                View Fixtures
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl font-bold text-liberia-blue mb-2">{stats.leagues}</div>
              <div className="text-gray-600">Active Leagues</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-liberia-blue mb-2">{stats.divisions}</div>
              <div className="text-gray-600">Divisions</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-liberia-blue mb-2">{stats.teams}</div>
              <div className="text-gray-600">Teams</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-liberia-blue mb-2">{stats.players}</div>
              <div className="text-gray-600">Players</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Scores Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <LiveScore
            autoRefresh={true}
            refreshInterval={30000}
            showUpcoming={true}
            showRecent={true}
            limit={10}
          />
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <AnnouncementsFeed />
          </div>

          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Platform Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="text-4xl mb-4">⚽</div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">
                Live Standings
              </h3>
              <p className="text-gray-600">
                Real-time league standings updated automatically after each match.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">
                Player Statistics
              </h3>
              <p className="text-gray-600">
                Comprehensive player stats including goals, assists, and cards.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">
                Match Fixtures
              </h3>
              <p className="text-gray-600">
                Complete fixture schedules for all divisions.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
