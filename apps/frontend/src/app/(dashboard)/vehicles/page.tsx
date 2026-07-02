'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/utils'
import { Car, Plus, Search, Download } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'

const VEHICLE_WRITE_ROLES = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_XUONG', 'QUAN_LY_DOI_XE']

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Hoạt động', color: 'bg-success/10 text-success' },
  RESTING: { label: 'Nghỉ', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  IN_WORKSHOP: { label: 'Trong xưởng', color: 'bg-warning/10 text-warning' },
  ACCIDENT: { label: 'Tai nạn', color: 'bg-danger/10 text-danger' },
  DECOMMISSIONED: { label: 'Thanh lý', color: 'bg-slate-100 text-slate-500' },
}

// Trạng thái hạn: đỏ nếu đã hết, cam nếu còn <=30 ngày, xanh nếu còn hạn
function expiryStatus(date?: string | null): { label: string; cls: string } | null {
  if (!date) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const days = Math.round((target.getTime() - now.getTime()) / 86400000)
  if (days < 0) return { label: `Quá hạn ${Math.abs(days)}d`, cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
  if (days <= 30) return { label: `Còn ${days}d`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' }
  return { label: `Còn ${days}d`, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' }
}

export default function VehiclesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const { user } = useAuthStore()
  const canWrite = VEHICLE_WRITE_ROLES.includes(user?.role || '')

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', { search, page }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)
      const { data } = await api.get(`/vehicles?${params}`)
      return data
    },
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await api.get(`/vehicles/export?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      const today = new Date().toISOString().slice(0, 10)
      link.download = `danh-sach-xe-${today}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Đã xuất file Excel')
    } catch {
      toast.error('Lỗi xuất file Excel')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Quản lý xe
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
          {canWrite && (
            <Link
              href="/vehicles/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Thêm xe
            </Link>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm biển số, VIN..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Biển số</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Model</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Chi nhánh</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">ODO</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Hạn đăng kiểm</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Hạn bảo hiểm</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Trạng thái</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Ngày ĐK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : data?.data?.length > 0 ? (
                data.data.map((vehicle: any) => {
                  const status = statusLabels[vehicle.status] || statusLabels.ACTIVE
                  return (
                    <tr
                      key={vehicle.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/vehicles/${vehicle.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {vehicle.licensePlate}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {vehicle.model?.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {vehicle.branch?.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {formatNumber(vehicle.currentOdo)} km
                      </td>
                      <td className="px-4 py-3">
                        {vehicle.inspectionExpiry ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-600 dark:text-slate-300 text-xs">{formatDate(vehicle.inspectionExpiry)}</span>
                            {(() => { const s = expiryStatus(vehicle.inspectionExpiry); return s ? <span className={`inline-flex w-fit px-1.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span> : null })()}
                          </div>
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {vehicle.insuranceExpiry ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-600 dark:text-slate-300 text-xs">{formatDate(vehicle.insuranceExpiry)}</span>
                            {(() => { const s = expiryStatus(vehicle.insuranceExpiry); return s ? <span className={`inline-flex w-fit px-1.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span> : null })()}
                          </div>
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {vehicle.registeredAt ? formatDate(vehicle.registeredAt) : '—'}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Chưa có xe nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500">
              Hiển thị {(page - 1) * 20 + 1}–{Math.min(page * 20, data.meta.total)} / {data.meta.total} xe
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
