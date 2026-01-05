'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileLayout from '@/components/MobileLayout'
import { useAuthStore } from '@/store/authStore'
import { accessAPI } from '@/lib/api'

interface AccessLog {
  id: number
  access_time: string
  status: string
  denial_reason?: string
  door_name: string
  door_location: string
}

export default function MobileHistoryPage() {
  const router = useRouter()
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, granted: 0, denied: 0 })

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    fetchMyLogs()
  }, [isAuthenticated])

  const fetchMyLogs = async () => {
    setIsLoading(true)
    try {
      const response = await accessAPI.getMyLogs({ limit: 50 })
      const logsData = response.data.data || []
      setLogs(logsData)

      // Calculate stats
      const granted = logsData.filter((log: AccessLog) => log.status === 'granted').length
      const denied = logsData.filter((log: AccessLog) => log.status === 'denied').length
      setStats({
        total: logsData.length,
        granted,
        denied,
      })
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <MobileLayout title="Lịch sử" showBack onBack={() => router.back()}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="Lịch sử ra vào" showBack onBack={() => router.back()}>
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="text-3xl font-bold text-cyan-600 mb-1">{stats.total}</div>
          <div className="text-xs text-gray-600">Tổng</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="text-3xl font-bold text-green-600 mb-1">{stats.granted}</div>
          <div className="text-xs text-gray-600">Chấp nhận</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="text-3xl font-bold text-red-600 mb-1">{stats.denied}</div>
          <div className="text-xs text-gray-600">Từ chối</div>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-500 font-semibold">Chưa có lịch sử</p>
            <p className="text-sm text-gray-400 mt-2">Quẹt thẻ để tạo lịch sử truy cập</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`bg-white rounded-xl shadow-md p-4 border-l-4 ${
                log.status === 'granted' ? 'border-green-500' : 'border-red-500'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{log.door_name}</h3>
                  <p className="text-sm text-gray-500">{log.door_location}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    log.status === 'granted'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {log.status === 'granted' ? 'Chấp nhận' : 'Từ chối'}
                </span>
              </div>

              {log.status === 'denied' && log.denial_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2">
                  <p className="text-xs text-red-700 font-semibold">{log.denial_reason}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {formatDate(log.access_time)}
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {formatTime(log.access_time)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={fetchMyLogs}
        className="mt-6 w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition"
      >
        <div className="flex items-center justify-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </div>
      </button>
    </MobileLayout>
  )
}
