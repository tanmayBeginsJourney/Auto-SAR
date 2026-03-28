import type { Role } from '../types'

export interface Session {
  role: Role
  userId: string
  userName: string
}
