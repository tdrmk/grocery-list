import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import IosInstallHint from './IosInstallHint'
import { AvatarGroup } from './commons/Avatar'
import EmojiGroup from './commons/EmojiGroup'
import BottomSheet from './commons/BottomSheet'

export default function ListsView({ session }) {
  const navigate = useNavigate()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    fetchLists()
  }, [])

  async function fetchLists() {
    const [{ data: listsData }, { data: itemsData }] = await Promise.all([
      supabase
        .from('lists')
        .select('id, name, created_at, list_members(user_id, profiles(name))')
        .order('created_at', { ascending: false }),
      supabase
        .from('items')
        .select('list_id, icon')
        .eq('status', 'active'),
    ])

    const iconsByList = {}
    for (const item of itemsData ?? []) {
      if (!iconsByList[item.list_id]) iconsByList[item.list_id] = []
      iconsByList[item.list_id].push(item.icon)
    }

    setLists((listsData ?? []).map(l => ({ ...l, activeIcons: iconsByList[l.id] ?? [] })))
    setLoading(false)
  }

  async function createList(e) {
    e.preventDefault()
    setError(null)

    const { data: list, error: listError } = await supabase
      .from('lists')
      .insert({ name: newListName, created_by: session.user.id })
      .select()
      .single()

    if (listError) {
      setError(listError.message)
      return
    }

    const { error: memberError } = await supabase
      .from('list_members')
      .insert({ list_id: list.id, user_id: session.user.id })

    if (memberError) {
      setError(memberError.message)
      return
    }

    setNewListName('')
    setCreating(false)
    fetchLists()
  }

  if (loading) return null

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold mb-4">My Lists</h1>

        {lists.length === 0 && !creating && (
          <p className="text-gray-400 text-center py-16">No lists yet. Create one below!</p>
        )}

        <ul className="flex flex-col gap-2">
          {lists.map(list => (
            <li
              key={list.id}
              className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => navigate(`/list/${list.id}`)}
              >
                <p className="text-lg font-medium">{list.name}</p>
                <AvatarGroup members={(list.list_members ?? []).map(m => ({
                  userId: m.user_id,
                  name: m.profiles?.name ?? '?',
                }))} />
                {list.activeIcons?.length > 0
                  ? <EmojiGroup icons={list.activeIcons} className="mt-2" />
                  : <p className="text-xs text-gray-400 mt-2 ml-1">No items</p>
                }
              </div>
              <button
                onClick={() => setConfirmDelete(list)}
                className="text-sm text-red-400 ml-4"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* iOS install hint banner */}
      <IosInstallHint />

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4">
        {creating ? (
          <form onSubmit={createList} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="List name"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              required
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-primary text-white font-semibold rounded-xl py-3"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="flex-1 bg-gray-100 text-gray-600 font-semibold rounded-xl py-3"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-base"
          >
            + New List
          </button>
        )}
      </div>

      {confirmDelete && (
        <BottomSheet open onClose={() => setConfirmDelete(null)}>
          <p className="text-base font-semibold">Delete "{confirmDelete.name}"?</p>
          <p className="text-sm text-gray-400 -mt-2">This cannot be undone.</p>
          <div className="flex gap-2">
            <button
              onClick={async () => { await supabase.from('lists').delete().eq('id', confirmDelete.id); setConfirmDelete(null); fetchLists() }}
              className="flex-1 bg-red-500 text-white font-semibold rounded-xl py-3"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              className="flex-1 bg-gray-100 text-gray-600 font-semibold rounded-xl py-3"
            >
              Cancel
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
