import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

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
    const { data } = await supabase
      .from('lists')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })

    setLists(data ?? [])
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
    <div className="min-h-dvh bg-gray-50">
      <div className="px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold">My Lists</h1>
      </div>

      <div className="px-4">
        {lists.length === 0 && !creating && (
          <p className="text-gray-400 text-center py-16">No lists yet. Create one below!</p>
        )}

        <ul className="flex flex-col gap-2">
          {lists.map(list => (
            <li
              key={list.id}
              className="flex items-center justify-between bg-white rounded-xl px-4 py-4 shadow-sm"
            >
              <span
                className="flex-1 text-base font-medium"
                onClick={() => navigate(`/list/${list.id}`)}
              >
                {list.name}
              </span>
              <button
                onClick={() => deleteList(list)}
                className="text-sm text-red-400 ml-4"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        {creating ? (
          <form onSubmit={createList} className="mt-4 flex flex-col gap-3">
            <input
              type="text"
              placeholder="List name"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              required
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
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
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="mt-4 w-full bg-primary text-white font-semibold rounded-xl py-3 text-base"
          >
            + New List
          </button>
        )}
      </div>
    </div>
  )
}
