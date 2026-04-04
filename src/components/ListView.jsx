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

  if (!list) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <p className="text-gray-500 mb-4">List not found.</p>
      <button onClick={() => navigate('/')} className="text-primary font-semibold">Go back</button>
    </div>
  )

  const activeItems = items.filter(i => i.status === 'active')
  const purchasedItems = items.filter(i => i.status === 'purchased')

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center px-4 py-3 gap-3">
          <button onClick={() => navigate('/')} className="text-primary font-medium text-sm">
            ← Back
          </button>
          <h1 className="flex-1 text-center font-bold text-lg truncate">{list.name}</h1>
          <button
            onClick={shareList}
            className="text-sm text-primary font-medium"
          >
            {copied ? '✓ Copied' : 'Share'}
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Empty state */}
        {activeItems.length === 0 && purchasedItems.length === 0 && (
          <p className="text-center text-gray-400 py-16">No items yet.</p>
        )}

        {/* Active items */}
        {activeItems.length > 0 && (
          <ul className="flex flex-col gap-1">
            {activeItems.map(item => (
              <li
                key={item.id}
                onClick={() => togglePurchased(item)}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm active:bg-gray-50 cursor-pointer"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="flex-1 text-base">{item.name}</span>
                {item.quantity && <span className="text-sm text-gray-400">{item.quantity}</span>}
              </li>
            ))}
          </ul>
        )}

        {/* Purchased items */}
        {purchasedItems.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
              Purchased
            </p>
            <ul className="flex flex-col gap-1">
              {purchasedItems.map(item => (
                <li
                  key={item.id}
                  onClick={() => togglePurchased(item)}
                  className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm opacity-50 active:bg-gray-50 cursor-pointer"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="flex-1 text-base line-through">{item.name}</span>
                  <span className="text-green-500 text-sm">✓</span>
                </li>
              ))}
            </ul>
            <button
              onClick={clearPurchased}
              className="mt-3 w-full text-sm text-gray-400 py-2"
            >
              Clear purchased
            </button>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4">
        <button
          onClick={() => navigate(`/list/${id}/add`)}
          className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-base"
        >
          + Add items
        </button>
      </div>
    </div>
  )
}
