'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { useState } from 'react'
import { Package, Search, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

const ADMIN_ROLES = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_XUONG']

export default function FleetPartsPage() {
  const { user } = useAuthStore()
  const isAdmin = ADMIN_ROLES.includes(user?.role || '')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filterBranchId, setFilterBranchId] = useState(isAdmin ? '' : (user?.branchId || ''))

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await api.get('/branches')
      return data
    },
  })

  const fleetBranches = branches?.filter((b: any) => b.type === 'FLEET' || b.type === 'COMBINED')

  const { data, isLoading } = useQuery({
    queryKey: ['fleet-parts', { search, page, filterBranchId }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (filterBranchId) params.set('branchId', filterBranchId)
      const { data } = await api.get(`/workshop/parts?${params}`)
      return data
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Phụ tùng đội xe</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tồn kho phụ tùng tại chi nhánh. Nhận thêm qua phiếu yêu cầu cấp phát từ xưởng.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm mã hoặc tên phụ tùng..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {isAdmin && (
          <select
            value={filterBranchId}
            onChange={(e) => { setFilterBranchId(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tất cả chi nhánh</option>
            {fleetBranches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Mã</th>
                <th className="text-left px-4 py-3 font-medium">Tên phụ tùng</th>
                <th className="text-left px-4 py-3 font-medium">Nhóm</th>
                <th className="text-right px-4 py-3 font-medium">Tồn kho</th>
                <th className="text-right px-4 py-3 font-medium">Tối thiểu</th>
                <th className="text-right px-4 py-3 font-medium">Giá nhập</th>
                <th className="text-left px-4 py-3 font-medium">NCC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : data?.data?.length > 0
                ? data.data.map((part: any) => {
                    const stockQty = part.stocks?.[0]?.stockQty ?? 0
                    const isLow = stockQty <= part.minStock
                    return (
                      <tr key={part.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                        <td className="px-4 py-3 font-mono text-primary text-xs">{part.code}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{part.name}</td>
                        <td className="px-4 py-3 text-slate-500">{part.category?.name}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                            {formatNumber(stockQty)}
                          </span>
                          {isLow && <AlertTriangle className="inline w-3.5 h-3.5 text-red-500 ml-1" />}
                          <span className="text-slate-400 ml-1 text-xs">{part.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 text-xs">{part.minStock}</td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                          {formatCurrency(Number(part.costPrice))}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{part.supplier || '—'}</td>
                      </tr>
                    )
                  })
                : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Chưa có phụ tùng nào trong kho</p>
                      <p className="text-xs text-slate-400 mt-1">Tồn kho sẽ được cập nhật khi nhận phiếu cấp phát từ xưởng</p>
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-500">Trang {page}/{data.meta.totalPages} — {data.meta.total} phụ tùng</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Trước</button>
              <button onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))} disabled={page === data.meta.totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Sau</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
