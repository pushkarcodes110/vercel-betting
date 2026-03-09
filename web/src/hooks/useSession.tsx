import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { API } from '@/api/client'

export type SessionState = {
  loading: boolean
  user: {
    id: number
    username: string
    is_staff: boolean
    is_superuser: boolean
  } | null
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<SessionState['user']>(null)

  const refresh = async () => {
    try {
      const data = await API.me()
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await API.logout()
    setUser(null)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const value = useMemo(
    () => ({
      loading,
      user,
      refresh,
      logout
    }),
    [loading, user]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used inside SessionProvider')
  }
  return context
}
