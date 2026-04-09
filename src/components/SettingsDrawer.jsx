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

  const { mutate: logout, isPending } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onError: (error) => showToast(error.message, 'error'),
  })

  return (
    <BottomSheet open={open} onClose={onClose}>
      <p className="text-base font-semibold">Settings</p>
      <button
        onClick={() => logout()}
        disabled={isPending}
        className="flex items-center gap-3 text-red-500 font-medium py-3 disabled:opacity-50"
      >
        {isPending ? <Spinner className="w-5 h-5" /> : <LogoutIcon />}
        Log out
      </button>
    </BottomSheet>
  )
}
