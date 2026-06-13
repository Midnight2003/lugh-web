import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

/**
 * GET /api/auth/session
 * 
 * Returns the current authenticated user session from HTTP-only cookies
 * 
 * Security:
 * - Token from HTTP-only cookies (not exposed to JavaScript)
 * - Server-side validation
 * - No token passing required
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyAuth()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: error || 'No active session' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user,
    })
  } catch (error) {
    console.error('SESSION ERROR:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
