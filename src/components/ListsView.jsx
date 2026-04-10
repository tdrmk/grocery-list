import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useUserId } from '../UserContext'
import groceryBag from '../assets/grocery-bag.svg'
import IosInstallHint from './IosInstallHint'
import { AvatarGroup } from './commons/Avatar'
import EmojiGroup from './commons/EmojiGroup'
import BottomSheet from './commons/BottomSheet'
import { useToast } from './commons/Toast'
import SettingsDrawer from './SettingsDrawer'
import Spinner from './commons/Spinner'
import Loading from './commons/Loading'
import { useListsQuery, useItemsQuery } from '../hooks/queries'

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function ConfirmDelete({ list, onClose, onDeleted }) {
  const showToast = useToast()
  const { mutateAsync: deleteList, isPending } = useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('lists').delete().eq('id', id)
      if (error) throw error
    },
    onError: (error) => showToast(error.message, 'error'),
    onSuccess: () => { showToast(`"${list.name}" deleted`); onDeleted() },
  })

  async function handleDelete() {
    await deleteList({ id: list.id })
  }

  return (
    <BottomSheet open onClose={onClose}>
      <p className="text-base font-semibold">Delete "{list.name}"?</p>
      <p className="text-sm text-gray-400 -mt-2">This cannot be undone.</p>
      <div className="flex gap-2">
        <button onClick={handleDelete} disabled={isPending} className="flex-1 bg-red-500 text-white font-semibold rounded-xl py-3 disabled:opacity-50">
          {isPending
            ? <span className="flex items-center justify-center gap-2"><Spinner className="w-4 h-4" />Deleting…</span>
            : 'Delete'}
        </button>
        <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 font-semibold rounded-xl py-3">Cancel</button>
      </div>
    </BottomSheet>
  )
}

function CreateList({ onClose }) {
  const userId = useUserId()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const { mutateAsync: createList, isPending, error } = useMutation({
    mutationFn: async ({ name }) => {
      const { data: list, error: listError } = await supabase
        .from('lists')
        .insert({ name, created_by: userId })
        .select()
        .single()
      if (listError) throw listError

      const { error: memberError } = await supabase
        .from('list_members')
        .insert({ list_id: list.id, user_id: userId })
      if (memberError) throw memberError

      return list
    },
    onSuccess: (list) => navigate(`/list/${list.id}`),
  })

  async function handleSubmit(e) {
    e.preventDefault()
    await createList({ name })
  }

  return (
    <BottomSheet open onClose={onClose}>
      <p className="text-base font-semibold">New List</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="List name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoFocus
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {error && <p className="text-red-500 text-sm text-center">{error.message}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={isPending} className="flex-1 bg-primary text-white font-semibold rounded-xl py-3 disabled:opacity-50">
            {isPending
              ? <span className="flex items-center justify-center gap-2"><Spinner className="w-4 h-4" />Creating…</span>
              : 'Create'}
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 font-semibold rounded-xl py-3">Cancel</button>
        </div>
      </form>
    </BottomSheet>
  )
}

function ListCard({ list }) {
  const userId = useUserId()
  const navigate = useNavigate()
  const isCreator = list.created_by === userId
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { data: items = [], isPending: isLoading } = useItemsQuery(list.id)
  const icons = items.filter(i => i.status === 'active').map(i => i.icon)
  return (
    <li className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm">
      <div className="flex-1 cursor-pointer" onClick={() => navigate(`/list/${list.id}`)}>
        <p className="text-lg font-medium">{list.name}</p>
        <AvatarGroup members={(list.list_members ?? []).map(m => ({
          userId: m.user_id,
          name: m.profiles?.name ?? '?',
        }))} />
        {isLoading
          ? <div className="mt-2 ml-1"><Spinner /></div>
          : icons.length > 0
            ? <EmojiGroup icons={icons} className="mt-2" />
            : <p className="text-xs text-gray-400 mt-2 ml-1">No items</p>
        }
      </div>
      {isCreator && (
        <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-400 ml-4">Delete</button>
      )}
      {confirmDelete && (
        <ConfirmDelete
          list={list}
          onClose={() => setConfirmDelete(false)}
          onDeleted={() => setConfirmDelete(false)}
        />
      )}
    </li>
  )
}

export default function ListsView() {
  const { data: lists = [], isPending: isLoading } = useListsQuery()
  const [creating, setCreating] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (isLoading) return <Loading />

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-8 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">My Lists</h1>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 active:bg-gray-100"
          >
            <SettingsIcon />
          </button>
        </div>

        {lists.length === 0 && (
          <div className="text-center py-16">
            <img src={groceryBag} alt="" className="w-20 h-20 mx-auto mb-4" />
            <p className="font-semibold text-gray-700">No lists yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first list to get started!</p>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {lists.map(list => (
            <ListCard key={list.id} list={list} />
          ))}
        </ul>
      </div>

      {/* iOS install hint banner */}
      <IosInstallHint />

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4">
        <button onClick={() => setCreating(true)} className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-base">+ New List</button>
      </div>

      {creating && <CreateList onClose={() => setCreating(false)} />}

      {/* Side drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
