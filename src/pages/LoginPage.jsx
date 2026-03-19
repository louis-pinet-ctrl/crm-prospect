import { useState } from 'react'
import { signIn } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-primary font-bold text-2xl">
            Avocat des Restaurateurs
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Je défends ceux qui nous nourrissent
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-text-secondary text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-bg-main border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-text-secondary text-sm mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-bg-main border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-danger text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-bg-main font-semibold py-2.5 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
