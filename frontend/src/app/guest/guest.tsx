'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Webcam from 'react-webcam' 
import { useAuthStore } from '@/store/authStore'
import { doorAPI } from '@/lib/api' 


interface CaptureResult {
  imageSrc: string
  time: string
  door_name?: string
  door_id?: number
}

interface Door {
  id: number
  name: string
}

export default function CameraPage() {
  const router = useRouter()
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore()
  
  // Refs & State cho Camera
  const webcamRef = useRef<Webcam>(null)
  const [capturedImage, setCapturedImage] = useState<CaptureResult | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [selectedDoor, setSelectedDoor] = useState(1)
  const [doors, setDoors] = useState<Door[]>([])

  // 1. Check Auth
  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false))
  }, [checkAuth])

  // 2. Fetch Doors
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

  // 3. Redirect logic
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    if (!isLoading && user && user.role !== 'admin' && user.role !== 'security') {
      router.push('/mobile')
    }
  }, [isAuthenticated, isLoading, user, router])

  const handleCapture = useCallback(() => {
    if (webcamRef.current) {
      // Chụp ảnh trả về chuỗi base64
      const imageSrc = webcamRef.current.getScreenshot()
      
      if (imageSrc) {
        const currentDoor = doors.find((d) => d.id === selectedDoor)
        
        // Lưu dữ liệu ảnh và thời gian
        setCapturedImage({
          imageSrc: imageSrc,
          time: new Date().toLocaleString('vi-VN'), // Lưu thời gian chụp
          door_id: selectedDoor,
          door_name: currentDoor?.name
        })
      }
    }
  }, [webcamRef, selectedDoor, doors])

  // Hàm reset để chụp lại
  const handleRetake = () => {
    setCapturedImage(null)
    setCameraError(null)
  }

  // Xử lý khi camera không load được
  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error("Camera Error:", error)
    setCameraError("Không thể truy cập camera. Vui lòng cấp quyền hoặc kiểm tra thiết bị.")
  }, [])

  if (isLoading) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) return null

  return (
    <div className="gradient-bg min-h-screen">
      {/* Header (Giữ nguyên) */}
      <header className="bg-gradient-to-r from-cyan-600 to-red-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Camera Check-in</h1>
              <p className="text-xs text-white/90">Chụp ảnh xác thực</p>
            </div>
          </div>
          {/* User info buttons... */}
          <div className="flex items-center gap-4">
             <button onClick={() => router.push('/dashboard')} className="text-white text-sm hover:underline">Back</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Door Selector (Giữ nguyên) */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Chọn vị trí (Cửa):</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {doors.map((door) => (
              <button
                key={door.id}
                onClick={() => setSelectedDoor(door.id)}
                disabled={!!capturedImage} // Không cho đổi cửa khi đang xem ảnh result
                className={`p-4 rounded-xl border-2 transition text-center ${
                  selectedDoor === door.id
                    ? 'border-transparent bg-gradient-to-r from-cyan-500 to-red-500 py-4 rounded-xl text-white'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                } ${capturedImage ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-semibold text-sm">{door.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* --- MAIN CAMERA / RESULT AREA --- */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          
          {capturedImage ? (
            // VIEW 2: HIỂN THỊ ẢNH ĐÃ CHỤP
            <div className="p-6 text-center">
              <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-200">
                <h2 className="text-2xl font-bold text-green-700 mb-2">Đã chụp thành công!</h2>
                <p className="text-gray-600">Thời gian: <span className="font-bold">{capturedImage.time}</span></p>
                <p className="text-gray-600">Tại: <span className="font-bold">{capturedImage.door_name}</span></p>
              </div>

              <div className="relative inline-block rounded-xl overflow-hidden shadow-2xl border-4 border-white mb-6">
                <img 
                  src={capturedImage.imageSrc} 
                  alt="Captured" 
                  className="max-w-full h-auto max-h-[400px]" 
                />
              </div>

              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={handleRetake}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-semibold"
                >
                  Chụp lại
                </button>
                <button
                  onClick={() => alert("Chức năng gửi API xử lý ảnh sẽ viết ở đây!")}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
                >
                  Gửi xác thực
                </button>
              </div>
            </div>
          ) : (
            // VIEW 1: CAMERA LIVE
            <div className="relative bg-black">
              {/* Header camera */}
              <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
        
              </div>

              {cameraError ? (
                <div className="p-12 text-center bg-gray-900 text-white min-h-[300px] flex flex-col items-center justify-center">
                  <p className="text-red-400 mb-4">{cameraError}</p>
                  <button onClick={() => setCameraError(null)} className="underline">Thử lại</button>
                </div>
              ) : (
                <div className="relative">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width="100%"
                    videoConstraints={{
                      facingMode: 'environment',
                    }}
                    onUserMediaError={handleUserMediaError}
                    className="w-full h-auto block"
                  />
                  
                  {/* Overlay khung ngắm (Chỉ để trang trí) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white/50 rounded-full"></div>
                  </div>

                  {/* Nút chụp ảnh nổi */}
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
                    <button
                      onClick={handleCapture}
                      className="group relative"
                    >
                      <div className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center shadow-lg transition transform group-hover:scale-110 group-active:scale-95">
                        <div className="w-16 h-16 bg-red-600 rounded-full"></div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}