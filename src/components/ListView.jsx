import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useUserId } from '../UserContext'
import { AvatarGroup } from './commons/Avatar'
import Avatar from './commons/Avatar'
import BottomSheet from './commons/BottomSheet'
import { useToast } from './commons/Toast'
import ItemRow from './commons/ItemRow'
import Spinner from './commons/Spinner'
import Loading from './commons/Loading'

function ShareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    </svg>
  )
}

function ShareButton({ listId, listName }) {
  const userId = useUserId()
  const showToast = useToast()
  const { data: profile } = useQuery({ queryKey: ['profile', userId] })
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('share_links')
        .insert({ list_id: listId })
        .select('token')
        .single()
      if (error || !data) throw new Error(error?.message ?? 'Could not create share link')
      return data.token
    },
    onError: (error) => showToast(error.message, 'error'),
    onSuccess: async (token) => {
      const url = `${window.location.origin}/join/${token}`
      const title = `${profile?.name ? `${profile.name} invited you to join` : 'Join'} "${listName}" on Grocery List`
      if (navigator.share) {
        await navigator.share({ title, url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast('Link copied!')
      }
    },
  })

  async function shareLink() {
    await mutateAsync()
  }

  return (
    <button
      onClick={shareLink}
      disabled={isPending}
      aria-label="Share list"
      className="text-primary rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-50"
    >
      {isPending ? <Spinner className="w-4 h-4" /> : <ShareIcon />}
    </button>
  )
}

function MembersSheet({ onClose, list }) {
  const userId = useUserId()
  const members = list.list_members ?? []
  return (
    <BottomSheet open onClose={onClose}>
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-base">Members</p>
        <ShareButton listId={list.id} listName={list.name} />
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
  )
}

function EditItemSheet({ item, onClose }) {
  const showToast = useToast()
  const [quantity, setQuantity] = useState(item.quantity ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const { mutateAsync: saveEdit, isPending } = useMutation({
    mutationFn: async ({ quantity, notes }) => {
      const { error } = await supabase
        .from('items')
        .update({ quantity: quantity || null, notes: notes || null })
        .eq('id', item.id)
      if (error) throw error
    },
    onError: (error) => showToast(error.message, 'error'),
    onSuccess: () => onClose(),
  })

  async function handleSave() {
    await saveEdit({ quantity, notes })
  }

  return (
    <BottomSheet open onClose={onClose}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{item.icon}</span>
        <span className="font-semibold text-base">{item.name}</span>
      </div>
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Quantity (e.g. 2x, 500g)"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="w-full bg-gray-100 rounded-xl px-4 py-3 text-base focus:outline-none"
        />
        <input
          type="text"
          placeholder="Notes (e.g. organic, the blue package)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full bg-gray-100 rounded-xl px-4 py-3 text-base focus:outline-none"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-base disabled:opacity-50"
      >
        {isPending ? <span className="flex items-center justify-center gap-2"><Spinner className="w-4 h-4" />Saving…</span> : 'Save'}
      </button>
    </BottomSheet>
  )
}

function ActiveItemRow({ item }) {
  const showToast = useToast()
  const [editing, setEditing] = useState(false)
  const { mutateAsync: setItemPurchased, isPending: purchasing } = useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('items').update({
        status: 'purchased',
        purchased_at: new Date().toISOString(),
      }).eq('id', id)
      if (error) throw error
    },
    onError: (error) => showToast(error.message, 'error'),
  })
  const { mutateAsync: deleteItem, isPending: deleting } = useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('items').delete().eq('id', id)
      if (error) throw error
    },
    onError: (error) => showToast(error.message, 'error'),
  })

  async function handleToggle() { await setItemPurchased({ id: item.id }) }
  async function handleDelete() { await deleteItem({ id: item.id }) }

  return (
    <>
      <ItemRow
        item={item}
        status="added"
        loading={purchasing || deleting}
        onClick={handleToggle}
        actions={[
          { icon: '✏️', label: 'Edit', color: 'bg-blue-400', onAction: () => setEditing(true) },
          { icon: '🗑️', label: 'Delete', color: 'bg-red-400', onAction: handleDelete, loading: deleting },
        ]}
      />
      {editing && <EditItemSheet item={item} onClose={() => setEditing(false)} />}
    </>
  )
}

function PurchasedItemRow({ item }) {
  const showToast = useToast()
  const { mutateAsync: setItemActive, isPending: activating } = useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('items').update({
        status: 'active',
        purchased_at: null,
      }).eq('id', id)
      if (error) throw error
    },
    onError: (error) => showToast(error.message, 'error'),
  })
  const { mutateAsync: clearItem, isPending: clearing } = useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('items').update({ status: 'cleared' }).eq('id', id)
      if (error) throw error
    },
    onError: (error) => showToast(error.message, 'error'),
  })

  async function handleToggle() { await setItemActive({ id: item.id }) }
  async function handleClear() { await clearItem({ id: item.id }) }

  return (
    <ItemRow
      item={item}
      status="purchased"
      loading={activating || clearing}
      onClick={handleToggle}
      actions={[
        { icon: '✕', label: 'Clear', color: 'bg-gray-400', onAction: handleClear, loading: clearing },
      ]}
    />
  )
}

export default function ListView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()
  const [showMembers, setShowMembers] = useState(false)

  const { data: lists = [], isLoading: listsLoading } = useQuery({ queryKey: ['lists'] })
  const { data: items = [], isLoading: itemsLoading } = useQuery({ queryKey: ['items', id] })

  const isLoading = listsLoading || itemsLoading

  const list = lists.find(l => l.id === id) ?? null

  // Silently clear any purchased items left over from previous shopping sessions.
  // Items purchased before today stay checked off indefinitely otherwise — this
  // auto-clears them on mount so each session starts with a clean list.
  // No onError: it's a best-effort background cleanup, not worth surfacing to the user.
  const { mutate: autoClearStale } = useMutation({
    mutationFn: async () => {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      await supabase
        .from('items')
        .update({ status: 'cleared' })
        .eq('list_id', id)
        .eq('status', 'purchased')
        .lt('purchased_at', startOfToday.toISOString())
    },
  })

  useEffect(() => {
    autoClearStale()
  }, [id])

  const { mutate: clearPurchased, isPending: clearingPurchased } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('items')
        .update({ status: 'cleared' })
        .eq('list_id', id)
        .eq('status', 'purchased')
      if (error) throw error
    },
    onError: (error) => showToast(error.message, 'error'),
  })

  if (isLoading) return <Loading />

  if (!list) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <p className="text-gray-500 mb-4">List not found.</p>
      <button onClick={() => navigate('/')} className="text-primary font-semibold">Go back</button>
    </div>
  )

  const listMembers = list.list_members ?? []
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
            {listMembers.length > 0 && (
              <button onClick={() => setShowMembers(true)}>
                <AvatarGroup members={listMembers.map(m => ({ userId: m.user_id, name: m.profiles?.name ?? '?' }))} />
              </button>
            )}
          </div>
          <ShareButton listId={id} listName={list.name} />
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
                    <ActiveItemRow key={item.id} item={item} />
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
                <PurchasedItemRow key={item.id} item={item} />
              ))}
            </ul>
            <button
              onClick={() => clearPurchased()}
              disabled={clearingPurchased}
              className="mt-3 w-full text-sm text-gray-400 py-2 disabled:opacity-50"
            >
              {clearingPurchased ? <span className="flex items-center justify-center gap-2"><Spinner className="w-4 h-4" />Clearing…</span> : 'Clear purchased'}
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

      {showMembers && (
        <MembersSheet
          onClose={() => setShowMembers(false)}
          list={list}
        />
      )}
    </div>
  )
}
