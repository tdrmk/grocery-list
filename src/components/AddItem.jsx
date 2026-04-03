import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function AddItem({ session }) {
  const { id: listId } = useParams()
  const navigate = useNavigate()
  const [catalog, setCatalog] = useState([])
  const [addedIds, setAddedIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(null) // id of item being added

  useEffect(() => {
    supabase
      .from('catalog')
      .select('*')
      .order('category')
      .then(({ data }) => setCatalog(data ?? []))

    supabase
      .from('items')
      .select('catalog_id')
      .eq('list_id', listId)
      .eq('status', 'active')
      .then(({ data }) => {
        setAddedIds(new Set((data ?? []).map(i => i.catalog_id).filter(Boolean)))
      })
  }, [])

  async function addItem(catalogItem) {
    setAdding(catalogItem.id)

    await supabase.from('items').insert({
      list_id: listId,
      catalog_id: catalogItem.id,
      name: catalogItem.name,
      category: catalogItem.category,
      icon: catalogItem.icon,
      status: 'active',
    })

    setAddedIds(prev => new Set([...prev, catalogItem.id]))
    setAdding(null)
  }

  const filtered = search.trim()
    ? catalog.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
      )
    : catalog

  // Group by category
  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div>
      <button onClick={() => navigate(`/list/${listId}`)}>← Back</button>
      <h1>Add Items</h1>

      <input
        type="search"
        placeholder="Search catalog…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h2>{category}</h2>
          <ul>
            {items.map(item => (
              <li
                key={item.id}
                onClick={() => addItem(item)}
                style={{ opacity: adding === item.id ? 0.5 : 1 }}
              >
                {item.icon} {item.name} {addedIds.has(item.id) && '✓'}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {filtered.length === 0 && (
        <p>No items found for "{search}".</p>
      )}
    </div>
  )
}
