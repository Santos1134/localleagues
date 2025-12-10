import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, full_name, role, managed_league_id, managed_cup_id, user_id } = body

    console.log('[API] Received request:', { email, role, managed_league_id, managed_cup_id, user_id })

    // Validate required fields
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if env vars are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[API] Missing env vars!')
      return NextResponse.json(
        { error: 'Server configuration error: Missing environment variables' },
        { status: 500 }
      )
    }

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('[API] Created admin client, upserting profile...')

    // Insert or update the profile with admin role and permissions using service role (bypasses RLS)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user_id,
        email: email.trim().toLowerCase(),
        role: role || 'league_admin',
        managed_league_id: managed_league_id || null,
        managed_cup_id: managed_cup_id || null,
        full_name: full_name || null
      }, {
        onConflict: 'id'
      })
      .select()

    if (profileError) {
      console.error('[API] Profile update error:', profileError)
      return NextResponse.json(
        { error: `Profile update failed: ${profileError.message}` },
        { status: 500 }
      )
    }

    console.log('[API] Profile updated successfully:', profileData)

    return NextResponse.json({
      success: true,
      user: {
        id: user_id,
        email: email
      }
    })

  } catch (error: any) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
