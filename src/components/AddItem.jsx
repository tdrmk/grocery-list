import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useToast } from './commons/Toast'
import ItemRow from './commons/ItemRow'
import Loading from './commons/Loading'
import { useItemsQuery } from '../hooks/queries'

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

function CatalogItemRow({ catalogItem, cartItem, listId }) {
  const showToast = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate: addItem, isPending: adding } = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('items').insert({
        list_id: listId,
        catalog_id: catalogItem.id,
        name: catalogItem.name,
        category: catalogItem.category,
        icon: catalogItem.icon,
        status: 'active',
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData(['items', listId], old => [newItem, ...(old ?? [])])
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const { mutate: removeItem, isPending: removing } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', cartItem.id)
        .eq('list_id', listId)
        .eq('status', 'active')
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.setQueryData(['items', listId], old =>
        (old ?? []).filter(i => i.id !== cartItem.id)
      )
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const status = cartItem?.status === 'active' ? 'added'
    : cartItem?.status === 'purchased' ? 'purchased'
    : undefined

  function handleClick() {
    if (cartItem?.status === 'active') removeItem()
    else if (!cartItem) addItem()
  }

  return (
    <ItemRow
      item={catalogItem}
      status={status}
      disabled={cartItem?.status === 'purchased'}
      loading={adding || removing}
      trailing="badge"
      onClick={handleClick}
      actions={catalogItem.is_global === false ? [{ icon: '✏️', label: 'Edit', color: 'bg-blue-500', onAction: () => navigate(`/list/${listId}/add/custom/edit`, { state: { existingItem: catalogItem } }) }] : undefined}
    />
  )
}

export default function AddItem() {
  const { id: listId } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: globalCatalog = [], isLoading: globalLoading } = useQuery({
    queryKey: ['catalog-global'],
    queryFn: async () => {
      const { data, error } = await supabase.from('catalog').select('*').eq('is_global', true).order('category')
      if (error) throw error
      return data ?? []
    },
    staleTime: Infinity,
  })

  const { data: listCatalog = [] } = useQuery({
    queryKey: ['catalog-list', listId],
    queryFn: async () => {
      const { data, error } = await supabase.from('catalog').select('*').eq('is_global', false).eq('list_id', listId).order('category')
      if (error) throw error
      return data ?? []
    },
  })

  // Active + purchased — populated by useSync in App.jsx, no separate fetch
  const { data: cartItems = [] } = useItemsQuery(listId)
  const cartByCatalogId = new Map(
    cartItems.filter(i => i.catalog_id).map(i => [i.catalog_id, i])
  )

  // Cleared items only — for "Recently purchased" section
  const { data: recentRaw = [] } = useQuery({
    queryKey: ['items-recent', listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('catalog_id, name, icon, category')
        .eq('list_id', listId)
        .eq('status', 'cleared')
        .not('catalog_id', 'is', null) // items without a catalog_id can't be managed from this screen
      if (error) throw error
      return data ?? []
    },
  })
  const counts = {}
  for (const item of recentRaw) {
    const key = item.catalog_id
    if (!counts[key]) counts[key] = { ...item, count: 1 }
    else counts[key].count++
  }
  const recentItems = Object.values(counts).sort((a, b) => b.count - a.count)

  if (globalLoading) return <Loading />

  const q = search.trim().toLowerCase()
  const filteredGlobal = q ? globalCatalog.filter(i => i.name.toLowerCase().includes(q)) : globalCatalog
  const filteredList = q ? listCatalog.filter(i => i.name.toLowerCase().includes(q)) : listCatalog

  const grouped = filteredGlobal.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  // Merge custom items into their category groups (filtered by search so they're searchable)
  for (const item of filteredList) {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  }

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
      {!q && recentItems.length > 0 && (
        <CategorySection title="Recently purchased">
          {recentItems.map(recentItem => (
            <CatalogItemRow
              key={recentItem.catalog_id}
              catalogItem={{ id: recentItem.catalog_id, name: recentItem.name, icon: recentItem.icon, category: recentItem.category }}
              cartItem={cartByCatalogId.get(recentItem.catalog_id)}
              listId={listId}
            />
          ))}
        </CategorySection>
      )}

      {/* Global catalog grouped by category */}
      {Object.entries(grouped).map(([category, catalogItems]) => (
        <CategorySection key={category} title={category}>
          {catalogItems.map(catalogItem => (
            <CatalogItemRow
              key={catalogItem.id}
              catalogItem={catalogItem}
              cartItem={cartByCatalogId.get(catalogItem.id)}
              listId={listId}
            />
          ))}
        </CategorySection>
      ))}

      {/* Own items — hidden during search to avoid duplication with categories */}
      {!q && listCatalog.length > 0 && (
        <CategorySection title="Own items">
          {listCatalog.map(item => (
            <CatalogItemRow
              key={item.id}
              catalogItem={item}
              cartItem={cartByCatalogId.get(item.id)}
              listId={listId}
            />
          ))}
        </CategorySection>
      )}

      {filteredGlobal.length === 0 && filteredList.length === 0 && search.trim() && (
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
