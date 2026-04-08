import { supabase } from '../supabaseClient'
import { useToast } from './commons/Toast'
import BottomSheet from './commons/BottomSheet'

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

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) showToast(`Error: ${error.message}`)
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <p className="text-base font-semibold">Settings</p>
      <button
        onClick={logout}
        className="flex items-center gap-3 text-red-500 font-medium py-3"
      >
        <LogoutIcon />
        Log out
      </button>
    </BottomSheet>
  )
}
