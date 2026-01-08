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

  const [checkoutId, setCheckoutId] = useState<number | null>(null) // Lưu ID của người đang checkout
  const topRef = useRef<HTMLDivElement>(null) // Để cuộn trang lên camera
  
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
    if (!checkoutId) {
        setFullName('')
        setIdCard('')
        setDob('')
        setReason('')
    }
    startCamera()
  }
  //hủy checkout 
const cancelCheckout = () => {
    setCheckoutId(null)
    setCapturedImage(null)
    setFullName('')
    setIdCard('')
    setDob('')
    setReason('')
    stopCamera()
  }

// --- HÀM XỬ LÝ CHECKOUT ---
  const handleStartCheckout = (photo: VisitorPhoto) => {
    setCheckoutId(photo.id)
    
    topRef.current?.scrollIntoView({ behavior: 'smooth' })

    startCamera()
  }



  // Upload ảnh & Gộp dữ liệu
 const uploadPhoto = async () => {
    if (!capturedImage) return

    setIsUploading(true)

    try {
      const token = localStorage.getItem('token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      // TRƯỜNG HỢP 1: CHECKOUT
      if (checkoutId) {
         await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/visitors/photos/${checkoutId}/checkout`,
          { photo: capturedImage }, // Chỉ cần gửi ảnh mới
          { headers }
        )
        alert('Đã Checkout thành công')
        setCheckoutId(null) // Thoát chế độ checkout
      } 
      // TRƯỜNG HỢP 2: CHECK IN 
      else {
        // Validate
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

      // Reset chung
      setCapturedImage(null)
      setFullName('')
      setIdCard('')
      setDob('')
      setReason('')
      loadPhotos() 

    } catch (error: any) {
      console.error('Action error:', error)
      alert(error.response?.data?.message || 'Lỗi khi xử lý')
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

      <div ref={topRef}></div> 

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ================= LEFT: CAMERA & FORM ================= */}
        <div className={`rounded-xl shadow-md p-6 border-2 transition-colors duration-300 ${
            checkoutId ? 'bg-orange-50 border-orange-500' : 'bg-white border-transparent'
        }`}>
          
          {/* Header của Camera Box */}
          <div className="flex justify-between items-center mb-4">
             <h2 className={`text-xl font-bold ${checkoutId ? 'text-orange-700' : 'text-gray-800'}`}>
                {checkoutId ? `Đang Checkout (ID #${checkoutId})` : 'Chụp ảnh Check-in'}
             </h2>
             
             {/* Nút Hủy Checkout */}
             {checkoutId && (
                 <button 
                    onClick={cancelCheckout} 
                    className="text-sm text-red-600 hover:text-red-800 underline font-semibold"
                 >
                    Hủy Checkout
                 </button>
             )}
          </div>

          {/* Khung Camera/Preview (Giữ nguyên logic cũ) */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4 shadow-inner" style={{ height: '360px' }}>
            {!isCameraOn && !capturedImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={startCamera}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:from-cyan-700 hover:to-red-700 transition font-semibold shadow-lg"
                >
                  Bật Camera
                </button>
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${!isCameraOn ? 'hidden' : ''}`} />
            {capturedImage && <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Nút điều khiển Camera (Chụp/Tắt) */}
          {isCameraOn && (
             <div className="flex gap-3 mb-4">
               <button 
                  onClick={capturePhoto} 
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold text-lg shadow"
                >
                CHỤP
               </button>
               <button 
                  onClick={stopCamera} 
                  className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
                >
                  Tắt
                </button>
             </div>
          )}

          {/* Form nhập liệu & Hành động sau khi chụp */}
          {capturedImage && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* TRƯỜNG HỢP 1: CHECK IN MỚI (Hiện form nhập liệu) */}
              {!checkoutId && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                     <div className="md:col-span-2 text-sm font-bold text-gray-500 uppercase border-b pb-2 mb-2">
                        Thông tin khách
                     </div>
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
                        <label className="block text-xs font-bold text-gray-700 mb-1">Lý do vào / Ghi chú</label>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Gặp ai? Mục đích gì?" rows={1} className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-cyan-500 text-sm"/>
                      </div>
                  </div>
              )}

              {/* TRƯỜNG HỢP 2: ĐANG CHECKOUT (Chỉ hiện thông báo) */}
              {checkoutId && (
                  <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm font-semibold text-center shadow-sm">
                      Hệ thống sẽ lưu ảnh này làm ảnh Checkout và cập nhật thời gian ra về.
                  </div>
              )}

              {/* Nút Xác nhận Lưu */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={uploadPhoto}
                  disabled={isUploading}
                  className={`flex-1 px-6 py-3 text-white rounded-lg transition font-bold text-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                      checkoutId 
                        ? 'bg-orange-600 hover:bg-orange-700' // Màu cam cho Checkout
                        : 'bg-gradient-to-r from-cyan-600 to-red-600 hover:from-cyan-700 hover:to-red-700' // Màu gradient cho Check-in
                  }`}
                >
                  {isUploading ? 'Đang xử lý...' : (checkoutId ? '✅ XÁC NHẬN CHECKOUT' : '💾 LƯU THÔNG TIN')}
                </button>
                
                <button 
                    onClick={retakePhoto} 
                    disabled={isUploading} 
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold shadow disabled:opacity-50"
                >
                  Chụp lại
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT: PHOTO LIST ================= */}
        <div className="bg-white rounded-xl shadow-md p-6 h-fit">
           <div className="flex justify-between items-center mb-4 border-b pb-4">
            <h2 className="text-xl font-bold text-gray-800">Lịch sử khách</h2>
            <button 
                onClick={loadPhotos} 
                disabled={isLoadingPhotos} 
                className="text-sm text-cyan-600 hover:text-cyan-800 font-semibold px-3 py-1 rounded hover:bg-cyan-50 transition"
            >
                {isLoadingPhotos ? 'Đang tải...' : 'Tải lại'}
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {photos.length === 0 ? (
              <div className="text-center py-12 text-gray-400 italic">
                <p>Chưa có dữ liệu nào trong ngày</p>
              </div>
            ) : (
              photos.map((photo) => (
                <div 
                    key={photo.id} 
                    className={`border rounded-lg p-3 flex gap-3 transition-all duration-200 ${
                        checkoutId === photo.id 
                            ? 'border-orange-500 bg-orange-50 shadow-md ring-2 ring-orange-200' 
                            : 'border-gray-200 hover:border-cyan-300 hover:shadow-sm'
                    }`}
                >
                  {/* Ảnh nhỏ */}
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      <img src={photo.photo_path} alt="Visitor" className="w-full h-full object-cover" />
                  </div>
                  
                  {/* Thông tin chi tiết */}
                  <div className="flex-1 flex flex-col justify-between">
                    {/* Nội dung text */}
                    <div className="text-sm text-gray-800 whitespace-pre-line break-words">
                        {photo.notes ? (
                            photo.notes.split(' - ').map((part, index) => {
                                const [label, ...rest] = part.split(':');
                                const content = rest.join(':');
                                return (
                                  <div key={index} className="mb-0.5">
                                    <span className="font-bold text-cyan-700 text-xs uppercase mr-1">
                                        {label}:
                                    </span>
                                    <span className="text-gray-900">{content}</span>
                                  </div>
                                );
                            })
                        ) : ( 
                            <span className="text-gray-400 italic text-xs">Không có ghi chú</span> 
                        )}
                    </div>
                    
                    {/* Footer của item: Ngày giờ & Nút bấm */}
                    <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-end">
                        <div className="text-xs text-gray-400 font-medium">
                          {new Date(photo.captured_at).toLocaleString('vi-VN')}
                        </div>

                        <div className="flex gap-3">
                            {/* Nút Xóa (Chỉ admin) */}
                            {user.role === 'admin' && (
                                <button 
                                    onClick={() => deletePhoto(photo.id)} 
                                    className="text-gray-400 hover:text-red-600 text-xs font-semibold transition"
                                    title="Xóa bản ghi này"
                                >
                                    Xóa
                                </button>
                            )}
                            
                            {/* Nút Check Out */}
                            <button 
                                onClick={() => handleStartCheckout(photo)}
                                disabled={!!checkoutId} // Disable nếu đang checkout người khác
                                className={`text-xs font-bold px-2 py-1 rounded transition ${
                                    checkoutId === photo.id 
                                        ? 'bg-orange-200 text-orange-800 cursor-default'
                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800'
                                }`}
                            >
                                {checkoutId === photo.id ? 'Đang chọn...' : 'Check Out ➜'}
                            </button>
                        </div>
                    </div>
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