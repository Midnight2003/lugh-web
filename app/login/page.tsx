'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const passwordRules = [
    { label: 'At least 8 characters', check: (p: string) => p.length >= 8 },
    { label: 'Uppercase letter', check: (p: string) => /[A-Z]/.test(p) },
    { label: 'Lowercase letter', check: (p: string) => /[a-z]/.test(p) },
    { label: 'A number', check: (p: string) => /\d/.test(p) },
    { label: 'Special character', check: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ]

  const isPasswordValid = (p: string) => passwordRules.every(r => r.check(p))

  const validateSignup = () => {
    setErrorMessage(null); setSuccessMessage(null)
    if (!email.trim()) { setErrorMessage('Email is required'); return false }
    if (!isPasswordValid(password)) { setErrorMessage('Please meet all password requirements'); return false }
    if (password !== confirmPassword) { setErrorMessage('Passwords do not match'); return false }
    return true
  }

  const validateLogin = () => {
    setErrorMessage(null); setSuccessMessage(null)
    if (!email.trim()) { setErrorMessage('Email is required'); return false }
    if (!password) { setErrorMessage('Password is required'); return false }
    return true
  }

  const signIn = async () => {
    if (!validateLogin()) return
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setErrorMessage(error.message); return }
    if (data.session) router.push('/')
  }

  const signUp = async () => {
    if (!validateSignup()) return
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) { setErrorMessage(error.message); return }
    if (data.session) { router.push('/'); return }
    setSuccessMessage('Check your email to confirm your account.')
    setPassword(''); setConfirmPassword('')
    setTimeout(() => { setMode('login'); setSuccessMessage(null) }, 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') await signIn(); else await signUp()
  }

  const toggleMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login')
    setPassword(''); setConfirmPassword(''); setErrorMessage(null); setSuccessMessage(null)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif", background: '#f5f4f0' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .field input { width: 100%; padding: 11px 14px; border: 1px solid #e8e5de; border-radius: 10px; font-family: inherit; font-size: 14px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; background: #fff; }
        .field input:focus { border-color: #1a1a1a; box-shadow: 0 0 0 3px rgba(26,26,26,0.06); }
        .field input:disabled { opacity: 0.6; }
        .field { position: relative; }
        .eye-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; color: #aaa; padding: 0; line-height: 1; }
        .submit-btn { width: 100%; padding: 12px; background: #1a1a1a; color: #fff; border: none; border-radius: 10px; font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .submit-btn:hover:not(:disabled) { background: #333; }
        .submit-btn:active:not(:disabled) { transform: scale(0.99); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .toggle-link { background: none; border: none; color: #1a1a1a; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
      `}</style>

      {/* LEFT PANEL — decorative */}
      <div style={{
        flex: '0 0 420px', background: '#1a1a1a', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '48px 40px', display: 'none'
      }} className="left-panel">
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo */}
          <div style={{ marginBottom: 36, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-1px' }}>Lugh</div>
            <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </div>
          </div>

          {/* Card */}
          <div style={{ background: '#fff', borderRadius: 18, padding: '32px 28px', border: '1px solid #e8e5de', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

            {/* Mode toggle tabs */}
            <div style={{ display: 'flex', background: '#f5f4f0', borderRadius: 10, padding: 4, marginBottom: 28 }}>
              {(['login', 'signup'] as const).map(m => (
                <button key={m} type="button" onClick={() => { setMode(m); setErrorMessage(null); setSuccessMessage(null) }}
                  style={{
                    flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontFamily: 'inherit',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    background: mode === m ? '#fff' : 'transparent',
                    color: mode === m ? '#1a1a1a' : '#aaa',
                    boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                  }}>
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Email</label>
                <div className="field">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" autoComplete="email" disabled={loading} />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Password</label>
                <div className="field">
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    disabled={loading} style={{ paddingRight: 40 }} />
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(s => !s)}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              {mode === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Confirm Password</label>
                  <div className="field">
                    <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••" autoComplete="new-password"
                      disabled={loading} style={{ paddingRight: 40 }} />
                    <button type="button" className="eye-btn" onClick={() => setShowConfirmPassword(s => !s)}>
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              )}

              {/* Password rules */}
              {mode === 'signup' && password && (
                <div style={{ background: '#f5f4f0', borderRadius: 10, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px' }}>
                  {passwordRules.map((rule, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ color: rule.check(password) ? '#22c55e' : '#d1d5db', fontSize: 14, lineHeight: 1 }}>
                        {rule.check(password) ? '✓' : '○'}
                      </span>
                      <span style={{ color: rule.check(password) ? '#166534' : '#9ca3af' }}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Messages */}
              {errorMessage && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#16a34a' }}>
                  {successMessage}
                </div>
              )}

              {/* Submit */}
              <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 4 }}>
                {loading && (
                  <svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                    <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

            </form>
          </div>

          {/* Toggle */}
          <p style={{ textAlign: 'center', fontSize: 14, color: '#888', marginTop: 20 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" className="toggle-link" onClick={toggleMode}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}