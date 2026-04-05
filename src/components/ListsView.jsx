import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import IosInstallHint from './IosInstallHint'

export default function ListsView({ session }) {
  const navigate = useNavigate()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLists()
  }, [])

  async function fetchLists() {
    const [{ data: listsData }, { data: itemCounts }] = await Promise.all([
      supabase
        .from('lists')
        .select('id, name, created_at, list_members(user_id, profiles(name))')
        .order('created_at', { ascending: false }),
      supabase
        .from('items')
        .select('list_id')
        .eq('status', 'active'),
    ])

    const countByList = {}
    for (const item of itemCounts ?? []) {
      countByList[item.list_id] = (countByList[item.list_id] ?? 0) + 1
    }

    setLists((listsData ?? []).map(l => ({ ...l, activeCount: countByList[l.id] ?? 0 })))
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

    await supabase
      .from('list_members')
      .insert({ list_id: list.id, user_id: session.user.id })

    setNewListName('')
    setCreating(false)
    fetchLists()
  }

  async function deleteList(list) {
    if (!confirm(`Delete "${list.name}"? This cannot be undone.`)) return

    await supabase.from('lists').delete().eq('id', list.id)
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
              className="flex items-center justify-between bg-white rounded-xl px-4 py-4 shadow-sm"
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => navigate(`/list/${list.id}`)}
              >
                <p className="text-base font-medium">{list.name}</p>
                {list.list_members?.length > 1 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {list.list_members
                      .map(m => m.user_id === session.user.id ? 'You' : m.profiles?.name)
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                {list.activeCount > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{list.activeCount} item{list.activeCount !== 1 ? 's' : ''}</p>
                )}
              </div>
              <button
                onClick={() => deleteList(list)}
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
    </div>
  )
}
