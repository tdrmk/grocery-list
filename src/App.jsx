import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabaseClient'
import { UserContext, useUserId } from './UserContext'
import Auth from './components/Auth'
import ProfileSetup from './components/ProfileSetup'
import ListsView from './components/ListsView'
import ListView from './components/ListView'
import AddItem from './components/AddItem'
import { AddCustomItem, EditCustomItem } from './components/ManageCustomItem'
import JoinList from './components/JoinList'
import { ToastProvider } from './components/commons/Toast'
import Loading from './components/commons/Loading'

// Rendered only when profile is confirmed. Sets up routes.
function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ListsView />} />
          <Route path="/list/:id" element={<ListView />} />
          <Route path="/list/:id/add" element={<AddItem />} />
          <Route path="/list/:id/add/custom" element={<AddCustomItem />} />
          <Route path="/list/:id/add/custom/edit" element={<EditCustomItem />} />
          <Route path="/join/:token" element={<JoinList />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

// Rendered only when session is confirmed. Loads the user's profile, then routes.
function ProfileCheck() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  // null = new user (no profile row yet), triggers ProfileSetup
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  if (isLoading) return <Loading />
  if (error) return <div className="flex items-center justify-center h-screen text-gray-500">Could not load profile. Please refresh.</div>

  if (!profile) return (
    <ProfileSetup
      onComplete={() => queryClient.invalidateQueries({ queryKey: ['profile', userId] })}
    />
  )

  return <App />
}

// Auth gate: resolves session state before rendering anything.
// undefined = still loading, null = logged out, object = logged in.
export default function AuthCheck() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // Restore existing session on page load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Keep session in sync with Supabase auth events (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Loading />  // waiting for getSession()
  if (!session) return <Auth />           // logged out
  return (
    <UserContext.Provider value={session.user.id}>
      <ProfileCheck />                     {/* logged in */}
    </UserContext.Provider>
  )
}
