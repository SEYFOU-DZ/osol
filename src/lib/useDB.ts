import { useSyncExternalStore, useCallback } from 'react'
import { store, type DB } from './store'

export function useDB(): [DB, (mutate: (draft: DB) => void) => void] {
  const snapshot = useSyncExternalStore(store.subscribe, store.get, store.get)
  const set = useCallback((mutate: (draft: DB) => void) => store.set(mutate), [])
  return [snapshot, set]
}

export const useSession = (db: DB) => db.users.find((u) => u.id === db.sessionUserId) ?? null

export const userWorkspaces = (db: DB, userId: string) =>
  db.workspaces.filter((w) => w.members.some((m) => m.email && db.users.find((u) => u.id === userId)?.email === m.email))
