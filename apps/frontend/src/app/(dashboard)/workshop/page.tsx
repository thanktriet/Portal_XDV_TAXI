'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatNumber, formatCurrency } from '@/lib/utils'
import {
  Wrench,
  Clock,
  Package,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  Search as SearchIcon,
} from 'lucide-react'

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {value}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

const statusLabels: Record<string, string> = {
  RECEIVED: 'Tiếp nhận',
  DIAGNOSING: 'Chẩn đoán',
  QUOTED: 'Đã báo giá',
  APPROVED: 'Duyệt sửa',
  WAITING_PARTS: 'Chờ phụ tùng',
  IN_PROGRESS: 'Đang sửa',
  QUALITY_CHECK: 'Kiểm tra CL',
  COMPLETED: 'Hoàn thành',
  DELIVERED: 'Đã bàn giao',
}

const statusColors: Record<string, string> = {
  RECEIVED: 'bg-slate-100 text-slate-600',
  DIAGNOSING: 'bg-blue-100 text-blue-700',
  QUOTED: 'bg-purple-100 text-purple-700',
  APPROVED: 'bg-indigo-100 text-indigo-700',
  WAITING_PARTS: 'bg-danger/10 text-danger',
  IN_PROGRESS: 'bg-warning/10 text-warning',
  QUALITY_CHECK: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-success/10 text-success',
  DELIVERED: 'bg-slate-100 text-slate-500',
}

export default function WorkshopDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['workshop', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/workshop/dashboard')
      return data
    },
  })

  if (isLoading || !stats) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Xưởng Dịch vụ
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Tổng xe trong xưởng"
          value={formatNumber(stats.totalInWorkshop)}
          icon={Wrench}
          color="bg-primary"
        />
        <KpiCard
          title="Đang sửa chữa"
          value={formatNumber(stats.inProgress)}
          icon={Clock}
          color="bg-warning"
        />
        <KpiCard
          title="Chờ phụ tùng"
          value={formatNumber(stats.waitingParts)}
          icon={Package}
          color="bg-danger"
        />
        <KpiCard
          title="Chờ nghiệm thu"
          value={formatNumber(stats.qualityCheck)}
          icon={CheckCircle2}
          color="bg-success"
        />
        <KpiCard
          title="Hoàn thành"
          value={formatNumber(stats.completed)}
          icon={CheckCircle2}
          color="bg-success"
        />
        <KpiCard
          title="Quá hạn (>7 ngày)"
          value={formatNumber(stats.overdue)}
          icon={AlertTriangle}
          color="bg-danger"
        />
        <KpiCard
          title="Xe bảo hành"
          value={formatNumber(stats.warrantyCount)}
          icon={FileText}
          color="bg-primary"
        />
        <KpiCard
          title="Doanh thu tháng"
          value={formatCurrency(stats.revenueThisMonth)}
          icon={DollarSign}
          color="bg-success"
        />
      </div>

      {/* Recent Jobs */}
      {stats.recentJobs?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Công việc gần đây
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Mã</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Xe</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Lý do</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Cố vấn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {stats.recentJobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium text-primary">{job.code}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {job.vehicle?.licensePlate} — {job.vehicle?.model?.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                      {job.entryReason}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status] || ''}`}>
                        {statusLabels[job.status] || job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {job.advisor?.fullName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
