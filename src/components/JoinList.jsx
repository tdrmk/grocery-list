import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function JoinList({ session }) {
  const { token } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    async function join() {
      const { data: link } = await supabase
        .from('share_links')
        .select('id, list_id')
        .eq('token', token)
        .is('claimed_by', null)
        .single()

      if (!link) {
        setError('This link is invalid or has already been used.')
        return
      }

      const { error: claimError } = await supabase
        .from('share_links')
        .update({ claimed_by: session.user.id })
        .eq('id', link.id)

      if (claimError) {
        setError('Failed to claim this link. Please try again.')
        return
      }

      const { error: memberError } = await supabase
        .from('list_members')
        .insert({ list_id: link.list_id, user_id: session.user.id })

      if (memberError) {
        setError('Failed to join the list. Please try again.')
        return
      }

      navigate(`/list/${link.list_id}`, { replace: true })
    }

    join()
  }, [token])

  if (error) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🔗</div>
      <p className="text-gray-700 mb-6">{error}</p>
      <button
        onClick={() => navigate('/')}
        className="bg-primary text-white font-semibold rounded-xl px-6 py-3"
      >
        Go home
      </button>
    </div>
  )

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <p className="text-gray-400">Joining list…</p>
    </div>
  )
}
