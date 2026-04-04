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

  if (error) return <p>{error} <button onClick={() => navigate('/')}>Go home</button></p>

  return null
}
