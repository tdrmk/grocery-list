import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function ProfileSetup({ session, onComplete }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from('profiles')
      .insert({ id: session.user.id, name })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      onComplete()
    }
  }

  return (
    <div>
      <h1>What should we call you?</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Continue'}
        </button>
        {error && <p>{error}</p>}
      </form>
    </div>
  )
}
