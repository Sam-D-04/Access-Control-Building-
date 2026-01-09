'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import toast from 'react-hot-toast'
import { cardAPI, userAPI, permissionAPI } from '@/lib/api'


interface Card {
  id: number
  card_uid: string
  user_id: number | null
  user_name: string | null
  is_active: boolean
  issued_at: string
  expired_at: string | null
  notes?: string
}

interface User {
  id: number
  employee_id: string
  full_name: string
  email: string
}

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [formData, setFormData] = useState({
    card_uid: '',
    user_id: '',
    is_active: true,
    issued_at: new Date().toISOString().split('T')[0],
    expired_at: '',
    notes: '',
  })
    // Permission management
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [cardPermissions, setCardPermissions] = useState<any[]>([])
  const [allPermissions, setAllPermissions] = useState<any[]>([])
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [newPermissionData, setNewPermissionData] = useState({
    permission_id: '',
    additional_door_ids: '',
    valid_from: '',
    valid_until: '',
  })


  // Lọc
  const [filterUser, setFilterUser] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    fetchCards()
    fetchUsers()
  }, [])

  const fetchCards = async () => {
    try {
      setLoading(true)
      const response = await cardAPI.getAll()
      setCards(response.data.data)
    } catch (error) {
      console.error('Error fetching cards:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAll()
      setUsers(response.data.data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleOpenModal = (card?: Card) => {
    if (card) {
      setEditingCard(card)
      setFormData({
        card_uid: card.card_uid,
        user_id: card.user_id?.toString() || '',
        is_active: card.is_active,
        issued_at: card.issued_at ? new Date(card.issued_at).toISOString().split('T')[0] : '',
        expired_at: card.expired_at ? new Date(card.expired_at).toISOString().split('T')[0] : '',
        notes: card.notes || '',
      })
    } else {
      setEditingCard(null)
      setFormData({
        card_uid: 'CARD-',
        user_id: '',
        is_active: true,
        issued_at: new Date().toISOString().split('T')[0],
        expired_at: '',
        notes: '',
      })
    }
    setShowModal(true)
  }

  // Format Card UID 
  const handleCardUidChange = (value: string) => {
    // Chỉ cho phép chữ cái, số và dấu gạch ngang
    let cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '')

    // Luôn bắt đầu bằng CARD-
    if (!cleaned.startsWith('CARD-')) {
      cleaned = 'CARD-' + cleaned.replace(/^CARD-?/i, '')
    }

    // Lấy phần sau "CARD-"
    const afterPrefix = cleaned.substring(5).replace(/-/g, '')

    // Tự động thêm "-" mỗi 3 ký tự
    let formatted = 'CARD-'
    for (let i = 0; i < afterPrefix.length; i++) {
      if (i > 0 && i % 3 === 0) {
        formatted += '-'
      }
      formatted += afterPrefix[i]
    }

    setFormData({ ...formData, card_uid: formatted })
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCard(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        user_id: formData.user_id ? parseInt(formData.user_id) : null,
        issued_at: formData.issued_at ? new Date(formData.issued_at).toISOString() : new Date().toISOString(),
        expired_at: formData.expired_at ? new Date(formData.expired_at).toISOString() : null,
      }

      if (editingCard) {
        await cardAPI.update(editingCard.id, data)
      } else {
        await cardAPI.create(data)
      }

      fetchCards()
      handleCloseModal()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleToggleActive = async (card: Card) => {
    try {
      if (card.is_active) {
        await cardAPI.deactivate(card.id)
      } else {
        await cardAPI.activate(card.id)
      }
      fetchCards()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleDelete = async (card: Card) => {
    if (!confirm(`Xóa thẻ ${card.card_uid}?`)) return

    try {
      await cardAPI.delete(card.id)
      fetchCards()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa thẻ')
    }
  }
  
  // Permission functions
  const handleOpenPermissionModal = async (card: Card) => {
    setSelectedCard(card)
    setShowPermissionModal(true)
    setLoadingPermissions(true)
    
    try {
      // Fetch card permissions
      const cpResponse = await permissionAPI.getCardPermissions(card.id)
      setCardPermissions(cpResponse.data.data)
      
      // Fetch all permissions
      const allResponse = await permissionAPI.getAll(true) // active only
      setAllPermissions(allResponse.data.data)
    } catch (error) {
      console.error('Error fetching permissions:', error)
      toast.error('Không thể tải danh sách phân quyền')
    } finally {
      setLoadingPermissions(false)
    }
  }

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCard) return

    try {
      const data: any = {
        permission_id: parseInt(newPermissionData.permission_id),
      }

      if (newPermissionData.additional_door_ids) {
        data.additional_door_ids = newPermissionData.additional_door_ids
          .split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id))
      }

      if (newPermissionData.valid_from) {
        data.valid_from = new Date(newPermissionData.valid_from).toISOString()
      }

      if (newPermissionData.valid_until) {
        data.valid_until = new Date(newPermissionData.valid_until).toISOString()
      }

      await permissionAPI.assignToCard(selectedCard.id, data)
      toast.success('Thêm phân quyền thành công')
      
      // Refresh
      const cpResponse = await permissionAPI.getCardPermissions(selectedCard.id)
      setCardPermissions(cpResponse.data.data)
      
      // Reset form
      setNewPermissionData({
        permission_id: '',
        additional_door_ids: '',
        valid_from: '',
        valid_until: '',
      })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleRemovePermission = async (cardPermissionId: number) => {
    if (!confirm('Xóa phân quyền này khỏi thẻ?')) return

    try {
      await permissionAPI.removeFromCard(cardPermissionId)
      toast.success('Xóa phân quyền thành công')
      
      // Refresh
      if (selectedCard) {
        const cpResponse = await permissionAPI.getCardPermissions(selectedCard.id)
        setCardPermissions(cpResponse.data.data)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa phân quyền')
    }
  }


  // Filtered cards
  const filteredCards = cards.filter((card) => {
    const matchUser = !filterUser || card.user_id?.toString() === filterUser
    const matchStatus = !filterStatus || (filterStatus === 'active' ? card.is_active : !card.is_active)
    const matchSearch = !searchTerm ||
      card.card_uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (card.user_name && card.user_name.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchUser && matchStatus && matchSearch
  })

  // Phân trang cards
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentCards = filteredCards.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredCards.length / itemsPerPage)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  const isExpired = (expiredAt: string | null) => {
    if (!expiredAt) return false
    return new Date(expiredAt) < new Date()
  }

  return (
    <DashboardLayout title="Quản lý mã truy cập">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Tìm kiếm Card UID, tên nhân viên"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* User Filter */}
          <div>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
            >
              <option value="">Tất cả nhân viên</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.employee_id})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">

          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:from-cyan-700 hover:to-red-700 transition font-semibold"
          >
             Thêm thẻ mới
          </button>
        </div>
      </div>

      {/* Cards Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Card UID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Nhân viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Ngày cấp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Hết hạn
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
                {currentCards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="font-mono font-semibold text-gray-800">{card.card_uid}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {card.user_name || <span className="text-gray-400">Chưa gán</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(card.issued_at).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {card.expired_at ? (
                        <span className={`text-sm ${isExpired(card.expired_at) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          {new Date(card.expired_at).toLocaleDateString('vi-VN')}
                          {isExpired(card.expired_at) && ' (Hết hạn)'}
                        </span>
                      ) : (
                        <span className="text-sm text-green-600 font-semibold">Vĩnh viễn</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        card.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {card.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(card)}
                          className={`p-2 rounded-lg transition ${
                            card.is_active
                              ? 'text-orange-600 hover:bg-orange-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={card.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {card.is_active ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                          </svg>
                        </button>
                                                <button
                          onClick={() => handleOpenPermissionModal(card)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          title="Quản lý phân quyền"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleOpenModal(card)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Sửa"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(card)}
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

            {filteredCards.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Không tìm thấy thẻ nào
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Hiển thị {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredCards.length)} của {filteredCards.length}
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

            {/* Card Permissions Modal */}
      {showPermissionModal && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Quản lý Phân quyền</h2>
                  <p className="text-gray-600">Thẻ: {selectedCard.card_uid}</p>
                </div>
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Current Permissions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Phân quyền hiện tại</h3>
                {loadingPermissions ? (
                  <div className="text-center py-4 text-gray-500">Đang tải...</div>
                ) : cardPermissions.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                    Thẻ chưa được gán phân quyền nào
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cardPermissions.map((cp: any) => (
                      <div key={cp.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{cp.permission_name}</div>
                          <div className="text-sm text-gray-600">{cp.permission_description}</div>
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            <span>Ưu tiên: {cp.priority}</span>
                            {cp.valid_from && (
                              <span>Từ: {new Date(cp.valid_from).toLocaleDateString('vi-VN')}</span>
                            )}
                            {cp.valid_until && (
                              <span>Đến: {new Date(cp.valid_until).toLocaleDateString('vi-VN')}</span>
                            )}
                          </div>
                          {cp.additional_door_ids && cp.additional_door_ids.length > 0 && (
                            <div className="mt-1 text-xs text-blue-600">
                              + Thêm cửa: {cp.additional_door_ids.join(', ')}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemovePermission(cp.id)}
                          className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Xóa"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Permission */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Thêm phân quyền mới</h3>
                <form onSubmit={handleAddPermission} className="space-y-4">
                  {/* Select Permission */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chọn phân quyền <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={newPermissionData.permission_id}
                      onChange={(e) => setNewPermissionData({ ...newPermissionData, permission_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">-- Chọn phân quyền --</option>
                      {allPermissions.map((perm: any) => (
                        <option key={perm.id} value={perm.id}>
                          {perm.name} (Priority: {perm.priority})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Additional Doors */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cửa bổ sung (ID, cách nhau bởi dấu phẩy)
                    </label>
                    <input
                      type="text"
                      value={newPermissionData.additional_door_ids}
                      onChange={(e) => setNewPermissionData({ ...newPermissionData, additional_door_ids: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="VD: 7,8,9"
                    />
                    <p className="text-xs text-gray-500 mt-1">Thêm quyền truy cập cho các cửa này (ngoài quyền gốc)</p>
                  </div>

                  {/* Valid From/Until */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hiệu lực từ</label>
                      <input
                        type="datetime-local"
                        value={newPermissionData.valid_from}
                        onChange={(e) => setNewPermissionData({ ...newPermissionData, valid_from: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hiệu lực đến</label>
                      <input
                        type="datetime-local"
                        value={newPermissionData.valid_until}
                        onChange={(e) => setNewPermissionData({ ...newPermissionData, valid_until: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!newPermissionData.permission_id}
                    className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Thêm phân quyền
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </DashboardLayout>
  )
}
