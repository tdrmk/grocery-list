import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useToast } from './commons/Toast'
import ItemRow from './commons/ItemRow'

function CategorySection({ title, children }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-7 pt-3 pb-1 cursor-pointer"
      >
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</span>
        <span className="text-gray-400 text-xl">{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <ul className="px-4 flex flex-col gap-1">
          {children}
        </ul>
      )}
    </div>
  )
}

export default function AddItem() {
  const { id: listId } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()
  const [catalog, setCatalog] = useState([])
  const [recentItems, setRecentItems] = useState([])
  const [addedIds, setAddedIds] = useState(new Set())
  const [purchasedIds, setPurchasedIds] = useState(new Set())
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
      .select('catalog_id, status, name, icon, category')
      .eq('list_id', listId)
      .then(({ data }) => {
        const items = data ?? []
        setAddedIds(new Set(items.filter(i => i.status === 'active').map(i => i.catalog_id).filter(Boolean)))
        setPurchasedIds(new Set(items.filter(i => i.status === 'purchased').map(i => i.catalog_id).filter(Boolean)))

        const counts = {}
        for (const item of items.filter(i => i.status === 'cleared' || i.status === 'purchased')) {
          const key = item.catalog_id ?? item.name
          if (!counts[key]) counts[key] = { ...item, count: 0 }
          counts[key].count++
        }
        setRecentItems(Object.values(counts).sort((a, b) => b.count - a.count))
      })
  }, [])

  async function addItem(catalogItem) {
    setAdding(catalogItem.id)

    const { error } = await supabase.from('items').insert({
      list_id: listId,
      catalog_id: catalogItem.id,
      name: catalogItem.name,
      category: catalogItem.category,
      icon: catalogItem.icon,
      status: 'active',
    })

    if (error) { showToast(error.message, 'error'); setAdding(null); return }
    setAddedIds(prev => new Set([...prev, catalogItem.id]))
    setAdding(null)
  }

  const filtered = search.trim()
    ? catalog.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
      )
    : catalog

  const filteredGlobal = filtered.filter(item => item.is_global)
  const filteredOwn = filtered.filter(item => !item.is_global)

  const grouped = filteredGlobal.reduce((acc, item) => {
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
            className="text-primary text-xl rounded-full w-9 h-9 flex items-center justify-center shrink-0"
          >
            ←
          </button>
          <input
            type="search"
            placeholder="Search items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="flex-1 min-w-0 bg-gray-100 rounded-xl px-3 py-1.5 text-base focus:outline-none"
          />
          <button
            onClick={() => navigate(`/list/${listId}/add/custom`, { state: { defaultName: search.trim() } })}
            className="text-primary text-xl rounded-full w-9 h-9 flex items-center justify-center shrink-0"
          >
            +
          </button>
        </div>
      </div>

      {/* Recently purchased */}
      {!search.trim() && recentItems.length > 0 && (
        <CategorySection title="Recently purchased">
          {recentItems.map(item => {
            const isAdded = item.catalog_id ? addedIds.has(item.catalog_id) : false
            const isPurchased = item.catalog_id ? purchasedIds.has(item.catalog_id) : false
            return (
              <ItemRow
                key={item.catalog_id ?? item.name}
                item={item}
                status={isAdded ? 'added' : isPurchased ? 'purchased' : undefined}
                disabled={isAdded || isPurchased}
                loading={adding === item.catalog_id}
                trailing="badge"
                onClick={() => addItem({ id: item.catalog_id, ...item })}
              />
            )
          })}
        </CategorySection>
      )}

      {/* Catalog */}
      {Object.entries(grouped).map(([category, items]) => (
        <CategorySection key={category} title={category}>
          {items.map(item => {
            const isAdded = addedIds.has(item.id)
            const isPurchased = purchasedIds.has(item.id)
            return (
              <ItemRow
                key={item.id}
                item={item}
                status={isAdded ? 'added' : isPurchased ? 'purchased' : undefined}
                disabled={isAdded || isPurchased}
                loading={adding === item.id}
                trailing="badge"
                onClick={() => addItem(item)}
              />
            )
          })}
        </CategorySection>
      ))}

      {/* My items */}
      {filteredOwn.length > 0 && (
        <CategorySection title="My items">
          {filteredOwn.map(item => {
            const isAdded = addedIds.has(item.id)
            const isPurchased = purchasedIds.has(item.id)
            return (
              <ItemRow
                key={item.id}
                item={item}
                status={isAdded ? 'added' : isPurchased ? 'purchased' : undefined}
                disabled={isAdded || isPurchased}
                loading={adding === item.id}
                trailing="badge"
                onClick={() => addItem(item)}
                actions={[
                  { icon: '✏️', label: 'Edit', color: 'bg-blue-500', onAction: () => navigate(`/list/${listId}/add/custom/edit`, { state: { existingItem: item } }) },
                ]}
              />
            )
          })}
        </CategorySection>
      )}

      {filtered.length === 0 && search.trim() && (
        <div className="px-4 pt-4">
          <button
            onClick={() => navigate(`/list/${listId}/add/custom`, { state: { defaultName: search.trim() } })}
            className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm active:bg-gray-50 text-left"
          >
            <span className="text-xl">🛒</span>
            <span className="flex-1 text-base text-gray-700">Add "{search.trim()}" as custom item</span>
            <span className="text-gray-300 text-xl">+</span>
          </button>
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}
