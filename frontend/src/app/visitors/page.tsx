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
    captured_by: number
    captured_by_name: string
    captured_by_employee_id: string
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
    const [notes, setNotes] = useState('')
    const [isUploading, setIsUploading] = useState(false)

    // Photo list states
    const [photos, setPhotos] = useState<VisitorPhoto[]>([])
    const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)

    // Check auth
    useEffect(() => {
      checkAuth().finally(() => setIsLoading(false))
    }, [checkAuth])

    // Redirect nếu không phải admin/security
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

    // Chụp lại
    const retakePhoto = () => {
      setCapturedImage(null)
      setNotes('')
      startCamera()
    }

    // Upload ảnh
    const uploadPhoto = async () => {
      if (!capturedImage) return

      setIsUploading(true)

      try {
        // Convert base64 to blob
        const blob = await fetch(capturedImage).then(r => r.blob())

        // Tạo FormData
        const formData = new FormData()
        formData.append('photo', blob, `visitor_${Date.now()}.jpg`)
        formData.append('notes', notes)

        // Upload
        const token = localStorage.getItem('token')
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/visitors/capture`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        )

        alert('Đã lưu ảnh thành công')

        // Reset
        setCapturedImage(null)
        setNotes('')

        // Reload danh sách
        loadPhotos()

      } catch (error: any) {
        console.error('Upload error:', error)
        alert(error.response?.data?.message || 'Lỗi khi upload ảnh')
      } finally {
        setIsUploading(false)
      }
    }


    // Load danh sách ảnh
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

    // Load photos khi mount
    useEffect(() => {
      if (isAuthenticated) {
        loadPhotos()
      }
    }, [isAuthenticated])

    // Xóa ảnh
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

    // Cleanup camera khi unmount
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

              {/* Video stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${!isCameraOn ? 'hidden' : ''}`}
              />

              {/* Captured image preview */}
              {capturedImage && (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              )}

              {/* Canvas hidden */}
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

            {/* Captured photo actions */}
            {capturedImage && (
              <div className="space-y-4">
                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ghi chú (Khách đến gặp ai? Mục đích gì?)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}                  rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={uploadPhoto}
                    disabled={isUploading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:from-cyan-700 hover:to-red-700 transition font-semibold disabled:opacity-50"
                  >
                    {isUploading ? 'Đang lưu...' : 'Lưu ảnh'}
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
              <h2 className="text-xl font-bold text-gray-800">Lịch sử ảnh</h2>
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
                  <p>Chưa có ảnh nào</p>
                </div>
              ) : (
                photos.map((photo) => (
                  <div key={photo.id} className="border border-gray-200 rounded-lg p-4">
                    {/* Photo */}
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/${photo.photo_path}`}
                      alt="Visitor"
                      className="w-full h-48 object-cover rounded-lg mb-3"
                    />

                    {/* Info */}
                    <div className="space-y-2">
                      {photo.notes && (
                        <div className="text-sm text-gray-700">
                          <span className="font-semibold">Ghi chú:</span> {photo.notes}
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        <div>Chụp bởi: <span className="font-semibold">{photo.captured_by_name}</span> ({photo.captured_by_employee_id})</div>
                        <div>Thời gian: {new Date(photo.captured_at).toLocaleString('vi-VN')}</div>
                      </div>

                      {/* Delete button (chỉ admin) */}
                      {user.role === 'admin' && (
                        <button
                          onClick={() => deletePhoto(photo.id)}
                          className="w-full mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                        >
                          Xóa
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
