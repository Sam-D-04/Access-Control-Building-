import { create } from 'zustand'
import { authAPI } from '@/lib/api'

interface User {
  id: number
  employee_id: string
  email: string
  full_name: string
  phone?: string
  avatar?: string
  department_id?: number
  position: string
  role: string
  is_active: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {

      const response = await authAPI.login(email, password)
      
      const { token, user } = response.data

      // Save to localStorage
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Đăng nhập thất bại'
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
      })
      throw new Error(errorMessage)
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
      set({ isAuthenticated: false })
      return
    }

    try {
      const user = JSON.parse(userStr)
      // Verify token with backend
      await authAPI.getMe()

      set({
        token,
        user,
        isAuthenticated: true,
      })
    } catch (error) {
      // Token invalid, clear storage
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      })
    }
  },

  clearError: () => set({ error: null }),
}))
