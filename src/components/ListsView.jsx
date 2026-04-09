import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useUserId } from '../UserContext'
import groceryBag from '../assets/grocery-bag.svg'
import IosInstallHint from './IosInstallHint'
import { AvatarGroup } from './commons/Avatar'
import EmojiGroup from './commons/EmojiGroup'
import BottomSheet from './commons/BottomSheet'
import { useToast } from './commons/Toast'
import SettingsDrawer from './SettingsDrawer'

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

export default function ListsView() {
  const userId = useUserId()
  const navigate = useNavigate()
  const showToast = useToast()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    fetchLists()
  }, [])

  async function fetchLists() {
    const [{ data: listsData }, { data: itemsData }] = await Promise.all([
      supabase
        .from('lists')
        .select('id, name, created_at, created_by, list_members(user_id, profiles(name))')
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
      .insert({ name: newListName, created_by: userId })
      .select()
      .single()

    if (listError) {
      setError(listError.message)
      return
    }

    const { error: memberError } = await supabase
      .from('list_members')
      .insert({ list_id: list.id, user_id: userId })

    if (memberError) {
      setError(memberError.message)
      return
    }

    navigate(`/list/${list.id}`)
  }

  if (loading) return null

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

        {lists.length === 0 && !creating && (
          <div className="text-center py-16">
            <img src={groceryBag} alt="" className="w-20 h-20 mx-auto mb-4" />
            <p className="font-semibold text-gray-700">No lists yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first list to get started!</p>
          </div>
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
              {list.created_by === userId && (
                <button
                  onClick={() => setConfirmDelete(list)}
                  className="text-sm text-red-400 ml-4"
                >
                  Delete
                </button>
              )}
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
              onClick={async () => {
                const { error } = await supabase.from('lists').delete().eq('id', confirmDelete.id)
                if (error) { showToast(error.message, 'error'); return }
                setConfirmDelete(null)
                fetchLists()
              }}
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

      {/* Side drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
