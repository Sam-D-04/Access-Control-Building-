'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Scanner } from '@yudiel/react-qr-scanner'
import { useAuthStore } from '@/store/authStore'
import { accessAPI, doorAPI } from '@/lib/api'

interface ScanResult {
  status: 'granted' | 'denied'
  user_name?: string
  employee_id?: string
  door_name?: string
  message: string
  time: string
}

interface Door {
  id: number
  name: string
}

export default function ScannerPage() {
  const router = useRouter()
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(true)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [selectedDoor, setSelectedDoor] = useState(1)
  const [doors, setDoors] = useState<Door[]>([])

  //check auth khi load page
  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false))
  }, [checkAuth])

  //fetch doors từ API
  useEffect(() => {
    const fetchDoors = async () => {
      try {
        const response = await doorAPI.getAll()
        const doorList = response.data.data.map((door: any) => ({
          id: door.id,
          name: door.name
        }))
        setDoors(doorList)
        if (doorList.length > 0) {
          setSelectedDoor(doorList[0].id)
        }
      } catch (error) {
        console.error('Error fetching doors:', error)
      }
    }

    if (isAuthenticated) {
      fetchDoors()
    }
  }, [isAuthenticated])

  //redirect nếu chưa login hoặc không phải admin/security
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (!isLoading && user && user.role !== 'admin' && user.role !== 'security') {
      router.push('/mobile')
    }
  }, [isAuthenticated, isLoading, user, router])

  //xử lý khi scan được QR code
  const handleScan = async (result: any) => {
    if (!result || !isScanning) return

    try {
      setIsScanning(false) //tạm dừng scan

      //parse QR data
      const qrData = JSON.parse(result[0].rawValue)
      console.log('QR Scanned:', qrData)

      //gọi API
      const response = await accessAPI.scanQR({
        qr_data: qrData,
        door_id: selectedDoor,
      })

      //hiển thị kết quả
      setLastResult({
        status: response.data.status,
        user_name: response.data.data?.user_name,
        employee_id: response.data.data?.employee_id,
        door_name: doors.find((d) => d.id === selectedDoor)?.name,
        message: response.data.message,
        time: new Date().toLocaleTimeString('vi-VN'),
      })

      //tự động scan lại sau 3 giây
      setTimeout(() => {
        setIsScanning(true)
        setLastResult(null)
      }, 3000)
    } catch (error: any) {
      console.error('Scan error:', error)

      setLastResult({
        status: 'denied',
        message: error.response?.data?.message || 'Lỗi khi quét QR',
        time: new Date().toLocaleTimeString('vi-VN'),
      })

      setTimeout(() => {
        setIsScanning(true)
        setLastResult(null)
      }, 3000)
    }
  }

  //xử lý lỗi scan
  const handleError = (error: any) => {
    console.error('Scanner error:', error)

    //set error message dựa vào loại lỗi
    if (error?.name === 'NotFoundError') {
      setCameraError('Không tìm thấy camera. Vui lòng kết nối webcam và cho phép truy cập.')
    } else if (error?.name === 'NotAllowedError') {
      setCameraError('Bạn chưa cho phép truy cập camera. Vui lòng cấp quyền trong trình duyệt.')
    } else {
      setCameraError('Lỗi khi khởi tạo camera: ' + (error?.message || 'Unknown error'))
    }
    setIsScanning(false)
  }

  if (isLoading) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="gradient-bg min-h-screen">
      {/* tạo header riêng cho scanner */}
      <header className="bg-gradient-to-r from-cyan-600 to-red-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Door Scanner</h1>
              <p className="text-xs text-white/90">Quét QR code nhân viên</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-white font-medium">{user.full_name}</span>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm text-white hover:bg-white/20 rounded-lg transition backdrop-blur"
            >
              Dashboard
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-white hover:bg-white/20 rounded-lg transition backdrop-blur"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* tạo main content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* tạo door selector */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Chọn cửa:</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {doors.map((door) => (
              <button
                key={door.id}
                onClick={() => setSelectedDoor(door.id)}
                disabled={!isScanning}
                className={`p-4 rounded-xl border-2 transition text-center ${
                  selectedDoor === door.id
                    ? 'border-transparent bg-gradient-to-r from-cyan-500 to-red-500 py-4 rounded-xl text-white'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                } ${!isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-semibold text-sm">{door.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/*hiển thị result hoặc scanner */}
        {lastResult ? (
          //hiển thị kết quả scan
          <div
            className={`rounded-2xl shadow-2xl p-12 text-center ${
              lastResult.status === 'granted'
                ? 'bg-gradient-to-br from-green-500 to-green-600'
                : 'bg-gradient-to-br from-red-500 to-red-600'
            }`}
          >
            <div className="mb-6">
              {lastResult.status === 'granted' ? (
                <svg
                  className="w-32 h-32 text-white mx-auto animate-bounce"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg
                  className="w-32 h-32 text-white mx-auto animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>

            <h2 className="text-5xl font-bold text-white mb-6">
              {lastResult.status === 'granted' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
            </h2>

            {lastResult.user_name && (
              <div className="bg-white bg-opacity-20 rounded-xl p-6 mb-4">
                <p className="text-white text-3xl font-bold mb-2">{lastResult.user_name}</p>
                <p className="text-white text-xl opacity-90">{lastResult.employee_id}</p>
              </div>
            )}

            <div className="bg-white bg-opacity-10 rounded-xl p-6">
              <p className="text-white text-2xl font-semibold mb-2">
                {lastResult.door_name}
              </p>
              <p className="text-white text-lg opacity-90 mb-2">{lastResult.message}</p>
              <p className="text-white text-sm opacity-75">{lastResult.time}</p>
            </div>

            <div className="mt-8 text-white text-sm opacity-75">
              Tự động quét tiếp sau 3 giây...
            </div>
          </div>
        ) : (
          //hiển thị camera scanner
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-red-600 p-6 text-white text-center">
              <h3 className="text-2xl font-bold mb-2">Camera Scanner</h3>
            </div>

            {cameraError ? (
              //hiển thị lỗi camera
              <div className="p-12 text-center bg-red-50">
                <svg
                  className="w-20 h-20 text-red-500 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-red-700 mb-2">Lỗi Camera</h3>
                <p className="text-gray-700 mb-6">{cameraError}</p>
                <button
                  onClick={() => {
                    setCameraError(null)
                    setIsScanning(true)
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:from-cyan-700 hover:to-red-700 transition font-semibold"
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                <div className="relative bg-black" style={{ paddingTop: '75%' }}>
                  {isScanning && (
                    <div className="absolute inset-0">
                      <Scanner
                        onScan={handleScan}
                        onError={handleError}
                        constraints={{
                          facingMode: 'environment',
                        }}
                        
                        styles={{
                          container: {
                            width: '100%',
                            height: '100%',
                          },
                        }}
                      />
                    </div>
                  )}

                  {/* thêm overlay hướng dẫn */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="border-4 border-white rounded-2xl w-64 h-64 shadow-2xl"></div>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-cyan-100 to-red-100 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-cyan-500 to-red-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-800 font-bold text-lg">Đang chờ...</span>
                  </div>
                  <p className="text-gray-700">
                    Cửa hiện tại:{' '}
                    <span className="font-bold text-gray-900">
                      {doors.find((d) => d.id === selectedDoor)?.name}
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
