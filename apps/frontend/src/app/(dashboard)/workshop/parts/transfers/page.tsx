'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { Plus, ArrowRightLeft } from 'lucide-react'

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ duyệt', color: 'bg-warning/10 text-warning' },
  APPROVED: { label: 'Đã duyệt', color: 'bg-success/10 text-success' },
  REJECTED: { label: 'Từ chối', color: 'bg-danger/10 text-danger' },
  REVERSED: { label: 'Hoàn trả', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
}

const tabs = [
  { key: '', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'REJECTED', label: 'Từ chối' },
  { key: 'REVERSED', label: 'Hoàn trả' },
]

export default function TransferBatchesPage() {
  const [activeTab, setActiveTab] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['transfer-batches', activeTab, page],
    queryFn: async () => {
      const params: any = { page, limit: 20 }
      if (activeTab) params.status = activeTab
      const { data } = await api.get('/parts/transfer-batches', { params })
      return data
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6" />
            Hoán đổi phụ tùng
          </h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý hoán đổi phụ tùng giữa các xe</p>
        </div>
        <Link
          href="/workshop/parts/transfers/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Tạo lô mới
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Đang tải...</div>
        ) : !data?.data?.length ? (
          <div className="p-8 text-center text-slate-400">Chưa có lô hoán đổi nào</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Mã lô</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Ngày tạo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Người tạo</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Số dòng</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.data.map((batch: any) => {
                const status = statusConfig[batch.status] || statusConfig.PENDING
                return (
                  <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3">
                      <Link
                        href={`/workshop/parts/transfers/${batch.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {batch.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatDateTime(batch.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {batch.createdBy?.fullName}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                      {batch._count?.lines || batch.lines?.length || 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Trang {data.meta.page} / {data.meta.totalPages} ({data.meta.total} lô)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Trước
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
              disabled={page === data.meta.totalPages}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
