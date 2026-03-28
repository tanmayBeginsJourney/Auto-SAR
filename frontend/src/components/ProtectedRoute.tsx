import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import type { Role } from '../types'

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useAuth()
  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (session.role !== role) {
    return <Navigate to={session.role === 'ANALYST' ? '/analyst/dashboard' : '/po/dashboard'} replace />
  }
  return <>{children}</>
}
