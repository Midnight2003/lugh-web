'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import blacklogo from '../image/blacklogo.png'
import whitelogo1 from '../image/whitelogo1.png'

type Node = {
  id: string
  name: string
  type: 'folder' | 'student' | 'file'
  parent_id: string | null
  profile_photo_path?: string | null
}

type FileMeta = {
  node_id: string
  name: string
  size: number
  mime_type: string
  uploaded_at: string
  storage_path: string
  student_id: string
  file_url?: string
}

type NodeWithMeta = Node & {
  fileMeta?: FileMeta
}

type Tag = { id: string; name: string }

export default function Home() {
  const router = useRouter()

  const [navigationStack, setNavigationStack] = useState<Node[]>([])
  const [tab, setTab] = useState<'folders' | 'students'>('folders')
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [initialNavigationRestored, setInitialNavigationRestored] = useState(false)
  const [dark, setDark] = useState(false)

  const currentFolderId = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1].id : null

  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showStudentModal, setShowStudentModal] = useState(false)

  const [folderName, setFolderName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const [selectedStudent, setSelectedStudent] = useState<Node | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState<Node | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [isDeleting, setIsDeleting] = useState(false)

  // Student folder navigation
  const [studentPathStack, setStudentPathStack] = useState<string[]>([])
  const [studentFolderContents, setStudentFolderContents] = useState<NodeWithMeta[]>([])
  const [studentContentsLoading, setStudentContentsLoading] = useState(false)
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null)
  const [previewMimeType, setPreviewMimeType] = useState<string | null>(null)
  const [previewFileName, setPreviewFileName] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // FAB actions inside student modal
  const [showFabMenu, setShowFabMenu] = useState(false)
  const [showNewFolderTypeModal, setShowNewFolderTypeModal] = useState(false)
  const [newFolderType, setNewFolderType] = useState<'normal' | 'compiled' | null>(null)
  const [newFolderNameInput, setNewFolderNameInput] = useState('')
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [compilationMode, setCompilationMode] = useState<'auto' | 'manual'>('auto')
  const [availableFilesForCompilation, setAvailableFilesForCompilation] = useState<Pick<Node, 'id' | 'name'>[]>([])
  const [manuallySelectedFileIds, setManuallySelectedFileIds] = useState<string[]>([])

  async function loadAllTags() {
    if (!user) return
    const { data, error } = await supabase.from('tags').select('id,name').eq('user_id', user.id)
    if (error) {
      console.error('LOAD TAGS ERROR:', error)
      return
    }
    setAllTags(data || [])
  }

  // File upload
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [fileTags, setFileTags] = useState<string[]>([])
  const [fileUploading, setFileUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [studentPhotoFile, setStudentPhotoFile] = useState<File | null>(null)
  const [studentPhotoPreview, setStudentPhotoPreview] = useState<string | null>(null)
  const [studentAvatarUrls, setStudentAvatarUrls] = useState<Record<string, string>>({})

  // Dark mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  const t = {
    bg: dark ? '#0f0f0f' : '#f5f4f0',
    topbar: dark ? '#111' : '#fff',
    topbarBorder: dark ? '#222' : '#e8e5de',
    card: dark ? '#1a1a1a' : '#fff',
    cardBorder: dark ? '#2e2e2e' : '#e8e5de',
    cardHoverShadow: dark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    text: dark ? '#f0f0f0' : '#1a1a1a',
    textMuted: dark ? '#666' : '#aaa',
    textSub: dark ? '#555' : '#aaa',
    inputBg: dark ? '#111' : '#fff',
    inputBorder: dark ? '#333' : '#e8e5de',
    tabActiveBg: dark ? '#f0f0f0' : '#1a1a1a',
    tabActiveText: dark ? '#0f0f0f' : '#fff',
    tabInactiveText: dark ? '#666' : '#888',
    btnPrimary: dark ? '#f0f0f0' : '#1a1a1a',
    btnPrimaryText: dark ? '#0f0f0f' : '#fff',
    btnGhostBorder: dark ? '#333' : '#e8e5de',
    btnGhostText: dark ? '#ccc' : '#555',
    btnGhostHover: dark ? '#222' : '#f5f4f0',
    avatarBg: dark ? '#222' : '#f5f4f0',
    initialsBg: dark ? '#4f46e5' : '#8b5cf6',
    initialsText: '#fff',
    folderIconBg: dark ? '#2a2200' : '#fef9ec',
    modalOverlay: 'rgba(0,0,0,0.6)',
    modalBg: dark ? '#1a1a1a' : '#fff',
    modalDivider: dark ? '#2a2a2a' : '#f0ede6',
    chipBg: dark ? '#222' : '#f5f4f0',
    chipBorder: dark ? '#333' : '#e8e5de',
    chipText: dark ? '#ccc' : '#555',
    fabBg: dark ? '#f0f0f0' : '#1a1a1a',
    fabText: dark ? '#0f0f0f' : '#fff',
    deleteBtn: dark ? '#444' : '#ccc',
    deleteBtnHover: dark ? '#f87171' : '#c51f37',
    deleteBtnHoverBg: dark ? '#2d0f0f' : '#fff5f5',
    toastSuccess: '#22c55e',
    toastError: '#ef4444',
  }

  // Auth
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setErrorMessage(null)
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) throw error
        if (!data.user) {
          router.push('/login')
          return
        }
        setUser(data.user)
      } catch (err) {
        console.error('AUTH INIT ERROR:', err)
        setErrorMessage('Unable to verify your session. Please sign in again.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!user?.id || initialNavigationRestored) return
    const restore = async () => {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const pathParam = params?.get('path')
      if (!pathParam) {
        setNavigationStack([])
        setInitialNavigationRestored(true)
        return
      }

      const ids = pathParam.split(',').map(id => id.trim()).filter(Boolean)
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
      const validIds = ids.filter(id => uuidRegex.test(id))
      if (!validIds.length) {
        setNavigationStack([])
        setInitialNavigationRestored(true)
        return
      }

      const { data, error } = await supabase
        .from('nodes')
        .select('id,name,type,parent_id')
        .in('id', validIds)
        .eq('user_id', user.id)

      if (error || !data) {
        console.error('NAV RESTORE ERROR:', error)
        setNavigationStack([])
        setInitialNavigationRestored(true)
        return
      }

      const ordered = validIds.map(id => data.find(node => node.id === id)).filter(Boolean) as Node[]
      setNavigationStack(ordered)
      setInitialNavigationRestored(true)
    }

    restore()
  }, [user, initialNavigationRestored])

  useEffect(() => {
    if (!user?.id || !initialNavigationRestored) return
    load(user.id)
  }, [currentFolderId, user, initialNavigationRestored])

  async function load(userId: string) {
    setErrorMessage(null)
    try {
      const { data, error } = await supabase.from('nodes').select('*').eq('user_id', userId)
      if (error) throw error
      setNodes(data || [])
    } catch (err) {
      console.error('LOAD ERROR:', err)
      setErrorMessage('Unable to load workspace content. Please refresh the page or try again later.')
    }
  }

  function updatePathUrl(stack: Node[]) {
    const path = stack.map(item => item.id).join(',')
    const url = path ? `/?path=${encodeURIComponent(path)}` : '/'
    router.replace(url, { scroll: false })
  }

  function navigateToFolder(folder: Node) {
    const nextStack = [...navigationStack, folder]
    setNavigationStack(nextStack)
    updatePathUrl(nextStack)
  }

  function navigateToBreadcrumb(index: number) {
    if (index < 0) {
      setNavigationStack([])
      updatePathUrl([])
      return
    }
    const nextStack = navigationStack.slice(0, index + 1)
    setNavigationStack(nextStack)
    updatePathUrl(nextStack)
  }

  function navigateBack() {
    if (navigationStack.length === 0) return
    const nextStack = navigationStack.slice(0, -1)
    setNavigationStack(nextStack)
    updatePathUrl(nextStack)
  }

  async function ensureStudentsFolder(userId: string): Promise<string | null> {
    const { data } = await supabase
      .from('nodes').select('*').eq('user_id', userId)
      .eq('type', 'folder').eq('name', 'Students').is('parent_id', null).maybeSingle()
    if (data) return data.id

    const { data: created, error: createError } = await supabase
      .from('nodes').insert({ name: 'Students', type: 'folder', parent_id: null, user_id: userId })
      .select().single()

    if (createError) {
      console.error('STUDENTS FOLDER ERROR:', createError)
      setToastType('error')
      setToastMessage('Unable to create Students folder: ' + (createError.message || 'database error'))
      return null
    }

    return created?.id || null
  }

  async function createNode(payload: { name: string; type: Node['type']; parent_id: string | null; user_id: string; profile_photo_path?: string | null }) {
    const { data, error } = await supabase.from('nodes').insert(payload).select().single()
    if (error) throw error
    setNodes(prev => [data, ...(prev || [])])
    return data
  }

  async function updateNode(id: string, updates: Partial<Pick<Node, 'name' | 'parent_id' | 'profile_photo_path'>>) {
    if (!user?.id) throw new Error('Missing authenticated user')
    const previousNodes = nodes
    setNodes(prev => prev.map(node => node.id === id ? { ...node, ...updates } : node))
    const { error } = await supabase.from('nodes').update(updates).eq('id', id).eq('user_id', user.id)
    if (error) {
      setNodes(previousNodes)
      throw error
    }
    return true
  }

  async function renameStudent(studentId: string, newName: string) {
    await updateNode(studentId, { name: newName })
    setToastType('success')
    setToastMessage('Student renamed successfully.')
  }

  async function moveStudent(studentId: string, newFolderId: string | null) {
    await updateNode(studentId, { parent_id: newFolderId })
    setToastType('success')
    setToastMessage('Student moved successfully.')
  }

  async function updateStudent(studentId: string, data: Partial<Pick<Node, 'name' | 'parent_id'>>) {
    await updateNode(studentId, data)
    setToastType('success')
    setToastMessage('Student updated successfully.')
  }

  async function createFolder() {
    if (!folderName || !user?.id) { alert('Missing folder name or user'); return }
    try {
      await createNode({ name: folderName, type: 'folder', parent_id: currentFolderId ?? null, user_id: user.id })
      setFolderName('')
      setShowFolderModal(false)
      setToastType('success')
      setToastMessage('Folder created successfully.')
    } catch (error: any) {
      console.error('CREATE FOLDER ERROR:', error)
      setToastType('error')
      setToastMessage(error?.message || 'Failed to create folder.')
    }
  }

  async function createStudent() {
    if (!firstName || !lastName || !user?.id) { alert('Student info or user not ready'); return }
    try {
      const studentsFolderId = await ensureStudentsFolder(user.id)
      if (!studentsFolderId) { alert('Could not create Students folder'); return }
      const studentName = `${firstName} ${lastName}`
      const studentFolder = await createNode({ name: studentName, type: 'folder', parent_id: studentsFolderId, user_id: user.id })
      const studentNode = await createNode({ name: studentName, type: 'student', parent_id: studentFolder.id, user_id: user.id })
      if (studentPhotoFile) {
        const ext = studentPhotoFile.name.split('.').pop()?.toLowerCase() || 'png'
        const objectName = `student-avatars/${studentNode.id}.${ext}`
        const { error: uploadError } = await supabase.storage.from('student-files').upload(objectName, studentPhotoFile, { cacheControl: '3600', upsert: true })
        if (uploadError) {
          await supabase.from('nodes').delete().eq('id', studentNode.id)
          await supabase.from('nodes').delete().eq('id', studentFolder.id)
          throw uploadError
        }
        await updateNode(studentNode.id, { profile_photo_path: objectName })
      }
      setFirstName('')
      setLastName('')
      setStudentPhotoFile(null)
      setStudentPhotoPreview(null)
      setShowStudentModal(false)
      setToastType('success')
      setToastMessage('Student created successfully.')
    } catch (error: any) {
      console.error('CREATE STUDENT ERROR:', error)
      setToastType('error')
      setToastMessage(error?.message || 'Failed to create student.')
    }
  }

  function closeStudentModal() {
    setShowStudentModal(false)
    setFirstName('')
    setLastName('')
    setStudentPhotoFile(null)
    setStudentPhotoPreview(null)
  }

  function collectDescendantIds(rootId: string) {
    const ids: string[] = []
    const traverse = (parentId: string) => {
      nodes.filter(node => node.parent_id === parentId).forEach(child => {
        ids.push(child.id)
        traverse(child.id)
      })
    }
    traverse(rootId)
    return ids
  }

  function openDeleteConfirm(node: Node) {
    setDeleteCandidate(node)
    setShowDeleteConfirm(true)
  }

  function closeDeleteConfirm() {
    setShowDeleteConfirm(false)
    setDeleteCandidate(null)
  }

  async function deleteNode(id: string) {
    if (!user?.id) return
    setIsDeleting(true)
    const previousNodes = nodes
    const previousStudentContents = studentFolderContents
    setNodes(prev => prev.filter(node => node.id !== id))
    setStudentFolderContents(prev => prev.filter(node => node.id !== id))
    if (selectedStudent?.id === id) {
      setSelectedStudent(null)
    }

    const targetNode = nodes.find(node => node.id === id)
    let fileMeta: FileMeta | null = null
    if (targetNode?.type === 'file') {
      const { data, error: metaError } = await supabase.from('files').select('*').eq('node_id', id).single()
      if (metaError) console.error('FILE META FETCH ERROR:', metaError)
      if (data) fileMeta = data
    }

    const { error } = await supabase.from('nodes').delete().eq('id', id).eq('user_id', user.id)
    if (error) {
      console.error('DELETE ERROR:', error)
      setNodes(previousNodes)
      setStudentFolderContents(previousStudentContents)
      setToastType('error')
      setToastMessage('Failed to delete item. Please try again.')
      setIsDeleting(false)
      return
    }

    if (fileMeta) {
      const { error: storageError } = await supabase.storage.from('student-files').remove([fileMeta.storage_path])
      if (storageError) console.error('FILE STORAGE DELETE ERROR:', storageError)
      const { error: metadataError } = await supabase.from('files').delete().eq('node_id', id)
      if (metadataError) console.error('FILE METADATA DELETE ERROR:', metadataError)
    }

    setToastType('success')
    setToastMessage('Item deleted successfully.')
    setIsDeleting(false)
  }

  async function handleConfirmDelete() {
    if (!deleteCandidate) return
    const candidate = deleteCandidate
    // Close modal immediately for snappy UX
    closeDeleteConfirm()
    if (candidate.type === 'student' || nodes.some(node => node.type === 'student' && node.parent_id === candidate.id)) {
      await deleteStudent(candidate.id)
    } else {
      await deleteNode(candidate.id)
    }
  }

  async function deleteStudent(studentId: string) {
    if (!user?.id) return
    setIsDeleting(true)

    const candidateNode = nodes.find(node => node.id === studentId)
    const studentNode = candidateNode?.type === 'student'
      ? candidateNode
      : nodes.find(node => node.type === 'student' && node.parent_id === studentId)
    const studentFolderId = candidateNode?.type === 'student'
      ? candidateNode.parent_id
      : candidateNode?.id

    if (!studentNode || !studentFolderId) {
      await deleteNode(studentId)
      setIsDeleting(false)
      closeDeleteConfirm()
      return
    }

    const deletedIds = new Set<string>([studentNode.id, studentFolderId])
    collectDescendantIds(studentFolderId).forEach(id => deletedIds.add(id))

    const previousNodes = nodes
    setNodes(prev => prev.filter(node => !deletedIds.has(node.id)))
    if (selectedStudent && deletedIds.has(selectedStudent.id)) {
      setSelectedStudent(null)
    }

    try {
      const { error } = await supabase.from('nodes').delete().in('id', Array.from(deletedIds)).eq('user_id', user.id)
      if (error) throw error
      setToastType('success')
      setToastMessage('Student deleted successfully.')
    } catch (err) {
      console.error('DELETE STUDENT ERROR:', err)
      setNodes(previousNodes)
      setToastType('error')
      setToastMessage('Failed to delete student. Please try again.')
    } finally {
      setIsDeleting(false)
      closeDeleteConfirm()
    }
  }

  async function getStudentContainerId(studentNodeId: string): Promise<string | null> {
    const { data } = await supabase.from('nodes').select('parent_id').eq('id', studentNodeId).single()
    return data?.parent_id || null
  }

  async function loadStudentContents(studentNodeId: string, folderId: string | null) {
    if (!user?.id) return
    setStudentContentsLoading(true)
    const containerId = await getStudentContainerId(studentNodeId)
    if (!containerId) { setStudentContentsLoading(false); return }

    const parentId = folderId ?? containerId
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('user_id', user.id)
      .eq('parent_id', parentId)
    if (error) {
      console.error(error)
      setStudentFolderContents([])
      setStudentContentsLoading(false)
      return
    }

    const nodes = data || []
    const fileNodes = nodes.filter(item => item.type === 'file')
    if (fileNodes.length > 0) {
      const fileIds = fileNodes.map(item => item.id)
      const { data: fileMetaRows, error: fileMetaError } = await supabase
        .from('files')
        .select('*')
        .in('node_id', fileIds)
      if (fileMetaError) console.error(fileMetaError)
      const fileMetaByNodeId = (fileMetaRows || []).reduce<Record<string, FileMeta>>((acc, row) => {
        acc[row.node_id] = row
        return acc
      }, {})
      setStudentFolderContents(nodes.map(node => ({
        ...node,
        fileMeta: node.type === 'file' ? fileMetaByNodeId[node.id] : undefined
      })))
    } else {
      setStudentFolderContents(nodes)
    }
    setPreviewFileUrl(null)
    setPreviewMimeType(null)
    setPreviewFileName(null)
    setStudentContentsLoading(false)
  }

  async function openStudentModal(student: Node) {
    setSelectedStudent(student)
    setStudentPathStack([])
    await loadStudentContents(student.id, null)
  }

  async function handleFolderClick(folder: Node) {
    // Always navigate into the folder when clicked from the Folders tab.
    // Student detail view should only open from the Students tab.
    navigateToFolder(folder)
  }

  async function handleStudentFolderOpen(folder: Node) {
    // Check if compiled folder
    const { data: compiled } = await supabase
      .from('compiled_folders')
      .select('*')
      .eq('folder_id', folder.id)
      .single()

    if (compiled) {
      const { data: childFiles, error: childError } = await supabase
        .from('nodes')
        .select('*')
        .eq('parent_id', folder.id)
        .eq('type', 'file')

      if (childError) {
        console.error('LOAD COMPILED CHILD FILES ERROR:', childError)
      }

      if (childFiles && childFiles.length > 0) {
        const fileMetaById: Record<string, FileMeta> = {}
        const fileMetaResult = await supabase
          .from('files')
          .select('*')
          .in('node_id', childFiles.map(f => f.id))
        if (fileMetaResult.error) console.error(fileMetaResult.error)
        const fileMetaRows = (fileMetaResult.data || []) as FileMeta[]
        fileMetaRows.forEach(row => {
          fileMetaById[row.node_id] = row
        })
        setStudentFolderContents(childFiles.map(file => ({
          ...file,
          fileMeta: fileMetaById[file.id]
        })))
        setStudentPathStack([...studentPathStack, folder.id])
      } else {
        let fileIds: string[] = compiled.selected_file_ids
        if (compiled.auto_select && selectedStudent) {
          fileIds = await getCompiledFileIds(compiled.tag_ids, selectedStudent.id)
        }
        const { data: files } = await supabase
          .from('nodes')
          .select('*')
          .in('id', fileIds)
          .eq('type', 'file')
        const fileMetaById: Record<string, FileMeta> = {}
        if (files?.length) {
          const fileMetaResult = await supabase
            .from('files')
            .select('*')
            .in('node_id', files.map(f => f.id))
          if (fileMetaResult.error) console.error(fileMetaResult.error)
          const fileMetaRows = (fileMetaResult.data || []) as FileMeta[]
          fileMetaRows.forEach(row => {
            fileMetaById[row.node_id] = row
          })
        }
        setStudentFolderContents((files || []).map(file => ({
          ...file,
          fileMeta: fileMetaById[file.id]
        })))
        setStudentPathStack([...studentPathStack, folder.id])
      }
    } else {
      setStudentPathStack([...studentPathStack, folder.id])
      await loadStudentContents(selectedStudent!.id, folder.id)
    }
  }

  async function handleStudentBack() {
    if (studentPathStack.length === 0) return
    const newStack = [...studentPathStack]
    newStack.pop()
    setStudentPathStack(newStack)
    const parentId = newStack.length === 0 ? null : newStack[newStack.length - 1]
    await loadStudentContents(selectedStudent!.id, parentId)
  }

  async function getStudentCurrentParentId(): Promise<string | null> {
    const containerId = await getStudentContainerId(selectedStudent!.id)
    if (studentPathStack.length === 0) return containerId
    return studentPathStack[studentPathStack.length - 1]
  }

  async function persistFileTags(fileId: string, tagNames: string[]) {
    if (!user) throw new Error('Missing authenticated user')
    const normalizedTags = tagNames.map(tag => tag.trim()).filter(Boolean)
    const uniqueTagNames = Array.from(new Set(normalizedTags))
    if (uniqueTagNames.length === 0) return []

    const { data: existingTags, error: existingTagsError } = await supabase
      .from('tags')
      .select('id, name')
      .eq('user_id', user.id)
      .in('name', uniqueTagNames)
    if (existingTagsError) throw existingTagsError

    const existingTagMap = (existingTags || []).reduce<Record<string, string>>((acc, tag) => {
      acc[tag.name] = tag.id
      return acc
    }, {})
    const missingTagNames = uniqueTagNames.filter(name => !existingTagMap[name])

    let insertedTags: { id: string; name: string }[] = []
    if (missingTagNames.length > 0) {
      console.debug('Persisting new tags', { userId: user.id, missingTagNames })
      const { data: newTags, error: insertTagsError } = await supabase
        .from('tags')
        .insert(missingTagNames.map(name => ({ user_id: user.id, name })))
        .select('id, name')
      if (insertTagsError) throw insertTagsError
      insertedTags = newTags || []
    }

    const allTagsForFile = [...(existingTags || []), ...insertedTags]
    if (allTagsForFile.length === 0) return []

    const fileTagRows = allTagsForFile.map(tag => ({ file_id: fileId, tag_id: tag.id }))
    const { error: fileTagsError } = await supabase.from('file_tags').insert(fileTagRows)
    if (fileTagsError) throw fileTagsError

    setAllTags(prev => {
      const existingNames = new Set(prev.map(tag => tag.name))
      const newTags = allTagsForFile.filter(tag => !existingNames.has(tag.name))
      return [...prev, ...newTags]
    })

    return allTagsForFile
  }

  // File upload
  async function uploadFileWithTags() {
    if (!uploadFile || !selectedStudent || !user) {
      setToastType('error')
      setToastMessage('Missing file, student, or user')
      return
    }

    const maxBytes = 10 * 1024 * 1024
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ]
    const extension = uploadFile.name.split('.').pop()?.toLowerCase() || ''
    const allowedExtensions = ['pdf', 'docx', 'xlsx', 'jpg', 'jpeg', 'png']

    if (uploadFile.size > maxBytes) {
      setToastType('error')
      setToastMessage('File too large. Maximum allowed size is 10MB.')
      return
    }
    if (!allowedTypes.includes(uploadFile.type) && !allowedExtensions.includes(extension)) {
      setToastType('error')
      setToastMessage('File type not supported. Please upload PDF, DOCX, JPG, PNG, or XLSX only.')
      return
    }

    setFileUploading(true)
    setUploadProgress(10)

    const safeFileName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const objectName = `students/${selectedStudent.id}/${Date.now()}_${safeFileName}`

    let createdNodeId: string | null = null
    try {
      const parentId = await getStudentCurrentParentId()
      const { data: fileNode, error: nodeError } = await supabase
        .from('nodes')
        .insert({
          name: uploadFile.name,
          type: 'file',
          parent_id: parentId,
          user_id: user.id
        })
        .select()
        .single()

      if (nodeError || !fileNode) {
        throw new Error(nodeError?.message || 'Node creation failed')
      }
      createdNodeId = fileNode.id

      setUploadProgress(25)
      const { error: uploadError } = await supabase.storage
        .from('student-files')
        .upload(objectName, uploadFile, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        throw uploadError
      }
      setUploadProgress(60)

      const metadata = {
        node_id: fileNode.id,
        name: uploadFile.name,
        storage_path: objectName,
        mime_type: uploadFile.type,
        size: uploadFile.size,
        uploaded_at: new Date().toISOString(),
        student_id: selectedStudent.id
      }

      const { error: metadataError } = await supabase.from('files').insert(metadata)
      if (metadataError) {
        await supabase.storage.from('student-files').remove([objectName])
        await supabase.from('nodes').delete().eq('id', fileNode.id)
        createdNodeId = null
        throw metadataError
      }

      const normalizedTags = fileTags.map(tag => tag.trim()).filter(Boolean)
      const uniqueTagNames = Array.from(new Set(normalizedTags))
      if (uniqueTagNames.length > 0) {
        const { data: existingTags, error: existingTagsError } = await supabase
          .from('tags')
          .select('id, name')
          .eq('user_id', user.id)
          .in('name', uniqueTagNames)

        if (existingTagsError) {
          await supabase.from('files').delete().eq('node_id', fileNode.id)
          await supabase.storage.from('student-files').remove([objectName])
          await supabase.from('nodes').delete().eq('id', fileNode.id)
          createdNodeId = null
          throw existingTagsError
        }

        const existingTagMap = (existingTags || []).reduce<Record<string, string>>((acc, tag) => {
          acc[tag.name] = tag.id
          return acc
        }, {})
        const missingTagNames = uniqueTagNames.filter(name => !existingTagMap[name])

        let insertedTags: { id: string; name: string }[] = []
        if (missingTagNames.length > 0) {
          console.debug('Uploading new tags (uploadFileWithTags)', { userId: user.id, missingTagNames })
          const { data: newTags, error: insertTagsError } = await supabase
            .from('tags')
            .insert(missingTagNames.map(name => ({ user_id: user.id, name })))
            .select('id, name')

          if (insertTagsError) {
            await supabase.from('files').delete().eq('node_id', fileNode.id)
            await supabase.storage.from('student-files').remove([objectName])
            await supabase.from('nodes').delete().eq('id', fileNode.id)
            createdNodeId = null
            throw insertTagsError
          }
          insertedTags = newTags || []
        }

        const fileTagRows = [...(existingTags || []), ...insertedTags].map(tag => ({ file_id: fileNode.id, tag_id: tag.id }))
        if (fileTagRows.length > 0) {
          const { error: fileTagsError } = await supabase.from('file_tags').insert(fileTagRows)
          if (fileTagsError) {
            await supabase.from('files').delete().eq('node_id', fileNode.id)
            await supabase.storage.from('student-files').remove([objectName])
            await supabase.from('nodes').delete().eq('id', fileNode.id)
            createdNodeId = null
            throw fileTagsError
          }
        }

        const allTagsForFile = [...(existingTags || []), ...insertedTags]
        if (allTagsForFile.length > 0) {
          setAllTags(prev => {
            const existingNames = new Set(prev.map(tag => tag.name))
            const newTags = allTagsForFile.filter(tag => !existingNames.has(tag.name))
            return [...prev, ...newTags]
          })
          await loadAllTags()
        }
      }

      const newFile: NodeWithMeta = {
        ...fileNode,
        fileMeta: metadata
      }
      setNodes(prev => [fileNode, ...(prev || [])])
      setStudentFolderContents(prev => [newFile, ...(prev || [])])

      if (fileInputRef.current) fileInputRef.current.value = ''

      setUploadProgress(100)
      setUploadFile(null)
      setFileTags([])
      setToastType('success')
      setToastMessage('File uploaded successfully.')
    } catch (err: any) {
      const message =
        err?.message ||
        err?.error_description ||
        err?.error ||
        (typeof err === 'string' ? err : null) ||
        'Upload failed. Please try again.'

      const status = err?.status || err?.statusCode

      console.error('Upload error message:', message)
      console.error('Upload error status:', status)
      console.error('Upload error full:', err)

      if (createdNodeId) {
        const { error: cleanupError } = await supabase
          .from('nodes')
          .delete()
          .eq('id', createdNodeId)
        if (cleanupError) console.error('ROLLBACK NODE ERROR:', cleanupError)
      }

      if (status === 403 || message?.toLowerCase().includes('policy')) {
        setToastType('error')
        setToastMessage('Upload failed. Storage permission denied. Check Supabase RLS policies.')
      } else if (status === 404) {
        setToastType('error')
        setToastMessage('Upload failed. Storage bucket not found.')
      } else {
        setToastType('error')
        setToastMessage(message)
      }
    } finally {
      setFileUploading(false)
      setUploadProgress(0)
    }
  }

  useEffect(() => {
    if (!studentPhotoFile) {
      setStudentPhotoPreview(null)
      return
    }
    const previewUrl = URL.createObjectURL(studentPhotoFile)
    setStudentPhotoPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [studentPhotoFile])

  const currentNodes = nodes.filter(n => n.parent_id === currentFolderId)
  const folders = currentNodes.filter(n => n.type === 'folder')
  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const studentRecords = nodes.filter(n => n.type === 'student')
  const filteredStudents = studentRecords.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))

  useEffect(() => {
    const studentsWithNewPhotos = filteredStudents.filter(
      s => s.profile_photo_path && !studentAvatarUrls[s.id]
    )
    if (studentsWithNewPhotos.length === 0) return

    const loadStudentAvatars = async () => {
      const paths = studentsWithNewPhotos.map(s => s.profile_photo_path as string)
      if (paths.length === 0) return

      try {
        const { data, error } = await supabase.storage
          .from('student-files')
          .createSignedUrls(paths, 3600)

        if (error || !data) {
          console.error('LOAD STUDENT AVATARS ERROR:', error)
          return
        }

        const newUrls: Record<string, string> = {}
        studentsWithNewPhotos.forEach(student => {
          const match = data.find(item => item.path === student.profile_photo_path)
          if (match?.signedUrl) {
            newUrls[student.id] = match.signedUrl
          }
        })
        setStudentAvatarUrls(prev => ({ ...prev, ...newUrls }))
      } catch (err) {
        console.error('LOAD STUDENT AVATARS ERROR:', err)
      }
    }

    loadStudentAvatars()
  }, [filteredStudents, studentAvatarUrls])

  const activeSectionLabel = tab === 'folders' ? 'Folders' : 'Students'

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  function formatDate(value?: string) {
    if (!value) return ''
    const date = new Date(value)
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  function getFileTypeIcon(mime: string) {
    if (mime.includes('pdf')) return '📄'
    if (mime.includes('image')) return '🖼️'
    if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('sheet')) return '📊'
    if (mime.includes('word') || mime.includes('officedocument')) return '📝'
    return '📎'
  }

  async function openFilePreview(item: NodeWithMeta) {
    if (!item.fileMeta) {
      setToastType('error')
      setToastMessage('Unable to preview file metadata.')
      return
    }
    const { data, error } = await supabase.storage.from('student-files').createSignedUrl(item.fileMeta.storage_path, 60)
    if (error || !data) {
      console.error('PREVIEW ERROR:', error)
      setToastType('error')
      setToastMessage('Unable to preview file.')
      return
    }
    setPreviewFileUrl(data.signedUrl)
    setPreviewMimeType(item.fileMeta.mime_type)
    setPreviewFileName(item.fileMeta.name)
  }

  function closeFilePreview() {
    setPreviewFileUrl(null)
    setPreviewMimeType(null)
    setPreviewFileName(null)
  }

  async function renameFile(item: NodeWithMeta) {
    const newName = window.prompt('Rename file', item.name)
    if (!newName || newName.trim() === '' || newName === item.name) return

    const previousContents = studentFolderContents
    const previousNodes = nodes
    setStudentFolderContents(prev => prev.map(node => node.id === item.id ? {
      ...node,
      name: newName,
      fileMeta: node.fileMeta ? { ...node.fileMeta, name: newName } : node.fileMeta
    } : node))
    setNodes(prev => prev.map(node => node.id === item.id ? { ...node, name: newName } : node))

    try {
      await updateNode(item.id, { name: newName })
      const { error } = await supabase.from('files').update({ name: newName }).eq('node_id', item.id)
      if (error) throw error
      setToastType('success')
      setToastMessage('File renamed successfully.')
    } catch (err: any) {
      console.error('RENAME FILE ERROR:', err)
      setStudentFolderContents(previousContents)
      setNodes(previousNodes)
      setToastType('error')
      setToastMessage(err?.message || 'Failed to rename file.')
    }
  }

  async function deleteFile(item: NodeWithMeta) {
    if (!item.fileMeta || !user?.id) return
    const previousContents = studentFolderContents
    const previousNodes = nodes
    setStudentFolderContents(prev => prev.filter(node => node.id !== item.id))
    setNodes(prev => prev.filter(node => node.id !== item.id))

    try {
      const { error: storageError } = await supabase.storage.from('student-files').remove([item.fileMeta.storage_path])
      if (storageError) throw storageError
      const { error: metadataError } = await supabase.from('files').delete().eq('node_id', item.id)
      if (metadataError) throw metadataError
      const { error: nodeError } = await supabase.from('nodes').delete().eq('id', item.id).eq('user_id', user.id)
      if (nodeError) throw nodeError
      setToastType('success')
      setToastMessage('File deleted successfully.')
    } catch (err: any) {
      console.error('DELETE FILE ERROR:', err)
      setStudentFolderContents(previousContents)
      setNodes(previousNodes)
      setToastType('error')
      setToastMessage(err?.message || 'Failed to delete file.')
    }
  }

  function renderStudentContent() {
    if (studentContentsLoading) return <div style={{ fontSize: 13, color: t.textMuted }}>Loading...</div>
    if (studentFolderContents.length === 0) return <div style={{ fontSize: 13, color: t.textMuted, textAlign: 'center', padding: 20 }}>Empty folder</div>

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {studentFolderContents.map(item => (
          <div key={item.id} className="file-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div className="file-icon">
                {item.type === 'folder' ? '📁' : item.fileMeta ? getFileTypeIcon(item.fileMeta.mime_type) : '📎'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                {item.type === 'file' && item.fileMeta && (
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                    {item.fileMeta.name} · {formatBytes(item.fileMeta.size)} · {formatDate(item.fileMeta.uploaded_at)}
                  </div>
                )}
              </div>
            </div>
            <div className="file-actions">
              {item.type === 'folder' ? (
                <>
                  <button onClick={() => handleStudentFolderOpen(item)}>Open</button>
                  <button onClick={() => openDeleteConfirm(item)}>Delete</button>
                </>
              ) : (
                <>
                  <button onClick={() => openFilePreview(item)}>Preview</button>
                  <button onClick={() => renameFile(item)}>Rename</button>
                  <button onClick={() => openDeleteConfirm(item)}>Delete</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  async function createStudentNormalFolder() {
    if (!newFolderNameInput || !selectedStudent || !user) return
    const parentId = await getStudentCurrentParentId()
    try {
      const folderNode = await createNode({
        name: newFolderNameInput,
        type: 'folder',
        parent_id: parentId,
        user_id: user.id
      })
      setShowNewFolderTypeModal(false)
      setNewFolderNameInput('')
      setToastType('success')
      setToastMessage('Folder created successfully.')
      const currentParent = studentPathStack.length === 0 ? null : studentPathStack[studentPathStack.length - 1]
      await loadStudentContents(selectedStudent.id, currentParent)
    } catch (error: any) {
      console.error('CREATE STUDENT FOLDER ERROR:', error)
      setToastType('error')
      setToastMessage(error?.message || 'Failed to create folder.')
    }
  }

  async function getCompiledFileIds(tagIds: string[], studentId: string) {
    if (!tagIds.length) return []
    const fileIdsByTag: Record<string, string[]> = {}
    for (const tid of tagIds) {
      const { data } = await supabase.from('file_tags').select('file_id').eq('tag_id', tid)
      fileIdsByTag[tid] = data?.map(d => d.file_id) || []
    }
    const tagSets = Object.values(fileIdsByTag)
    if (tagSets.length === 0) return []
    const intersection = tagSets.reduce((a, b) => a.filter(id => b.includes(id)), tagSets[0])
    if (intersection.length === 0) return []
    const { data: fileRows, error } = await supabase.from('files').select('node_id').in('node_id', intersection).eq('student_id', studentId)
    if (error) {
      console.error('LOAD COMPILED FILE IDS ERROR:', error)
      return []
    }
    return (fileRows || []).map(row => row.node_id)
  }

  async function getCompiledCandidateFileIds(tagIds: string[], studentId: string) {
    if (!tagIds.length) return []
    const fileIdsByTag: Record<string, string[]> = {}
    for (const tid of tagIds) {
      const { data } = await supabase.from('file_tags').select('file_id').eq('tag_id', tid)
      fileIdsByTag[tid] = data?.map(d => d.file_id) || []
    }
    const union = Array.from(new Set(Object.values(fileIdsByTag).flat()))
    if (union.length === 0) return []
    const { data: fileRows, error } = await supabase.from('files').select('node_id').in('node_id', union).eq('student_id', studentId)
    if (error) {
      console.error('LOAD COMPILED CANDIDATE FILE IDS ERROR:', error)
      return []
    }
    return (fileRows || []).map(row => row.node_id)
  }

  async function copyFileToFolder(sourceFileId: string, targetFolderId: string) {
    const { data: sourceNode, error: nodeError } = await supabase.from('nodes').select('*').eq('id', sourceFileId).single()
    if (nodeError || !sourceNode) {
      throw nodeError || new Error('Source file node not found')
    }

    const { data: fileMeta, error: fileMetaError } = await supabase.from('files').select('*').eq('node_id', sourceFileId).single()
    if (fileMetaError || !fileMeta) {
      throw fileMetaError || new Error('Source file metadata not found')
    }

    const { data: newFileNode, error: createError } = await supabase.from('nodes')
      .insert({
        name: sourceNode.name,
        type: 'file',
        parent_id: targetFolderId,
        user_id: user.id
      })
      .select()
      .single()

    if (createError || !newFileNode) {
      throw createError || new Error('Failed to create compiled file node')
    }

    const metadata = {
      node_id: newFileNode.id,
      name: fileMeta.name,
      size: fileMeta.size,
      mime_type: fileMeta.mime_type,
      uploaded_at: fileMeta.uploaded_at,
      storage_path: fileMeta.storage_path,
      student_id: fileMeta.student_id
    }

    const { error: insertMetaError } = await supabase.from('files').insert(metadata)
    if (insertMetaError) {
      await supabase.from('nodes').delete().eq('id', newFileNode.id)
      throw insertMetaError
    }

    return newFileNode.id
  }

  async function ensureCompiledFoldersTableAccessible() {
    const { data, error } = await supabase
      .from('compiled_folders')
      .select('folder_id')
      .limit(1)

    if (error) {
      console.error('COMPILED_FOLDERS TABLE ACCESS ERROR', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw new Error(
        error.message?.toLowerCase().includes('does not exist')
          ? 'compiled_folders table does not exist. Verify your Supabase schema and permissions.'
          : `Unable to access compiled_folders table: ${error.message || 'unknown error'}`
      )
    }

    return true
  }

  async function createCompiledFolder() {
    if (!newFolderNameInput || !selectedStudent || !user || selectedTagIds.length === 0) return
    if (compilationMode === 'manual' && manuallySelectedFileIds.length === 0) {
      setToastType('error')
      setToastMessage('Select at least one file for manual compilation.')
      return
    }

    try {
      await ensureCompiledFoldersTableAccessible()
    } catch (error: any) {
      console.error('COMPILED FOLDER SCHEMA CHECK FAILED:', error)
      setToastType('error')
      setToastMessage(error?.message || 'Unable to access compiled_folders table. Verify Supabase schema.')
      return
    }

    const parentId = await getStudentCurrentParentId()
    let folderNode: Node
    try {
      folderNode = await createNode({ name: newFolderNameInput, type: 'folder', parent_id: parentId, user_id: user.id })
    } catch (error: any) {
      console.error('CREATE COMPILED FOLDER ERROR:', error)
      setToastType('error')
      setToastMessage(error?.message || 'Failed to create compiled folder.')
      return
    }

    const matchedIds = compilationMode === 'auto'
      ? await getCompiledFileIds(selectedTagIds, selectedStudent.id)
      : await getCompiledCandidateFileIds(selectedTagIds, selectedStudent.id)

    let selectedIds: string[] = []
    if (compilationMode === 'auto') {
      selectedIds = matchedIds
    } else {
      selectedIds = manuallySelectedFileIds.filter(id => matchedIds.includes(id))
    }

    const copiedFileIds: string[] = []
    for (const sourceFileId of selectedIds) {
      try {
        const copiedId = await copyFileToFolder(sourceFileId, folderNode.id)
        copiedFileIds.push(copiedId)
      } catch (error) {
        console.error('COPY COMPILED FILE ERROR:', error)
      }
    }

    const compiledPayload = {
      folder_id: folderNode.id,
      tag_ids: selectedTagIds,
      auto_select: compilationMode === 'auto',
      selected_file_ids: selectedIds
    }

    const { data: compiledData, error: compiledInsertError } = await (supabase
      .from('compiled_folders')
      .insert(compiledPayload)
      .select('id') as any)

    const insertFailed = compiledInsertError && !Array.isArray(compiledData)
    if (insertFailed) {
      console.error('CREATE COMPILED FOLDER METADATA ERROR raw:', compiledInsertError)
      console.error('CREATE COMPILED FOLDER METADATA PAYLOAD:', compiledPayload)

      await supabase.from('nodes').delete().in('id', [...copiedFileIds, folderNode.id])
      setToastType('error')
      setToastMessage('Failed to create compiled folder. Please check the compiled_folders table and permissions.')
      return
    }

    if (compiledInsertError && Array.isArray(compiledData) && compiledData.length > 0) {
      console.warn('CREATE COMPILED FOLDER METADATA WARNING: insert returned data despite error', compiledInsertError, compiledData)
    }

    setShowNewFolderTypeModal(false)
    setNewFolderNameInput('')
    setSelectedTagIds([])
    setManuallySelectedFileIds([])
    setToastType('success')
    setToastMessage('Folder created successfully.')
    const currentParent = studentPathStack.length === 0 ? null : studentPathStack[studentPathStack.length - 1]
    await loadStudentContents(selectedStudent.id, currentParent)
  }

  useEffect(() => {
    if (newFolderType === 'compiled' && user) {
      loadAllTags()
    }
  }, [newFolderType, user])

  useEffect(() => {
    if (showNewFolderTypeModal && newFolderType === 'compiled' && user) {
      loadAllTags()
    }
  }, [showNewFolderTypeModal, newFolderType, user])

  useEffect(() => {
    if (newFolderType === 'compiled' && selectedTagIds.length && selectedStudent) {
      const fetchMatching = async () => {
        const fileIds = compilationMode === 'manual'
          ? await getCompiledCandidateFileIds(selectedTagIds, selectedStudent.id)
          : await getCompiledFileIds(selectedTagIds, selectedStudent.id)

        if (fileIds.length === 0) {
          setAvailableFilesForCompilation([])
          return
        }

        const { data: files, error } = await supabase.from('nodes').select('id,name').in('id', fileIds).eq('type', 'file')
        if (error) {
          console.error('LOAD COMPILED FILES ERROR:', error)
          setAvailableFilesForCompilation([])
          return
        }
        setAvailableFilesForCompilation(files || [])
      }
      fetchMatching()
    } else {
      setAvailableFilesForCompilation([])
    }
  }, [selectedTagIds, newFolderType, compilationMode, selectedStudent])

  function renderEmptyState(message: string) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: 260, color: t.textMuted, textAlign: 'center', padding: 24 }}>
        <div style={{ width: 120, height: 120, borderRadius: 24, background: t.card, border: `1px dashed ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42 }}>
          {tab === 'folders' ? '📁' : '👥'}
        </div>
        <div style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 6 }}>{message}</div>
          <div style={{ fontSize: 13, color: t.textMuted }}>Use the + button to add your first item.</div>
        </div>
      </div>
    )
  }

  function renderLoadingSkeleton() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 16 }}>
        <div style={{ width: '60%', height: 24, borderRadius: 12, background: t.inputBorder, opacity: 0.4 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[1, 2, 3, 4].map(key => (
            <div key={key} style={{ padding: 18, borderRadius: 18, background: t.card, border: `1px solid ${t.cardBorder}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: t.inputBorder, marginBottom: 14, opacity: 0.4 }} />
              <div style={{ width: '70%', height: 18, borderRadius: 10, background: t.inputBorder, opacity: 0.4, marginBottom: 8 }} />
              <div style={{ width: '40%', height: 14, borderRadius: 10, background: t.inputBorder, opacity: 0.4 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  async function retryLoad() {
    setErrorMessage(null)
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      if (!data.user) {
        router.push('/login')
        return
      }
      setUser(data.user)
      await load(data.user.id)
    } catch (err) {
      console.error('RETRY LOAD ERROR:', err)
      setErrorMessage('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: t.bg, fontFamily: "'DM Sans', sans-serif", transition: 'background 0.2s' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .app-shell { min-height: 100vh; display: flex; flex-direction: column; background: ${t.bg}; font-family: 'DM Sans', sans-serif; transition: background 0.2s; color: ${t.text}; }
        * { box-sizing: border-box; }
        .card { background: ${t.card}; border: 1px solid ${t.cardBorder}; border-radius: 18px; transition: transform 0.18s, box-shadow 0.18s; }
        .card:hover { transform: translateY(-1px); box-shadow: ${t.cardHoverShadow}; }
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
        .card-content { padding: 20px; min-height: 180px; display: flex; flex-direction: column; justify-content: space-between; }
        .card-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .avatar-initials { width: 40px; height: 40px; border-radius: 12px; background: ${t.initialsBg}; color: ${t.initialsText}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
        .btn { font-family: inherit; font-size: 14px; font-weight: 600; border-radius: 12px; padding: 10px 20px; cursor: pointer; transition: all 0.15s; }
        .btn-primary { background: ${t.btnPrimary}; color: ${t.btnPrimaryText}; border: none; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { background: transparent; color: ${t.btnGhostText}; border: 1px solid ${t.btnGhostBorder}; }
        .btn-secondary:hover { background: ${t.btnGhostHover}; }
        .btn-ghost { background: transparent; color: ${t.btnGhostText}; border: 1px solid ${t.btnGhostBorder}; }
        .btn-ghost:hover { background: ${t.btnGhostHover}; }
        .btn-text { background: transparent; border: none; color: ${t.textMuted}; }
        .btn-text:hover { color: ${t.text}; }
        .btn-delete { background: transparent; border: none; color: ${t.deleteBtn}; padding: 8px; border-radius: 10px; }
        .btn-delete:hover { color: ${t.tabActiveText}; background: ${t.btnGhostHover}; }
        .modal-overlay { position: fixed; inset: 0; backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 16px; }
        .modal { border-radius: 20px; padding: 28px; width: 100%; max-width: 420px; background: ${t.modalBg}; box-shadow: ${t.cardHoverShadow}; }
        .modal-lg { max-width: 540px; }
        .modal-header { margin: 0 0 16px; font-size: 18px; font-weight: 700; color: ${t.text}; }
        .modal-body { display: flex; flex-direction: column; gap: 16px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
        .app-input { width: 100%; padding: 12px 14px; border-radius: 12px; font-family: inherit; font-size: 14px; outline: none; border: 1px solid ${t.inputBorder}; background: ${t.inputBg}; color: ${t.text}; transition: border-color 0.15s; }
        .app-input:focus { outline: none; border-color: ${t.tabActiveText}; }
        .topbar { background: ${t.topbar}; border-bottom: 1px solid ${t.topbarBorder}; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 72px; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-copy { display: flex; flex-direction: column; gap: 2px; }
        .brand-title { font-size: 18px; font-weight: 700; letter-spacing: 0.01em; color: ${t.text}; }
        .brand-subtitle { font-size: 12px; color: ${t.textMuted}; }
        .tab-bar { display: flex; align-items: center; gap: 8px; }
        .tab-btn { display: inline-flex; align-items: center; gap: 8px; border: 1px solid transparent; border-radius: 999px; padding: 10px 16px; font-weight: 700; background: transparent; color: ${t.textMuted}; transition: background 0.15s, border-color 0.15s, color 0.15s; }
        .tab-btn.active { background: ${t.tabActiveBg}; color: ${t.tabActiveText}; border-color: ${t.tabActiveText}; }
        .tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; border-radius: 999px; background: ${t.chipBg}; color: ${t.textMuted}; font-size: 12px; padding: 0 8px; }
        .topbar-actions { display: flex; align-items: center; gap: 12px; }
        .topbar-pill { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 999px; background: ${t.card}; border: 1px solid ${t.cardBorder}; }
        .topbar-pill .avatar-circle { width: 32px; height: 32px; border-radius: 50%; background: ${t.initialsBg}; color: ${t.initialsText}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
        .topbar-pill .pill-text { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; }
        .breadcrumb-button { padding: 0; font-size: 13px; text-decoration: underline; }
        .breadcrumb-button:hover { color: ${t.text}; }
        .page-content { flex: 1; overflow-y: auto; padding: 32px 24px; max-width: 1240px; width: 100%; margin: 0 auto; }
        .section-header { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
        .section-title { margin: 0; font-size: 26px; font-weight: 700; color: ${t.text}; }
        .section-meta { margin: 8px 0 0; color: ${t.textMuted}; font-size: 13px; }
        .breadcrumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: ${t.textMuted}; font-size: 13px; margin-bottom: 12px; }
        .breadcrumbs span { display: inline-flex; align-items: center; gap: 8px; }
        .toast { position: fixed; bottom: 24px; right: 24px; z-index: 200; padding: 14px 18px; border-radius: 14px; color: ${t.btnPrimaryText}; box-shadow: ${t.cardHoverShadow}; min-width: 220px; }
        .toast.success { background: ${t.toastSuccess}; }
        .toast.error { background: ${t.toastError}; }
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; min-height: 260px; color: ${t.textMuted}; text-align: center; padding: 24px; }
        .empty-state-card { width: 120px; height: 120px; border-radius: 24px; background: ${t.card}; border: 1px dashed ${t.cardBorder}; display: flex; align-items: center; justify-content: center; font-size: 42px; }
        .file-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; background: ${t.chipBg}; border: 1px solid ${t.cardBorder}; border-radius: 12px; }
        .file-icon { width: 36px; height: 36px; border-radius: 10px; background: ${t.inputBorder}; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .file-actions button { background: transparent; border: none; color: ${t.textMuted}; cursor: pointer; font-size: 14px; padding: 8px; }
        .file-actions button:hover { color: ${t.text}; }
        .student-detail-screen { position: fixed; top: 60px; left: 0; right: 0; bottom: 0; z-index: 200; overflow-y: auto; background: ${t.bg}; padding: 24px; display: flex; flex-direction: column; }
        .student-detail-header { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .student-detail-avatar { width: 48px; height: 48px; border-radius: 50%; background: ${t.avatarBg}; display: flex; align-items: center; justify-content: center; font-size: 22px; }
        .content-card { background: ${t.modalBg}; border: 1px solid ${t.cardBorder}; border-radius: 18px; padding: 24px; }
        .button-row { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
        .fab { position: fixed; bottom: 28px; right: 28px; min-width: 54px; min-height: 54px; border: none; border-radius: 999px; font-size: 14px; cursor: pointer; box-shadow: ${t.cardHoverShadow}; transition: transform 0.15s, background 0.15s; display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 0 18px; white-space: nowrap; }
        .fab:hover { transform: translateY(-1px); }
        .fab-icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.1); font-size: 20px; }
        .fab-text { font-size: 14px; font-weight: 700; white-space: nowrap; }
        .dark-toggle { background: transparent; border: none; cursor: pointer; font-size: 18px; padding: 8px; border-radius: 12px; transition: background 0.15s; color: ${t.text}; }
        .dark-toggle:hover { background: ${t.btnGhostHover}; }
      `}</style>

      {/* Top bar */}
      <div className="topbar">
        <div className="brand">
          <Image src={dark ? whitelogo1 : blacklogo} alt="Lugh" width={30} height={30} loading="eager" style={{ objectFit: 'contain', width: 'auto', height: 'auto' }} />
          <div className="brand-copy">
            <div className="brand-title">Lugh</div>
            <div className="brand-subtitle">Student file workspace</div>
          </div>
        </div>
        <div className="tab-bar">
          <button className={`tab-btn ${tab === 'folders' ? 'active' : ''}`} onClick={() => setTab('folders')}>
            Folders
            <span className="tab-badge">{filteredFolders.length}</span>
          </button>
          <button className={`tab-btn ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>
            Students
            <span className="tab-badge">{filteredStudents.length}</span>
          </button>
        </div>
        <div className="topbar-actions">
          <div className="topbar-pill">
            <div className="avatar-circle">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="pill-text">
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{user?.user_metadata?.name || user?.email || 'Signed in'}</span>
              <span style={{ fontSize: 11, color: t.textMuted }}>Account</span>
            </div>
          </div>
          <button className="btn btn-text dark-toggle" onClick={() => setDark(d => !d)}>{dark ? '☀️' : '🌙'}</button>
          <button className="btn btn-text" onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}>Sign out</button>
        </div>
      </div>

      {/* Main content */}
      <div className="page-content">
        {toastMessage && (
          <div className={`toast ${toastType}`}>
            {toastMessage}
          </div>
        )}
        {loading && renderLoadingSkeleton()}
        {errorMessage && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: 260, color: '#d64545', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Something went wrong.</div>
            <div style={{ maxWidth: 360, color: t.textMuted }}>Please try again. If the problem persists, sign out and sign back in.</div>
            <button className="btn btn-primary" onClick={retryLoad}>Retry</button>
          </div>
        )}
        {navigationStack.length > 0 && <button className="btn btn-text" onClick={navigateBack}>← Back</button>}
        {!loading && !errorMessage && (
          <>
            <div className="section-header">
              <div>
                <div className="breadcrumbs">
                  <button type="button" className="btn btn-text breadcrumb-button" onClick={() => navigateToBreadcrumb(-1)}>Root</button>
                  {navigationStack.map((item, index) => (
                    <span key={item.id}>
                      <span>›</span>
                      <button type="button" className="btn btn-text breadcrumb-button" onClick={() => navigateToBreadcrumb(index)}>{item.name}</button>
                    </span>
                  ))}
                </div>
                <h2 className="section-title">{activeSectionLabel}</h2>
                <p className="section-meta">{tab === 'folders' ? `${filteredFolders.length} folder(s)` : `${filteredStudents.length} student(s)`}</p>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeSectionLabel.toLowerCase()} by name...`}
                style={{
                  width: '100%',
                  maxWidth: 420,
                  marginTop: 14,
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: `1px solid ${t.inputBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontSize: 14,
                }}
              />
            </div>
            {tab === 'folders' && filteredFolders.length === 0 && renderEmptyState('No folders yet. Click + to create one.')}
            {tab === 'folders' && filteredFolders.length > 0 && (
              <div className="card-grid">
                {filteredFolders.map(f => (
                  <div key={f.id} className="card card-content" style={{ cursor: 'pointer' }} onClick={() => handleFolderClick(f)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div className="card-icon" style={{ background: t.folderIconBg, fontSize: 20 }}>📁</div>
                      <button className="btn-delete" onClick={e => { e.stopPropagation(); openDeleteConfirm(f) }}>✕</button>
                    </div>
                    <div style={{ marginTop: 10, fontWeight: 600, color: t.text }}>{f.name}</div>
                  </div>
                ))}
              </div>
            )}
            {tab === 'students' && filteredStudents.length === 0 && renderEmptyState('No students yet. Click + to create one.')}
            {tab === 'students' && filteredStudents.length > 0 && (
              <div className="card-grid">
                {filteredStudents.map(s => (
                  <div key={s.id} className="card card-content" style={{ cursor: 'pointer' }} onClick={() => openStudentModal(s)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div className="card-icon" style={{ background: t.folderIconBg, overflow: 'hidden' }}>
                        {studentAvatarUrls[s.id] ? (
                          <img src={studentAvatarUrls[s.id]} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                        ) : (
                          <div className="avatar-initials">{getInitials(s.name)}</div>
                        )}
                      </div>
                      <button className="btn-delete" onClick={e => { e.stopPropagation(); openDeleteConfirm(s) }}>✕</button>
                    </div>
                    <div style={{ marginTop: 10, fontWeight: 600, color: t.text }}>{s.name}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Global FAB */}
      {!selectedStudent && (
        <button
          className="fab"
          style={{ background: t.fabBg, color: t.fabText }}
          onClick={() => tab === 'folders' ? setShowFolderModal(true) : setShowStudentModal(true)}
          title={tab === 'folders' ? 'New Folder' : 'Add Student'}
          aria-label={tab === 'folders' ? 'New Folder' : 'Add Student'}
        >
          <span className="fab-icon">+</span>
          <span className="fab-text">{tab === 'folders' ? 'New Folder' : 'Add Student'}</span>
        </button>
      )}

      {showDeleteConfirm && deleteCandidate && (
        <div className="modal-overlay" style={{ background: t.modalOverlay }} onClick={closeDeleteConfirm}>
          <div className="modal" style={{ background: t.modalBg }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: t.text }}>Delete confirmation</h2>
            <p style={{ margin: '0 0 20px', color: t.textMuted, fontSize: 14 }}>
              Are you sure you want to delete <strong style={{ color: t.text }}>{deleteCandidate.name}</strong>? This action cannot be undone.
            </p>
            <div className="button-row">
              <button className="btn btn-secondary" onClick={closeDeleteConfirm}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder creation modal */}
      {showFolderModal && (
        <div className="modal-overlay" style={{ background: t.modalOverlay }} onClick={() => setShowFolderModal(false)}>
          <div className="modal" style={{ background: t.modalBg }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: t.text }}>New Folder</h2>
            <input className="app-input" type="text" placeholder="Folder name" value={folderName} onChange={e => setFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createFolder()} autoFocus style={{ marginBottom: 16, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text }} />
            <div className="button-row">
              <button className="btn btn-secondary" onClick={() => setShowFolderModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createFolder}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Student creation modal */}
      {showStudentModal && (
        <div className="modal-overlay" style={{ background: t.modalOverlay }} onClick={closeStudentModal}>
          <div className="modal" style={{ background: t.modalBg }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: t.text }}>Add Student</h2>
            <input className="app-input" type="text" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus style={{ marginBottom: 10, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text }} />
            <input className="app-input" type="text" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createStudent()} style={{ marginBottom: 16, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text }} />
            <label style={{ display: 'block', marginBottom: 16, color: t.text, fontSize: 13 }}>
              Profile photo (optional)
              <input
                type="file"
                accept="image/*"
                onChange={e => setStudentPhotoFile(e.target.files?.[0] || null)}
                style={{ display: 'block', marginTop: 10, width: '100%' }}
              />
            </label>
            {studentPhotoPreview && (
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                <img src={studentPhotoPreview} alt="Preview" style={{ width: 90, height: 90, borderRadius: 18, objectFit: 'cover', border: `1px solid ${t.cardBorder}` }} />
              </div>
            )}
            <div className="button-row">
              <button className="btn btn-secondary" onClick={closeStudentModal}>Cancel</button>
              <button className="btn btn-primary" onClick={createStudent}>Add Student</button>
            </div>
          </div>
        </div>
      )}

      {/* Student detail screen */}
      {selectedStudent && (
        <div className="student-detail-screen">
          <div style={{ maxWidth: 1080, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="student-detail-header">
              <button className="btn btn-text" onClick={() => setSelectedStudent(null)}>← Back</button>
              <div style={{ width: 48, height: 48, background: t.avatarBg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👤</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: t.text }}>{selectedStudent.name}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: t.textMuted }}>Student details and folder contents</p>
              </div>
            </div>

            <div style={{ border: `1px solid ${t.cardBorder}`, borderRadius: 20, background: t.modalBg, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.text }}>Contents</h3>
                  {studentPathStack.length > 0 && (
                    <button className="btn btn-text breadcrumb-button" onClick={handleStudentBack}>← Back</button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.docx,.jpg,.jpeg,.png,.xlsx"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0] || null
                    setUploadFile(file)
                  }}
                />
              </div>

              {!uploadFile && (
                <div style={{ marginBottom: 16, fontSize: 13, color: t.textMuted }}>No file selected yet. Click Choose File to pick a document.</div>
              )}
              {uploadFile && (
                <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 13, color: t.textMuted }}>Selected file: <strong style={{ color: t.text }}>{uploadFile.name}</strong></div>
                  <input
                    className="app-input"
                    type="text"
                    placeholder="Add tags to confirm upload"
                    value={fileTags.join(', ')}
                    onChange={e => setFileTags(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    style={{ border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={() => {
                      setUploadFile(null)
                      setFileTags([])
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}>Clear selection</button>
                    {uploadFile && (
                      <button
                        className="btn btn-primary"
                        onClick={uploadFileWithTags}
                        disabled={fileUploading}
                        style={{ fontSize: 13 }}
                      >
                        {fileUploading ? 'Uploading...' : 'Confirm Upload'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {showNewFolderTypeModal && (
                <div style={{ marginBottom: 22, padding: 18, borderRadius: 18, background: t.card, border: `1px solid ${t.cardBorder}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>New Folder</div>
                      <div style={{ fontSize: 12, color: t.textMuted }}>Create a normal folder or compiled folder inside this student folder.</div>
                    </div>
                    <button onClick={() => setShowNewFolderTypeModal(false)} style={{ background: 'transparent', border: 'none', color: t.textMuted, fontSize: 18, cursor: 'pointer' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                    <button onClick={() => { setNewFolderType('normal'); setNewFolderNameInput(''); }} style={{ flex: 1, padding: '12px', background: newFolderType === 'normal' ? t.btnPrimary : 'transparent', color: newFolderType === 'normal' ? t.btnPrimaryText : t.text, border: `1px solid ${t.cardBorder}`, borderRadius: 12, cursor: 'pointer' }}>Normal Folder</button>
                    <button onClick={() => { setNewFolderType('compiled'); setNewFolderNameInput(''); setSelectedTagIds([]); }} style={{ flex: 1, padding: '12px', background: newFolderType === 'compiled' ? t.btnPrimary : 'transparent', color: newFolderType === 'compiled' ? t.btnPrimaryText : t.text, border: `1px solid ${t.cardBorder}`, borderRadius: 12, cursor: 'pointer' }}>Compiled Folder</button>
                  </div>
                  {newFolderType && (
                    <>
                      <input className="app-input" type="text" placeholder="Folder name" value={newFolderNameInput} onChange={e => setNewFolderNameInput(e.target.value)} style={{ marginBottom: 16, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text }} />
                      {newFolderType === 'compiled' && (
                        <>
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 13, color: t.text }}>Select Tags</label>
                            <div style={{ marginTop: 8, maxHeight: 120, overflowY: 'auto' }}>
                              {allTags.map(tag => (
                                <label key={tag.id} style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                                  <input type="checkbox" checked={selectedTagIds.includes(tag.id)} onChange={e => {
                                    if (e.target.checked) setSelectedTagIds(prev => [...prev, tag.id])
                                    else setSelectedTagIds(prev => prev.filter(id => id !== tag.id))
                                  }} /> {tag.name}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 13, color: t.text }}>Compilation Mode</label>
                            <select value={compilationMode} onChange={e => setCompilationMode(e.target.value as any)} style={{ width: '100%', marginTop: 4, padding: 8, background: t.inputBg, color: t.text, border: `1px solid ${t.inputBorder}`, borderRadius: 8 }}>
                              <option value="auto">Auto – include all files that have the tags</option>
                              <option value="manual">Manual – let me choose which files to include</option>
                            </select>
                          </div>
                          {compilationMode === 'manual' && (
                            <>
                              {availableFilesForCompilation.length > 0 ? (
                                <div style={{ marginBottom: 16, maxHeight: 150, overflowY: 'auto', border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: 8 }}>
                                  <p style={{ fontSize: 12, marginBottom: 8 }}>Select files to include:</p>
                                  {availableFilesForCompilation.map(file => (
                                    <label key={file.id} style={{ display: 'block', fontSize: 13 }}>
                                      <input type="checkbox" checked={manuallySelectedFileIds.includes(file.id)} onChange={e => {
                                        if (e.target.checked) setManuallySelectedFileIds(prev => [...prev, file.id])
                                        else setManuallySelectedFileIds(prev => prev.filter(id => id !== file.id))
                                      }} /> {file.name}
                                </label>
                                  ))}
                                </div>
                              ) : (
                                selectedTagIds.length > 0 && (
                                  <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>No files match the selected tag(s). Try different tags or switch to Auto mode.</div>
                                )
                              )}
                            </>
                          )}
                          {selectedTagIds.length === 0 && (
                            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>Select at least one tag before creating a compiled folder.</div>
                          )}
                          {selectedTagIds.length > 0 && compilationMode === 'manual' && manuallySelectedFileIds.length === 0 && availableFilesForCompilation.length > 0 && (
                            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>Pick at least one matched file to include in the manual compiled folder.</div>
                          )}
                        </>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => setShowNewFolderTypeModal(false)}>Cancel</button>
                        <button
                          onClick={newFolderType === 'normal' ? createStudentNormalFolder : createCompiledFolder}
                          disabled={!newFolderNameInput || (newFolderType === 'compiled' && (selectedTagIds.length === 0 || (compilationMode === 'manual' && manuallySelectedFileIds.length === 0)))}
                          style={{
                            background: !newFolderNameInput || (newFolderType === 'compiled' && (selectedTagIds.length === 0 || (compilationMode === 'manual' && manuallySelectedFileIds.length === 0))) ? '#999' : t.btnPrimary,
                            color: t.btnPrimaryText,
                            border: 'none',
                            borderRadius: 10,
                            padding: '10px 20px',
                            cursor: !newFolderNameInput || (newFolderType === 'compiled' && (selectedTagIds.length === 0 || (compilationMode === 'manual' && manuallySelectedFileIds.length === 0))) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Create
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {renderStudentContent()}

              {previewFileUrl && (
                <div style={{ marginTop: 18, padding: 18, borderRadius: 16, background: t.card, border: `1px solid ${t.cardBorder}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{previewFileName}</div>
                      <div style={{ fontSize: 12, color: t.textMuted }}>{previewMimeType}</div>
                    </div>
                    <button onClick={closeFilePreview} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 18 }}>✕</button>
                  </div>
                  {previewMimeType?.includes('image') ? (
                    <img src={previewFileUrl} alt={previewFileName || 'Preview'} style={{ width: '100%', borderRadius: 14, maxHeight: 420, objectFit: 'contain' }} />
                  ) : previewMimeType?.includes('pdf') ? (
                    <iframe src={previewFileUrl} title={previewFileName || 'PDF preview'} style={{ width: '100%', height: 420, border: 'none', borderRadius: 14 }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ color: t.textMuted, fontSize: 13 }}>Preview not supported for this file type.</div>
                      <a href={previewFileUrl} target="_blank" rel="noreferrer" style={{ color: t.btnPrimary, fontWeight: 600 }}>Download file</a>
                    </div>
                  )}
                </div>
              )}

              <div style={{ position: 'relative', marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ position: 'relative' }}>
                  <button
                    className="fab"
                    style={{ position: 'relative', bottom: 0, right: 0, marginTop: 8, background: t.fabBg, color: t.fabText }}
                    onClick={() => setShowFabMenu(!showFabMenu)}
                  >+</button>
                  {showFabMenu && (
                    <div className="fab-menu" style={{ position: 'absolute', bottom: '60px', right: '0' }}>
                      <div className="fab-menu-item" onClick={() => { setShowFabMenu(false); fileInputRef.current?.click(); }}>📎 New File</div>
                      <div className="fab-menu-item" onClick={() => {
                        setShowFabMenu(false)
                        setShowNewFolderTypeModal(true)
                        setNewFolderType(null)
                        setNewFolderNameInput('')
                        setSelectedTagIds([])
                        setCompilationMode('auto')
                        setManuallySelectedFileIds([])
                      }}>📁 New Folder</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}