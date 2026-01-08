'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuthStore } from '@/store/authStore'
import axios from 'axios'

interface VisitorPhoto {
  id: number
  photo_path: string
  notes: string | null
  captured_at: string
}

export default function VisitorCameraPage() {
  const router = useRouter()
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  // Camera states
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  
  // FORM 
  const [fullName, setFullName] = useState('')
  const [idCard, setIdCard] = useState('')
  const [dob, setDob] = useState('')
  const [reason, setReason] = useState('')
  
  const [isUploading, setIsUploading] = useState(false)

  // Photo list states
  const [photos, setPhotos] = useState<VisitorPhoto[]>([])
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)

  // Check auth
  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false))
  }, [checkAuth])

  // Redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
    if (!isLoading && user && user.role !== 'admin' && user.role !== 'security') {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, user, router])


  // Bật camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraOn(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Không thể truy cập camera.')
    }
  }

  // Tắt camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setIsCameraOn(false)
    }
  }

  // Chụp ảnh
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageData)
        stopCamera()
      }
    }
  }

  // Chụp lại (Reset form)
  const retakePhoto = () => {
    setCapturedImage(null)
    // Reset các ô nhập liệu
    setFullName('')
    setIdCard('')
    setDob('')
    setReason('')
    startCamera()
  }

  // Upload ảnh & Gộp dữ liệu
  const uploadPhoto = async () => {
    if (!capturedImage) return

    
    if (!fullName || !idCard) {
      alert('Vui lòng nhập ít nhất Họ tên và Số CCCD')
      return
    }

    setIsUploading(true)

    try {
      const token = localStorage.getItem('token')
     
      // Tạo mảng chứa các phần thông tin, lọc bỏ các ô trống
      const tt = []
      if (fullName) tt.push(`Họ tên: ${fullName}`)
      if (idCard) tt.push(`CCCD: ${idCard}`)
      if (dob) tt.push(`Ngày sinh: ${dob}`)
      if (reason) tt.push(`Lý do: ${reason}`)

      // Nối lại thành 1 chuỗi string để lưu vào cột notes
      const finalNotes = tt.join(' - '); 

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/visitors/capture`,
        {
            photo: capturedImage,
            notes: finalNotes
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      alert('Đã lưu thông tin khách thành công')

      // Reset toàn bộ
      setCapturedImage(null)
      setFullName('')
      setIdCard('')
      setDob('')
      setReason('')
      
    
      loadPhotos()

    } catch (error: any) {
      console.error('Upload error:', error)
      alert(error.response?.data?.message || 'Lỗi khi lưu ảnh')
    } finally {
      setIsUploading(false)
    }
  }

  const loadPhotos = async () => {
    setIsLoadingPhotos(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/visitors/photos?limit=20`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      setPhotos(response.data.data)
    } catch (error) {
      console.error('Load photos error:', error)
    } finally {
      setIsLoadingPhotos(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadPhotos()
    }
  }, [isAuthenticated])

  const deletePhoto = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa ảnh này')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/visitors/photos/${id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      alert('Đã xóa ảnh')
      loadPhotos()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa ảnh')
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  if (isLoading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <DashboardLayout title="Chụp ảnh khách lạ">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT: CAMERA */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Chụp ảnh</h2>

          {/* Camera/Preview */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4" style={{ height: '360px' }}>
            {!isCameraOn && !capturedImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={startCamera}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:from-cyan-700 hover:to-red-700 transition font-semibold"
                >
                  Bật Camera
                </button>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${!isCameraOn ? 'hidden' : ''}`}
            />

            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Controls */}
          {isCameraOn && (
            <div className="flex gap-3">
              <button
                onClick={capturePhoto}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                Chụp
              </button>
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Tắt
              </button>
            </div>
          )}

          {/* Captured photo actions - FORM NHẬP LIỆU */}
          {capturedImage && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Họ tên */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Họ và Tên *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>

                {/* Số CCCD */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Số CCCD *</label>
                  <input
                    type="text"
                    value={idCard}
                    onChange={(e) => setIdCard(e.target.value)}
                    placeholder="012345..."
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>

                {/* Ngày sinh */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>
              </div>

              {/* Lý do / Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lý do / Ghi chú</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Gặp ai? Mục đích gì?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={uploadPhoto}
                  disabled={isUploading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:from-cyan-700 hover:to-red-700 transition font-semibold disabled:opacity-50"
                >
                  {isUploading ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
                <button
                  onClick={retakePhoto}
                  disabled={isUploading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                >
                  Chụp lại
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: PHOTO LIST */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Lịch sử khách</h2>
            <button
              onClick={loadPhotos}
              disabled={isLoadingPhotos}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-semibold"
            >
              {isLoadingPhotos ? 'Đang tải...' : 'Tải lại'}
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {photos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Chưa có dữ liệu nào</p>
              </div>
            ) : (
              photos.map((photo) => (
                <div key={photo.id} className="border border-gray-200 rounded-lg p-4 flex gap-4">
                  {/* Ảnh nhỏ bên trái */}
                  <img
                    src={photo.photo_path}
                    alt="Visitor"
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                  
                  {/* Thông tin bên phải */}
                  <div className="flex-1 space-y-1">
                    {photo.notes ? (
                      <div className="text-sm text-gray-800 whitespace-pre-line break-words">
                        {photo.notes.split(' - ').map((part, index) => (
                          <div key={index} className="mb-1">
                            {/* Tô đậm phần tiêu đề (ví dụ "Họ tên:") */}
                            <span className="font-semibold text-cyan-700">
                              {part.split(':')[0]}:
                            </span>
                            {part.split(':').slice(1).join(':')}
                          </div>
                        ))}
                      </div>
                    ) : (
                       <span className="text-gray-400 italic text-sm">Không có thông tin</span>
                    )}
                    
                    <div className="text-xs text-gray-500 pt-1 border-t mt-2">
                      {new Date(photo.captured_at).toLocaleString('vi-VN')}
                    </div>

                    {user.role === 'admin' && (
                      <button
                        onClick={() => deletePhoto(photo.id)}
                        className="text-red-600 text-xs hover:underline mt-1"
                      >
                        [Xóa bản ghi]
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}