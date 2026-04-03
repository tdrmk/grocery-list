import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import ProfileSetup from './components/ProfileSetup'
import ListsView from './components/ListsView'
import ListView from './components/ListView'
import AddItem from './components/AddItem'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(session) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', session.user.id)
      .single()
    setProfile(data)
  }

  useEffect(() => {
    if (!session) {
      setProfile(undefined)
      return
    }

    fetchProfile(session)
  }, [session?.user.id])

  if (session === undefined || profile === undefined) return null

  if (!session) return <Auth />

  if (!profile) return <ProfileSetup session={session} onComplete={() => fetchProfile(session)} />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ListsView session={session} />} />
        <Route path="/list/:id" element={<ListView session={session} />} />
        <Route path="/list/:id/add" element={<AddItem session={session} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
