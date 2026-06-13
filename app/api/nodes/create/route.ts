import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

/**
 * POST /api/nodes/create
 * 
 * Create a new folder or student node.
 * Uses HTTP-only cookies for authentication (no token passing).
 * 
 * Security:
 * - User verified from secure HTTP-only cookies
 * - User can only create nodes in their own workspace
 * - RLS policies enforce data isolation at database level
 * 
 * Request body:
 * {
 *   name: string,
 *   type: 'folder' | 'student',
 *   parentId: string | null
 * }
 * 
 * Returns: { id, name, type, parent_id, user_id }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user from secure cookies
    const { user, error: authError } = await verifyAuth()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authError || 'Not authenticated' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { name, type, parentId } = body

    // Server-side validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!type || !['folder', 'student'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid request: type must be "folder" or "student"' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // If parentId provided, validate it exists and belongs to user (RLS will enforce)
    if (parentId) {
      const { data: parentNode, error: parentError } = await supabase
        .from('nodes')
        .select('id')
        .eq('id', parentId)
        .eq('user_id', user.id)
        .single()

      if (parentError || !parentNode) {
        return NextResponse.json(
          { error: 'Parent folder not found or does not belong to you' },
          { status: 400 }
        )
      }
    }

    // Create the node (RLS will ensure user_id matches)
    const { data, error } = await supabase
      .from('nodes')
      .insert({
        name: name.trim(),
        type,
        parent_id: parentId || null,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('NODE CREATE ERROR:', error)
      return NextResponse.json(
        { error: 'Failed to create node', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('POST /api/nodes/create ERROR:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
