import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function AddItem() {
  const { id: listId } = useParams()
  const navigate = useNavigate()
  const [catalog, setCatalog] = useState([])
  const [addedIds, setAddedIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(null)

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

  const [collapsedCategories, setCollapsedCategories] = useState(new Set())

  function toggleCategory(category) {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      next.has(category) ? next.delete(category) : next.add(category)
      return next
    })
  }

  const filtered = search.trim()
    ? catalog.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
      )
    : catalog

  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Sticky header + search */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center px-4 py-3 gap-3">
          <button
            onClick={() => navigate(`/list/${listId}`)}
            className="text-primary font-medium text-sm shrink-0"
          >
            ← Back
          </button>
          <input
            type="search"
            placeholder="Search items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="flex-1 bg-gray-100 rounded-xl px-4 py-2 text-base focus:outline-none"
          />
        </div>
      </div>

      {/* Catalog */}
      {Object.entries(grouped).map(([category, items]) => {
        const isCollapsed = collapsedCategories.has(category)
        return (
          <div key={category}>
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-7 pt-3 pb-1 cursor-pointer"
            >
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{category}</span>
              <span className="text-gray-400 text-xl">{isCollapsed ? '▸' : '▾'}</span>
            </button>
            {!isCollapsed && (
              <ul className="px-4 flex flex-col gap-1">
                {items.map(item => {
                  const isAdded = addedIds.has(item.id)
                  const isAdding = adding === item.id
                  return (
                    <li
                      key={item.id}
                      onClick={() => !isAdded && addItem(item)}
                      className={`flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm transition-opacity ${isAdded ? 'opacity-40 cursor-default' : 'active:bg-gray-50 cursor-pointer'} ${isAdding ? 'opacity-50' : ''}`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="flex-1 text-base">{item.name}</span>
                      {isAdded
                        ? <span className="text-primary text-sm font-semibold">✓</span>
                        : <span className="text-gray-300 text-xl">+</span>
                      }
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-16">No items found for "{search}"</p>
      )}

      <div className="h-8" />
    </div>
  )
}
