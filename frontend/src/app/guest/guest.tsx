'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

interface CapturedPhoto {
  dataUrl: string
  timestamp: Date
  note: string
}

export default function CameraPage() {
  const router = useRouter()
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Check auth khi load page
  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false))
  }, [checkAuth])

  // Redirect nếu chưa login hoặc không phải admin/security
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (!isLoading && user && user.role !== 'admin' && user.role !== 'security') {
      router.push('/mobile')
    }
  }, [isAuthenticated, isLoading, user, router])

  // Khởi tạo camera
  const startCamera = useCallback(async () => {
    try {
      // Dừng stream cũ nếu có
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      setCameraError(null)
      setIsCameraReady(false)

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setIsCameraReady(true)
        }
      }
    } catch (error: any) {
      console.error('Camera error:', error)
      
      if (error?.name === 'NotFoundError') {
        setCameraError('Không tìm thấy camera. Vui lòng kết nối webcam.')
      } else if (error?.name === 'NotAllowedError') {
        setCameraError('Bạn chưa cho phép truy cập camera. Vui lòng cấp quyền trong trình duyệt.')
      } else {
        setCameraError('Lỗi khi khởi tạo camera: ' + (error?.message || 'Unknown error'))
      }
    }
  }, [facingMode])

  // Khởi tạo camera khi component mount và khi đổi camera
  useEffect(() => {
    if (isAuthenticated && !capturedPhoto) {
      startCamera()
    }

    // Cleanup khi unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [isAuthenticated, startCamera, capturedPhoto])

  // Chụp ảnh
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas size = video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Vẽ frame hiện tại lên canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Lấy data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)

    // Lưu ảnh đã chụp
    setCapturedPhoto({
      dataUrl,
      timestamp: new Date(),
      note: ''
    })

    // Dừng camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
  }

  // Chụp lại
  const retakePhoto = () => {
    setCapturedPhoto(null)
    // Camera sẽ tự động khởi động lại do useEffect
  }

  // Đổi camera trước/sau
  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  // Cập nhật ghi chú
  const updateNote = (note: string) => {
    if (capturedPhoto) {
      setCapturedPhoto({ ...capturedPhoto, note })
    }
  }

  // Xác nhận và lưu (placeholder - sẽ implement sau)
  const confirmPhoto = () => {
    if (!capturedPhoto) return
    
    console.log('Photo to save:', {
      timestamp: capturedPhoto.timestamp.toISOString(),
      note: capturedPhoto.note,
      imageSize: capturedPhoto.dataUrl.length
    })
    
    // TODO: Gọi API lưu ảnh
    alert('Ảnh đã được lưu! (Demo - chưa kết nối backend)')
    
    // Reset để chụp ảnh mới
    setCapturedPhoto(null)
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
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-red-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Camera</h1>
              <p className="text-xs text-white/90">Chụp ảnh và ghi chú</p>
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

      {/* Main content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Canvas ẩn để capture ảnh */}
        <canvas ref={canvasRef} className="hidden" />

        {capturedPhoto ? (
          /* Preview ảnh đã chụp */
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-red-600 p-4 text-white text-center">
              <h3 className="text-xl font-bold">Xem trước ảnh</h3>
            </div>

            {/* Ảnh preview */}
            <div className="relative bg-black">
              <img 
                src={capturedPhoto.dataUrl} 
                alt="Captured" 
                className="w-full h-auto"
              />
              
              {/* Timestamp overlay */}
              <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-lg text-sm">
                {capturedPhoto.timestamp.toLocaleString('vi-VN')}
              </div>
            </div>

            {/* Form ghi chú */}
            <div className="p-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Ghi chú:
              </label>
              <textarea
                value={capturedPhoto.note}
                onChange={(e) => updateNote(e.target.value)}
                placeholder="Nhập ghi chú cho ảnh này..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                rows={3}
              />

              {/* Buttons */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={retakePhoto}
                  className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-semibold flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Chụp lại
                </button>
                <button
                  onClick={confirmPhoto}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:from-cyan-700 hover:to-red-700 transition font-semibold flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Lưu ảnh
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Camera view */
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-red-600 p-4 text-white text-center">
              <h3 className="text-xl font-bold">Camera</h3>
            </div>

            {cameraError ? (
              /* Lỗi camera */
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
                  onClick={startCamera}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:from-cyan-700 hover:to-red-700 transition font-semibold"
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                {/* Video stream */}
                <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Loading overlay */}
                  {!isCameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-2"></div>
                        <p>Đang khởi tạo camera...</p>
                      </div>
                    </div>
                  )}

                  {/* Camera switch button */}
                  <button
                    onClick={switchCamera}
                    className="absolute top-4 right-4 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
                    title="Đổi camera"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>

                  {/* Viewfinder guides */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-white/70 rounded-tl-lg"></div>
                    <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-white/70 rounded-tr-lg"></div>
                    <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-white/70 rounded-bl-lg"></div>
                    <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-white/70 rounded-br-lg"></div>
                  </div>
                </div>

                {/* Capture button */}
                <div className="p-6 bg-gradient-to-r from-cyan-100 to-red-100 flex justify-center">
                  <button
                    onClick={capturePhoto}
                    disabled={!isCameraReady}
                    className={`w-20 h-20 rounded-full border-4 border-white shadow-lg transition-all flex items-center justify-center
                      ${isCameraReady 
                        ? 'bg-gradient-to-r from-cyan-500 to-red-500 hover:scale-110 active:scale-95' 
                        : 'bg-gray-400 cursor-not-allowed'
                      }`}
                  >
                    <div className="w-14 h-14 bg-white rounded-full"></div>
                  </button>
                </div>

                {/* Status */}
                <div className="p-4 text-center bg-gray-50">
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isCameraReady ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
                    <span className="text-gray-700 font-medium">
                      {isCameraReady ? 'Sẵn sàng chụp' : 'Đang khởi tạo...'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}