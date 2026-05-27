'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // SIGN IN
  async function signIn() {
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    router.push('/')
  }

  // SIGN UP
  async function signUp() {
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password
    })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    alert('Check your email to confirm account')
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="border p-6 rounded w-80">

        <h1 className="text-xl font-bold mb-4">Login</h1>

        <input
          className="border w-full p-2 mb-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border w-full p-2 mb-4"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={signIn}
          className="bg-black text-white w-full p-2 mb-2"
        >
          Sign In
        </button>

        <button
          onClick={signUp}
          className="border w-full p-2"
        >
          Sign Up
        </button>

        {loading && <p className="text-sm mt-2">Loading...</p>}

      </div>
    </div>
  )
}