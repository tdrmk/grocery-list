import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const CATEGORIES = [
  'Produce', 'Dairy & Eggs', 'Bakery', 'Meat & Seafood',
  'Frozen', 'Pantry & Dry Goods', 'Spices & Masalas',
  'Snacks', 'Beverages', 'Household & Cleaning', 'Personal Care', 'Custom'
]

const ICONS = [
  '🥦','🥕','🍅','🧅','🥔','🌽','🥑','🍎','🍌','🍋','🍊','🍇',
  '🥛','🧀','🥚','🧈',
  '🥩','🍗','🥓','🐟','🦐',
  '🍞','🥖',
  '🫙','🧴','🧻','📦','🛒','🌿','☕','🧃','🍵','🫖',
]

export default function AddCustomItem() {
  const { id: listId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [name, setName] = useState(location.state?.defaultName ?? '')
  const [category, setCategory] = useState('Custom')
  const [icon, setIcon] = useState(ICONS[0])
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)

    const { data: catalogRow, error } = await supabase
      .from('catalog')
      .insert({ name: name.trim().replace(/\b\w/g, c => c.toUpperCase()), category, icon })
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
          <h1 className="flex-1 text-center font-semibold text-base">New item</h1>
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

      {/* Save */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4">
        <button
          onClick={save}
          disabled={!name.trim() || saving}
          className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-base disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
