import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useUserId } from '../UserContext'
import Spinner from './commons/Spinner'

export default function ProfileSetup({ onComplete }) {
  const userId = useUserId()
  const [name, setName] = useState('')

  const { mutateAsync: createProfile, isPending, error } = useMutation({
    mutationFn: async ({ name }) => {
      const { error } = await supabase.from('profiles').insert({ id: userId, name })
      if (error) throw error
    },
    onSuccess: onComplete,
  })

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await createProfile({ name })
    } catch {
      // error displayed via `error` below
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
          disabled={isPending}
          className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-base disabled:opacity-50"
        >
          {isPending ? <span className="flex items-center justify-center gap-2"><Spinner className="w-5 h-5" />Saving…</span> : 'Continue'}
        </button>
        {error && <p className="text-red-500 text-sm text-center">{error.message}</p>}
      </form>
    </div>
  )
}
