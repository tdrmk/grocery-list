import { useEffect } from 'react'
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { useUserId } from '../UserContext'

export function useListsQuery() {
  return useQuery({
    queryKey: ['lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lists')
        .select('id, name, created_at, created_by, list_members(user_id, profiles(name))')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useItemsQuery(listId) {
  return useQuery({
    queryKey: ['items', listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('list_id', listId)
        .in('status', ['active', 'purchased'])
        .order('added_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useProfileQuery() {
  const userId = useUserId()
  return useQuery({
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
}

// Fetches and caches all app data, and keeps it in sync via realtime subscriptions.
// Components read directly from the React Query cache — no local fetches needed.
export function useSync() {
  const queryClient = useQueryClient()

  const { data: lists } = useListsQuery()

  useQueries({
    queries: (lists ?? []).map(list => ({
      queryKey: ['items', list.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('list_id', list.id)
          .in('status', ['active', 'purchased'])
          .order('added_at', { ascending: false })
        if (error) throw error
        return data ?? []
      },
    })),
  })

  // Stable string of list IDs — effect only re-runs when lists are added/removed
  const listIdsKey = lists?.map(l => l.id).sort().join(',') ?? ''

  // Invalidate ['lists'] on any list or membership change
  useEffect(() => {
    const channel = supabase
      .channel('lists-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, () => {
        queryClient.invalidateQueries({ queryKey: ['lists'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_members' }, () => {
        queryClient.invalidateQueries({ queryKey: ['lists'] })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [queryClient])

  // Invalidate ['items', listId] on item changes, scoped per list
  useEffect(() => {
    if (!listIdsKey) return

    const listIds = listIdsKey.split(',')
    const channel = supabase.channel('items-realtime')

    for (const listId of listIds) {
      channel.on('postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `list_id=eq.${listId}` },
        () => queryClient.invalidateQueries({ queryKey: ['items', listId] })
      )
    }

    channel.subscribe()
    return () => supabase.removeChannel(channel)
  }, [listIdsKey, queryClient])
}

