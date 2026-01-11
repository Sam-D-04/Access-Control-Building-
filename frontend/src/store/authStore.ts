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

      // Lưu token vào localStorage
      localStorage.setItem('token', token)
      // Lưu user tạm thời (optional, vì checkAuth sẽ load lại)
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

    // Nếu không có token, reset state và thoát
    if (!token) {
      set({ isAuthenticated: false, user: null, token: null })
      return
    }

    try {
      // Gọi API lấy thông tin user mới nhất từ server
      const response = await authAPI.getMe()
      const user = response.data.user

      // Cập nhật lại user vào localStorage để đồng bộ
      localStorage.setItem('user', JSON.stringify(user))

      set({
        token,
        user,
        isAuthenticated: true,
      })
    } catch (error) {
      console.error('Phiên đăng nhập hết hạn hoặc lỗi:', error)
      // Nếu token không hợp lệ, xóa sạch để đăng nhập lại
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