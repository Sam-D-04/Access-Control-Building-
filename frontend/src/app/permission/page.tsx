'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { permissionAPI, cardAPI } from '@/lib/api'
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

interface TimeRestriction {
  start_time: string
  end_time: string
  allowed_days: number[]
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
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [selectedPermissionId, setSelectedPermissionId] = useState<number | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    door_access_mode: 'all' as 'all' | 'specific' | 'none',
    allowed_door_ids: '',
    priority: 50,
    is_active: true,
    has_time_restrictions: false,
    start_time: '08:00',
    end_time: '18:00',
    allowed_days: [1, 2, 3, 4, 5],
  })

  // Card assignment
  const [cards, setCards] = useState<any[]>([])
  const [selectedCardId, setSelectedCardId] = useState('')
  const [assignmentData, setAssignmentData] = useState({
    override_doors: false,
    custom_door_ids: '',
    override_time: false,
    custom_start_time: '08:00',
    custom_end_time: '18:00',
    custom_allowed_days: [1, 2, 3, 4, 5],
    additional_door_ids: '',
    valid_from: '',
    valid_until: '',
  })

  // Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    fetchPermissions()
    fetchCards()
  }, [])

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const response = await permissionAPI.getAll()
      setPermissions(response.data.data)
    } catch (error) {
      console.error('Error fetching permissions:', error)
      toast.error('Không thể tải danh sách phân quyền')
    } finally {
      setLoading(false)
    }
  }

  const fetchCards = async () => {
    try {
      const response = await cardAPI.getAll()
      setCards(response.data.data)
    } catch (error) {
      console.error('Error fetching cards:', error)
    }
  }

  const handleOpenModal = (permission?: Permission) => {
    if (permission) {
      setEditingPermission(permission)
      setFormData({
        name: permission.name,
        description: permission.description || '',
        door_access_mode: permission.door_access_mode,
        allowed_door_ids: permission.allowed_door_ids?.join(',') || '',
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
        allowed_door_ids: '',
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

      // Parse allowed_door_ids
      if (formData.door_access_mode === 'specific' && formData.allowed_door_ids) {
        data.allowed_door_ids = formData.allowed_door_ids.split(',').map((id) => parseInt(id.trim())).filter((id) => !isNaN(id))
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

      if (editingPermission) {
        await permissionAPI.update(editingPermission.id, data)
        toast.success('Cập nhật phân quyền thành công')
      } else {
        await permissionAPI.create(data)
        toast.success('Tạo phân quyền thành công')
      }

      fetchPermissions()
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
      fetchPermissions()
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

  const handleOpenAssignModal = (permissionId: number) => {
    setSelectedPermissionId(permissionId)
    setSelectedCardId('')
    setAssignmentData({
      override_doors: false,
      custom_door_ids: '',
      override_time: false,
      custom_start_time: '08:00',
      custom_end_time: '18:00',
      custom_allowed_days: [1, 2, 3, 4, 5],
      additional_door_ids: '',
      valid_from: '',
      valid_until: '',
    })
    setShowAssignModal(true)
  }

  const handleAssignToCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCardId || !selectedPermissionId) return

    try {
      const data: any = {
        permission_id: selectedPermissionId,
        override_doors: assignmentData.override_doors,
        override_time: assignmentData.override_time,
      }

      if (assignmentData.override_doors && assignmentData.custom_door_ids) {
        data.custom_door_ids = assignmentData.custom_door_ids
          .split(',')
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id))
      }

      if (assignmentData.override_time) {
        data.custom_time_restrictions = {
          start_time: assignmentData.custom_start_time,
          end_time: assignmentData.custom_end_time,
          allowed_days: assignmentData.custom_allowed_days,
        }
      }

      if (assignmentData.additional_door_ids) {
        data.additional_door_ids = assignmentData.additional_door_ids
          .split(',')
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id))
      }

      if (assignmentData.valid_from) {
        data.valid_from = new Date(assignmentData.valid_from).toISOString()
      }

      if (assignmentData.valid_until) {
        data.valid_until = new Date(assignmentData.valid_until).toISOString()
      }

      await permissionAPI.assignToCard(parseInt(selectedCardId), data)
      toast.success('Gán phân quyền cho thẻ thành công')
      setShowAssignModal(false)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
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
    <DashboardLayout title="Phân quyền">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Quản lý Phân quyền</h1>
          <p className="text-gray-600">Quản lý các mẫu phân quyền và gán cho thẻ</p>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Tìm kiếm phân quyền..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Đã vô hiệu</option>
            </select>

            {/* Add Button */}
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:from-cyan-700 hover:to-cyan-800 transition flex items-center gap-2"
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên phân quyền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chế độ cửa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Giờ làm việc
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ưu tiên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      </td>
                      <td className="px-6 py-4">
                        {permission.time_restrictions ? (
                          <div className="text-sm text-gray-900">
                            <div>{permission.time_restrictions.start_time} - {permission.time_restrictions.end_time}</div>
                            <div className="text-gray-500">{getDaysLabel(permission.time_restrictions.allowed_days)}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">24/7</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{permission.priority}</span>
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
                          onClick={() => handleOpenAssignModal(permission.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Gán cho thẻ"
                        >
                          <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingPermission ? 'Chỉnh sửa phân quyền' : 'Thêm phân quyền mới'}
              </h2>

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
                    placeholder="VD: Office Hours Access"
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
                    placeholder="Mô tả chi tiết"
                  />
                </div>

                {/* Door Access Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chế độ truy cập cửa</label>
                  <select
                    value={formData.door_access_mode}
                    onChange={(e) => setFormData({ ...formData, door_access_mode: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="all">Tất cả cửa</option>
                    <option value="specific">Cửa cụ thể</option>
                    <option value="none">Không có cửa nào</option>
                  </select>
                </div>

                {/* Allowed Door IDs */}
                {formData.door_access_mode === 'specific' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Danh sách ID cửa (cách nhau bởi dấu phẩy)
                    </label>
                    <input
                      type="text"
                      value={formData.allowed_door_ids}
                      onChange={(e) => setFormData({ ...formData, allowed_door_ids: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="VD: 1,2,3"
                    />
                  </div>
                )}

                {/* Priority */}
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
                  <p className="text-xs text-gray-500 mt-1">Số càng cao = ưu tiên càng cao</p>
                </div>

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
                    {editingPermission ? 'Cập nhật' : 'Tạo mới'}
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
            </div>
          </div>
        </div>
      )}

      {/* Modal: Assign to Card */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Gán phân quyền cho thẻ</h2>

              <form onSubmit={handleAssignToCard} className="space-y-4">
                {/* Select Card */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chọn thẻ <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedCardId}
                    onChange={(e) => setSelectedCardId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">-- Chọn thẻ --</option>
                    {cards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.card_uid} - {card.user_name || 'Chưa gán'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Additional Doors */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thêm cửa bổ sung (ID, cách nhau bởi dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={assignmentData.additional_door_ids}
                    onChange={(e) => setAssignmentData({ ...assignmentData, additional_door_ids: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="VD: 7,8,9"
                  />
                </div>

                {/* Valid From/Until */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hiệu lực từ</label>
                    <input
                      type="datetime-local"
                      value={assignmentData.valid_from}
                      onChange={(e) => setAssignmentData({ ...assignmentData, valid_from: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hiệu lực đến</label>
                    <input
                      type="datetime-local"
                      value={assignmentData.valid_until}
                      onChange={(e) => setAssignmentData({ ...assignmentData, valid_until: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition"
                  >
                    Gán phân quyền
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
