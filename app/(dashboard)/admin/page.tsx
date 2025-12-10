import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/admin/LogoutButton'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, managed_league_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'league_admin')) {
    redirect('/')
  }

  const isSuperAdmin = profile.role === 'admin'

  const [leaguesResult, divisionsResult, teamsResult, matchesResult, cupsResult] = await Promise.all([
    supabase.from('leagues').select('*', { count: 'exact' }),
    supabase.from('divisions').select('*', { count: 'exact' }),
    supabase.from('teams').select('*', { count: 'exact' }),
    supabase.from('matches').select('*', { count: 'exact' }).eq('status', 'scheduled'),
    supabase.from('cups').select('*', { count: 'exact' }),
  ])

  const stats = {
    leagues: leaguesResult.count || 0,
    divisions: divisionsResult.count || 0,
    teams: teamsResult.count || 0,
    upcomingMatches: matchesResult.count || 0,
    cups: cupsResult.count || 0,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Liberian Colors */}
      <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white shadow-lg border-b-4 border-liberia-red">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-blue-100">Manage your league system</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics Cards with Liberian Colors */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-liberia-red">
            <div className="text-sm font-medium text-gray-600 mb-2">Total Leagues</div>
            <div className="text-4xl font-bold text-liberia-blue">{stats.leagues}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-liberia-blue">
            <div className="text-sm font-medium text-gray-600 mb-2">Total Divisions</div>
            <div className="text-4xl font-bold text-liberia-red">{stats.divisions}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-liberia-red">
            <div className="text-sm font-medium text-gray-600 mb-2">Total Teams</div>
            <div className="text-4xl font-bold text-liberia-blue">{stats.teams}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-liberia-blue">
            <div className="text-sm font-medium text-gray-600 mb-2">Cup Competitions</div>
            <div className="text-4xl font-bold text-liberia-red">{stats.cups}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-liberia-red">
            <div className="text-sm font-medium text-gray-600 mb-2">Upcoming Matches</div>
            <div className="text-4xl font-bold text-liberia-blue">{stats.upcomingMatches}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8 border-l-4 border-liberia-red">
          <h2 className="text-2xl font-bold mb-6 text-liberia-blue">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/leagues"
              className="p-6 bg-gradient-to-br from-liberia-blue to-liberia-blue-dark text-white rounded-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <div className="text-3xl mb-3">⚽</div>
              <div className="font-bold text-lg">Manage Leagues</div>
              <div className="text-sm text-blue-100 mt-1">Create and manage leagues</div>
            </Link>

            <Link
              href="/admin/cups"
              className="p-6 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <div className="text-3xl mb-3">🏆</div>
              <div className="font-bold text-lg">Cup Competitions</div>
              <div className="text-sm text-yellow-100 mt-1">Create and manage tournaments</div>
            </Link>

            <Link
              href="/admin/matches"
              className="p-6 bg-gradient-to-br from-liberia-red to-liberia-red-dark text-white rounded-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <div className="text-3xl mb-3">📅</div>
              <div className="font-bold text-lg">Manage Matches</div>
              <div className="text-sm text-red-100 mt-1">Schedule and manage fixtures</div>
            </Link>

            {isSuperAdmin && (
              <Link
                href="/admin/administrators"
                className="p-6 bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <div className="text-3xl mb-3">👥</div>
                <div className="font-bold text-lg">Administrators</div>
                <div className="text-sm text-purple-100 mt-1">Manage league & cup admins</div>
              </Link>
            )}

            <Link
              href="/standings"
              className="p-6 bg-gradient-to-br from-liberia-blue to-liberia-blue-dark text-white rounded-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <div className="text-3xl mb-3">📊</div>
              <div className="font-bold text-lg">View Standings</div>
              <div className="text-sm text-blue-100 mt-1">League tables and stats</div>
            </Link>

            <Link
              href="/admin/announcements"
              className="p-6 bg-gradient-to-br from-liberia-red to-liberia-red-dark text-white rounded-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <div className="text-3xl mb-3">📢</div>
              <div className="font-bold text-lg">Announcements</div>
              <div className="text-sm text-red-100 mt-1">Manage league news</div>
            </Link>

            <Link
              href="/admin/transfers"
              className="p-6 bg-gradient-to-br from-liberia-blue to-liberia-blue-dark text-white rounded-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <div className="text-3xl mb-3">🔄</div>
              <div className="font-bold text-lg">Player Transfers</div>
              <div className="text-sm text-blue-100 mt-1">Manage player movements</div>
            </Link>

            <Link
              href="/admin/archives"
              className="p-6 bg-gradient-to-br from-liberia-red to-liberia-red-dark text-white rounded-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <div className="text-3xl mb-3">📦</div>
              <div className="font-bold text-lg">Season Archives</div>
              <div className="text-sm text-red-100 mt-1">Archive and restore leagues</div>
            </Link>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Leagues Section */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border-t-4 border-liberia-blue">
            <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white px-6 py-4">
              <h2 className="text-xl font-bold">League Management</h2>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                <li>
                  <Link href="/admin/leagues" className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition">
                    <span className="font-medium text-gray-700">Manage Leagues</span>
                    <span className="text-liberia-blue">→</span>
                  </Link>
                </li>
                <li>
                  <Link href="/admin/leagues" className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition">
                    <span className="font-medium text-gray-700">Manage Divisions</span>
                    <span className="text-liberia-blue">→</span>
                  </Link>
                </li>
                <li>
                  <Link href="/admin/leagues" className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition">
                    <span className="font-medium text-gray-700">Manage Teams</span>
                    <span className="text-liberia-blue">→</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Matches Section */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border-t-4 border-liberia-red">
            <div className="bg-gradient-to-r from-liberia-red to-liberia-red-dark text-white px-6 py-4">
              <h2 className="text-xl font-bold">Match Management</h2>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                <li>
                  <Link href="/admin/matches" className="flex items-center justify-between p-3 hover:bg-red-50 rounded-lg transition">
                    <span className="font-medium text-gray-700">Schedule Matches</span>
                    <span className="text-liberia-red">→</span>
                  </Link>
                </li>
                <li>
                  <Link href="/admin/matches" className="flex items-center justify-between p-3 hover:bg-red-50 rounded-lg transition">
                    <span className="font-medium text-gray-700">Generate Fixtures</span>
                    <span className="text-liberia-red">→</span>
                  </Link>
                </li>
                <li>
                  <Link href="/admin/matches" className="flex items-center justify-between p-3 hover:bg-red-50 rounded-lg transition">
                    <span className="font-medium text-gray-700">Manage Results</span>
                    <span className="text-liberia-red">→</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Players Section */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border-t-4 border-liberia-blue">
            <div className="bg-gradient-to-r from-liberia-blue to-liberia-blue-dark text-white px-6 py-4">
              <h2 className="text-xl font-bold">Player Management</h2>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                <li>
                  <Link href="/admin/leagues" className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition">
                    <span className="font-medium text-gray-700">Manage Players</span>
                    <span className="text-liberia-blue">→</span>
                  </Link>
                </li>
                <li>
                  <Link href="/players" className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition">
                    <span className="font-medium text-gray-700">View Statistics</span>
                    <span className="text-liberia-blue">→</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* System Section */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border-t-4 border-liberia-red">
            <div className="bg-gradient-to-r from-liberia-red to-liberia-red-dark text-white px-6 py-4">
              <h2 className="text-xl font-bold">System</h2>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                <li>
                  <Link href="/standings" className="flex items-center justify-between p-3 hover:bg-red-50 rounded-lg transition">
                    <span className="font-medium text-gray-700">View Public Standings</span>
                    <span className="text-liberia-red">→</span>
                  </Link>
                </li>
                <li>
                  <Link href="/fixtures" className="flex items-center justify-between p-3 hover:bg-red-50 rounded-lg transition">
                    <span className="font-medium text-gray-700">View Public Fixtures</span>
                    <span className="text-liberia-red">→</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
