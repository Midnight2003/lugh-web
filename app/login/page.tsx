'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import blacklogo from '../../image/blacklogo.png'
import whitelogo1 from '../../image/whitelogo1.png'

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
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const t = {
    bg: dark ? '#0f0f0f' : '#f5f4f0',
    card: dark ? '#1a1a1a' : '#ffffff',
    cardBorder: dark ? '#2e2e2e' : '#e8e5de',
    text: dark ? '#f0f0f0' : '#1a1a1a',
    textMuted: dark ? '#888' : '#aaa',
    textLabel: dark ? '#ccc' : '#555',
    inputBg: dark ? '#111' : '#fff',
    inputBorder: dark ? '#333' : '#e8e5de',
    inputFocus: dark ? '#555' : '#1a1a1a',
    tabBg: dark ? '#111' : '#f5f4f0',
    tabActive: dark ? '#2a2a2a' : '#fff',
    btnPrimary: dark ? '#f0f0f0' : '#1a1a1a',
    btnPrimaryText: dark ? '#0f0f0f' : '#fff',
    btnPrimaryHover: dark ? '#fff' : '#333',
    toggleBtn: dark ? '#f0f0f0' : '#1a1a1a',
    ruleBg: dark ? '#111' : '#f5f4f0',
    shadow: dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.06)',
  }

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
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif", background: t.bg, transition: 'background 0.2s, color 0.2s' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .login-input { width: 100%; padding: 11px 14px; border-radius: 10px; font-family: inherit; font-size: 14px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .submit-btn { width: 100%; padding: 12px; border: none; border-radius: 10px; font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .submit-btn:active:not(:disabled) { transform: scale(0.99); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .eye-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; padding: 0; line-height: 1; }
        .toggle-link { background: none; border: none; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
        .dark-toggle { background: none; border: none; cursor: pointer; font-size: 18px; padding: 6px; border-radius: 8px; transition: background 0.15s; }
        .dark-toggle:hover { background: rgba(128,128,128,0.15); }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo + dark toggle */}
          <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }} />
              <Image
                src={dark ? whitelogo1 : blacklogo}
                alt="Lugh"
                width={100}
                height={40}
                loading="eager"
                style={{ objectFit: 'contain', width: 'auto', height: 'auto' }}
              />
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="dark-toggle" onClick={() => setDark(d => !d)} title="Toggle dark mode">
                  {dark ? '☀️' : '🌙'}
                </button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: t.textMuted }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </div>
          </div>

          {/* Card */}
          <div style={{ background: t.card, borderRadius: 18, padding: '32px 28px', border: `1px solid ${t.cardBorder}`, boxShadow: t.shadow, transition: 'background 0.2s, border-color 0.2s' }}>

            {/* Mode tabs */}
            <div style={{ display: 'flex', background: t.tabBg, borderRadius: 10, padding: 4, marginBottom: 28, transition: 'background 0.2s' }}>
              {(['login', 'signup'] as const).map(m => (
                <button key={m} type="button"
                  onClick={() => { setMode(m); setErrorMessage(null); setSuccessMessage(null) }}
                  style={{
                    flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontFamily: 'inherit',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    background: mode === m ? t.tabActive : 'transparent',
                    color: mode === m ? t.text : t.textMuted,
                    boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.12)' : 'none'
                  }}>
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textLabel, marginBottom: 6 }}>Email</label>
                <input className="login-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="email" disabled={loading}
                  style={{ border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text }} />
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textLabel, marginBottom: 6 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="login-input" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    disabled={loading} style={{ paddingRight: 40, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text }} />
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(s => !s)} style={{ color: t.textMuted }}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              {mode === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textLabel, marginBottom: 6 }}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="login-input" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••"
                      autoComplete="new-password" disabled={loading}
                      style={{ paddingRight: 40, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text }} />
                    <button type="button" className="eye-btn" onClick={() => setShowConfirmPassword(s => !s)} style={{ color: t.textMuted }}>
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              )}

              {/* Password rules */}
              {mode === 'signup' && password && (
                <div style={{ background: t.ruleBg, borderRadius: 10, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px', transition: 'background 0.2s' }}>
                  {passwordRules.map((rule, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ color: rule.check(password) ? '#22c55e' : '#6b7280', fontSize: 14, lineHeight: 1 }}>
                        {rule.check(password) ? '✓' : '○'}
                      </span>
                      <span style={{ color: rule.check(password) ? '#16a34a' : t.textMuted }}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Messages */}
              {errorMessage && (
                <div style={{ background: dark ? '#2d0f0f' : '#fef2f2', border: `1px solid ${dark ? '#7f1d1d' : '#fecaca'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: dark ? '#fca5a5' : '#dc2626' }}>
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div style={{ background: dark ? '#0f2d1a' : '#f0fdf4', border: `1px solid ${dark ? '#166534' : '#bbf7d0'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: dark ? '#86efac' : '#16a34a' }}>
                  {successMessage}
                </div>
              )}

              {/* Submit */}
              <button type="submit" className="submit-btn" disabled={loading}
                style={{ marginTop: 4, background: t.btnPrimary, color: t.btnPrimaryText }}>
                {loading && (
                  <svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                    <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

            </form>
          </div>

          {/* Toggle */}
          <p style={{ textAlign: 'center', fontSize: 14, color: t.textMuted, marginTop: 20 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" className="toggle-link" onClick={toggleMode} style={{ color: t.toggleBtn }}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}