'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { departmentAPI, userAPI, doorAPI } from '@/lib/api'

interface Department {
  id: number
  name: string
  description: string
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch departments
      const deptResponse = await departmentAPI.getAll()
      const usersResponse = await userAPI.getAll()
      const doorsResponse = await doorAPI.getAll()

      const users = usersResponse.data.data
      const doors = doorsResponse.data.data

      // Count employees and doors per department
      const departmentStats = deptResponse.data.data.map((dept: Department) => {
        const deptUsers = users.filter((u: any) => u.department_id === dept.id)
        const deptDoors = doors.filter((d: any) => d.department_id === dept.id && d.access_level === 'department')

        return {
          ...dept,
          employeeCount: deptUsers.length,
          doorCount: deptDoors.length,
          manager: deptUsers.find((u: any) => u.position === 'manager')?.full_name || 'Chưa có',
        }
      })

      setDepartments(departmentStats)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Department color schemes
  const colorSchemes = [
    { bg: 'from-cyan-500 to-cyan-600', badge: 'bg-cyan-100 text-cyan-700', button: 'bg-cyan-600 hover:bg-cyan-700' },
    { bg: 'from-green-500 to-green-600', badge: 'bg-green-100 text-green-700', button: 'bg-green-600 hover:bg-green-700' },
    { bg: 'from-orange-500 to-orange-600', badge: 'bg-orange-100 text-orange-700', button: 'bg-orange-600 hover:bg-orange-700' },
    { bg: 'from-purple-500 to-purple-600', badge: 'bg-purple-100 text-purple-700', button: 'bg-purple-600 hover:bg-purple-700' },
    { bg: 'from-pink-500 to-pink-600', badge: 'bg-pink-100 text-pink-700', button: 'bg-pink-600 hover:bg-pink-700' },
  ]

  // Department icons
  const getIcon = (index: number) => {
    const icons = [
      // IT
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>,
      // HR
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>,
      // Sales
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>,
      // Marketing
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>,
    ]
    return icons[index % icons.length]
  }

  return (
    <DashboardLayout title="Phòng ban">
      {loading ? (
        <div className="p-8 text-center text-gray-500">Đang tải...</div>
      ) : (
        <>
          {/* Departments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {departments.map((dept: any, index: number) => {
              const colors = colorSchemes[index % colorSchemes.length]

              return (
                <div key={dept.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-r ${colors.bg} rounded-xl flex items-center justify-center`}>
                      {getIcon(index)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{dept.name}</h3>
                      <p className="text-sm text-gray-600">{dept.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      <span className="text-gray-700">
                        <span className="font-bold text-gray-900">{dept.employeeCount}</span> nhân viên
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-gray-700">
                        <span className="font-bold text-gray-900">{dept.doorCount}</span> cửa được phân quyền
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="text-gray-700">
                        Manager: <span className={`font-semibold ${colors.badge.split(' ')[1]}`}>{dept.manager}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {departments.length === 0 && (
            <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
              Không có phòng ban nào
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
