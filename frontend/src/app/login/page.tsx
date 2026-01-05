'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error, clearError, user } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      await login(email, password)

      // Redirect theo role
      const loggedInUser = useAuthStore.getState().user
      if (loggedInUser?.role === 'admin' || loggedInUser?.role === 'security') {
        router.push('/dashboard')
      } else {
        router.push('/mobile')
      }
    } catch (err) {
      // Error handled by store
    }
  }

  const fillDemoAccount = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
  }

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center px-4">
      <div className="container mx-auto">
        {/* Login Card */}
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-600 to-red-600 p-8 text-white text-center">
            {/* Logo SVG */}
            <div className="mb-4">
              <svg
                className="w-20 h-20 mx-auto"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 2.18l7 3.82v5c0 4.52-2.98 8.69-7 9.93-4.02-1.24-7-5.41-7-9.93V8l7-3.82zM10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">Access Control System</h1>
            <p className="text-cyan-100">Hệ thống kiểm soát ra vào tòa nhà</p>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit}>
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Email */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 transition"
                  required
                />
              </div>

              {/* Password */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 transition"
                  required
                />
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-600 to-red-600 text-white font-bold py-3 rounded-lg hover:from-cyan-700 hover:to-red-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>

            {/* Demo Accounts */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                 Tài khoản mẫu:
              </p>
              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('admin@company.com', '123456')}
                  className="w-full flex justify-between items-center p-2 bg-white rounded border border-gray-200 hover:border-cyan-500 hover:bg-cyan-50 transition text-left"
                >
                  <span className="font-semibold text-red-700">Admin</span>
                  <span className="text-gray-600">
                    admin@company.com / 123456
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    fillDemoAccount('security@company.com', '123456')
                  }
                  className="w-full flex justify-between items-center p-2 bg-white rounded border border-gray-200 hover:border-cyan-500 hover:bg-cyan-50 transition text-left"
                >
                  <span className="font-semibold text-orange-700">Security</span>
                  <span className="text-gray-600">
                    security@company.com / 123456
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    fillDemoAccount('it.staff1@company.com', '123456')
                  }
                  className="w-full flex justify-between items-center p-2 bg-white rounded border border-gray-200 hover:border-cyan-500 hover:bg-cyan-50 transition text-left"
                >
                  <span className="font-semibold text-cyan-700">IT Staff</span>
                  <span className="text-gray-600">
                    it.staff1@company.com / 123456
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('hr.staff@company.com', '123456')}
                  className="w-full flex justify-between items-center p-2 bg-white rounded border border-gray-200 hover:border-cyan-500 hover:bg-cyan-50 transition text-left"
                >
                  <span className="font-semibold text-green-700">Employee</span>
                  <span className="text-gray-600">hr.staff@company.com / 123456</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
