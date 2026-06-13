import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

/**
 * POST /api/files/upload
 * 
 * Upload a file with validation and metadata storage.
 * Uses HTTP-only cookies for authentication.
 * 
 * Security:
 * - User verified from secure cookies
 * - File ownership verified before upload
 * - RLS ensures only owner can access file
 * - Automatic cleanup on failure
 * 
 * Request: multipart/form-data
 * - file: File object
 * - parentId: string (folder to upload to)
 * - studentId: string (student associated with file)
 * - tags: string[] (optional tags)
 * 
 * Returns: { nodeId, storagePath, size, mimeType, uploadedAt }
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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const parentId = formData.get('parentId') as string
    const studentId = formData.get('studentId') as string

    // Validation
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // File type validation
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Use PDF, DOCX, XLSX, JPG, or PNG.' },
        { status: 400 }
      )
    }

    // File size validation (10MB max)
    const maxBytes = 10 * 1024 * 1024
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: 'File too large. Maximum 10MB allowed.' },
        { status: 400 }
      )
    }

    // Verify parent folder belongs to user
    if (parentId) {
      const { data: parent } = await supabase
        .from('nodes')
        .select('id')
        .eq('id', parentId)
        .eq('user_id', user.id)
        .single()

      if (!parent) {
        return NextResponse.json(
          { error: 'Parent folder not found' },
          { status: 400 }
        )
      }
    }

    // Create file node
    const { data: fileNode, error: nodeError } = await supabase
      .from('nodes')
      .insert({
        name: file.name,
        type: 'file',
        parent_id: parentId || null,
        user_id: user.id,
      })
      .select()
      .single()

    if (nodeError || !fileNode) {
      return NextResponse.json(
        { error: 'Failed to create file node', message: nodeError?.message },
        { status: 500 }
      )
    }

    // Upload to storage
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `students/${studentId}/${Date.now()}_${safeFileName}`

    const buffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('student-files')
      .upload(storagePath, Buffer.from(buffer), {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      // Cleanup: delete the node we just created
      await supabase.from('nodes').delete().eq('id', fileNode.id)
      console.error('STORAGE UPLOAD ERROR:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage', message: uploadError.message },
        { status: 500 }
      )
    }

    // Save file metadata
    const { error: metadataError } = await supabase
      .from('files')
      .insert({
        node_id: fileNode.id,
        name: file.name,
        storage_path: storagePath,
        mime_type: file.type,
        size: file.size,
        uploaded_at: new Date().toISOString(),
        student_id: studentId,
      })

    if (metadataError) {
      // Cleanup: delete file from storage and node
      await supabase.storage.from('student-files').remove([storagePath])
      await supabase.from('nodes').delete().eq('id', fileNode.id)
      console.error('METADATA ERROR:', metadataError)
      return NextResponse.json(
        { error: 'Failed to save file metadata', message: metadataError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        nodeId: fileNode.id,
        storagePath,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/files/upload ERROR:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
