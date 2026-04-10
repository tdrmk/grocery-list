import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useToast } from './commons/Toast'
import BottomSheet from './commons/BottomSheet'
import Spinner from './commons/Spinner'

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 4a1 1 0 011-1h5v2H5v10h4v2H4a1 1 0 01-1-1V4z"/>
      <path d="M13 6l4 4-4 4v-3H8V9h5V6z"/>
    </svg>
  )
}

export default function SettingsDrawer({ open, onClose }) {
  const showToast = useToast()
  const [groupByCategory, setGroupByCategory] = useState(
    () => localStorage.getItem('groupByCategory') !== 'false'
  )

  function toggleGroupByCategory() {
    const next = !groupByCategory
    setGroupByCategory(next)
    localStorage.setItem('groupByCategory', String(next))
  }

  const { mutate: logout, isPending } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onError: (error) => showToast(error.message, 'error'),
  })

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="text-base font-semibold">Settings</p>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Preferences</p>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-medium text-gray-400">Show categories</span>
            <button
              onClick={toggleGroupByCategory}
              className={`w-11 h-6 rounded-full transition-colors ${groupByCategory ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${groupByCategory ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-1">
          <button
            onClick={() => logout()}
            disabled={isPending}
            className="flex items-center gap-3 text-red-500 font-medium py-1 disabled:opacity-50"
          >
            {isPending ? <Spinner className="w-5 h-5" /> : <LogoutIcon />}
            Log out
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
