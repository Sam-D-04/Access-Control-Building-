'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { permissionAPI, cardAPI, doorAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface Permission {
  id: number
  name: string
  description: string
  door_access_mode: 'all' | 'specific' | 'none'
  allowed_door_ids: number[] | null
  time_restrictions: {
    start_time: string
    end_time: string
    allowed_days: number[]
  } | null
  priority: number
  is_active: boolean
  created_at: string
}

interface Door {
  id: number
  name: string
  location: string
  access_level: string
}

interface Card {
  id: number
  card_uid: string
  user_name: string
}

const DAYS = [
  { value: 0, label: 'CN' },
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
]

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [doors, setDoors] = useState<Door[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [currentStep, setCurrentStep] = useState(1) // 1: Permission Info, 2: Assign Cards

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    door_access_mode: 'all' as 'all' | 'specific' | 'none',
    allowed_door_ids: [] as number[],
    priority: 50,
    is_active: true,
    has_time_restrictions: false,
    start_time: '08:00',
    end_time: '18:00',
    allowed_days: [1, 2, 3, 4, 5],
  })

  // Card selection for new permission
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([])

  // Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [permResponse, doorResponse, cardResponse] = await Promise.all([
        permissionAPI.getAll(),
        doorAPI.getAll(),
        cardAPI.getAll(),
      ])
      setPermissions(permResponse.data.data)
      setDoors(doorResponse.data.data)
      setCards(cardResponse.data.data)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (permission?: Permission) => {
    setCurrentStep(1)
    setSelectedCardIds([])
    
    if (permission) {
      setEditingPermission(permission)
      setFormData({
        name: permission.name,
        description: permission.description || '',
        door_access_mode: permission.door_access_mode,
        allowed_door_ids: permission.allowed_door_ids || [],
        priority: permission.priority,
        is_active: permission.is_active,
        has_time_restrictions: !!permission.time_restrictions,
        start_time: permission.time_restrictions?.start_time || '08:00',
        end_time: permission.time_restrictions?.end_time || '18:00',
        allowed_days: permission.time_restrictions?.allowed_days || [1, 2, 3, 4, 5],
      })
    } else {
      setEditingPermission(null)
      setFormData({
        name: '',
        description: '',
        door_access_mode: 'all',
        allowed_door_ids: [],
        priority: 50,
        is_active: true,
        has_time_restrictions: false,
        start_time: '08:00',
        end_time: '18:00',
        allowed_days: [1, 2, 3, 4, 5],
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingPermission(null)
    setCurrentStep(1)
    setSelectedCardIds([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const data: any = {
        name: formData.name,
        description: formData.description,
        door_access_mode: formData.door_access_mode,
        priority: formData.priority,
        is_active: formData.is_active,
      }

      // Allowed door ids
      if (formData.door_access_mode === 'specific') {
        data.allowed_door_ids = formData.allowed_door_ids
      } else {
        data.allowed_door_ids = null
      }

      // Time restrictions
      if (formData.has_time_restrictions) {
        data.time_restrictions = {
          start_time: formData.start_time,
          end_time: formData.end_time,
          allowed_days: formData.allowed_days,
        }
      } else {
        data.time_restrictions = null
      }

      let permissionId: number

      if (editingPermission) {
        await permissionAPI.update(editingPermission.id, data)
        toast.success('Cập nhật phân quyền thành công')
        fetchData()
        handleCloseModal()
      } else {
        // Tạo mới
        const response = await permissionAPI.create(data)
        permissionId = response.data.data.id
        toast.success('Tạo phân quyền thành công')
        
        // Chuyển sang bước 2: Gán cards
        setEditingPermission(response.data.data)
        setCurrentStep(2)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleAssignCards = async () => {
    if (!editingPermission || selectedCardIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 thẻ')
      return
    }

    try {
      // Gán permission cho các cards đã chọn
      await Promise.all(
        selectedCardIds.map(cardId =>
          permissionAPI.assignToCard(cardId, { permission_id: editingPermission.id })
        )
      )
      
      toast.success(`Đã gán phân quyền cho ${selectedCardIds.length} thẻ`)
      fetchData()
      handleCloseModal()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phân quyền này?')) return

    try {
      await permissionAPI.delete(id)
      toast.success('Xóa phân quyền thành công')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa phân quyền')
    }
  }

  const handleToggleDay = (day: number) => {
    if (formData.allowed_days.includes(day)) {
      setFormData({
        ...formData,
        allowed_days: formData.allowed_days.filter((d) => d !== day),
      })
    } else {
      setFormData({
        ...formData,
        allowed_days: [...formData.allowed_days, day].sort(),
      })
    }
  }

  const handleToggleDoor = (doorId: number) => {
    if (formData.allowed_door_ids.includes(doorId)) {
      setFormData({
        ...formData,
        allowed_door_ids: formData.allowed_door_ids.filter(id => id !== doorId),
      })
    } else {
      setFormData({
        ...formData,
        allowed_door_ids: [...formData.allowed_door_ids, doorId],
      })
    }
  }

  const handleToggleCard = (cardId: number) => {
    if (selectedCardIds.includes(cardId)) {
      setSelectedCardIds(selectedCardIds.filter(id => id !== cardId))
    } else {
      setSelectedCardIds([...selectedCardIds, cardId])
    }
  }

  // Filter
  const filteredPermissions = permissions.filter((perm) => {
    const matchSearch = perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === '' || 
      (filterStatus === 'active' && perm.is_active) ||
      (filterStatus === 'inactive' && !perm.is_active)
    return matchSearch && matchStatus
  })

  const getDoorModeLabel = (mode: string) => {
    switch (mode) {
      case 'all': return 'Tất cả cửa'
      case 'specific': return 'Cửa cụ thể'
      case 'none': return 'Không có'
      default: return mode
    }
  }

  const getDaysLabel = (days: number[]) => {
    if (!days || days.length === 0) return 'Không có'
    if (days.length === 7) return 'Cả tuần'
    return days.map(d => DAYS.find(day => day.value === d)?.label).join(', ')
  }

  return (
    <DashboardLayout title='Quản lý phân quyền'>
      <div className="p-6">
        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Tìm kiếm phân quyền..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Đã vô hiệu</option>
            </select>

            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:from-cyan-700 hover:to-red-700 transition font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Thêm phân quyền
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">Đang tải...</p>
            </div>
          ) : filteredPermissions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Không có dữ liệu</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tên phân quyền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Chế độ cửa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Giờ làm việc
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Độ ưu tiên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPermissions.map((permission) => (
                    <tr key={permission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                        <div className="text-sm text-gray-500">{permission.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getDoorModeLabel(permission.door_access_mode)}
                        </span>
                        {permission.door_access_mode === 'specific' && permission.allowed_door_ids && (
                          <div className="text-xs text-gray-500 mt-1">
                            Cửa: {permission.allowed_door_ids.join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {permission.time_restrictions ? (
                          <div className="text-sm text-gray-900">
                            <div>{permission.time_restrictions.start_time} - {permission.time_restrictions.end_time}</div>
                            <div className="text-gray-500 text-xs">{getDaysLabel(permission.time_restrictions.allowed_days)}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-green-600 font-semibold">24/7</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{permission.priority}</span>
                          <div className="text-xs text-gray-500">
                            {permission.priority >= 80 ? 'Cao' : permission.priority >= 50 ? 'Trung bình' : 'Thấp'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            permission.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {permission.is_active ? 'Hoạt động' : 'Vô hiệu'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleOpenModal(permission)}
                          className="text-cyan-600 hover:text-cyan-900 mr-3"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(permission.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create/Edit Permission */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header with Steps */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">
                  {editingPermission && currentStep === 1 ? 'Chỉnh sửa phân quyền' : currentStep === 1 ? 'Thêm phân quyền mới' : 'Gán thẻ cho phân quyền'}
                </h2>
                
                {!editingPermission && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-cyan-600' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-cyan-600 text-white' : 'bg-gray-200'}`}>
                        1
                      </div>
                      <span className="font-medium">Thông tin phân quyền</span>
                    </div>
                    <div className="flex-1 h-1 bg-gray-200">
                      <div className={`h-full ${currentStep >= 2 ? 'bg-cyan-600' : 'bg-gray-200'}`} style={{ width: currentStep >= 2 ? '100%' : '0%' }}></div>
                    </div>
                    <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-cyan-600' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-cyan-600 text-white' : 'bg-gray-200'}`}>
                        2
                      </div>
                      <span className="font-medium">Gán thẻ (tùy chọn)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 1: Permission Info */}
              {currentStep === 1 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên phân quyền <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      rows={2}
                    />
                  </div>

                  {/* Priority with explanation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Độ ưu tiên (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  
                  </div>

                  {/* Door Access Mode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chế độ truy cập cửa</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['all', 'specific', 'none'].map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setFormData({ ...formData, door_access_mode: mode as any, allowed_door_ids: [] })}
                          className={`px-4 py-3 rounded-lg border-2 transition ${
                            formData.door_access_mode === mode
                              ? 'border-cyan-600 bg-cyan-50 text-cyan-900 font-semibold'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {mode === 'all' ? 'Tất cả cửa' : mode === 'specific' ? 'Cửa cụ thể' : 'Không có'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Door Selection Grid */}
                  {formData.door_access_mode === 'specific' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chọn cửa được phép (đã chọn: {formData.allowed_door_ids.length})
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-3 border border-gray-300 rounded-lg">
                        {doors.map(door => (
                          <label
                            key={door.id}
                            className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${
                              formData.allowed_door_ids.includes(door.id)
                                ? 'bg-cyan-50 border-cyan-600'
                                : 'bg-white border-gray-300 hover:border-cyan-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.allowed_door_ids.includes(door.id)}
                              onChange={() => handleToggleDoor(door.id)}
                              className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{door.name}</div>
                              <div className="text-xs text-gray-500 truncate">{door.location}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Time Restrictions */}
                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={formData.has_time_restrictions}
                        onChange={(e) => setFormData({ ...formData, has_time_restrictions: e.target.checked })}
                        className="rounded text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Giới hạn thời gian</span>
                    </label>

                    {formData.has_time_restrictions && (
                      <div className="space-y-3 ml-6 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Giờ bắt đầu</label>
                            <input
                              type="time"
                              value={formData.start_time}
                              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Giờ kết thúc</label>
                            <input
                              type="time"
                              value={formData.end_time}
                              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Ngày trong tuần</label>
                          <div className="flex gap-2 flex-wrap">
                            {DAYS.map((day) => (
                              <button
                                key={day.value}
                                type="button"
                                onClick={() => handleToggleDay(day.value)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                                  formData.allowed_days.includes(day.value)
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {day.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Is Active */}
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Kích hoạt</span>
                    </label>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:from-cyan-700 hover:to-cyan-800 transition"
                    >
                      {editingPermission ? 'Cập nhật' : 'Tiếp theo'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Assign Cards */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800">
                      Phân quyền "<strong>{editingPermission?.name}</strong>" đã được tạo thành công
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Bạn có thể gán phân quyền này cho các thẻ bên dưới (hoặc bỏ qua và hoàn thành)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chọn thẻ cần gán (đã chọn: {selectedCardIds.length})
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto p-3 border border-gray-300 rounded-lg">
                      {cards.map(card => (
                        <label
                          key={card.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                            selectedCardIds.includes(card.id)
                              ? 'bg-green-50 border-green-600'
                              : 'bg-white border-gray-300 hover:border-green-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCardIds.includes(card.id)}
                            onChange={() => handleToggleCard(card.id)}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 font-mono">{card.card_uid}</div>
                            <div className="text-xs text-gray-500">{card.user_name || 'Chưa gán nhân viên'}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleAssignCards}
                      disabled={selectedCardIds.length === 0}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Gán cho {selectedCardIds.length} thẻ
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Bỏ qua và hoàn thành
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
