'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { departmentAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface Department {
  id: number
  name: string
  description: string
  parent_id: number | null
  parent_name: string | null
  level: number
  employee_count: number
  children?: Department[]
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [treeData, setTreeData] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set())

  const [formData, setFormData] = useState({
    name: '',
    parent_id: '',
    description: '',
  })

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      const response = await departmentAPI.getAll()
      const depts = response.data.data
      setDepartments(depts)
      
      // Build tree
      const tree = buildTree(depts)
      setTreeData(tree)

      // Expand level 0 by default
      const rootIds = depts.filter((d: Department) => d.level === 0).map((d: Department) => d.id)
      setExpandedNodes(new Set(rootIds))
    } catch (error) {
      console.error('Error fetching departments:', error)
      toast.error('Không thể tải danh sách phòng ban')
    } finally {
      setLoading(false)
    }
  }

  const buildTree = (flatList: Department[]): Department[] => {
    const map: { [key: number]: Department } = {}
    const tree: Department[] = []

    // Create map
    flatList.forEach(dept => {
      map[dept.id] = { ...dept, children: [] }
    })

    // Build tree
    flatList.forEach(dept => {
      if (dept.parent_id === null) {
        tree.push(map[dept.id])
      } else if (map[dept.parent_id]) {
        map[dept.parent_id].children!.push(map[dept.id])
      }
    })

    return tree
  }

  const toggleNode = (id: number) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedNodes(newExpanded)
  }

  const handleOpenModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept)
      setFormData({
        name: dept.name,
        parent_id: dept.parent_id?.toString() || '',
        description: dept.description || '',
      })
    } else {
      setEditingDept(null)
      setFormData({
        name: '',
        parent_id: '',
        description: '',
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingDept(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
      }

      if (editingDept) {
        await departmentAPI.update(editingDept.id, data)
        toast.success('Cập nhật phòng ban thành công')
      } else {
        await departmentAPI.create(data)
        toast.success('Tạo phòng ban thành công')
      }

      fetchDepartments()
      handleCloseModal()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Xóa phòng ban "${dept.name}"?\n\nLưu ý: Không thể xóa nếu còn nhân viên hoặc phòng ban con.`)) return

    try {
      await departmentAPI.delete(dept.id)
      toast.success('Xóa phòng ban thành công')
      fetchDepartments()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa phòng ban')
    }
  }

  // Render tree node
  const renderTreeNode = (dept: Department, depth: number = 0) => {
    const hasChildren = dept.children && dept.children.length > 0
    const isExpanded = expandedNodes.has(dept.id)
    const indent = depth * 40

    const colors = [
      'from-cyan-500 to-cyan-600',
      'from-blue-500 to-blue-600',
      'from-indigo-500 to-indigo-600',
      'from-purple-500 to-purple-600',
    ]
    const colorClass = colors[dept.level % colors.length]

    return (
      <div key={dept.id} className="mb-1">
        <div
          className="flex items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition group"
          style={{ paddingLeft: `${indent + 12}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleNode(dept.id)}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded transition"
            >
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-6"></div>
          )}

          {/* Icon */}
          <div className={`w-10 h-10 bg-gradient-to-r ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 truncate">{dept.name}</h3>
              <span className="text-xs text-gray-500">Level {dept.level}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                {dept.employee_count} nhân viên
              </span>
              {dept.parent_name && (
                <span className="text-gray-500">
                  ↳ Thuộc: <span className="font-medium">{dept.parent_name}</span>
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => handleOpenModal({ ...dept, parent_id: dept.id, name: '', description: '' } as any)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
              title="Thêm phòng con"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={() => handleOpenModal(dept)}
              className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
              title="Sửa"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={() => handleDelete(dept)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Xóa"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {dept.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <DashboardLayout title='Quản lý phòng ban'>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:from-cyan-700 hover:to-cyan-800 transition flex items-center gap-2 font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm phòng ban
          </button>
        </div>

        {/* Tree View */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">Đang tải...</p>
            </div>
          ) : treeData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Chưa có phòng ban nào</div>
          ) : (
            <div className="space-y-1">
              {treeData.map(dept => renderTreeNode(dept, 0))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingDept && !formData.name ? 'Thêm phòng ban con' : editingDept ? 'Chỉnh sửa phòng ban' : 'Thêm phòng ban mới'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên phòng ban <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="VD: IT Department"
                  />
                </div>

                {/* Parent */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban cha</label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">-- Không có (Root) --</option>
                    {departments
                      .filter(d => !editingDept || d.id !== editingDept.id) // Không cho chọn chính nó
                      .map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {'  '.repeat(dept.level)}
                          {dept.name} (Level {dept.level})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    rows={3}
                    placeholder="Mô tả về phòng ban..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:from-cyan-700 hover:to-cyan-800 transition"
                  >
                    {editingDept && formData.name ? 'Cập nhật' : 'Tạo mới'}
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
    </DashboardLayout>
  )
}
