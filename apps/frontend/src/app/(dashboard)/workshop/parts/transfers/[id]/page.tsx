'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { useState } from 'react'
import { ArrowLeft, ArrowRightLeft, Check, X, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ duyệt', color: 'bg-warning/10 text-warning' },
  APPROVED: { label: 'Đã duyệt', color: 'bg-success/10 text-success' },
  REJECTED: { label: 'Từ chối', color: 'bg-danger/10 text-danger' },
  REVERSED: { label: 'Hoàn trả', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
}

export default function TransferBatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const canApprove = user && ['SUPER_ADMIN', 'QUAN_LY_XUONG'].includes(user.role)

  const { data: batch, isLoading } = useQuery({
    queryKey: ['transfer-batch', id],
    queryFn: async () => {
      const { data } = await api.get(`/parts/transfer-batches/${id}`)
      return data
    },
  })

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/parts/transfer-batches/${id}/approve`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-batch', id] })
      toast.success('Duyệt lô hoán đổi thành công')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi duyệt lô')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const { data } = await api.patch(`/parts/transfer-batches/${id}/reject`, { reason })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-batch', id] })
      toast.success('Đã từ chối lô hoán đổi')
      setShowRejectDialog(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi từ chối lô')
    },
  })

  const reverseMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/parts/transfer-batches/${id}/reverse`)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transfer-batch', id] })
      toast.success(`Tạo lô hoàn trả ${data.code} thành công`)
      router.push(`/workshop/parts/transfers/${data.id}`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi tạo lô hoàn trả')
    },
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
    )
  }

  if (!batch) {
    return <div className="text-center py-12 text-slate-500">Lô hoán đổi không tồn tại</div>
  }

  const status = statusConfig[batch.status] || statusConfig.PENDING

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/workshop/parts/transfers"
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {batch.code}
              </h1>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Tạo bởi {batch.createdBy?.fullName} • {formatDateTime(batch.createdAt)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canApprove && batch.status === 'PENDING' && (
            <>
              <button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-success hover:bg-success-600 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Duyệt
              </button>
              <button
                onClick={() => setShowRejectDialog(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-danger hover:bg-danger-600 text-white rounded-lg font-medium transition"
              >
                <X className="w-4 h-4" />
                Từ chối
              </button>
            </>
          )}
          {canApprove && batch.status === 'APPROVED' && (
            <button
              onClick={() => reverseMutation.mutate()}
              disabled={reverseMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Hoàn trả
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      {batch.note && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-500">Ghi chú:</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{batch.note}</p>
        </div>
      )}

      {batch.approvedBy && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-500">
            {batch.status === 'REJECTED' ? 'Từ chối' : 'Duyệt'} bởi:{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {batch.approvedBy.fullName}
            </span>{' '}
            • {formatDateTime(batch.approvedAt)}
          </p>
          {batch.rejectedReason && (
            <p className="text-sm text-danger mt-1">Lý do: {batch.rejectedReason}</p>
          )}
        </div>
      )}

      {batch.reversedFrom && (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-500">
            Hoàn trả từ lô:{' '}
            <Link href={`/workshop/parts/transfers/${batch.reversedFrom.id}`} className="text-primary hover:underline font-medium">
              {batch.reversedFrom.code}
            </Link>
          </p>
        </div>
      )}

      {batch.reversals?.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-500">
            Lô hoàn trả:{' '}
            {batch.reversals.map((r: any) => (
              <Link key={r.id} href={`/workshop/parts/transfers/${r.id}`} className="text-primary hover:underline font-medium">
                {r.code} ({statusConfig[r.status]?.label})
              </Link>
            ))}
          </p>
        </div>
      )}

      {/* Lines table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Chi tiết hoán đổi ({batch.lines.length} dòng)
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <th className="text-left px-4 py-3 font-medium text-slate-500">Linh kiện</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Xe nguồn</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500">→</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Xe đích</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500">SL</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {batch.lines.map((line: any) => (
              <tr key={line.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900 dark:text-white">{line.itemDescription}</p>
                  {line.part && <p className="text-xs text-slate-400">{line.part.code}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  <p className="font-medium">{line.fromVehicle?.licensePlate}</p>
                  <p className="text-xs text-slate-400">{line.fromVehicle?.model?.name}</p>
                </td>
                <td className="px-4 py-3 text-center text-slate-400">→</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  <p className="font-medium">{line.toVehicle?.licensePlate}</p>
                  <p className="text-xs text-slate-400">{line.toVehicle?.model?.name}</p>
                </td>
                <td className="px-4 py-3 text-center font-medium text-slate-900 dark:text-white">
                  {line.quantity}
                </td>
                <td className="px-4 py-3 text-slate-500">{line.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Từ chối lô hoán đổi
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowRejectDialog(false); setRejectReason('') }}
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Hủy
              </button>
              <button
                onClick={() => rejectReason && rejectMutation.mutate(rejectReason)}
                disabled={!rejectReason || rejectMutation.isPending}
                className="px-4 py-2 text-sm bg-danger hover:bg-danger-600 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
