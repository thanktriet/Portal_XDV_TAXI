'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { Car, Wrench, DollarSign, AlertTriangle, Calendar, Gauge } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: workshopStats } = useQuery({
    queryKey: ['workshop-dashboard'],
    queryFn: async () => { const { data } = await api.get('/workshop/dashboard'); return data },
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-stats'],
    queryFn: async () => { const { data } = await api.get('/vehicles', { params: { limit: 1 } }); return data },
  })

  const { data: costSummary } = useQuery({
    queryKey: ['fleet-costs-summary'],
    queryFn: async () => { const { data } = await api.get('/fleet/costs/summary'); return data },
  })

  const { data: incidents } = useQuery({
    queryKey: ['fleet-incidents-active'],
    queryFn: async () => { const { data } = await api.get('/fleet/incidents', { params: { limit: 5 } }); return data },
  })

  const { data: dueVehicles } = useQuery({
    queryKey: ['maintenance-due'],
    queryFn: async () => { const { data } = await api.get('/maintenance/due'); return data },
  })

  const { data: notifications } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => { const { data } = await api.get('/notifications/unread-count'); return data },
  })

  const activeIncidents = incidents?.data?.filter((i: any) => i.status !== 'RESOLVED')?.length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Xin chào, {user?.fullName}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-primary" />
            <span className="text-xs text-slate-500">Tổng xe</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{vehicles?.meta?.total || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-warning" />
            <span className="text-xs text-slate-500">Trong xưởng</span>
          </div>
          <p className="text-2xl font-bold text-warning">{workshopStats?.totalInWorkshop || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-primary" />
            <span className="text-xs text-slate-500">Đang sửa</span>
          </div>
          <p className="text-2xl font-bold text-primary">{workshopStats?.inProgress || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <span className="text-xs text-slate-500">Sự cố</span>
          </div>
          <p className="text-2xl font-bold text-danger">{activeIncidents}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-slate-500">Cần bảo dưỡng</span>
          </div>
          <p className="text-2xl font-bold text-orange-500">{dueVehicles?.length || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-success" />
            <span className="text-xs text-slate-500">Chi phí tháng</span>
          </div>
          <p className="text-xl font-bold text-success">{formatNumber(costSummary?.total || 0)}đ</p>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workshop status */}
        {workshopStats && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5" />Xưởng dịch vụ
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Chẩn đoán', value: workshopStats.diagnosing, color: 'bg-blue-500' },
                { label: 'Chờ phụ tùng', value: workshopStats.waitingParts, color: 'bg-orange-500' },
                { label: 'Đang sửa', value: workshopStats.inProgress, color: 'bg-primary' },
                { label: 'Kiểm tra CL', value: workshopStats.qualityCheck, color: 'bg-purple-500' },
                { label: 'Hoàn thành', value: workshopStats.completed, color: 'bg-success' },
                { label: 'Quá hạn', value: workshopStats.overdue, color: 'bg-danger' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-sm text-slate-600 dark:text-slate-300">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.value || 0}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm">
              <span className="text-slate-500">Doanh thu tháng</span>
              <span className="font-semibold text-success">{formatNumber(workshopStats.revenueThisMonth || 0)}đ</span>
            </div>
          </div>
        )}

        {/* Recent incidents */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />Sự cố gần đây
          </h3>
          {incidents?.data?.length > 0 ? (
            <div className="space-y-3">
              {incidents.data.slice(0, 5).map((inc: any) => (
                <div key={inc.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{inc.vehicle?.licensePlate}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{inc.description}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                    inc.status === 'RESOLVED' ? 'bg-success/10 text-success' :
                    inc.status === 'NEW' ? 'bg-danger/10 text-danger' :
                    'bg-warning/10 text-warning'
                  }`}>
                    {inc.status === 'NEW' ? 'Mới' : inc.status === 'RESOLVED' ? 'Xong' : 'Xử lý'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Không có sự cố</p>
          )}
        </div>
      </div>
    </div>
  )
}
