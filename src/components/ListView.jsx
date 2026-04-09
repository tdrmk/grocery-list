import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useUserId } from '../UserContext'
import { AvatarGroup } from './commons/Avatar'
import Avatar from './commons/Avatar'
import BottomSheet from './commons/BottomSheet'
import { useToast } from './commons/Toast'
import SwipeableRow from './commons/SwipeableRow'

function ShareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    </svg>
  )
}

export default function ListView() {
  const userId = useUserId()
  const { id } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()
  const [list, setList] = useState(null)
  const [members, setMembers] = useState([])
  const [myName, setMyName] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
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
    setMyName(data?.find(m => m.user_id === userId)?.profiles?.name ?? null)
  }

  async function togglePurchased(item) {
    const newStatus = item.status === 'active' ? 'purchased' : 'active'
    const updates = {
      status: newStatus,
      purchased_at: newStatus === 'purchased' ? new Date().toISOString() : null
    }
    const { error } = await supabase.from('items').update(updates).eq('id', item.id)
    if (error) showToast(`Error: ${error.message}`)
  }

  async function clearItem(item) {
    const { error } = await supabase.from('items').update({ status: 'cleared' }).eq('id', item.id)
    if (error) showToast(`Error: ${error.message}`)
  }

  async function deleteItem(item) {
    const { error } = await supabase.from('items').delete().eq('id', item.id)
    if (error) showToast(`Error: ${error.message}`)
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
    const { error } = await supabase
      .from('items')
      .update({ status: 'cleared' })
      .eq('list_id', id)
      .eq('status', 'purchased')
    if (error) showToast(`Error: ${error.message}`)
  }

  async function shareList() {
    const { data, error } = await supabase
      .from('share_links')
      .insert({ list_id: id })
      .select('token')
      .single()
    if (error || !data) { showToast(`Error: ${error?.message ?? 'Could not create share link'}`); return }
    const url = `${window.location.origin}/join/${data.token}`
    const title = `${myName ? `${myName} invited you to join` : 'Join'} "${list.name}" on Grocery List`
    if (navigator.share) {
      await navigator.share({ title, url })
    } else {
      await navigator.clipboard.writeText(url)
      showToast('Link copied!')
    }
  }

  function openEdit(item) {
    setEditingItem(item)
    setEditQuantity(item.quantity ?? '')
    setEditNotes(item.notes ?? '')
  }

  async function saveEdit() {
    const { error } = await supabase
      .from('items')
      .update({ quantity: editQuantity || null, notes: editNotes || null })
      .eq('id', editingItem.id)
    if (error) { showToast(`Error: ${error.message}`); return }
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

  const groupedActive = activeItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

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
            aria-label="Share list"
            className="text-primary rounded-full w-9 h-9 flex items-center justify-center"
          >
              <ShareIcon />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Empty state */}
        {activeItems.length === 0 && purchasedItems.length === 0 && (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">🛒</p>
            <p className="font-semibold text-gray-700">Ready to shop?</p>
            <p className="text-sm text-gray-400 mt-1">Add some items!</p>
          </div>
        )}

        {/* All done state */}
        {activeItems.length === 0 && purchasedItems.length > 0 && (
          <p className="text-center text-gray-400 py-4">All items purchased!</p>
        )}

        {/* Active items grouped by category */}
        {activeItems.length > 0 && (
          <div className="flex flex-col gap-4">
            {Object.entries(groupedActive).map(([category, categoryItems]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1">{category}</p>
                <ul className="flex flex-col gap-1">
                  {categoryItems.map(item => (
                    <li key={item.id} className="rounded-xl overflow-hidden bg-rose-50 shadow-sm">
                      <SwipeableRow
                        actions={[
                          { icon: '✏️', label: 'Edit', color: 'bg-blue-400', onAction: () => openEdit(item) },
                          { icon: '🗑️', label: 'Delete', color: 'bg-red-400', onAction: () => deleteItem(item) },
                        ]}
                        onClick={() => togglePurchased(item)}
                      >
                        <div className="flex items-center gap-3 pl-4 pr-8 py-3 active:bg-rose-100 cursor-pointer select-none">
                          <span className="text-xl">{item.icon}</span>
                          <span className="flex-1 text-base">{item.name}</span>
                          {item.quantity && <span className="text-sm text-gray-400">{item.quantity}</span>}
                          {item.notes && <span className="text-sm text-gray-300 italic">{item.notes}</span>}
                        </div>
                      </SwipeableRow>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Purchased items */}
        {purchasedItems.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-2 px-1">
              <div className="flex-1 h-px bg-gray-200" />
              <p className="text-sm font-bold text-gray-500">Purchased</p>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <ul className="flex flex-col gap-1">
              {purchasedItems.map(item => (
                <li key={item.id} className="rounded-xl overflow-hidden bg-green-50 shadow-sm">
                  <SwipeableRow
                    actions={[
                      { icon: '✕', label: 'Clear', color: 'bg-gray-400', onAction: () => clearItem(item) },
                    ]}
                    onClick={() => togglePurchased(item)}
                  >
                    <div className="flex items-center gap-3 pl-4 pr-8 py-3 active:bg-green-100 cursor-pointer select-none">
                      <span className="text-xl">{item.icon}</span>
                      <span className="flex-1 text-base">{item.name}</span>
                    </div>
                  </SwipeableRow>
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
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-base">Members</p>
            <button
              onClick={() => shareList()}
              aria-label="Share list"
              className="text-primary rounded-full w-9 h-9 flex items-center justify-center"
            >
              <ShareIcon />
            </button>
          </div>
          <ul className="flex flex-col gap-3">
            {members.map(m => (
              <li key={m.user_id} className="flex items-center gap-3">
                <Avatar name={m.profiles?.name ?? '?'} userId={m.user_id} />
                <span className="text-base">
                  {m.profiles?.name ?? 'Unknown'}
                  {m.user_id === userId && <span className="text-gray-400 text-sm ml-1">(You)</span>}
                </span>
              </li>
            ))}
          </ul>
        </BottomSheet>
      )}
    </div>
  )
}
