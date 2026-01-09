'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { cardAPI, userAPI, permissionAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface Card {
  id: number
  card_number: string
  user_id: number
  user_name?: string
  user_email?: string
  department_name?: string
  issue_date: string
  expiry_date: string | null
  is_active: boolean
}

interface User {
  id: number
  username: string
  full_name: string
  email: string
  role: string
  department_id: number
  department_name?: string
}

interface Permission {
  id: number
  name: string
  door_access_mode: string
  priority: number
  is_active: boolean
}

interface CardPermission {
  id: number
  card_id: number
  permission_id: number
  permission_name: string
  override_doors: boolean
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
}

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [formData, setFormData] = useState({
    card_number: '',
    user_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    is_active: true,
  })

  // Permission modal states
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [cardPermissions, setCardPermissions] = useState<CardPermission[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Pagination
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
      toast.error('Không thể tải danh sách thẻ')
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
        card_number: card.card_number,
        user_id: card.user_id.toString(),
        issue_date: card.issue_date.split('T')[0],
        expiry_date: card.expiry_date ? card.expiry_date.split('T')[0] : '',
        is_active: card.is_active,
      })
    } else {
      setEditingCard(null)
      setFormData({
        card_number: '',
        user_id: '',
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: '',
        is_active: true,
      })
    }
    setShowModal(true)
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
        user_id: parseInt(formData.user_id),
        expiry_date: formData.expiry_date || null,
      }

      if (editingCard) {
        await cardAPI.update(editingCard.id, data)
        toast.success('Cập nhật thẻ thành công')
      } else {
        await cardAPI.create(data)
        toast.success('Tạo thẻ mới thành công')
      }

      fetchCards()
      handleCloseModal()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleDelete = async (card: Card) => {
    if (!confirm(`Xóa thẻ ${card.card_number}?`)) return

    try {
      await cardAPI.delete(card.id)
      toast.success('Xóa thẻ thành công')
      fetchCards()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa thẻ')
    }
  }

  const handleOpenPermissionModal = async (card: Card) => {
    try {
      setSelectedCard(card)
      const cpResponse = await permissionAPI.getCardPermissions(card.id)
      setCardPermissions(cpResponse.data.data)
      const allResponse = await permissionAPI.getAll(true)
      setAllPermissions(allResponse.data.data)
      setShowPermissionModal(true)
    } catch (error) {
      console.error('Error fetching permissions:', error)
      toast.error('Không thể tải danh sách phân quyền')
    }
  }

  const handleClosePermissionModal = () => {
    setShowPermissionModal(false)
    setSelectedCard(null)
  }

  // Filtered cards
  const filteredCards = cards.filter((card) => {
    const matchStatus = !filterStatus || 
      (filterStatus === 'active' ? card.is_active : !card.is_active)
    const matchSearch = !searchTerm ||
      card.card_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.user_name?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchStatus && matchSearch
  })

  // Paginated cards
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentCards = filteredCards.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredCards.length / itemsPerPage)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  return (
    <DashboardLayout title="Quản lý thẻ truy cập">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Tìm kiếm mã thẻ, tên người dùng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-red-600 text-white rounded-lg hover:from-cyan-700 hover:to-red-700 transition font-semibold"
          >
            + Thêm thẻ mới
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
                    Mã thẻ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Người dùng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Phòng ban
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Ngày cấp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Ngày hết hạn
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
                        <span className="font-semibold text-gray-800">{card.card_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{card.user_name}</div>
                        <div className="text-xs text-gray-500">{card.user_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{card.department_name || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(card.issue_date).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {card.expiry_date ? new Date(card.expiry_date).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        card.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {card.is_active ? 'Hoạt động' : 'Ngừng'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
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

      {/* Add/Edit Card Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">
                {editingCard ? 'Sửa thẻ truy cập' : 'Thêm thẻ mới'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Card Number */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Mã thẻ *</label>
                  <input
                    type="text"
                    required
                    value={formData.card_number}
                    onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
                    placeholder="VD: CARD001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* User Selection */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Người dùng *</label>
                  <select
                    required
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Chọn người dùng --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email}) - {user.department_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Issue Date */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Ngày cấp *</label>
                    <input
                      type="date"
                      required
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Ngày hết hạn</label>
                    <input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Để trống nếu không giới hạn</p>
                  </div>
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
                    <span className="text-sm font-semibold">Kích hoạt thẻ</span>
                  </label>
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
                  {editingCard ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Management Modal */}
      {showPermissionModal && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">
                Quản lý phân quyền - Thẻ {selectedCard.card_number}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Người dùng: {selectedCard.user_name}
              </p>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Quyền hiện tại</h3>
                {cardPermissions.length > 0 ? (
                  <div className="space-y-2">
                    {cardPermissions.map((cp) => (
                      <div key={cp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{cp.permission_name}</div>
                          <div className="text-sm text-gray-600">
                            {cp.valid_from && `Từ: ${new Date(cp.valid_from).toLocaleDateString('vi-VN')}`}
                            {cp.valid_until && ` - Đến: ${new Date(cp.valid_until).toLocaleDateString('vi-VN')}`}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm('Xóa quyền này?')) {
                              try {
                                await permissionAPI.removeFromCard(cp.id)
                                toast.success('Xóa quyền thành công')
                                handleOpenPermissionModal(selectedCard)
                              } catch (error) {
                                toast.error('Không thể xóa quyền')
                              }
                            }
                          }}
                          className="text-red-600 hover:bg-red-50 p-2 rounded"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-4">
                    Chưa có quyền nào được gán
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Thêm quyền mới</h3>
                <div className="text-sm text-gray-600 mb-4">
                  Chọn quyền và nhấn "Thêm" để gán cho thẻ này
                </div>
                <div className="space-y-2">
                  {allPermissions.map((perm) => (
                    <div key={perm.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div>
                        <div className="font-medium">{perm.name}</div>
                        <div className="text-sm text-gray-600">
                          Mode: {perm.door_access_mode} | Priority: {perm.priority}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await permissionAPI.assignToCard(selectedCard.id, {
                              permission_id: perm.id,
                            })
                            toast.success('Thêm quyền thành công')
                            handleOpenPermissionModal(selectedCard)
                          } catch (error: any) {
                            toast.error(error.response?.data?.message || 'Không thể thêm quyền')
                          }
                        }}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                      >
                        Thêm
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end">
              <button
                onClick={handleClosePermissionModal}
                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
