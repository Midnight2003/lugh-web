import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

/**
 * Utility to verify user authentication from HTTP-only cookies
 * This ensures that:
 * 1. User has a valid session token
 * 2. Token is validated with Supabase
 * 3. User data is securely retrieved
 * 
 * Usage in API routes:
 * const { user, error } = await verifyAuth(request)
 * if (error) return NextResponse.json({ error }, { status: 401 })
 */
export async function verifyAuth(request?: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value

    if (!accessToken) {
      return {
        user: null,
        error: 'No session found. Please log in.',
      }
    }

    // Create Supabase client with access token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    )

    // Verify token by getting user
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      return {
        user: null,
        error: 'Invalid or expired session.',
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      error: null,
    }
  } catch (err) {
    console.error('AUTH VERIFICATION ERROR:', err)
    return {
      user: null,
      error: 'Authentication verification failed.',
    }
  }
}

/**
 * Middleware to protect API routes
 * Ensures user is authenticated before processing request
 * 
 * Usage:
 * export async function POST(request: NextRequest) {
 *   const { user, error } = await verifyAuth()
 *   if (error) return NextResponse.json({ error }, { status: 401 })
 *   // Now user.id is guaranteed to be set
 * }
 */
export async function requireAuth(request?: NextRequest) {
  return verifyAuth(request)
}
