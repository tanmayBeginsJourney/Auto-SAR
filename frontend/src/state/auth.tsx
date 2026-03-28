import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Role } from '../types'

interface Session {
  role: Role
  userId: string
  userName: string
}

interface DemoUsersResponse {
  analyst: {
    user_id: string
    user_name: string
    role: Role
  }
  po: {
    user_id: string
    user_name: string
    role: Role
  }
}

interface AuthContextValue {
  session: Session | null
  setSession: (next: Session) => void
  logout: () => void
}

const STORAGE_KEY = 'autosar-demo-session'
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [sessionState, setSessionState] = useState<Session | null>(() => readStoredSession())

  const value = useMemo<AuthContextValue>(
    () => ({
      session: sessionState,
      setSession: (next) => {
        setSessionState(next)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      },
      logout: () => {
        setSessionState(null)
        localStorage.removeItem(STORAGE_KEY)
        navigate('/login')
      },
    }),
    [navigate, sessionState],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export async function fetchDemoUsers() {
  const response = await fetch('http://127.0.0.1:8000/api/auth/demo-users')
  if (!response.ok) {
    throw new Error('Failed to load demo users')
  }
  return (await response.json()) as DemoUsersResponse
}
