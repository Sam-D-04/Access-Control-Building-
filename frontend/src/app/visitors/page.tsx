'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuthStore } from '@/store/authStore'
import axios from 'axios'

// --- INTERFACES ---
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
}

export default function VisitorCameraPage() {
  const router = useRouter()
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  // --- STATES ---
  const [checkoutId, setCheckoutId] = useState<number | null>(null) 
  const topRef = useRef<HTMLDivElement>(null)
  
  const [stats, setStats] = useState<VisitorStats>({ total: 0, checked_out: 0, inside: 0 })

  // --- FILTER STATES (CẬP NHẬT GIỐNG LOGS PAGE) ---
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('') // Thêm tìm kiếm text

  // Camera states
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  
  // Form Data States
  const [fullName, setFullName] = useState('')
  const [idCard, setIdCard] = useState('')
  const [dob, setDob] = useState('')
  const [reason, setReason] = useState('')
  
  const [isUploading, setIsUploading] = useState(false)

  // Photo list states
  const [photos, setPhotos] = useState<VisitorPhoto[]>([])
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)

  // --- AUTH CHECK ---
  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false))
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
    if (!isLoading && user && user.role !== 'admin' && user.role !== 'security') {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, user, router])


  // --- CAMERA FUNCTIONS ---
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

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setIsCameraOn(false)
    }
  }

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

  // --- ACTION HANDLERS ---
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

  const cancelCheckout = () => {
    setCheckoutId(null)
    setCapturedImage(null)
    setFullName('')
    setIdCard('')
    setDob('')
    setReason('')
    stopCamera()
  }

  const handleStartCheckout = (photo: VisitorPhoto) => {
    setCheckoutId(photo.id)
    topRef.current?.scrollIntoView({ behavior: 'smooth' }) 
    startCamera() 
  }

  // --- API CALLS ---
  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/visitors/stats`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      setStats(response.data.data)
    } catch (error) {
      console.error('Load stats error:', error)
    }
  }

  // Cập nhật loadPhotos để gửi search và date
  const loadPhotos = async () => {
    setIsLoadingPhotos(true)
    try {
      const token = localStorage.getItem('token')
      
      const params = new URLSearchParams()
      params.append('limit', '20')
      if (filterStartDate) params.append('startDate', filterStartDate)
      if (filterEndDate) params.append('endDate', filterEndDate)
      if (searchTerm) params.append('search', searchTerm)

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/visitors/photos?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      setPhotos(response.data.data)
    } catch (error) {
      console.error('Load photos error:', error)
    } finally {
      setIsLoadingPhotos(false)
    }
  }

  // Tự động load lại khi filter thay đổi (Debounce search text có thể thêm nếu muốn tối ưu)
  useEffect(() => {
      if (isAuthenticated) {
          const timeoutId = setTimeout(() => {
              loadPhotos()
          }, 500) // Delay 500ms để tránh gọi API liên tục khi gõ phím
          return () => clearTimeout(timeoutId)
      }
  }, [filterStartDate, filterEndDate, searchTerm])

  const clearFilter = () => {
      setFilterStartDate('')
      setFilterEndDate('')
      setSearchTerm('')
  }

  const uploadPhoto = async () => {
    if (!capturedImage) return

    setIsUploading(true)

    try {
      const token = localStorage.getItem('token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      if (checkoutId) {
         await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/visitors/photos/${checkoutId}/checkout`,
          { photo: capturedImage }, 
          { headers }
        )
        alert('Đã Checkout thành công!')
        setCheckoutId(null) 
      } 
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

  const deletePhoto = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa bản ghi này?')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/visitors/photos/${id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      alert('Đã xóa bản ghi')
      loadPhotos()
      loadStats()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa')
    }
  }

  // --- INITIAL LOAD ---
  useEffect(() => {
    if (isAuthenticated) {
      loadStats()
      // loadPhotos đã được gọi trong useEffect của filter
    }
  }, [isAuthenticated])

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

      {/* Neo để cuộn trang */}
      <div ref={topRef}></div> 
      
      {/* 1. KHU VỰC THỐNG KÊ */}
      <div className="grid grid-cols-3 gap-4 mb-4">
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

      {/* 2. KHU VỰC BỘ LỌC (GIAO DIỆN GIỐNG LOGS PAGE) */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        
        {/* Dòng 1: Tìm kiếm */}
        <div className="mb-4">
            <label className="block text-xs font-bold text-gray-700 mb-1">Tìm kiếm</label>
            <input
              type="text"
              placeholder="Nhập tên, số CCCD hoặc ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
            />
        </div>

        {/* Dòng 2: Thời gian */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Từ ngày giờ</label>
              <input
                type="datetime-local"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 flex justify-between">
                  <span>Đến ngày giờ</span>
                  {(filterStartDate || filterEndDate || searchTerm) && (
                      <button onClick={clearFilter} className="text-red-500 hover:text-red-700 font-normal">
                          Xóa bộ lọc
                      </button>
                  )}
              </label>
              <input
                type="datetime-local"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
              />
            </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center text-xs text-gray-500 italic">
           <span>Đang hiển thị {photos.length} kết quả phù hợp</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ================= LEFT: CAMERA & FORM ================= */}
        <div className={`rounded-xl shadow-md p-6 border-2 transition-colors duration-300 ${
            checkoutId ? 'bg-orange-50 border-orange-500' : 'bg-white border-transparent'
        }`}>
          
          <div className="flex justify-between items-center mb-4">
             <h2 className={`text-xl font-bold ${checkoutId ? 'text-orange-700' : 'text-gray-800'}`}>
                {checkoutId ? ` Đang Checkout (ID #${checkoutId})` : 'Chụp ảnh Check-in'}
             </h2>
             
             {checkoutId && (
                 <button onClick={cancelCheckout} className="text-sm text-red-600 hover:text-red-800 underline font-semibold">
                    Hủy Checkout
                 </button>
             )}
          </div>

          {/* Camera View */}
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

          {isCameraOn && (
             <div className="flex gap-3 mb-4">
               <button onClick={capturePhoto} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold text-lg shadow">CHỤP</button>
               <button onClick={stopCamera} className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold">Tắt</button>
             </div>
          )}

          {capturedImage && (
            <div className="space-y-4 animate-fadeIn">
              {!checkoutId && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                     <div className="md:col-span-2 text-sm font-bold text-gray-500 uppercase border-b pb-2 mb-2">Thông tin khách</div>
                     <div><label className="block text-xs font-bold text-gray-700 mb-1">Họ và Tên *</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-cyan-500 text-sm"/></div>
                     <div><label className="block text-xs font-bold text-gray-700 mb-1">Số CCCD *</label><input type="text" value={idCard} onChange={(e) => setIdCard(e.target.value)} placeholder="012345..." className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-cyan-500 text-sm"/></div>
                     <div><label className="block text-xs font-bold text-gray-700 mb-1">Ngày sinh</label><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-cyan-500 text-sm"/></div>
                     <div><label className="block text-xs font-bold text-gray-700 mb-1">Lý do vào / Ghi chú</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Gặp ai? Mục đích gì?" rows={1} className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-cyan-500 text-sm"/></div>
                  </div>
              )}

              {checkoutId && (
                  <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm font-semibold text-center shadow-sm">
                      Hệ thống sẽ lưu ảnh này làm ảnh Checkout và cập nhật thời gian ra về.
                  </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={uploadPhoto} disabled={isUploading} className={`flex-1 px-6 py-3 text-white rounded-lg transition font-bold text-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${checkoutId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gradient-to-r from-cyan-600 to-red-600 hover:from-cyan-700 hover:to-red-700'}`}>
                  {isUploading ? 'Đang xử lý...' : (checkoutId ? 'XÁC NHẬN CHECKOUT' : 'LƯU THÔNG TIN')}
                </button>
                <button onClick={retakePhoto} disabled={isUploading} className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold shadow disabled:opacity-50">Chụp lại</button>
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT: PHOTO LIST ================= */}
        <div className="bg-white rounded-xl shadow-md p-6 h-fit">
           <div className="flex justify-between items-center mb-4 border-b pb-4">
            <h2 className="text-xl font-bold text-gray-800">Lịch sử khách</h2>
            <button onClick={loadPhotos} disabled={isLoadingPhotos} className="text-sm text-cyan-600 hover:text-cyan-800 font-semibold px-3 py-1 rounded hover:bg-cyan-50 transition">{isLoadingPhotos ? 'Đang tải...' : '🔄 Tải lại'}</button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {photos.length === 0 ? (
              <div className="text-center py-12 text-gray-400 italic"><p>Không tìm thấy bản ghi phù hợp</p></div>
            ) : (
              photos.map((photo) => {
                const isCheckedOut = Boolean(photo.is_checkout);

                return (
                  <div key={photo.id} className={`border rounded-lg p-3 flex gap-3 transition-all duration-200 ${checkoutId === photo.id ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : isCheckedOut ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:border-cyan-300'}`}>
                    <div className="flex flex-col gap-2">
                        <div className="relative group">
                            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200"><img src={photo.photo_path} alt="Check-in" className="w-full h-full object-cover" /></div>
                            <span className="absolute bottom-0 left-0 w-full bg-black bg-opacity-60 text-white text-[10px] text-center py-0.5">📥 CHECK IN</span>
                        </div>
                        {isCheckedOut && photo.checkout_photo_path && (
                            <div className="relative group animate-fadeIn">
                                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200"><img src={photo.checkout_photo_path} alt="Check-out" className="w-full h-full object-cover" /></div>
                                <span className="absolute bottom-0 left-0 w-full bg-red-600 bg-opacity-80 text-white text-[10px] text-center py-0.5">📤 CHECK OUT</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="text-sm text-gray-800 whitespace-pre-line break-words">
                          {photo.notes ? (
                              photo.notes.split(' - ').map((part, index) => {
                                  if (part.includes('CHECKOUT')) return null;
                                  const [label, ...rest] = part.split(':');
                                  return (
                                    <div key={index} className="mb-0.5">
                                      <span className="font-bold text-cyan-700 text-xs uppercase mr-1">{label}:</span><span className="text-gray-900">{rest.join(':')}</span>
                                    </div>
                                  );
                              })
                          ) : <span className="text-gray-400 italic text-xs">Không có ghi chú</span>}
                      </div>
                      
                      <div className="pt-2 mt-2 border-t border-gray-100 text-xs">
                          <div className="flex items-center gap-1 mb-1">
                              <span className="text-green-600 font-bold"> Vào:</span><span className="text-gray-600">{new Date(photo.captured_at).toLocaleString('vi-VN')}</span>
                          </div>
                          {photo.time_out ? (
                              <div className="flex items-center gap-1 mb-2"><span className="text-red-600 font-bold">⬆ Ra:</span><span className="text-gray-600">{new Date(photo.time_out).toLocaleString('vi-VN')}</span></div>
                          ) : (
                              <div className="text-orange-500 italic font-semibold mb-2">Đang ở trong tòa nhà</div>
                          )}

                          <div className="flex justify-between items-center mt-2">
                              {user.role === 'admin' && (
                                  <button onClick={() => deletePhoto(photo.id)} className="text-gray-400 hover:text-red-600 font-semibold underline">Xóa</button>
                              )}
                              
                              {!isCheckedOut ? (
                                  <button onClick={() => handleStartCheckout(photo)} disabled={!!checkoutId} className={`font-bold px-3 py-1.5 rounded transition shadow-sm ml-auto ${checkoutId === photo.id ? 'bg-orange-200 text-orange-800 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                      {checkoutId === photo.id ? 'Đang chụp...' : 'Check Out ➜'}
                                  </button>
                              ) : (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 font-bold rounded border border-green-200 ml-auto">Hoàn tất</span>
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