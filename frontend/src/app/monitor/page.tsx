'use client'

import { useEffect, useState, useRef } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import mqtt, { MqttClient } from 'mqtt'

interface AccessLog {
  user_name: string
  employee_id?: string
  department?: string
  door_name: string
  status: string
  denial_reason?: string
  access_time: string
  card_uid?: string
}

export default function MonitorPage() {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [stats, setStats] = useState({
    total: 0,
    granted: 0,
    denied: 0,
    lastUpdate: '-- : -- : --',
  })
  const [isConnected, setIsConnected] = useState(false)
  const clientRef = useRef<MqttClient | null>(null)

  useEffect(() => {
    // MQTT WebSocket connection
    const MQTT_WS_URL = process.env.NEXT_PUBLIC_MQTT_WS_URL || 'ws://localhost:9001'

    const client = mqtt.connect(MQTT_WS_URL, {
      clientId: `monitor_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000,
      username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
    })

    client.on('connect', () => {
      console.log('Connected to MQTT broker')
      setIsConnected(true)

      // Subscribe to access logs topic
      client.subscribe('access/log', (err) => {
        if (err) {
          console.error('Subscription error:', err)
        } else {
          console.log('Subscribed to access/log')
        }
      })
    })

    client.on('message', (topic, message) => {
      try {
        const log: AccessLog = JSON.parse(message.toString())

        // thêm log mới vào
        setLogs((prev) => [log, ...prev].slice(0, 20)) // 20 logs

        // Cập nhật status
        setStats((prev) => {
          const newStats = {
            total: prev.total + 1,
            granted: log.status === 'Chấp nhận' ? prev.granted + 1 : prev.granted,
            denied: log.status === 'Từ chối' ? prev.denied + 1 : prev.denied,
            lastUpdate: new Date(log.access_time).toLocaleTimeString('vi-VN'),
          }
          return newStats
        })
      } catch (error) {
        console.error('Error parsing MQTT message:', error)
      }
    })

    client.on('error', (error) => {
      console.error('MQTT error:', error)
      setIsConnected(false)
    })

    client.on('disconnect', () => {
      console.log('Disconnected from MQTT broker')
      setIsConnected(false)
    })

    client.on('reconnect', () => {
      console.log('Reconnecting to MQTT broker')
    })

    clientRef.current = client

    return () => {
      if (client) {
        client.end()
      }
    }
  }, []) // Chỉ chạy 1 lần khi mount

  const getInitials = (name: string) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getColorByDepartment = (dept?: string) => {
    const colors: { [key: string]: string } = {
      IT: 'from-cyan-500 to-cyan-600',
      HR: 'from-green-500 to-green-600',
      Sales: 'from-orange-500 to-orange-600',
      Admin: 'from-purple-500 to-purple-600',
    }
    return colors[dept || 'Admin'] || 'from-gray-500 to-gray-600'
  }

  return (
    <DashboardLayout title="Monitor thời gian thực">
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .log-item-new {
          animation: slideIn 0.3s ease-out;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .pulse-dot {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* Header with Live Badge */}
      <div className="mb-6">
        <span
          className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full ${
            isConnected ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600 pulse-dot' : 'bg-red-600'}`}></span>
          {isConnected ? 'Live' : 'Disconnected'}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-1">Tổng hôm nay</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-1">Granted</div>
              <div className="text-3xl font-bold text-green-600">{stats.granted}</div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
               <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-1">Denied</div>
              <div className="text-3xl font-bold text-red-600">{stats.denied}</div>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-1">Cập nhật lần cuối</div>
              <div className="text-lg font-bold text-gray-900">{stats.lastUpdate}</div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Live Feed */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Live Access Feed</h2>
          <div className="flex items-center gap-2 text-sm">
            <svg
              className={`w-5 h-5 ${isConnected ? 'text-green-600 pulse-dot' : 'text-red-600'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <circle cx="10" cy="10" r="6" />
            </svg>
            <span className={isConnected ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
              {isConnected ? 'MQTT Connected' : 'MQTT Disconnected'}
            </span>
          </div>
        </div>

        {/* Log List */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <p className="font-semibold">Đang chờ access events...</p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`log-item-new p-4 rounded-lg border-2 transition ${
                  log.status === 'granted'
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-12 h-12 bg-gradient-to-r ${getColorByDepartment(
                        log.department
                      )} rounded-full flex items-center justify-center text-white font-bold`}
                    >
                      {getInitials(log.user_name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">{log.user_name || 'Unknown'}</span>
                        {log.employee_id && <span className="text-xs text-gray-500">({log.employee_id})</span>}
                        {log.department && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded">
                            {log.department}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold">{log.door_name}</span>
                        {log.status === 'denied' && log.denial_reason && (
                          <span className="text-red-700 font-semibold ml-2">• {log.denial_reason}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono font-semibold text-gray-700">
                      {new Date(log.access_time).toLocaleTimeString('vi-VN')}
                    </span>
                    <span
                      className={`px-4 py-2 text-white text-sm font-bold rounded-lg ${
                        log.status === 'granted' ? 'bg-green-600' : 'bg-red-600'
                      }`}
                    >
                      {log.status === 'granted' ? 'GRANTED' : 'DENIED'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}