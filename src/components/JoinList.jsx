import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import Loading from './commons/Loading'

export default function JoinList() {
  const { token } = useParams()
  const navigate = useNavigate()

  const { mutate: joinList, error } = useMutation({
    mutationFn: async ({ token }) => {
      const { data, error } = await supabase.rpc('claim_share_link', { p_token: token })
      if (error) throw new Error('This link is invalid or has already been used.')
      return data
    },
    onSuccess: (listId) => navigate(`/list/${listId}`, { replace: true }),
  })

  useEffect(() => {
    joinList({ token })
  }, [token])

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <p className="text-gray-700 mb-6">{error.message}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary text-white font-semibold rounded-xl px-6 py-3"
        >
          Go home
        </button>
      </div>
    )
  }

  return <Loading />
}
