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

  // ======================
  // AUTH INIT
  // ======================
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        console.log('AUTH ERROR:', error)
      }

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
    let query = supabase
      .from('nodes')
      .select('*')
      .eq('user_id', userId)

    // IMPORTANT: correct NULL handling for UUID column
    if (currentFolder === null) {
      query = query.is('parent_id', null)
    } else {
      query = query.eq('parent_id', currentFolder)
    }

    const { data, error } = await query

    if (error) {
      console.log('LOAD ERROR:', error)
      return
    }

    setNodes(data || [])
  }

  // ======================
  // CREATE FOLDER
  // ======================
  async function createFolder() {
    if (!folderName || !user?.id) {
      alert('Missing folder name or user')
      return
    }

    const { error } = await supabase.from('nodes').insert({
      name: folderName,
      type: 'folder',
      parent_id: currentFolder ?? null, // IMPORTANT SAFETY
      user_id: user.id
    })

    if (error) {
      console.log('CREATE FOLDER ERROR:', error)
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
    if (!firstName || !lastName || !user?.id) {
      alert('Student info or user not ready')
      return
    }

    const { error } = await supabase.from('nodes').insert({
      name: `${firstName} ${lastName}`,
      type: 'student',
      parent_id: currentFolder ?? null,
      user_id: user.id
    })

    if (error) {
      console.log('CREATE STUDENT ERROR:', error)
      alert(error.message)
      return
    }

    setFirstName('')
    setLastName('')
    setShowStudentModal(false)
    load(user.id)
  }

  // ======================
  // DELETE NODES
  // ======================
  async function deleteNode(id: string) {
  if (!user?.id) return

  const confirmDelete = confirm('Are you sure you want to delete this item?')
  if (!confirmDelete) return

  const { error } = await supabase
    .from('nodes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.log('DELETE ERROR:', error)
    alert(error.message)
    return
  }

  load(user.id)
  }
  const folders = nodes.filter(n => n.type === 'folder')
  const students = nodes.filter(n => n.type === 'student')

  return (
    <div className="h-screen flex flex-col bg-gray-100">

      {/* TOP BAR */}
      <div className="flex items-center justify-between bg-white px-6 py-3 border-b shadow-sm">

        <div className="flex gap-6">

          <button
            onClick={() => setTab('folders')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition
              ${tab === 'folders'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            📁 Folders
          </button>

          <button
            onClick={() => setTab('students')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition
              ${tab === 'students'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            👤 Students
          </button>

        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
          className="text-sm text-red-500 hover:text-red-700"
        >
          Logout
        </button>

      </div>

      {/* CONTENT */}
      <div className="flex-1 p-6">

        {loading && (
          <div className="text-gray-500">Loading workspace...</div>
        )}

        {/* BACK BUTTON */}
        {currentFolder && (
          <button
            onClick={() => setCurrentFolder(null)}
            className="mb-4 text-blue-600 hover:underline"
          >
            ← Back
          </button>
        )}

        {/* EMPTY STATE */}
        {!loading && nodes.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            This folder is empty
          </div>
        )}

        {/* FOLDERS */}
        {tab === 'folders' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Your Folders
            </h1>

            <div className="grid gap-3">
              {folders.map(f => (
              <div
                key={f.id}
                onClick={() => setCurrentFolder(f.id)}
                className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer flex justify-between items-center"
              >
                <div>
                  📁 {f.name}
                  <div className="text-xs text-gray-400 mt-1">Click to open</div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNode(f.id)
                  }}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
              ))}
            </div>
          </div>
        )}

        {/* STUDENTS */}
        {tab === 'students' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Students
            </h1>

            <div className="grid gap-3">
              {students.map(s => (
              <div
                key={s.id}
                className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition flex justify-between items-center"
              >
                <div>
                  👤 {s.name}
                  <div className="text-xs text-gray-400 mt-1">Student</div>
                </div>

                <button
                  onClick={() => deleteNode(s.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
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
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full text-2xl shadow-lg hover:bg-blue-700 transition"
      >
        +
      </button>

      {/* FOLDER MODAL */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-5 rounded-xl w-80 shadow-lg">

            <h2 className="font-bold text-lg mb-3">Create Folder</h2>

            <input
              className="border rounded-md w-full p-2 mb-3"
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
                className="bg-blue-600 text-white px-3 py-1 rounded-md"
              >
                Create
              </button>
            </div>

          </div>
        </div>
      )}

      {/* STUDENT MODAL */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-5 rounded-xl w-80 shadow-lg">

            <h2 className="font-bold text-lg mb-3">Add Student</h2>

            <input
              className="border rounded-md w-full p-2 mb-2"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />

            <input
              className="border rounded-md w-full p-2 mb-3"
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
                className="bg-blue-600 text-white px-3 py-1 rounded-md"
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