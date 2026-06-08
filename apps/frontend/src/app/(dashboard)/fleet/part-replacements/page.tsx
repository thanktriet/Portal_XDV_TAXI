'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import Link from 'next/link'
import { useState } from 'react'
import { Plus, Truck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING:       { label: 'Chờ duyệt',        cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  APPROVED:      { label: 'Đã duyệt',          cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  REJECTED:      { label: 'Từ chối',           cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  PARTS_RETURNED:{ label: 'Đã trả phụ tùng',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
}

const TABS = ['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Đã trả phụ tùng', 'Từ chối']
const TAB_STATUS: Record<string, string | undefined> = {
  'Tất cả': undefined,
  'Chờ duyệt': 'PENDING',
  'Đã duyệt': 'APPROVED',
  'Đã trả phụ tùng': 'PARTS_RETURNED',
  'Từ chối': 'REJECTED',
}

export default function FleetPartReplacementsPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState('Tất cả')
  const [page, setPage] = useState(1)
  const isManager = ['SUPER_ADMIN', 'QUAN_LY_DOI_XE', 'GIAM_DOC_HAU_MAI'].includes(user?.role || '')

  const { data, isLoading } = useQuery({
    queryKey: ['fleet-part-replacements', tab, page],
    queryFn: async () => {
      const status = TAB_STATUS[tab]
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (status) params.set('status', status)
      if (!isManager && user?.branchId) params.set('branchId', user.branchId)
      const { data } = await api.get(`/fleet/part-replacements?${params}`)
      return data
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lệnh thay thế phụ tùng đội xe</h1>
        <Link
          href="/fleet/part-replacements/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Tạo lệnh thay thế
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Mã lệnh</th>
              <th className="text-left px-4 py-3 font-medium">Biển số xe</th>
              <th className="text-left px-4 py-3 font-medium">Chi nhánh</th>
              <th className="text-left px-4 py-3 font-medium">Mô tả</th>
              <th className="text-left px-4 py-3 font-medium">Số PT</th>
              <th className="text-left px-4 py-3 font-medium">Ngày tạo</th>
              <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
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
              : data?.data?.map((fpr: any) => {
                  const s = STATUS_CONFIG[fpr.status] || STATUS_CONFIG.PENDING
                  return (
                    <tr key={fpr.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3">
                        <Link href={`/fleet/part-replacements/${fpr.id}`} className="font-mono text-primary hover:underline">
                          {fpr.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium">{fpr.vehicle?.licensePlate}</td>
                      <td className="px-4 py-3 text-slate-500">{fpr.branch?.name}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">{fpr.description}</td>
                      <td className="px-4 py-3 text-slate-500">{fpr.items?.length}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(fpr.createdAt).toLocaleDateString('vi')}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
        {!isLoading && !data?.data?.length && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Truck className="w-10 h-10 mb-2" />
            <p>Không có lệnh thay thế nào</p>
          </div>
        )}
      </div>
    </div>
  )
}
