'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import { doorAPI, departmentAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface Door {
  id: number
  name: string
  location: string
  department_id: number | null
  department_name?: string
  is_locked: boolean
  is_active: boolean
}

interface Department {
  id: number
  name: string
  description: string
}

export default function DoorsPage() {
  const [doors, setDoors] = useState<Door[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDoor, setEditingDoor] = useState<Door | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    department_id: '',
    is_locked: false,
    is_active: true,
  })

  // Filters
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingDoor, setDeletingDoor] = useState<Door | null>(null)

  useEffect(() => {
    fetchDoors()
    fetchDepartments()
  }, [])

  const fetchDoors = async () => {
    try {
      setLoading(true)
      const response = await doorAPI.getAll()
      setDoors(response.data.data)
    } catch (error) {
      console.error('Error fetching doors:', error)
      toast.error('Không thể tải danh sách cửa')
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await departmentAPI.getAll()
      setDepartments(response.data.data)
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleOpenModal = (door?: Door) => {
    if (door) {
      setEditingDoor(door)
      setFormData({
        name: door.name,
        location: door.location,
        department_id: door.department_id?.toString() || '',
        is_locked: door.is_locked,
        is_active: door.is_active,
      })
    } else {
      setEditingDoor(null)
      setFormData({
        name: '',
        location: '',
        department_id: '',
        is_locked: false,
        is_active: true,
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingDoor(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        department_id: formData.department_id ? parseInt(formData.department_id) : null,
      }

      if (editingDoor) {
        await doorAPI.update(editingDoor.id, data)
        toast.success('Cập nhật cửa thành công')
      } else {
        await doorAPI.create(data)
        toast.success('Tạo cửa mới thành công')
      }

      fetchDoors()
      handleCloseModal()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleToggleLock = async (door: Door) => {
    try {
      if (door.is_locked) {
        await doorAPI.unlock(door.id)
        toast.success('Đã mở khóa cửa')
      } else {
        await doorAPI.lock(door.id)
        toast.success('Đã khóa cửa')
      }
      fetchDoors()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleOpenDeleteDialog = (door: Door) => {
    setDeletingDoor(door)
    setShowDeleteDialog(true)
  }

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false)
    setDeletingDoor(null)
  }

  const handleDelete = async () => {
    if (!deletingDoor) return

    try {
      await doorAPI.delete(deletingDoor.id)
      toast.success('Xóa cửa thành công')
      fetchDoors()
      handleCloseDeleteDialog()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa cửa')
    }
  }

  // Filtered doors
  const filteredDoors = doors.filter((door) => {
    const matchDepartment = !filterDepartment || door.department_id?.toString() === filterDepartment
    const matchStatus = !filterStatus || (filterStatus === 'locked' ? door.is_locked : !door.is_locked)
    const matchSearch = !searchTerm ||
      door.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      door.location.toLowerCase().includes(searchTerm.toLowerCase())

    return matchDepartment && matchStatus && matchSearch
  })

  // Paginated doors
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentDoors = filteredDoors.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredDoors.length / itemsPerPage)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  return (
    <DashboardLayout title="Quản lý cửa ra vào">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Tìm kiếm tên cửa, vị trí..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
            >
              <option value="">Tất cả phòng ban</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lock Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="unlocked">Mở (Unlocked)</option>
              <option value="locked">Khóa (Locked)</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:from-cyan-700 hover:to-red-700 transition font-semibold"
          >
            + Thêm cửa mới
          </button>
        </div>
      </div>

      {/* Doors Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Tên cửa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Vị trí
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Phòng ban
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentDoors.map((door) => (
                  <tr key={door.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                        <span className="font-semibold text-gray-800">{door.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{door.location}</span>
                    </td>
                    <td className="px-6 py-4">
                      {door.department_name ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {door.department_name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Chưa gán</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        door.is_locked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {door.is_locked ? 'Lock' : 'Open'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleLock(door)}
                          className={`p-2 rounded-lg transition ${
                            door.is_locked
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={door.is_locked ? 'Mở khóa' : 'Khóa cửa'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {door.is_locked ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            )}
                          </svg>
                        </button>
                        <button
                          onClick={() => handleOpenModal(door)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Sửa"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleOpenDeleteDialog(door)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Xóa"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredDoors.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Không tìm thấy cửa nào
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Hiển thị {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredDoors.length)} của {filteredDoors.length}
                </div>
                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-4 py-2 rounded-lg transition ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-cyan-600 to-red-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">
                {editingDoor ? 'Sửa cửa' : 'Thêm cửa mới'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Tên cửa *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Cửa Sảnh Chính"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Vị trí *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Tầng 1 - Sảnh chính"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Phòng ban</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Không gán phòng ban --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Cửa này sẽ thuộc về phòng ban được chọn (không bắt buộc)
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Locked Status */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_locked}
                        onChange={(e) => setFormData({ ...formData, is_locked: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-semibold">Khóa cửa (Emergency)</span>
                    </label>
                  </div>

                  {/* Active Status */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-semibold">Kích hoạt cửa</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:from-cyan-700 hover:to-red-700 transition font-semibold"
                >
                  {editingDoor ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        message="Bạn có chắc chắn muốn xóa cửa"
        itemName={deletingDoor?.name}
        additionalNote="Hành động này không thể hoàn tác."
      />
    </DashboardLayout>
  )
}
