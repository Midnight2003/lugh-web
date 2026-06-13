import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/signup
 * 
 * Creates a new user and sets HTTP-only secure cookies
 * 
 * Request body:
 * {
 *   email: string,
 *   password: string
 * }
 * 
 * Returns: { success: true, user: { id, email }, message: string }
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

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Sign up with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      },
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 500 }
      )
    }

    // If session exists (auto-confirmation), set cookies
    if (data.session) {
      const response = NextResponse.json(
        {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email,
          },
          message: 'Account created successfully',
        },
        { status: 201 }
      )

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      }

      response.cookies.set('sb-access-token', data.session.access_token, {
        ...cookieOptions,
        maxAge: data.session.expires_in,
      })

      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        ...cookieOptions,
      })

      return response
    }

    // Otherwise, email confirmation required
    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        message: 'Check your email to confirm your account',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('SIGNUP ERROR:', error)
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    )
  }
}
