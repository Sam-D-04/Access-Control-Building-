'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileLayout from '@/components/MobileLayout'
import { useAuthStore } from '@/store/authStore'
import { QRCodeSVG } from 'qrcode.react'

export default function MobilePage() {
  const router = useRouter()
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [lastAccess, setLastAccess] = useState<any>(null)
  const [qrData, setQrData] = useState('')
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false))
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  //generate QR code chứa thông tin user
  const generateQRData = () => {
    if (!user) return ''

    const qrPayload = {
      user_id: user.id,
      employee_id: user.employee_id,
      timestamp: Date.now(),
      //tạo signature đơn giản
      signature: btoa(`${user.id}-${Date.now()}`),
    }

    return JSON.stringify(qrPayload)
  }

  //refresh QR code mỗi 60 giây
  useEffect(() => {
    if (!user) return

    // generate QR code lần đầu
    setQrData(generateQRData())
    setCountdown(60)

    //set timer để refresh QR
    const interval = setInterval(() => {
      setQrData(generateQRData())
      setCountdown(60)
    }, 60000) // 60 giây

    //set countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 60))
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(countdownInterval)
    }
  }, [user])

  if (isLoading) {
    return (
      <MobileLayout title="Loading...">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </MobileLayout>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <MobileLayout title="Access Control">
      {/* User Info Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center mb-4">
          {user.avatar ? (
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
              <img src={user.avatar} alt={user.full_name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-red-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
          )}
          <div className="ml-4 flex-1">
            <h2 className="text-xl font-bold text-gray-800">{user.full_name}</h2>
            <p className="text-sm text-gray-500">{user.employee_id}</p>
            <p className="text-xs text-gray-400">{user.position}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            Đăng xuất
          </button>
        </div>

        {/* Action Buttons */}
        <div className={user.role === 'admin' || user.role === 'security' ? 'grid grid-cols-2 gap-3' : ''}>
          <button
            onClick={() => router.push('/mobile/history')}
            className="bg-gradient-to-r from-cyan-100 to-red-100 rounded-xl p-4 hover:shadow-md transition flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-semibold text-gray-700">Lịch sử</span>
          </button>
          {(user.role === 'admin' || user.role === 'security') && (
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gradient-to-r from-cyan-100 to-red-100 rounded-xl p-4 hover:shadow-md transition flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="text-sm font-semibold text-gray-700">Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/*hiển thị QR để scan tại cửa */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 mb-1">QR vào cửa</h3>
          <p className="text-sm text-gray-500">Đưa QR code lên scanner tại cửa</p>
        </div>

        {/*Render QR code*/}
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-red-500 shadow-xl">
            {qrData && (
              <QRCodeSVG
                value={qrData}
                size={220}
                level="H"
                includeMargin={true}
                fgColor="#ffffff"
                bgColor="transparent"
              />
            )}
          </div>
        </div>

        {/*hiển thị countdown timer */}
        <div className="bg-gradient-to-r from-cyan-100 to-red-100 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
            <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-semibold">
              QR code sẽ làm mới sau <span className="text-gray-900 text-lg font-bold">{countdown}s</span>
            </span>
          </div>
        </div>
      </div>

      {/* Last Access Result */}
      {lastAccess && (
        <div
          className={`rounded-2xl shadow-lg p-6 mb-6 ${
            lastAccess.status === 'granted'
              ? 'bg-gradient-to-r from-green-500 to-green-600'
              : 'bg-gradient-to-r from-red-500 to-red-600'
          }`}
        >
          <div className="flex items-center mb-2">
            {lastAccess.status === 'granted' ? (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="ml-3 text-white text-2xl font-bold">
              {lastAccess.status === 'granted' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
            </span>
          </div>
          <div className="text-white text-sm opacity-90">
            <p className="font-semibold">{lastAccess.door}</p>
            {/* Chỉ hiển thị message khi GRANTED hoặc không có denial_details */}
            {(lastAccess.status === 'granted' || !lastAccess.denial_details || lastAccess.denial_details.length === 0) && (
              <p>{lastAccess.message}</p>
            )}
            <p className="text-xs mt-2">{lastAccess.time}</p>
          </div>

          {/* Hiển thị chi tiết khi GRANTED */}
          {lastAccess.status === 'granted' && lastAccess.matched_permission && (
            <div className="mt-3 bg-white bg-opacity-20 rounded-lg p-2.5">
              <p className="text-white text-xs font-semibold mb-1">✓ Quyền:</p>
              <p className="text-white text-sm opacity-90">{lastAccess.matched_permission}</p>
            </div>
          )}

          {/* Hiển thị chi tiết lỗi khi DENIED - Rút gọn */}
          {lastAccess.status === 'denied' && lastAccess.denial_details && lastAccess.denial_details.length > 0 && (
            <div className="mt-3 bg-white bg-opacity-20 rounded-lg p-2.5 max-h-40 overflow-y-auto">
              <p className="text-white text-xs font-bold mb-2 text-center">
                Lý do từ chối:
              </p>
              <div className="space-y-1.5">
                {lastAccess.denial_details.map((detail: any, index: number) => (
                  <div key={index} className="bg-white bg-opacity-10 rounded p-2">
                    <p className="text-white text-xs font-semibold mb-0.5 opacity-75">
                      {detail.permission_name}
                    </p>
                    <p className="text-white text-xs">{detail.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </MobileLayout>
  )
}
