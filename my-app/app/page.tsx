'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Node = {
  id: string
  name: string
  type: string
}

export default function Home() {
  const router = useRouter()
  const [tab, setTab] = useState<'folders' | 'students'>('folders')
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(false)

  const [user, setUser] = useState<any>(null)

  // Folder modal
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [folderName, setFolderName] = useState('')

  // Student modal
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // ======================
  // LOGIN SCREEN
  // ======================
  useEffect(() => {
  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      router.push('/login')
      return
    }

    setUser(data.user)
    load(data.user.id)
  }

  checkUser()
  }, [])
  // ======================
  // INIT USER + LOAD DATA
  // ======================
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)

      load(data.user?.id)
    }

    init()
  }, [])

  // ======================
  // LOAD DATA
  // ======================
  async function load(userId?: string) {
    if (!userId) return

    setLoading(true)

    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.log('LOAD ERROR:', error)
    }

    setNodes(data || [])
    setLoading(false)
  }

  // ======================
  // CREATE FOLDER
  // ======================
  async function createFolder() {
    if (!folderName || !user) return

    const { error } = await supabase.from('nodes').insert({
      name: folderName,
      type: 'folder',
      user_id: user.id
    })

    if (error) {
      console.log('INSERT ERROR:', error)
      alert(error.message)
      return
    }

    setFolderName('')
    setShowFolderModal(false)
    load(user.id)
  }

  // ======================
  // CREATE STUDENT
  // ======================
  async function createStudent() {
    if (!firstName || !lastName || !user) return

    const { error } = await supabase.from('nodes').insert({
      name: `${firstName} ${lastName}`,
      type: 'student',
      user_id: user.id
    })

    if (error) {
      console.log('INSERT ERROR:', error)
      alert(error.message)
      return
    }

    setFirstName('')
    setLastName('')
    setShowStudentModal(false)
    load(user.id)
  }

  const folders = nodes.filter(n => n.type === 'folder')
  const students = nodes.filter(n => n.type === 'student')

  return (
    <div className="h-screen flex flex-col">

      {/* TOP BAR */}
      <div className="flex border-b p-2 gap-4">
        <button
          onClick={() => setTab('folders')}
          className={tab === 'folders' ? 'font-bold' : ''}
        >
          Folders
        </button>

        <button
          onClick={() => setTab('students')}
          className={tab === 'students' ? 'font-bold' : ''}
        >
          Students
        </button>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
        >
          Logout
        </button>
        </div>

      {/* CONTENT */}
      <div className="flex-1 p-4">

        {loading && <p>Loading...</p>}

        {/* FOLDERS */}
        {tab === 'folders' && (
          <div>
            <h1 className="text-xl font-bold">Folders</h1>

            <div className="mt-4 space-y-2">
              {folders.map(f => (
                <div key={f.id} className="border p-2 rounded">
                  📁 {f.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STUDENTS */}
        {tab === 'students' && (
          <div>
            <h1 className="text-xl font-bold">Students</h1>

            <div className="mt-4 space-y-2">
              {students.map(s => (
                <div key={s.id} className="border p-2 rounded">
                  👤 {s.name}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* + BUTTON */}
      <button
        onClick={() =>
          tab === 'folders'
            ? setShowFolderModal(true)
            : setShowStudentModal(true)
        }
        className="fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full text-2xl"
      >
        +
      </button>

      {/* ======================
          FOLDER MODAL
      ====================== */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-80">

            <h2 className="font-bold mb-2">Create Folder</h2>

            <input
              className="border w-full p-2 mb-2"
              placeholder="Folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFolderModal(false)}>
                Cancel
              </button>

              <button
                onClick={createFolder}
                className="bg-black text-white px-3 py-1 rounded"
              >
                Create
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================
          STUDENT MODAL
      ====================== */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-80">

            <h2 className="font-bold mb-2">Add Student</h2>

            <input
              className="border w-full p-2 mb-2"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />

            <input
              className="border w-full p-2 mb-2"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowStudentModal(false)}>
                Cancel
              </button>

              <button
                onClick={createStudent}
                className="bg-black text-white px-3 py-1 rounded"
              >
                Create
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}