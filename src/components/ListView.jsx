import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { AvatarGroup } from './commons/Avatar'
import Avatar from './commons/Avatar'
import BottomSheet from './commons/BottomSheet'

export default function ListView({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [list, setList] = useState(null)
  const [members, setMembers] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    fetchList()
    fetchItems()
    fetchMembers()
    autoClearStale()

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

  async function fetchMembers() {
    const { data } = await supabase
      .from('list_members')
      .select('user_id, profiles(name)')
      .eq('list_id', id)
    setMembers(data ?? [])
  }

  async function togglePurchased(item) {
    const newStatus = item.status === 'active' ? 'purchased' : 'active'
    const updates = {
      status: newStatus,
      purchased_at: newStatus === 'purchased' ? new Date().toISOString() : null
    }
    await supabase.from('items').update(updates).eq('id', item.id)
    fetchItems()
  }

  async function clearItem(item) {
    await supabase.from('items').update({ status: 'cleared' }).eq('id', item.id)
    fetchItems()
  }

  async function deleteItem(item) {
    await supabase.from('items').delete().eq('id', item.id)
    fetchItems()
  }

  async function autoClearStale() {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    await supabase
      .from('items')
      .update({ status: 'cleared' })
      .eq('list_id', id)
      .eq('status', 'purchased')
      .lt('purchased_at', startOfToday.toISOString())
  }

  async function clearPurchased() {
    await supabase
      .from('items')
      .update({ status: 'cleared' })
      .eq('list_id', id)
      .eq('status', 'purchased')
    fetchItems()
  }

  async function shareList() {
    const { data } = await supabase
      .from('share_links')
      .insert({ list_id: id })
      .select('token')
      .single()
    const url = `${window.location.origin}/join/${data.token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openEdit(item) {
    setEditingItem(item)
    setEditQuantity(item.quantity ?? '')
    setEditNotes(item.notes ?? '')
  }

  async function saveEdit() {
    await supabase
      .from('items')
      .update({ quantity: editQuantity || null, notes: editNotes || null })
      .eq('id', editingItem.id)
    setEditingItem(null)
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
          <button onClick={() => navigate('/')} className="text-primary text-xl rounded-full w-9 h-9 flex items-center justify-center">
            ←
          </button>
          <div className="flex-1 flex flex-col items-center">
            <h1 className="font-bold text-lg truncate">{list.name}</h1>
            {members.length > 0 && (
              <button onClick={() => setShowMembers(true)}>
                <AvatarGroup members={members.map(m => ({ userId: m.user_id, name: m.profiles?.name ?? '?' }))} />
              </button>
            )}
          </div>
          <button
            onClick={shareList}
            className="text-primary text-xl rounded-full w-9 h-9 flex items-center justify-center"
          >
            {copied ? '✓' : '📤'}
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
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm active:bg-gray-50 cursor-pointer select-none"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="flex-1 text-base">{item.name}</span>
                {item.quantity && <span className="text-sm text-gray-400">{item.quantity}</span>}
                {item.notes && <span className="text-sm text-gray-300 italic">{item.notes}</span>}
                <button
                  onClick={e => { e.stopPropagation(); openEdit(item) }}
                  className="text-base px-1 shrink-0"
                >
                  ✏️
                </button>
                <button
                  onClick={e => { e.stopPropagation(); deleteItem(item) }}
                  className="text-gray-300 text-base px-1 shrink-0"
                >
                  🗑️
                </button>
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
                  className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm opacity-50 active:bg-gray-50 cursor-pointer select-none"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="flex-1 text-base line-through">{item.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); clearItem(item) }}
                    className="text-gray-400 text-base px-1 shrink-0"
                  >
                    ✕
                  </button>
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

      {/* Edit bottom sheet */}
      {editingItem && (
        <BottomSheet open onClose={() => setEditingItem(null)}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{editingItem.icon}</span>
            <span className="font-semibold text-base">{editingItem.name}</span>
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Quantity (e.g. 2x, 500g)"
              value={editQuantity}
              onChange={e => setEditQuantity(e.target.value)}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-base focus:outline-none"
            />
            <input
              type="text"
              placeholder="Notes (e.g. organic, the blue package)"
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-base focus:outline-none"
            />
          </div>
          <button
            onClick={saveEdit}
            className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-base"
          >
            Save
          </button>
        </BottomSheet>
      )}
      {showMembers && (
        <BottomSheet open onClose={() => setShowMembers(false)}>
          <p className="font-semibold text-base">Members</p>
          <ul className="flex flex-col gap-3">
            {members.map(m => (
              <li key={m.user_id} className="flex items-center gap-3">
                <Avatar name={m.profiles?.name ?? '?'} userId={m.user_id} />
                <span className="text-base">
                  {m.profiles?.name ?? 'Unknown'}
                  {m.user_id === session.user.id && <span className="text-gray-400 text-sm ml-1">(You)</span>}
                </span>
              </li>
            ))}
          </ul>
        </BottomSheet>
      )}
    </div>
  )
}
