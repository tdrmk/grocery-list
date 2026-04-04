import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ListView({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [list, setList] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchList()
    fetchItems()

    const channel = supabase
      .channel(`list-items-${id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `list_id=eq.${id}` },
        () => fetchItems()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [id])

  async function fetchList() {
    const { data } = await supabase
      .from('lists')
      .select('id, name')
      .eq('id', id)
      .single()

    setList(data)
    setLoading(false)
  }

  async function fetchItems() {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('list_id', id)
      .in('status', ['active', 'purchased'])
      .order('added_at', { ascending: false })

    setItems(data ?? [])
  }

  async function togglePurchased(item) {
    const newStatus = item.status === 'active' ? 'purchased' : 'active'
    const updates = {
      status: newStatus,
      purchased_at: newStatus === 'purchased' ? new Date().toISOString() : null
    }

    await supabase.from('items').update(updates).eq('id', item.id)
  }

  async function clearPurchased() {
    await supabase
      .from('items')
      .update({ status: 'cleared' })
      .eq('list_id', id)
      .eq('status', 'purchased')
  }

  async function shareList() {
    const { data } = await supabase
      .from('share_links')
      .insert({ list_id: id, created_by: session.user.id })
      .select('token')
      .single()
    const url = `${window.location.origin}/join/${data.token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return null

  if (!list) return <p>List not found. <button onClick={() => navigate('/')}>Go back</button></p>

  const activeItems = items.filter(i => i.status === 'active')
  const purchasedItems = items.filter(i => i.status === 'purchased')

  return (
    <div>
      <button onClick={() => navigate('/')}>← Back</button>
      <h1>{list.name}</h1>
      <button onClick={() => navigate(`/list/${id}/add`)}>+ Add items</button>
      <button onClick={shareList}>{copied ? 'Link copied!' : 'Share'}</button>

      {activeItems.length === 0 && purchasedItems.length === 0 && (
        <p>No items yet.</p>
      )}

      <ul>
        {activeItems.map(item => (
          <li key={item.id} onClick={() => togglePurchased(item)}>
            {item.icon} {item.name} {item.quantity && `(${item.quantity})`}
          </li>
        ))}
      </ul>

      {purchasedItems.length > 0 && (
        <>
          <p>── Purchased ──</p>
          <ul>
            {purchasedItems.map(item => (
              <li key={item.id} onClick={() => togglePurchased(item)}>
                ✓ {item.icon} {item.name}
              </li>
            ))}
          </ul>
          <button onClick={clearPurchased}>Clear purchased</button>
        </>
      )}
    </div>
  )
}
