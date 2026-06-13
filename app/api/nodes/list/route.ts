import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

/**
 * GET /api/nodes/list
 * 
 * List all nodes for the authenticated user.
 * Uses HTTP-only cookies for authentication.
 * 
 * Security:
 * - User verified from secure cookies
 * - RLS policies ensure only user's nodes are returned
 * - No cross-user data leakage possible
 * 
 * Query params (optional):
 * - type: 'folder' | 'student' | 'file' (filter by type)
 * - parentId: string (filter by parent)
 * - limit: number (pagination)
 * - offset: number (pagination)
 * 
 * Returns: [{ id, name, type, parent_id, user_id, ... }]
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user from secure cookies
    const { user, error: authError } = await verifyAuth()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authError || 'Not authenticated' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const parentId = searchParams.get('parentId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Build query (RLS policies will ensure user_id = authenticated user)
    let query = supabase
      .from('nodes')
      .select('*')
      .eq('user_id', user.id)

    // Apply filters
    if (type && ['folder', 'student', 'file'].includes(type)) {
      query = query.eq('type', type)
    }

    if (parentId) {
      query = query.eq('parent_id', parentId)
    } else {
      // If no parentId filter, show root-level items
      query = query.is('parent_id', null)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('NODES LIST ERROR:', error)
      return NextResponse.json(
        { error: 'Failed to fetch nodes', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        limit,
        offset,
        count: data?.length || 0,
      },
    })
  } catch (error) {
    console.error('GET /api/nodes/list ERROR:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
