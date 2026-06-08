'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter } from 'lucide-react'
import { toast } from 'sonner'

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

const WORKFLOW_STEPS = [
  'RECEIVED', 'DIAGNOSING', 'QUOTED', 'APPROVED',
  'WAITING_PARTS', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED', 'DELIVERED',
]

function WorkflowStepper({ currentStatus }: { currentStatus: string }) {
  const currentIdx = WORKFLOW_STEPS.indexOf(currentStatus)
  return (
    <div className="flex items-center gap-0.5">
      {WORKFLOW_STEPS.map((step, idx) => (
        <div
          key={step}
          className={`h-1.5 w-4 rounded-full ${
            idx <= currentIdx ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'
          }`}
          title={statusLabels[step]}
        />
      ))}
    </div>
  )
}

export default function WorkshopJobsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['workshop', 'jobs', { search, status: statusFilter, page }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const { data } = await api.get(`/workshop/jobs?${params}`)
      return data
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Quản lý công việc xưởng
        </h1>
        <Link
          href="/workshop/jobs/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Tiếp nhận xe
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã job, biển số..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Mã Job</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Xe</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Lý do vào xưởng</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Trạng thái</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Tiến độ</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Ngày nhận</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">BH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : data?.data?.length > 0 ? (
                data.data.map((job: any) => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-4 py-3">
                      <Link
                        href={`/workshop/jobs/${job.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {job.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>
                        <p className="font-medium">{job.vehicle?.licensePlate}</p>
                        <p className="text-xs text-slate-400">{job.vehicle?.model?.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                      {job.entryReason}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status] || ''}`}>
                        {statusLabels[job.status] || job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <WorkflowStepper currentStatus={job.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatDate(job.receivedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {job.isWarranty && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          BH
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Chưa có công việc nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500">
              Trang {page}/{data.meta.totalPages} — {data.meta.total} kết quả
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Trước
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                disabled={page === data.meta.totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
