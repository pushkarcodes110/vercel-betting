import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API } from '@/api/client'
import { useSession } from '@/hooks/useSession'
import { LoaderOverlay } from '@/components/LoaderOverlay'
import { useToast } from '@/hooks/useToast'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { refresh } = useSession()
  const { showToast } = useToast()

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      await API.login(email, password)
      await refresh()
      showToast('Success', 'Signed in successfully', 'success')
      navigate('/home')
    } catch (error) {
      showToast('Login Failed', error instanceof Error ? error.message : 'Invalid email or password', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen p-4">
      <LoaderOverlay active={loading} text="Signing in..." />

      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900">Sign In to Your Account</h1>
          <p className="mt-2 text-sm text-gray-500">Welcome back! Please enter your details.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>

          <button type="submit" disabled={loading} className="w-full py-2 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
