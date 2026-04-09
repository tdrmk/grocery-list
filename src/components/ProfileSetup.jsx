import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function ProfileSetup({ userId, onComplete }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from('profiles')
      .insert({ id: userId, name })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      onComplete()
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="text-5xl mb-4">👋</div>
      <h1 className="text-2xl font-bold mb-1">What should we call you?</h1>
      <p className="text-gray-500 mb-8">This is how you'll appear to people you share lists with</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoFocus
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-base disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </form>
    </div>
  )
}
