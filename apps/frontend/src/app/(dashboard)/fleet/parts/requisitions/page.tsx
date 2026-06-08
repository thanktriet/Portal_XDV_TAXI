'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import Link from 'next/link'
import { useState } from 'react'
import { Plus, Package } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  DRAFT:          { label: 'Nháp',              cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  SUBMITTED:      { label: 'Chờ QL đội xe',     cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  FLEET_APPROVED: { label: 'Chờ NV phụ tùng',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  PARTS_APPROVED: { label: 'Chờ GĐ duyệt',      cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  APPROVED:       { label: 'Đã duyệt',           cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  DISPATCHED:     { label: 'Đã gửi hàng',        cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  RECEIVED:       { label: 'Đã nhận',             cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  REJECTED:       { label: 'Từ chối',             cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  CANCELLED:      { label: 'Đã huỷ',             cls: 'bg-slate-100 text-slate-500' },
}

const TABS = ['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Đã gửi', 'Đã nhận', 'Từ chối']
const TAB_STATUS: Record<string, string | undefined> = {
  'Tất cả': undefined,
  'Chờ duyệt': 'SUBMITTED,FLEET_APPROVED,PARTS_APPROVED',
  'Đã duyệt': 'APPROVED',
  'Đã gửi': 'DISPATCHED',
  'Đã nhận': 'RECEIVED',
  'Từ chối': 'REJECTED',
}

export default function FleetPartRequisitionsPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState('Tất cả')
  const [page, setPage] = useState(1)
  const isHQ = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI'].includes(user?.role || '')

  const { data, isLoading } = useQuery({
    queryKey: ['part-requisitions', tab, page, user?.branchId],
    queryFn: async () => {
      const status = TAB_STATUS[tab]
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (status) params.set('status', status)
      if (!isHQ && user?.branchId) params.set('fromBranchId', user.branchId)
      const { data } = await api.get(`/parts/requisitions?${params}`)
      return data
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Yêu cầu cấp phát phụ tùng</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tạo và theo dõi phiếu yêu cầu cấp phát từ xưởng về đội xe</p>
        </div>
        <Link
          href="/fleet/parts/requisitions/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Tạo phiếu yêu cầu
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
              <th className="text-left px-4 py-3 font-medium">Mã phiếu</th>
              <th className="text-left px-4 py-3 font-medium">Chi nhánh yêu cầu</th>
              <th className="text-left px-4 py-3 font-medium">Kho cấp phát</th>
              <th className="text-left px-4 py-3 font-medium">Số dòng</th>
              <th className="text-left px-4 py-3 font-medium">Ngày tạo</th>
              <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.data?.map((req: any) => {
                  const s = STATUS_CONFIG[req.status] || STATUS_CONFIG.DRAFT
                  return (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3">
                        <Link href={`/fleet/parts/requisitions/${req.id}`} className="font-mono text-primary hover:underline">
                          {req.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{req.fromBranch?.name}</td>
                      <td className="px-4 py-3 text-slate-500">{req.toBranch?.name}</td>
                      <td className="px-4 py-3 text-slate-500">{req.lines?.length} phụ tùng</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(req.createdAt).toLocaleDateString('vi')}</td>
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
            <Package className="w-10 h-10 mb-2" />
            <p>Không có phiếu yêu cầu nào</p>
          </div>
        )}
      </div>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex justify-end gap-2">
          {Array.from({ length: data.meta.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-sm font-medium ${
                p === page ? 'bg-primary text-white' : 'border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
