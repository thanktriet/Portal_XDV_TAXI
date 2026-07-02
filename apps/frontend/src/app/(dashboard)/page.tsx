'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { Car, Wrench, DollarSign, AlertTriangle, Calendar, Gauge, Bell, Shield, Clock, ChevronRight, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import Link from 'next/link'

const COST_CATEGORY_LABELS: Record<string, string> = {
  ELECTRICITY: 'Điện / sạc',
  TIRE:        'Lốp xe',
  BRAKE:       'Phanh',
  INSURANCE:   'Bảo hiểm',
  MAINTENANCE: 'Bảo dưỡng',
  REPAIR:      'Sửa chữa',
  ACCIDENT:    'Tai nạn',
  OTHER:       'Khác',
}

const COST_CATEGORY_COLORS: Record<string, string> = {
  ELECTRICITY: 'bg-yellow-500',
  TIRE:        'bg-slate-500',
  BRAKE:       'bg-red-500',
  INSURANCE:   'bg-blue-500',
  MAINTENANCE: 'bg-green-500',
  REPAIR:      'bg-orange-500',
  ACCIDENT:    'bg-rose-600',
  OTHER:       'bg-slate-400',
}

const JOB_STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Tiếp nhận', DIAGNOSING: 'Chẩn đoán', QUOTED: 'Đã báo giá',
  APPROVED: 'Duyệt sửa', WAITING_PARTS: 'Chờ phụ tùng', IN_PROGRESS: 'Đang sửa',
  QUALITY_CHECK: 'Kiểm tra CL', COMPLETED: 'Hoàn thành', DELIVERED: 'Đã bàn giao',
  REJECTED: 'Từ chối',
}

const JOB_STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-slate-100 text-slate-600', DIAGNOSING: 'bg-blue-100 text-blue-700',
  QUOTED: 'bg-purple-100 text-purple-700', APPROVED: 'bg-primary/10 text-primary',
  WAITING_PARTS: 'bg-orange-100 text-orange-700', IN_PROGRESS: 'bg-warning/10 text-warning',
  QUALITY_CHECK: 'bg-cyan-100 text-cyan-700', COMPLETED: 'bg-success/10 text-success',
  DELIVERED: 'bg-success/10 text-success', REJECTED: 'bg-danger/10 text-danger',
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `${days} ngày trước`
}

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
  const unreadCount = notifications?.count ?? notifications?.unread ?? 0
  const dueList = dueVehicles ?? []
  const overdueCount = dueList.filter((v: any) => v.mostUrgent?.status === 'OVERDUE').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Xin chào, {user?.fullName}</p>
        </div>
        <Link
          href="/notifications"
          className="relative flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <Bell className="w-4 h-4 text-primary" />
          Thông báo
          {unreadCount > 0 && (
            <span className="ml-1 min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-danger text-white text-xs font-semibold">
              {unreadCount}
            </span>
          )}
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Link href="/vehicles" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-primary/40 transition">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-primary" />
            <span className="text-xs text-slate-500">Tổng xe</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{vehicles?.meta?.total || 0}</p>
        </Link>

        <Link href="/workshop/jobs" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-primary/40 transition">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-warning" />
            <span className="text-xs text-slate-500">Trong xưởng</span>
          </div>
          <p className="text-2xl font-bold text-warning">{workshopStats?.totalInWorkshop || 0}</p>
        </Link>

        <Link href="/workshop/jobs" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-primary/40 transition">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-primary" />
            <span className="text-xs text-slate-500">Đang sửa</span>
          </div>
          <p className="text-2xl font-bold text-primary">{workshopStats?.inProgress || 0}</p>
        </Link>

        <Link href="/fleet/incidents" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-danger/40 transition">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <span className="text-xs text-slate-500">Sự cố</span>
          </div>
          <p className="text-2xl font-bold text-danger">{activeIncidents}</p>
        </Link>

        <Link href="/maintenance" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-orange-400/40 transition">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-slate-500">Cần bảo dưỡng</span>
          </div>
          <p className="text-2xl font-bold text-orange-500">{dueList.length}</p>
          {overdueCount > 0 && <p className="text-xs text-danger mt-0.5">{overdueCount} quá hạn</p>}
        </Link>

        <Link href="/fleet/costs" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-success/40 transition">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-success" />
            <span className="text-xs text-slate-500">Chi phí tháng</span>
          </div>
          <p className="text-xl font-bold text-success">{formatNumber(costSummary?.total || 0)}đ</p>
        </Link>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workshop status */}
        {workshopStats && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-5 h-5" />Xưởng dịch vụ
              </h3>
              <Link href="/workshop" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Chi tiết <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
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

            {/* Warranty vs paid */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Bảo hành</p>
                  <p className="text-sm font-semibold text-blue-600">{workshopStats.warrantyCount || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <Wrench className="w-4 h-4 text-orange-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Tính phí</p>
                  <p className="text-sm font-semibold text-orange-600">{workshopStats.paidCount || 0}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm">
              <span className="text-slate-500 flex items-center gap-1"><TrendingUp className="w-4 h-4" />Doanh thu tháng</span>
              <span className="font-semibold text-success">{formatNumber(workshopStats.revenueThisMonth || 0)}đ</span>
            </div>
          </div>
        )}

        {/* Recent incidents */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />Sự cố gần đây
            </h3>
            <Link href="/fleet/incidents" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
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

      {/* Recent jobs + maintenance due + cost breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent workshop jobs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />Công việc gần đây
            </h3>
            <Link href="/workshop/jobs" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {workshopStats?.recentJobs?.length > 0 ? (
            <div className="space-y-2">
              {workshopStats.recentJobs.slice(0, 6).map((job: any) => (
                <Link
                  key={job.id}
                  href={`/workshop/jobs/${job.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">{job.code}</span>
                      <span className="text-sm text-slate-600 dark:text-slate-300">{job.vehicle?.licensePlate}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{job.entryReason}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${JOB_STATUS_COLORS[job.status] || ''}`}>
                    {JOB_STATUS_LABELS[job.status] || job.status}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400 hidden sm:block w-20 text-right">{timeAgo(job.createdAt)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Chưa có công việc</p>
          )}
        </div>

        {/* Cost breakdown by category */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5" />Chi phí theo loại
            </h3>
            <Link href="/fleet/costs" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {costSummary?.byCategory?.length > 0 ? (
            <div className="space-y-3">
              {[...costSummary.byCategory]
                .sort((a: any, b: any) => b.total - a.total)
                .map((cat: any) => {
                  const pct = costSummary.total > 0 ? Math.round((cat.total / costSummary.total) * 100) : 0
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600 dark:text-slate-300">{COST_CATEGORY_LABELS[cat.category] || cat.category}</span>
                        <span className="font-medium text-slate-900 dark:text-white">{formatNumber(cat.total)}đ</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div className={`h-full rounded-full ${COST_CATEGORY_COLORS[cat.category] || 'bg-slate-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Chưa có chi phí</p>
          )}
        </div>
      </div>

      {/* Maintenance due */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />Xe cần bảo dưỡng
          </h3>
          <Link href="/maintenance" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            Tất cả <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {dueList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dueList.slice(0, 6).map((v: any) => {
              const overdue = v.mostUrgent?.status === 'OVERDUE'
              return (
                <Link
                  key={v.id}
                  href={`/vehicles/${v.id}`}
                  className={`p-3 rounded-lg border transition hover:shadow-sm ${
                    overdue
                      ? 'border-danger/30 bg-danger/5'
                      : 'border-orange-300/40 bg-orange-50/50 dark:bg-orange-900/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{v.licensePlate}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      overdue ? 'bg-danger/10 text-danger' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {overdue ? 'Quá hạn' : 'Sắp tới'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{v.mostUrgent?.planName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {overdue
                      ? `Trễ ${formatNumber(Math.abs(v.mostUrgent?.remaining || 0))} km`
                      : `Còn ${formatNumber(v.mostUrgent?.remaining || 0)} km`}
                  </p>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">Không có xe cần bảo dưỡng</p>
        )}
      </div>
    </div>
  )
}
