import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({ email })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
        <img src="/favicon.svg" alt="" className="w-16 h-16 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-gray-500">We sent a magic link to <strong className="text-gray-800">{email}</strong></p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <img src="/favicon.svg" alt="" className="w-16 h-16 mb-4" />
      <h1 className="text-3xl font-bold mb-1">Grocery List</h1>
      <p className="text-gray-500 mb-8">Shop together, in sync</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-base disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send magic link'}
        </button>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </form>
    </div>
  )
}
