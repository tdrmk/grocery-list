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
    <div>
      <h1>My Lists</h1>

      {lists.length === 0 && !creating && (
        <p>No lists yet.</p>
      )}

      <ul>
        {lists.map(list => (
        <li key={list.id}>
            <span onClick={() => navigate(`/list/${list.id}`)}>{list.name}</span>
            <button onClick={() => deleteList(list)}>Delete</button>
          </li>
        ))}
      </ul>

      {creating ? (
        <form onSubmit={createList}>
          <input
            type="text"
            placeholder="List name"
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            required
            autoFocus
          />
          <button type="submit">Create</button>
          <button type="button" onClick={() => setCreating(false)}>Cancel</button>
          {error && <p>{error}</p>}
        </form>
      ) : (
        <button onClick={() => setCreating(true)}>New List</button>
      )}
    </div>
  )
}
