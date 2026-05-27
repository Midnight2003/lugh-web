'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import blacklogo from '../image/blacklogo.png'
import whitelogo1 from '../image/whitelogo1.png'

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
  const [dark, setDark] = useState(false)

  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showStudentModal, setShowStudentModal] = useState(false)

  const [folderName, setFolderName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const [allStudents, setAllStudents] = useState<Node[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Node | null>(null)
  const [studentFiles, setStudentFiles] = useState<Node[]>([])
  const [studentFilesLoading, setStudentFilesLoading] = useState(false)

  // Detect system dark mode preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

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
    deleteBtnHover: '#e53e3e',
    deleteBtnHoverBg: dark ? '#2d0f0f' : '#fff5f5',
  }

  // ======================
  // AUTH INIT
  // ======================
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) console.log('AUTH ERROR:', error)
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!user?.id) return
    load(user.id)
  }, [currentFolder, user])

  // ======================
  // LOAD DATA
  // ======================
  async function load(userId: string) {
    let query = supabase.from('nodes').select('*').eq('user_id', userId)
    if (currentFolder === null) {
      query = query.is('parent_id', null)
    } else {
      query = query.eq('parent_id', currentFolder)
    }
    const { data, error } = await query
    if (error) { console.log('LOAD ERROR:', error); return }
    setNodes(data || [])

    const { data: studentData, error: studentError } = await supabase
      .from('nodes').select('*').eq('user_id', userId).eq('type', 'student')
    if (studentError) { console.log('STUDENTS LOAD ERROR:', studentError); return }
    setAllStudents(studentData || [])
  }

  // ======================
  // ENSURE STUDENTS ROOT FOLDER
  // ======================
  async function ensureStudentsFolder(userId: string): Promise<string | null> {
    const { data } = await supabase
      .from('nodes').select('*').eq('user_id', userId)
      .eq('type', 'folder').eq('name', 'Students').is('parent_id', null).maybeSingle()
    if (data) return data.id
    const { data: created, error: createError } = await supabase
      .from('nodes').insert({ name: 'Students', type: 'folder', parent_id: null, user_id: userId })
      .select().single()
    if (createError) { console.log('STUDENTS FOLDER ERROR:', createError); return null }
    return created.id
  }

  // ======================
  // CREATE FOLDER
  // ======================
  async function createFolder() {
    if (!folderName || !user?.id) { alert('Missing folder name or user'); return }
    const { error } = await supabase.from('nodes').insert({
      name: folderName, type: 'folder', parent_id: currentFolder ?? null, user_id: user.id
    })
    if (error) { console.log('CREATE FOLDER ERROR:', error); alert(error.message); return }
    setFolderName(''); setShowFolderModal(false); load(user.id)
  }

  // ======================
  // CREATE STUDENT
  // ======================
  async function createStudent() {
    if (!firstName || !lastName || !user?.id) { alert('Student info or user not ready'); return }
    const studentsFolderId = await ensureStudentsFolder(user.id)
    if (!studentsFolderId) { alert('Could not create Students folder'); return }
    const studentName = `${firstName} ${lastName}`
    const { data: folderData, error: folderError } = await supabase
      .from('nodes').insert({ name: studentName, type: 'folder', parent_id: studentsFolderId, user_id: user.id })
      .select().single()
    if (folderError) { console.log('CREATE STUDENT FOLDER ERROR:', folderError); alert(folderError.message); return }
    const { error } = await supabase.from('nodes').insert({
      name: studentName, type: 'student', parent_id: folderData.id, user_id: user.id
    })
    if (error) { console.log('CREATE STUDENT ERROR:', error); alert(error.message); return }
    setFirstName(''); setLastName(''); setShowStudentModal(false); load(user.id)
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
    const { data, error } = await supabase
      .from('nodes').select('*').eq('user_id', user.id)
      .eq('parent_id', student.parent_id).neq('type', 'student')
    if (error) console.log('STUDENT FILES ERROR:', error)
    setStudentFiles(data || [])
    setStudentFilesLoading(false)
  }

  const folders = nodes.filter(n => n.type === 'folder')

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: t.bg, fontFamily: "'DM Sans', sans-serif", transition: 'background 0.2s' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .card { border-radius: 14px; transition: box-shadow 0.18s, transform 0.18s; }
        .card:hover { transform: translateY(-1px); }
        .tab-btn { background: transparent; border: none; padding: 8px 18px; font-family: inherit; font-size: 14px; font-weight: 500; cursor: pointer; border-radius: 8px; transition: all 0.15s; }
        .modal-overlay { position: fixed; inset: 0; backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
        .modal { border-radius: 18px; padding: 28px; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .modal-lg { max-width: 540px; }
        .app-input { width: 100%; padding: 10px 14px; border-radius: 10px; font-family: inherit; font-size: 14px; outline: none; transition: border-color 0.15s; }
        .app-input:focus { outline: none; }
        .delete-btn { background: transparent; border: none; cursor: pointer; font-size: 16px; padding: 4px 8px; border-radius: 6px; transition: color 0.15s, background 0.15s; }
        .fab { position: fixed; bottom: 28px; right: 28px; width: 52px; height: 52px; border: none; border-radius: 50%; font-size: 24px; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.25); transition: transform 0.15s, background 0.15s; display: flex; align-items: center; justify-content: center; }
        .fab:hover { transform: scale(1.07); }
        .student-card { cursor: pointer; }
        .dark-toggle { background: none; border: none; cursor: pointer; font-size: 18px; padding: 6px; border-radius: 8px; transition: background 0.15s; }
        .dark-toggle:hover { background: rgba(128,128,128,0.15); }
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: t.topbar, borderBottom: `1px solid ${t.topbarBorder}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, transition: 'background 0.2s' }}>

         {/* Logo */}
        <Image
          src={dark ? whitelogo1 : blacklogo}
          alt="Lugh"
          width={30}
          height={30}
          loading="eager"
          style={{ objectFit: 'contain', width: 'auto', height: 'auto' }}
        />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="tab-btn"
            onClick={() => setTab('folders')}
            style={{ background: tab === 'folders' ? t.tabActiveBg : 'transparent', color: tab === 'folders' ? t.tabActiveText : t.tabInactiveText }}>
            Folders
          </button>
          <button className="tab-btn"
            onClick={() => setTab('students')}
            style={{ background: tab === 'students' ? t.tabActiveBg : 'transparent', color: tab === 'students' ? t.tabActiveText : t.tabInactiveText }}>
            Students
          </button>
        </div>

        
        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="dark-toggle" onClick={() => setDark(d => !d)} title="Toggle dark mode">
            {dark ? '☀️' : '🌙'}
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ background: 'transparent', border: 'none', color: t.textMuted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            Sign out
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>

        {loading && <div style={{ color: t.textMuted, fontSize: 14, textAlign: 'center', marginTop: 60 }}>Loading workspace...</div>}

        {currentFolder && (
          <button onClick={() => setCurrentFolder(null)}
            style={{ background: 'transparent', border: 'none', color: t.textMuted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back
          </button>
        )}

        {!loading && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: t.text, margin: 0, letterSpacing: '-0.5px' }}>
              {tab === 'folders' ? 'Folders' : 'Students'}
            </h2>
            <p style={{ fontSize: 13, color: t.textMuted, margin: '4px 0 0' }}>
              {tab === 'folders' ? `${folders.length} folder${folders.length !== 1 ? 's' : ''}` : `${allStudents.length} student${allStudents.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        )}

        {!loading && ((tab === 'folders' && folders.length === 0) || (tab === 'students' && allStudents.length === 0)) && (
          <div style={{ textAlign: 'center', marginTop: 60, color: t.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{tab === 'folders' ? '📁' : '👤'}</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>No {tab} yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Click the + button to add one</div>
          </div>
        )}

        {/* FOLDERS GRID */}
        {!loading && tab === 'folders' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {folders.map(f => (
              <div key={f.id} className="card"
                style={{ padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, background: t.card, border: `1px solid ${t.cardBorder}` }}
                onClick={() => setCurrentFolder(f.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, background: t.folderIconBg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📁</div>
                  <button className="delete-btn"
                    style={{ color: t.deleteBtn }}
                    onClick={e => { e.stopPropagation(); deleteNode(f.id) }}>✕</button>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: t.text }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>Click to open</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STUDENTS LIST */}
        {!loading && tab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allStudents.map(s => (
              <div key={s.id} className="card student-card"
                style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, background: t.card, border: `1px solid ${t.cardBorder}` }}
                onClick={() => openStudentModal(s)}>
                <div style={{ width: 38, height: 38, background: t.avatarBg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  👤
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: t.text }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>Click to view details</div>
                </div>
                <button className="delete-btn" style={{ color: t.deleteBtn }}
                  onClick={e => { e.stopPropagation(); deleteNode(s.id) }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab"
        style={{ background: t.fabBg, color: t.fabText }}
        onClick={() => tab === 'folders' ? setShowFolderModal(true) : setShowStudentModal(true)}>+</button>

      {/* FOLDER MODAL */}
      {showFolderModal && (
        <div className="modal-overlay" style={{ background: t.modalOverlay }} onClick={() => setShowFolderModal(false)}>
          <div className="modal" style={{ background: t.modalBg, border: `1px solid ${t.cardBorder}` }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: t.text }}>New Folder</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: t.textMuted }}>Give your folder a name</p>
            <input className="app-input" type="text" placeholder="Folder name" value={folderName}
              onChange={e => setFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createFolder()} autoFocus
              style={{ marginBottom: 16, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowFolderModal(false)}
                style={{ background: 'transparent', border: `1px solid ${t.btnGhostBorder}`, borderRadius: 10, padding: '10px 20px', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: t.btnGhostText }}>
                Cancel
              </button>
              <button onClick={createFolder}
                style={{ background: t.btnPrimary, color: t.btnPrimaryText, border: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT MODAL */}
      {showStudentModal && (
        <div className="modal-overlay" style={{ background: t.modalOverlay }} onClick={() => setShowStudentModal(false)}>
          <div className="modal" style={{ background: t.modalBg, border: `1px solid ${t.cardBorder}` }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: t.text }}>Add Student</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: t.textMuted }}>Student will be added to the Students folder</p>
            <input className="app-input" type="text" placeholder="First name" value={firstName}
              onChange={e => setFirstName(e.target.value)} autoFocus
              style={{ marginBottom: 10, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text }} />
            <input className="app-input" type="text" placeholder="Last name" value={lastName}
              onChange={e => setLastName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createStudent()}
              style={{ marginBottom: 16, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowStudentModal(false)}
                style={{ background: 'transparent', border: `1px solid ${t.btnGhostBorder}`, borderRadius: 10, padding: '10px 20px', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: t.btnGhostText }}>
                Cancel
              </button>
              <button onClick={createStudent}
                style={{ background: t.btnPrimary, color: t.btnPrimaryText, border: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT DETAIL MODAL */}
      {selectedStudent && (
        <div className="modal-overlay" style={{ background: t.modalOverlay }} onClick={() => setSelectedStudent(null)}>
          <div className="modal modal-lg" style={{ background: t.modalBg, border: `1px solid ${t.cardBorder}` }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, background: t.avatarBg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👤</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: t.text }}>{selectedStudent.name}</h2>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: t.textMuted }}>Student</p>
              </div>
              <button onClick={() => setSelectedStudent(null)}
                style={{ marginLeft: 'auto', background: 'transparent', border: 'none', fontSize: 20, color: t.textMuted, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ borderTop: `1px solid ${t.modalDivider}`, paddingTop: 18 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: t.textSub }}>Files</h3>
              {studentFilesLoading && <div style={{ fontSize: 13, color: t.textMuted }}>Loading files...</div>}
              {!studentFilesLoading && studentFiles.length === 0 && (
                <div style={{ fontSize: 13, color: t.textMuted, textAlign: 'center', padding: '20px 0' }}>No files yet</div>
              )}
              {!studentFilesLoading && studentFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {studentFiles.map(file => (
                    <div key={file.id} style={{ background: t.chipBg, border: `1px solid ${t.chipBorder}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: t.chipText, display: 'flex', alignItems: 'center', gap: 6 }}>
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