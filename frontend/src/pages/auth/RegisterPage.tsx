import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const RegisterPage: React.FC = () => {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'operator' | 'client'>('operator')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Email and password are required')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      setIsSubmitting(true)
      await signUp(fullName || email, password, email, role)
      navigate('/login')
    } catch (err: any) {
      setError(err?.message || 'Failed to create account')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-slate-300">Register for wastewater monitoring system</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'operator' | 'client')}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="operator">Operator</option>
                <option value="client">Client/Owner</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-300">
              Already have an account?{' '}
              <Link to="/login" className="text-teal-400 hover:text-teal-300 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage