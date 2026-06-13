import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/login
 * 
 * Authenticates user and sets HTTP-only secure cookies
 * 
 * Request body:
 * {
 *   email: string,
 *   password: string
 * }
 * 
 * Returns: { success: true, user: { id, email } }
 * Sets: sb-access-token, sb-refresh-token (HTTP-only, Secure, SameSite=Strict)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      { status: 200 }
    )

    // Set HTTP-only cookies with strong security settings
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    }

    response.cookies.set('sb-access-token', data.session.access_token, {
      ...cookieOptions,
      maxAge: data.session.expires_in,
    })

    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      ...cookieOptions,
    })

    return response
  } catch (error) {
    console.error('LOGIN ERROR:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
