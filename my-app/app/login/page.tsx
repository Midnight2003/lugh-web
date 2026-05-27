'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  // Mode: 'login' or 'signup'
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // UI helpers
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Error & success messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Password validation rules (for signup)
  const passwordRules = [
    { label: 'At least 8 characters', check: (pwd: string) => pwd.length >= 8 },
    { label: 'Contains uppercase letter', check: (pwd: string) => /[A-Z]/.test(pwd) },
    { label: 'Contains lowercase letter', check: (pwd: string) => /[a-z]/.test(pwd) },
    { label: 'Contains a number', check: (pwd: string) => /\d/.test(pwd) },
    { label: 'Contains a special character', check: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ]

  const getPasswordValidation = (pwd: string) => {
    return passwordRules.map(rule => ({
      ...rule,
      isValid: rule.check(pwd),
    }))
  }

  const isPasswordValid = (pwd: string) => {
    return passwordRules.every(rule => rule.check(pwd))
  }

  const validateSignup = (): boolean => {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!email.trim()) {
      setErrorMessage('Email is required')
      return false
    }
    if (!password) {
      setErrorMessage('Password is required')
      return false
    }
    if (!isPasswordValid(password)) {
      setErrorMessage('Please meet all password requirements')
      return false
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match')
      return false
    }
    return true
  }

  const validateLogin = (): boolean => {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!email.trim()) {
      setErrorMessage('Email is required')
      return false
    }
    if (!password) {
      setErrorMessage('Password is required')
      return false
    }
    return true
  }

  // SIGN IN
  const signIn = async () => {
    if (!validateLogin()) return

    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    if (data.session) {
      router.push('/')
    }
  }

  // SIGN UP
  const signUp = async () => {
    if (!validateSignup()) return

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    setLoading(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    // If session exists (email confirmation disabled), redirect to home
    if (data.session) {
      router.push('/')
      return
    }

    // Email confirmation required
    setSuccessMessage(
      'Signup successful! Please check your email to confirm your account.'
    )
    // Clear password fields after successful signup
    setPassword('')
    setConfirmPassword('')
    // Optionally switch to login mode after a delay (user can also click toggle)
    setTimeout(() => {
      setMode('login')
      setSuccessMessage(null)
    }, 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') {
      await signIn()
    } else {
      await signUp()
    }
  }

  const toggleMode = () => {
    const newMode = mode === 'login' ? 'signup' : 'login'
    setMode(newMode)
    // Reset form fields & messages when toggling
    setPassword('')
    setConfirmPassword('')
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-8 pb-4 text-center border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-800">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'login'
                ? 'Sign in to your account'
                : 'Join us today'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition pr-10"
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (only for signup) */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition pr-10"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            )}

            {/* Password Requirements (signup only) */}
            {mode === 'signup' && password && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                <p className="font-medium text-gray-700 mb-1">Password requirements:</p>
                {getPasswordValidation(password).map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {rule.isValid ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-gray-400">○</span>
                    )}
                    <span className={rule.isValid ? 'text-green-700' : 'text-gray-500'}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-200">
                {successMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            {/* Toggle Mode Link */}
            <div className="text-center text-sm">
              {mode === 'login' ? (
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}