'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ClipboardList, Plus, Search } from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Đang mở', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  IN_PROGRESS: { label: 'Đang sửa', cls: 'bg-warning/10 text-warning' },
  CLOSED: { label: 'Hoàn tất', cls: 'bg-success/10 text-success' },
  CANCELLED: { label: 'Hủy', cls: 'bg-slate-100 text-slate-500' },
}

export default function RepairOrdersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['repair-orders', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const { data } = await api.get(`/workshop/repair-orders?${params}`)
      return data
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-6 h-6" />Lệnh sửa chữa
        </h1>
        <Link
          href="/workshop/repair-orders/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />Tạo lệnh
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm theo mã, mô tả..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Mã RO</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Xe</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Mô tả</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Trạng thái</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Tổng tiền</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Ngày mở</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                : data?.data?.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Chưa có lệnh sửa chữa nào
                    </td>
                  </tr>
                )
                : data?.data?.map((ro: any) => {
                    const status = STATUS_LABEL[ro.status] || { label: ro.status, cls: '' }
                    return (
                      <tr key={ro.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                        <td className="px-4 py-3">
                          <Link
                            href={`/workshop/repair-orders/${ro.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {ro.code}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          <div className="font-medium">{ro.job?.vehicle?.licensePlate}</div>
                          <div className="text-xs text-slate-400">{ro.job?.vehicle?.model?.name}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {ro.description}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                          {formatCurrency(ro.totalCost || 0)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {formatDate(ro.openedAt)}
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500">
              {data.meta.total} lệnh
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Trước
              </button>
              <span className="px-3 py-1 text-sm text-slate-600 dark:text-slate-300">
                {page} / {data.meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                disabled={page === data.meta.totalPages}
                className="px-3 py-1 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
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
