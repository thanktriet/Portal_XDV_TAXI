'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Truck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { formatNumber } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING:        { label: 'Chờ duyệt',       cls: 'bg-yellow-100 text-yellow-700' },
  APPROVED:       { label: 'Đã duyệt',         cls: 'bg-green-100 text-green-700' },
  REJECTED:       { label: 'Từ chối',          cls: 'bg-red-100 text-red-700' },
  PARTS_RETURNED: { label: 'Đã trả phụ tùng', cls: 'bg-blue-100 text-blue-700' },
}

const MANAGER_ROLES = ['SUPER_ADMIN', 'QUAN_LY_DOI_XE', 'GIAM_DOC_HAU_MAI']

export default function FleetReplacementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isManager = MANAGER_ROLES.includes(user?.role || '')

  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [returnedItems, setReturnedItems] = useState<Set<string>>(new Set())

  const { data: fpr, isLoading } = useQuery({
    queryKey: ['fleet-part-replacement', id],
    queryFn: async () => {
      const { data } = await api.get(`/fleet/part-replacements/${id}`)
      return data
    },
  })

  const approveMutation = useMutation({
    mutationFn: () => api.patch(`/fleet/part-replacements/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-part-replacement', id] })
      toast.success('Đã duyệt lệnh, kho đã trừ phụ tùng')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.patch(`/fleet/part-replacements/${id}/reject`, { reason: rejectReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-part-replacement', id] })
      toast.success('Đã từ chối lệnh')
      setShowReject(false)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  const returnMutation = useMutation({
    mutationFn: () => api.patch(`/fleet/part-replacements/${id}/return-parts`, { itemIds: Array.from(returnedItems) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-part-replacement', id] })
      toast.success('Đã ghi nhận trả phụ tùng cũ về kho')
      setReturnedItems(new Set())
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  if (isLoading) return <div className="h-64 flex items-center justify-center text-slate-400">Đang tải...</div>
  if (!fpr) return null

  const s = STATUS_CONFIG[fpr.status] || STATUS_CONFIG.PENDING
  const canApprove = isManager && fpr.status === 'PENDING'
  const canReturn = fpr.status === 'APPROVED' && fpr.items?.some((i: any) => !i.oldPartReturned)
  const unreturned = fpr.items?.filter((i: any) => !i.oldPartReturned) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{fpr.code}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {fpr.vehicle?.licensePlate} · {fpr.branch?.name} · {new Date(fpr.createdAt).toLocaleDateString('vi')}
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 mb-1">Xe</p>
          <p className="font-semibold">{fpr.vehicle?.licensePlate}</p>
          <p className="text-xs text-slate-400">{fpr.vehicle?.model?.name}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 mb-1">Chi nhánh</p>
          <p className="font-semibold">{fpr.branch?.name}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 mb-1">ODO khi thay</p>
          <p className="font-semibold">{formatNumber(fpr.odoAtService)} km</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 mb-1">KTV tạo lệnh</p>
          <p className="font-semibold">{fpr.createdBy?.fullName}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs text-slate-500 mb-1">Mô tả công việc</p>
        <p className="text-slate-800 dark:text-slate-200">{fpr.description}</p>
        {fpr.note && <p className="text-sm text-slate-500 mt-1">Ghi chú: {fpr.note}</p>}
      </div>

      {fpr.rejectedReason && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
          Lý do từ chối: {fpr.rejectedReason}
        </div>
      )}

      {/* Items table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-4 h-4" /> Phụ tùng thay thế
          </h2>
          {canReturn && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {unreturned.length} phụ tùng cũ chưa trả về kho tổng
            </p>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Phụ tùng</th>
              <th className="text-left px-4 py-3 font-medium">Mô tả</th>
              <th className="text-right px-4 py-3 font-medium">SL</th>
              <th className="text-left px-4 py-3 font-medium">Tình trạng PT cũ</th>
              <th className="text-center px-4 py-3 font-medium">PT cũ trả kho</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {fpr.items?.map((item: any) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-white">{item.part?.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{item.part?.code}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.description}</td>
                <td className="px-4 py-3 text-right">{item.quantity} {item.part?.unit}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{item.oldPartCondition || '—'}</td>
                <td className="px-4 py-3 text-center">
                  {item.oldPartReturned ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Đã trả
                    </span>
                  ) : canReturn ? (
                    <input
                      type="checkbox"
                      checked={returnedItems.has(item.id)}
                      onChange={(e) => {
                        const s = new Set(returnedItems)
                        if (e.target.checked) s.add(item.id)
                        else s.delete(item.id)
                        setReturnedItems(s)
                      }}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                  ) : (
                    <span className="text-slate-400 text-xs">Chưa trả</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      {canApprove && (
        <div className="flex gap-3">
          <button
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {approveMutation.isPending ? 'Đang duyệt...' : 'Duyệt lệnh & Xuất kho'}
          </button>
          <button
            onClick={() => setShowReject(true)}
            className="flex items-center gap-2 px-5 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition"
          >
            <XCircle className="w-4 h-4" /> Từ chối
          </button>
        </div>
      )}

      {canReturn && returnedItems.size > 0 && (
        <button
          onClick={() => returnMutation.mutate()}
          disabled={returnMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          {returnMutation.isPending ? 'Đang ghi nhận...' : `Xác nhận trả ${returnedItems.size} PT cũ về kho tổng`}
        </button>
      )}

      {showReject && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-red-700">Lý do từ chối *</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-red-300 bg-white dark:bg-slate-800 text-sm outline-none resize-none"
            placeholder="Nhập lý do..."
          />
          <div className="flex gap-2">
            <button
              onClick={() => { if (rejectReason.trim()) rejectMutation.mutate() }}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg disabled:opacity-50"
            >
              Xác nhận
            </button>
            <button onClick={() => setShowReject(false)} className="px-4 py-2 border border-slate-300 text-sm rounded-lg hover:bg-slate-50">Hủy</button>
          </div>
        </div>
      )}

      {fpr.approvedBy && (
        <p className="text-sm text-slate-500">
          {fpr.status === 'APPROVED' || fpr.status === 'PARTS_RETURNED' ? 'Duyệt bởi' : 'Từ chối bởi'}: {fpr.approvedBy.fullName} · {new Date(fpr.approvedAt).toLocaleString('vi')}
        </p>
      )}
    </div>
  )
}
