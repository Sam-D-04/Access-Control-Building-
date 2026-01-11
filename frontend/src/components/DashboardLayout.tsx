'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Sidebar from './Sidebar'
import { Menu, X } from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function DashboardLayout({
  children,
  title,
  subtitle,
}: DashboardLayoutProps) {
  const router = useRouter()
  const { isAuthenticated, checkAuth, user } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Employee không được vào dashboard, redirect to mobile
    if (user && user.role !== 'admin' && user.role !== 'security') {
      router.push('/mobile')
    }
  }, [isAuthenticated, user, router])

  if (!isAuthenticated || (user && user.role !== 'admin' && user.role !== 'security')) {
    return null // Or loading spinner
  }

  return (
    <div className="flex h-screen">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? (
          <X className="w-6 h-6 text-gray-700" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700" />
        )}
      </button>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: always visible, Mobile: overlay khi mở */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-40
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white shadow-sm p-4 border-b">
          <div className="flex justify-between items-center">
            <div className="ml-14 md:ml-0">
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">{title}</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Date Time - Ẩn text trên mobile nhỏ */}
              <div className="text-right">
                <div className="text-xs md:text-sm text-gray-600 hidden sm:block">Hôm nay</div>
                <div className="text-xs md:text-sm font-semibold">
                  {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  <span className="hidden sm:inline">-{new Date().getFullYear()}</span>
                  {' - '}
                  {new Date().toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-gray-50">{children}</div>
      </div>
    </div>
  )
}
