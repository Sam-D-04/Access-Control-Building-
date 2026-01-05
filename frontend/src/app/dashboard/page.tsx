'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { accessAPI } from '@/lib/api'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch stats
      const statsRes = await accessAPI.getStats()
      setStats(statsRes.data.data)

      // Fetch recent logs
      const logsRes = await accessAPI.getRecent(10)
      setRecentLogs(logsRes.data.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Đang tải...</div>
        </div>
      </DashboardLayout>
    )
  }

  const totalToday = stats?.today?.total || 0
  const grantedToday = stats?.today?.granted || 0
  const deniedToday = stats?.today?.denied || 0

  return (
    <DashboardLayout title="Dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Tổng truy cập */}
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-gray-500 text-sm font-medium mb-1">
                Tổng truy cập
              </div>
              <div className="text-3xl font-bold text-gray-800">{totalToday}</div>
            </div>
            <div className="p-3 bg-cyan-50 rounded-lg">
              <svg
                className="w-6 h-6 text-cyan-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-center text-sm">
            <span className="text-gray-500">Tổng cộng</span>
          </div>
        </div>

        {/* Được chấp nhận */}
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-gray-500 text-sm font-medium mb-1">
                Được chấp nhận
              </div>
              <div className="text-3xl font-bold text-green-600">{grantedToday}</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-center text-sm">
            <span className="text-gray-500">
              {totalToday > 0
                ? Math.round((grantedToday / totalToday) * 100)
                : 0}
              % tổng số truy cập
            </span>
          </div>
        </div>

        {/* Bị từ chối */}
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-gray-500 text-sm font-medium mb-1">
                Bị từ chối
              </div>
              <div className="text-3xl font-bold text-red-600">{deniedToday}</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-center text-sm">
            <span className="text-gray-500">
              {totalToday > 0 ? Math.round((deniedToday / totalToday) * 100) : 0}%
              tổng số truy cập
            </span>
          </div>
        </div>

        {/* Tổng nhân viên */}
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-gray-500 text-sm font-medium mb-1">
                Tổng nhân viên
              </div>
              <div className="text-3xl font-bold text-gray-800">10</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-center text-sm">
            <span className="text-gray-500">10 active users</span>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold mb-4">Hoạt động gần đây</h3>
        <div className="space-y-3">
          {recentLogs.length === 0 ? (
            <p className="text-gray-500 text-sm">Chưa có hoạt động nào</p>
          ) : (
            recentLogs.map((log, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${
                  log.status === 'granted'
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <svg
                  className={`w-5 h-5 mt-0.5 ${
                    log.status === 'granted' ? 'text-green-600' : 'text-red-600'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {log.status === 'granted' ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  )}
                </svg>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{log.user_name || 'Unknown'}</div>
                  <div className="text-xs text-gray-600">
                    {log.door_name} •{' '}
                    {new Date(log.access_time).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {log.denial_reason && (
                    <div className="text-xs text-red-600 mt-1">{log.denial_reason}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
