import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import BottomSheet from './commons/BottomSheet'
import { useToast } from './commons/Toast'
import Spinner from './commons/Spinner'

const CATEGORIES = [
  'Produce', 'Dairy & Eggs', 'Bakery', 'Meat & Seafood',
  'Frozen', 'Grains & Flours', 'Dals & Pulses', 'Pantry & Dry Goods',
  'Spices & Masalas', 'Nuts & Dry Fruits', 'Snacks', 'Beverages',
  'Household & Cleaning', 'Personal Care', 'Custom'
]

function formatName(name) {
  return name.trim().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

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

function CustomItemForm({ name, setName, category, setCategory, icon, setIcon }) {
  return (
    <>
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

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Icon</label>
        <div className="bg-white rounded-xl p-3 shadow-sm overflow-y-auto max-h-44 grid grid-cols-7 gap-1">
          {ICONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => setIcon(emoji)}
              className={`text-2xl p-2 rounded-xl transition-colors ${
                icon === emoji ? 'bg-primary/10 ring-2 ring-primary' : 'bg-gray-100'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function DeleteConfirmSheet({ onClose, onConfirm }) {
  return (
    <BottomSheet open onClose={onClose}>
      <p className="text-base font-semibold">Delete this item from your catalog?</p>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex-1 bg-red-500 text-white font-semibold rounded-xl py-3"
        >
          Delete
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-gray-100 text-gray-600 font-semibold rounded-xl py-3"
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  )
}

export function AddCustomItem() {
  const { id: listId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const showToast = useToast()

  const [name, setName] = useState(location.state?.defaultName ?? '')
  const [category, setCategory] = useState('Custom')
  const [icon, setIcon] = useState(ICONS[0])

  const formattedName = formatName(name)

  const { mutate: createCustomItem, isPending } = useMutation({
    mutationFn: async ({ name, category, icon }) => {
      const { data: catalogRow, error } = await supabase
        .from('catalog')
        .insert({ name, category, icon })
        .select()
        .single()
      if (error || !catalogRow) throw error ?? new Error('Could not create item')

      const { error: itemsError } = await supabase.from('items').insert({
        list_id: listId,
        catalog_id: catalogRow.id,
        name: catalogRow.name,
        category: catalogRow.category,
        icon: catalogRow.icon,
        status: 'active',
      })
      return itemsError ?? null
    },
    onError: (err) => showToast(err.message, 'error'),
    onSuccess: (itemsError) => {
      if (itemsError) showToast(`Item saved, but could not add to list: ${itemsError.message}`, 'error')
      navigate(`/list/${listId}/add`, { replace: true })
    },
  })

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center px-4 py-3 gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-primary text-xl rounded-full w-9 h-9 flex items-center justify-center shrink-0"
          >
            ←
          </button>
          <h1 className="flex-1 text-center font-semibold text-base">New item</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex-1 px-4 py-6 flex flex-col gap-5">
        <CustomItemForm
          name={name} setName={setName}
          category={category} setCategory={setCategory}
          icon={icon} setIcon={setIcon}
        />
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4">
        <button
          onClick={() => createCustomItem({ name: formattedName, category, icon })}
          disabled={!formattedName || isPending}
          className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-base disabled:opacity-50"
        >
          {isPending
            ? <span className="flex items-center justify-center gap-2"><Spinner className="w-4 h-4" />Adding…</span>
            : 'Add item'}
        </button>
      </div>
    </div>
  )
}

export function EditCustomItem() {
  const navigate = useNavigate()
  const location = useLocation()
  const showToast = useToast()

  const existingItem = location.state?.existingItem

  const [name, setName] = useState(existingItem?.name ?? '')
  const [category, setCategory] = useState(existingItem?.category ?? 'Custom')
  const [icon, setIcon] = useState(existingItem?.icon ?? ICONS[0])
  const [confirmDelete, setConfirmDelete] = useState(false)

  const formattedName = formatName(name)

  const { mutate: updateCustomItem, isPending: isUpdating } = useMutation({
    mutationFn: async ({ name, category, icon }) => {
      const { error: catalogError } = await supabase
        .from('catalog')
        .update({ name, category, icon })
        .eq('id', existingItem.id)
      if (catalogError) throw catalogError

      const { error: itemsError } = await supabase
        .from('items')
        .update({ name, category, icon })
        .eq('catalog_id', existingItem.id)
      if (itemsError) throw itemsError
    },
    onError: (err) => showToast(err.message, 'error'),
    onSuccess: () => navigate(-1),
  })

  const { mutate: deleteCustomItem, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('catalog').delete().eq('id', existingItem.id)
      if (error) throw error
    },
    onError: (err) => showToast(err.message, 'error'),
    onSuccess: () => navigate(-1),
  })

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center px-4 py-3 gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-primary text-xl rounded-full w-9 h-9 flex items-center justify-center shrink-0"
          >
            ←
          </button>
          <h1 className="flex-1 text-center font-semibold text-base">Edit item</h1>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isDeleting}
            className="text-xl rounded-full w-9 h-9 flex items-center justify-center shrink-0 disabled:opacity-50"
            aria-label="Delete item"
          >
            {isDeleting ? <Spinner className="w-5 h-5" /> : '🗑️'}
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 flex flex-col gap-5">
        <CustomItemForm
          name={name} setName={setName}
          category={category} setCategory={setCategory}
          icon={icon} setIcon={setIcon}
        />
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-2">
        <button
          onClick={() => updateCustomItem({ name: formattedName, category, icon })}
          disabled={!formattedName || isUpdating}
          className="w-full bg-primary text-white font-semibold rounded-xl py-3 text-base disabled:opacity-50"
        >
          {isUpdating
            ? <span className="flex items-center justify-center gap-2"><Spinner className="w-4 h-4" />Saving…</span>
            : 'Save changes'}
        </button>
      </div>

      {confirmDelete && (
        <DeleteConfirmSheet
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => deleteCustomItem()}
        />
      )}
    </div>
  )
}
