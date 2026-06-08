import { create } from 'zustand'
import api from '@/lib/api'

interface User {
  id: string
  email: string
  fullName: string
  role: string
  branchId: string | null
  permissions?: string[]
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchProfile: () => Promise<void>
  hasPermission: (resource: string, action: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    set({
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        role: data.user.role?.code ?? data.user.role,
        branchId: data.user.branchId,
        permissions: data.user.permissions,
      },
      isAuthenticated: true,
      isLoading: false,
    })
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({ user: null, isAuthenticated: false })
    window.location.href = '/login'
  },

  fetchProfile: async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        set({ isLoading: false })
        return
      }
      const { data } = await api.get('/auth/me')
      set({
        user: {
          id: data.id,
          email: data.email,
          fullName: data.fullName,
          role: data.role.code,
          branchId: data.branchId,
          permissions: data.permissions,
        },
        isAuthenticated: true,
        isLoading: false,
      })
    } catch {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  hasPermission: (resource: string, action: string) => {
    const { user } = get()
    if (!user) return false
    if (user.role === 'SUPER_ADMIN') return true
    return user.permissions?.includes(`${resource}:${action}`) ?? false
  },
}))
