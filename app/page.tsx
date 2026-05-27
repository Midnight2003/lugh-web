'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Node = {
  id: string
  name: string
  type: 'folder' | 'student'
  parent_id: string | null
}

export default function Home() {
  const router = useRouter()

  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [tab, setTab] = useState<'folders' | 'students'>('folders')
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showStudentModal, setShowStudentModal] = useState(false)

  const [folderName, setFolderName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // All students (across all folders)
  const [allStudents, setAllStudents] = useState<Node[]>([])

  // Student detail modal
  const [selectedStudent, setSelectedStudent] = useState<Node | null>(null)
  const [studentFiles, setStudentFiles] = useState<Node[]>([])
  const [studentFilesLoading, setStudentFilesLoading] = useState(false)

  // ======================
  // AUTH INIT
  // ======================
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) console.log('AUTH ERROR:', error)
      if (!data.user) {
        router.push('/login')
        return
      }
      setUser(data.user)
      setLoading(false)
    }
    init()
  }, [])

  // ======================
  // RELOAD ON FOLDER CHANGE
  // ======================
  useEffect(() => {
    if (!user?.id) return
    load(user.id)
  }, [currentFolder, user])

  // ======================
  // LOAD DATA
  // ======================
  async function load(userId: string) {
    // Load current folder view (for Folders tab)
    let query = supabase.from('nodes').select('*').eq('user_id', userId)
    if (currentFolder === null) {
      query = query.is('parent_id', null)
    } else {
      query = query.eq('parent_id', currentFolder)
    }
    const { data, error } = await query
    if (error) { console.log('LOAD ERROR:', error); return }
    setNodes(data || [])

    // Load ALL students globally (for Students tab)
    const { data: studentData, error: studentError } = await supabase
      .from('nodes')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'student')
    if (studentError) { console.log('STUDENTS LOAD ERROR:', studentError); return }
    setAllStudents(studentData || [])
  }

  // ======================
  // ENSURE STUDENTS ROOT FOLDER
  // ======================
  async function ensureStudentsFolder(userId: string): Promise<string | null> {
    // Check if a root "Students" folder already exists
    const { data } = await supabase
      .from('nodes')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'folder')
      .eq('name', 'Students')
      .is('parent_id', null)
      .maybeSingle()

    if (data) return data.id

    // Create it
    const { data: created, error: createError } = await supabase
      .from('nodes')
      .insert({ name: 'Students', type: 'folder', parent_id: null, user_id: userId })
      .select()
      .single()

    if (createError) { console.log('STUDENTS FOLDER ERROR:', createError); return null }
    return created.id
  }

  // ======================
  // CREATE FOLDER
  // ======================
  async function createFolder() {
    if (!folderName || !user?.id) { alert('Missing folder name or user'); return }
    const { error } = await supabase.from('nodes').insert({
      name: folderName,
      type: 'folder',
      parent_id: currentFolder ?? null,
      user_id: user.id
    })
    if (error) { console.log('CREATE FOLDER ERROR:', error); alert(error.message); return }
    setFolderName('')
    setShowFolderModal(false)
    load(user.id)
  }

  // ======================
  // CREATE STUDENT
  // ======================
  async function createStudent() {
    if (!firstName || !lastName || !user?.id) { alert('Student info or user not ready'); return }

    const studentsFolderId = await ensureStudentsFolder(user.id)
    if (!studentsFolderId) { alert('Could not create Students folder'); return }

    const studentName = `${firstName} ${lastName}`

    // Create a folder for the student inside the Students root folder
    const { data: folderData, error: folderError } = await supabase
      .from('nodes')
      .insert({
        name: studentName,
        type: 'folder',
        parent_id: studentsFolderId,
        user_id: user.id
      })
      .select()
      .single()

    if (folderError) { console.log('CREATE STUDENT FOLDER ERROR:', folderError); alert(folderError.message); return }

    // Create the student node linked to their personal folder
    const { error } = await supabase.from('nodes').insert({
      name: studentName,
      type: 'student',
      parent_id: folderData.id,
      user_id: user.id
    })

    if (error) { console.log('CREATE STUDENT ERROR:', error); alert(error.message); return }

    setFirstName('')
    setLastName('')
    setShowStudentModal(false)
    load(user.id)
  }

  // ======================
  // DELETE NODE
  // ======================
  async function deleteNode(id: string) {
    if (!user?.id) return
    if (!confirm('Are you sure you want to delete this item?')) return
    const { error } = await supabase.from('nodes').delete().eq('id', id).eq('user_id', user.id)
    if (error) { console.log('DELETE ERROR:', error); alert(error.message); return }
    load(user.id)
  }

  // ======================
  // OPEN STUDENT MODAL
  // ======================
  async function openStudentModal(student: Node) {
    setSelectedStudent(student)
    setStudentFilesLoading(true)
    // The student node lives inside their personal folder (parent_id = folder id)
    // So load the contents of that folder (siblings of the student node, excluding the student itself)
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('user_id', user.id)
      .eq('parent_id', student.parent_id)
      .neq('type', 'student')
    if (error) console.log('STUDENT FILES ERROR:', error)
    setStudentFiles(data || [])
    setStudentFilesLoading(false)
  }

  const folders = nodes.filter(n => n.type === 'folder')

  return (
    <div className="h-screen flex flex-col" style={{ background: '#f5f4f0', fontFamily: "'DM Sans', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .card { background: #fff; border: 1px solid #e8e5de; border-radius: 14px; transition: box-shadow 0.18s, transform 0.18s; }
        .card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .btn-primary { background: #1a1a1a; color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .btn-primary:hover { background: #333; }
        .btn-ghost { background: transparent; border: 1px solid #e8e5de; border-radius: 10px; padding: 10px 20px; font-family: inherit; font-size: 14px; font-weight: 500; cursor: pointer; color: #555; transition: background 0.15s; }
        .btn-ghost:hover { background: #f5f4f0; }
        .tab-btn { background: transparent; border: none; padding: 8px 18px; font-family: inherit; font-size: 14px; font-weight: 500; cursor: pointer; color: #888; border-radius: 8px; transition: all 0.15s; }
        .tab-btn.active { background: #1a1a1a; color: #fff; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
        .modal { background: #fff; border-radius: 18px; padding: 28px; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
        .modal-lg { max-width: 540px; }
        input[type=text], input[type=email], input[type=password] { width: 100%; padding: 10px 14px; border: 1px solid #e8e5de; border-radius: 10px; font-family: inherit; font-size: 14px; outline: none; transition: border-color 0.15s; }
        input:focus { border-color: #1a1a1a; }
        .delete-btn { background: transparent; border: none; color: #ccc; cursor: pointer; font-size: 16px; padding: 4px 8px; border-radius: 6px; transition: color 0.15s, background 0.15s; }
        .delete-btn:hover { color: #e53e3e; background: #fff5f5; }
        .fab { position: fixed; bottom: 28px; right: 28px; width: 52px; height: 52px; background: #1a1a1a; color: #fff; border: none; border-radius: 50%; font-size: 24px; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.2); transition: transform 0.15s, background 0.15s; display: flex; align-items: center; justify-content: center; }
        .fab:hover { background: #333; transform: scale(1.07); }
        .student-card { cursor: pointer; }
        .student-card:hover .student-avatar { background: #1a1a1a; color: #fff; }
        .file-chip { background: #f5f4f0; border: 1px solid #e8e5de; border-radius: 8px; padding: 8px 12px; font-size: 13px; color: #555; display: flex; align-items: center; gap-6px; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e5de', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.5px' }}>Lugh</span>
          <span style={{ background: '#f5f4f0', color: '#888', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Workspace</span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button className="tab-btn active" style={{ display: 'none' }} />
          <button className={`tab-btn ${tab === 'folders' ? 'active' : ''}`} onClick={() => setTab('folders')}>Folders</button>
          <button className={`tab-btn ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>Students</button>
        </div>

        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
          style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
        >
          Sign out
        </button>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>

        {loading && (
          <div style={{ color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 60 }}>Loading workspace...</div>
        )}

        {/* BACK */}
        {currentFolder && (
          <button
            onClick={() => setCurrentFolder(null)}
            style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← Back
          </button>
        )}

        {/* SECTION HEADER */}
        {!loading && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: '-0.5px' }}>
              {tab === 'folders' ? 'Folders' : 'Students'}
            </h2>
            <p style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>
              {tab === 'folders' ? `${folders.length} folder${folders.length !== 1 ? 's' : ''}` : `${allStudents.length} student${allStudents.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        )}

        {/* EMPTY */}
        {!loading && ((tab === 'folders' && folders.length === 0) || (tab === 'students' && allStudents.length === 0)) && (
          <div style={{ textAlign: 'center', marginTop: 60, color: '#bbb' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{tab === 'folders' ? '📁' : '👤'}</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>No {tab} yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Click the + button to add one</div>
          </div>
        )}

        {/* FOLDERS GRID */}
        {!loading && tab === 'folders' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {folders.map(f => (
              <div key={f.id} className="card" style={{ padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
                onClick={() => setCurrentFolder(f.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, background: '#fef9ec', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📁</div>
                  <button className="delete-btn" onClick={e => { e.stopPropagation(); deleteNode(f.id) }}>✕</button>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Click to open</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STUDENTS LIST */}
        {!loading && tab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allStudents.map(s => (
              <div key={s.id} className="card student-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}
                onClick={() => openStudentModal(s)}>
                <div className="student-avatar" style={{ width: 38, height: 38, background: '#f5f4f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, transition: 'background 0.15s, color 0.15s' }}>
                  👤
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: '#aaa' }}>Click to view details</div>
                </div>
                <button className="delete-btn" onClick={e => { e.stopPropagation(); deleteNode(s.id) }}>✕</button>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* FAB */}
      <button className="fab" onClick={() => tab === 'folders' ? setShowFolderModal(true) : setShowStudentModal(true)}>+</button>

      {/* FOLDER MODAL */}
      {showFolderModal && (
        <div className="modal-overlay" onClick={() => setShowFolderModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>New Folder</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#aaa' }}>Give your folder a name</p>
            <input
              type="text"
              placeholder="Folder name"
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createFolder()}
              autoFocus
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn-ghost" onClick={() => setShowFolderModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={createFolder}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT MODAL */}
      {showStudentModal && (
        <div className="modal-overlay" onClick={() => setShowStudentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>Add Student</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#aaa' }}>Student will be added to the Students folder</p>
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              autoFocus
              style={{ marginBottom: 10 }}
            />
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createStudent()}
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn-ghost" onClick={() => setShowStudentModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={createStudent}>Add Student</button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT DETAIL MODAL */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, background: '#f5f4f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👤</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{selectedStudent.name}</h2>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#aaa' }}>Student</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{ marginLeft: 'auto', background: 'transparent', border: 'none', fontSize: 20, color: '#ccc', cursor: 'pointer', lineHeight: 1 }}
              >✕</button>
            </div>

            <div style={{ borderTop: '1px solid #f0ede6', paddingTop: 18 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#555' }}>Files</h3>
              {studentFilesLoading && <div style={{ fontSize: 13, color: '#aaa' }}>Loading files...</div>}
              {!studentFilesLoading && studentFiles.length === 0 && (
                <div style={{ fontSize: 13, color: '#bbb', textAlign: 'center', padding: '20px 0' }}>No files yet</div>
              )}
              {!studentFilesLoading && studentFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {studentFiles.map(file => (
                    <div key={file.id} className="file-chip">
                      {file.type === 'folder' ? '📁' : '📄'} {file.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}