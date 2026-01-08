'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuthStore } from '@/store/authStore'
import axios from 'axios'

interface VisitorPhoto {
  id: number
  photo_path: string
  checkout_photo_path: string | null
  is_checkout: number | boolean
  notes: string | null
  captured_at: string
  time_out: string | null
}

interface VisitorStats {
  total: number
  checked_out: number
  inside: number
  date: string
}

export default function VisitorCameraPage() {
  const router = useRouter()
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  const [checkoutId, setCheckoutId] = useState<number | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const [stats, setStats] = useState<VisitorStats>({ total: 0, checked_out: 0, inside: 0, date: 'today' })

  // === BỘ LỌC ===
  const [filterDate, setFilterDate] = useState('')
  const [filterStartTime, setFilterStartTime] = useState('')
  const [filterEndTime, setFilterEndTime] = useState('')

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

  // Chụp lại
  const retakePhoto = () => {
    setCapturedImage(null)
    if (!checkoutId) {
        setFullName('')
        setIdCard('')
        setDob('')
        setReason('')
    }
    startCamera()
  }

  // Hủy checkout
  const cancelCheckout = () => {
    setCheckoutId(null)
    setCapturedImage(null)
    setFullName('')
    setIdCard('')
    setDob('')
    setReason('')
    stopCamera()
  }

  // Thống kê
  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token')

      let url = `${process.env.NEXT_PUBLIC_API_URL}/visitors/stats`
      if (filterDate) {
        url += `?date=${filterDate}`
      }

      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setStats(response.data.data)
    } catch (error) {
      console.error('Load stats error:', error)
    }
  }

  // Bắt đầu checkout
  const handleStartCheckout = (photo: VisitorPhoto) => {
    setCheckoutId(photo.id)
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
    startCamera()
  }

  // Upload ảnh
  const uploadPhoto = async () => {
    if (!capturedImage) return

    setIsUploading(true)

    try {
      const token = localStorage.getItem('token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      // CHECKOUT
      if (checkoutId) {
         await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/visitors/photos/${checkoutId}/checkout`,
          { photo: capturedImage },
          { headers }
        )
        alert('Đã Checkout thành công')
        setCheckoutId(null)
      }
      // CHECK IN
      else {
        if (!fullName || !idCard) {
          alert('Vui lòng nhập ít nhất Họ tên và Số CCCD')
          setIsUploading(false)
          return
        }

        const parts = []
        if (fullName) parts.push(`Họ tên: ${fullName}`)
        if (idCard) parts.push(`CCCD: ${idCard}`)
        if (dob) parts.push(`Ngày sinh: ${dob}`)
        if (reason) parts.push(`Lý do: ${reason}`)
        const finalNotes = parts.join(' - ')

        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/visitors/capture`,
          { photo: capturedImage, notes: finalNotes },
          { headers }
        )
        alert('Đã lưu thông tin khách thành công')
      }

      // Reset
      setCapturedImage(null)
      setFullName('')
      setIdCard('')
      setDob('')
      setReason('')
      loadPhotos()
      loadStats()

    } catch (error: any) {
      console.error('Action error:', error)
      alert(error.response?.data?.message || 'Lỗi khi xử lý')
    } finally {
      setIsUploading(false)
    }
  }

  // Load photos với filter
  const loadPhotos = async () => {
    setIsLoadingPhotos(true)
    try {
      const token = localStorage.getItem('token')

      let url = `${process.env.NEXT_PUBLIC_API_URL}/visitors/photos?limit=50`

      if (filterDate) {
        url += `&date=${filterDate}`
      }
      if (filterStartTime) {
        url += `&start_time=${filterStartTime}`
      }
      if (filterEndTime) {
        url += `&end_time=${filterEndTime}`
      }

      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setPhotos(response.data.data)
    } catch (error) {
      console.error('Load photos error:', error)
    } finally {
      setIsLoadingPhotos(false)
    }
  }

  // Auto reload khi filter thay đổi
  useEffect(() => {
    if (isAuthenticated) {
      loadPhotos()
      loadStats()
    }
  }, [isAuthenticated, filterDate, filterStartTime, filterEndTime])

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
      loadStats()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa ảnh')
    }
  }

  // Reset bộ lọc
  const resetFilters = () => {
    setFilterDate('')
    setFilterStartTime('')
    setFilterEndTime('')
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
      <div ref={topRef}></div>

      {/* === THỐNG KÊ === */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <div className="text-gray-500 text-sm font-semibold uppercase">Tổng khách hôm nay</div>
            <div className="text-3xl font-bold text-blue-600 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
            <div className="text-gray-500 text-sm font-semibold uppercase">Đang ở trong tòa nhà</div>
            <div className="text-3xl font-bold text-orange-600 mt-1">{stats.inside}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
            <div className="text-gray-500 text-sm font-semibold uppercase">Đã ra về</div>
            <div className="text-3xl font-bold text-green-600 mt-1">{stats.checked_out}</div>
        </div>
      </div>

      {/* === BỘ LỌC === */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl shadow-md p-4 mb-6 border border-cyan-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="font-bold text-gray-700">BỘ LỌC:</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-600">Ngày:</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-600">Từ giờ:</label>
            <input
              type="time"
              value={filterStartTime}
              onChange={(e) => setFilterStartTime(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-600">Đến giờ:</label>
            <input
              type="time"
              value={filterEndTime}
              onChange={(e) => setFilterEndTime(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500 bg-white"
            />
          </div>

          <button
            onClick={resetFilters}
            className="ml-auto px-4 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-semibold shadow-sm"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* === CAMERA & PHOTO LIST === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Camera */}
        <div className={`rounded-xl shadow-md p-6 border-2 transition-colors ${checkoutId ? 'bg-orange-50 border-orange-500' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-4">
             <h2 className={`text-xl font-bold ${checkoutId ? 'text-orange-700' : 'text-gray-800'}`}>
                {checkoutId ? `Đang Checkout (ID #${checkoutId})` : 'Chụp ảnh Check-in'}
             </h2>
             {checkoutId && (
                 <button onClick={cancelCheckout} className="text-sm text-red-600 hover:text-red-800 underline font-semibold">Hủy Checkout</button>
             )}
          </div>

          {/* Video/Preview */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4 shadow-inner" style={{ height: '360px' }}>
            {!isCameraOn && !capturedImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button onClick={startCamera} className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:from-cyan-700 hover:to-red-700 transition font-semibold shadow-lg">
                  Bật Camera
                </button>
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${!isCameraOn ? 'hidden' : ''}`} />
            {capturedImage && <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Nút điều khiển */}
          {isCameraOn && (
             <div className="flex gap-3 mb-4">
               <button onClick={capturePhoto} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold text-lg shadow">CHỤP</button>
               <button onClick={stopCamera} className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold">Tắt</button>
             </div>
          )}

          {/* Form nhập liệu */}
          {capturedImage && (
            <div className="space-y-4 animate-fadeIn">
              {!checkoutId && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                     <div className="md:col-span-2 text-sm font-bold text-gray-500 uppercase border-b pb-2 mb-2">Thông tin khách</div>
                     <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Họ và Tên *</label>
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-cyan-500 text-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Số CCCD *</label>
                      <input type="text" value={idCard} onChange={(e) => setIdCard(e.target.value)} placeholder="012345..." className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-cyan-500 text-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Ngày sinh</label>
                      <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-cyan-500 text-sm"/>
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Lý do vào</label>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Gặp ai? Mục đích gì?" rows={1} className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-cyan-500 text-sm"/>
                      </div>
                  </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={uploadPhoto} disabled={isUploading} className={`flex-1 px-6 py-3 text-white rounded-lg transition font-bold text-lg shadow-md disabled:opacity-50 ${checkoutId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gradient-to-r from-cyan-600 to-red-600 hover:from-cyan-700 hover:to-red-700'}`}>
                  {isUploading ? 'Đang xử lý...' : (checkoutId ? 'XÁC NHẬN CHECKOUT' : 'LƯU THÔNG TIN')}
                </button>
                <button onClick={retakePhoto} disabled={isUploading} className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold shadow disabled:opacity-50">Chụp lại</button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Photo List */}
        <div className="bg-white rounded-xl shadow-md p-6 h-fit">
           <div className="flex justify-between items-center mb-4 border-b pb-4">
            <h2 className="text-xl font-bold text-gray-800">Lịch sử khách</h2>
            <button onClick={loadPhotos} disabled={isLoadingPhotos} className="text-sm text-cyan-600 hover:text-cyan-800 font-semibold px-3 py-1 rounded hover:bg-cyan-50 transition">
                {isLoadingPhotos ? 'Đang tải...' : 'Tải lại'}
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {photos.length === 0 ? (
              <div className="text-center py-12 text-gray-400 italic"><p>Không có dữ liệu phù hợp</p></div>
            ) : (
              photos.map((photo) => {
                const isCheckedOut = Boolean(photo.is_checkout);
                return (
                  <div key={photo.id} className={`border rounded-lg p-3 flex gap-3 transition ${checkoutId === photo.id ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : isCheckedOut ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:border-cyan-300'}`}>
                    <div className="flex flex-col gap-2">
                        <div className="relative group">
                            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                <img src={photo.photo_path} alt="Check-in" className="w-full h-full object-cover" />
                            </div>
                            <span className="absolute bottom-0 left-0 w-full bg-black bg-opacity-60 text-white text-[10px] text-center py-0.5">CHECK IN</span>
                        </div>
                        {isCheckedOut && photo.checkout_photo_path && (
                            <div className="relative group animate-fadeIn">
                                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                    <img src={photo.checkout_photo_path} alt="Check-out" className="w-full h-full object-cover" />
                                </div>
                                <span className="absolute bottom-0 left-0 w-full bg-red-600 bg-opacity-80 text-white text-[10px] text-center py-0.5">CHECK OUT</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="text-sm text-gray-800 whitespace-pre-line break-words">
                          {photo.notes ? photo.notes.split(' - ').map((part, index) => {
                              if (part.includes('CHECKOUT')) {
                                  return <div key={index} className="mt-2 pt-1 border-t border-dashed border-gray-300 text-red-600 font-bold text-xs bg-red-50 p-1 rounded">{part}</div>
                              }
                              const [label, ...rest] = part.split(':');
                              return <div key={index} className="mb-0.5"><span className="font-bold text-cyan-700 text-xs uppercase mr-1">{label}:</span><span className="text-gray-900">{rest.join(':')}</span></div>;
                          }) : <span className="text-gray-400 italic text-xs">Không có ghi chú</span>}
                      </div>
                      <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-end">
                          <div className="text-xs text-gray-400 font-medium">Vào: {new Date(photo.captured_at).toLocaleString('vi-VN')}</div>
                          <div className="flex gap-2">
                              {user.role === 'admin' && <button onClick={() => deletePhoto(photo.id)} className="text-gray-400 hover:text-red-600 text-xs font-semibold px-2">Xóa</button>}
                              {!isCheckedOut ? (
                                  <button onClick={() => handleStartCheckout(photo)} disabled={!!checkoutId} className={`text-xs font-bold px-3 py-1.5 rounded transition shadow-sm ${checkoutId === photo.id ? 'bg-orange-200 text-orange-800 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                      {checkoutId === photo.id ? 'Đang chụp...' : 'Check Out'}
                                  </button>
                              ) : (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded border border-green-200">Đã checkout</span>
                              )}
                          </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
