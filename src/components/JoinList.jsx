import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function JoinList() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    async function join() {
      const { data: listId, error } = await supabase
        .rpc('claim_share_link', { p_token: token })

      if (error) {
        setError('This link is invalid or has already been used.')
        return
      }

      navigate(`/list/${listId}`, { replace: true })
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
