import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import BottomSheet from './commons/BottomSheet'

const CATEGORIES = [
  'Produce', 'Dairy & Eggs', 'Bakery', 'Meat & Seafood',
  'Frozen', 'Grains & Flours', 'Dals & Pulses', 'Pantry & Dry Goods',
  'Spices & Masalas', 'Nuts & Dry Fruits', 'Snacks', 'Beverages',
  'Household & Cleaning', 'Personal Care', 'Custom'
]

const ICONS = [
  // Other
  '🛒',
  // Vegetables
  '🧅','🧄','🥔','🍠','🥕','🌽','🥦','🥬','🥒','🫑','🍆','🌶️','🫛','🍅','🍄','🫀',
  // Herbs & leaves
  '🌿','🍃','🌺','🌱','🫚',
  // Fruits
  '🍎','🍊','🍋','🍇','🍉','🍌','🍍','🥭','🥑','🍓','🍒','🍑','🍐','🍈','🥥','🫐','🥝','❤️',
  // Proteins
  '🥚','🍗','🥩','🥓','🐟','🦐','🦑','🦀','🦞',
  // Dairy
  '🥛','🧀','🧈','🥣','🥫','🍮',
  // Bread & grains
  '🍞','🥖','🫓','🥐','🌾','🍚','🍙','🍝','🍜','🫘',
  // Pantry & spices
  '🫙','🍯','🥜','🧂','🍬','🧪','🌰','⭐','🟡','🟤','🟢','⚪',
  // Snacks & sweets
  '🍪','🍿','🍫','🍰','🧁','🍩','🍦','🍨',
  // Beverages
  '☕','🍵','🫖','🧃','🥤','💧','🌹','🧋',
  // Prepared food
  '🍲','🥘','🍛','🥗',
  // Household
  '🧴','🧻','📦','🧺','🧽','🧼','🫧','🗑️','🌸','🦟',
  // Personal care
  '🪥','🪒','🩹',
  // Misc
  '🏠',
]

export default function AddCustomItem() {
  const { id: listId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const existingItem = location.state?.existingItem ?? null

  const [name, setName] = useState(existingItem?.name ?? location.state?.defaultName ?? '')
  const [category, setCategory] = useState(existingItem?.category ?? 'Custom')
  const [icon, setIcon] = useState(existingItem?.icon ?? ICONS[0])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)

    const formatted = name.trim().replace(/\b\w/g, c => c.toUpperCase())

    if (existingItem) {
      await supabase
        .from('catalog')
        .update({ name: formatted, category, icon })
        .eq('id', existingItem.id)
      await supabase
        .from('items')
        .update({ name: formatted, category, icon })
        .eq('catalog_id', existingItem.id)
      navigate(-1)
    } else {
      const { data: catalogRow, error } = await supabase
        .from('catalog')
        .insert({ name: formatted, category, icon })
        .select()
        .single()

      if (error || !catalogRow) { setSaving(false); return }

      await supabase.from('items').insert({
        list_id: listId,
        catalog_id: catalogRow.id,
        name: catalogRow.name,
        category: catalogRow.category,
        icon: catalogRow.icon,
        status: 'active',
      })

      navigate(`/list/${listId}/add`, { replace: true })
    }

    setSaving(false)
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center px-4 py-3 gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-primary font-medium text-sm shrink-0"
          >
            ← Back
          </button>
          <h1 className="flex-1 text-center font-semibold text-base">
            {existingItem ? 'Edit item' : 'New item'}
          </h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 py-6 flex flex-col gap-5">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Oat milk"
            autoFocus
            className="w-full bg-white rounded-xl px-4 py-3 text-base shadow-sm focus:outline-none"
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-white rounded-xl px-4 py-3 text-base shadow-sm focus:outline-none appearance-none"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Icon */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Icon</label>
          <div className="bg-white rounded-xl p-3 shadow-sm overflow-y-auto max-h-44 grid grid-cols-7 gap-1">
            {ICONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => setIcon(emoji)}
                className={`text-2xl p-2 rounded-xl transition-colors ${
                  icon === emoji
                    ? 'bg-primary/10 ring-2 ring-primary'
                    : 'bg-gray-100'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-2">
        <button
          onClick={save}
          disabled={!name.trim() || saving}
          className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-base disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {existingItem && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full text-red-500 font-medium py-2 text-base"
          >
            Delete
          </button>
        )}
      </div>

      {confirmDelete && (
        <BottomSheet open onClose={() => setConfirmDelete(false)}>
          <p className="text-base font-semibold">Delete this item from your catalog?</p>
          <div className="flex gap-2">
            <button
              onClick={async () => { await supabase.from('catalog').delete().eq('id', existingItem.id); navigate(-1) }}
              className="flex-1 bg-red-500 text-white font-semibold rounded-xl py-3"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
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
