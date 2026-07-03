'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowRightLeft, Check, X, Truck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

const TRANSFER_APPROVE_ROLES = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_DOI_XE']
const HQ_ROLES = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI']

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Chờ duyệt',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  APPROVED:  { label: 'Đã duyệt',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  RECEIVED:  { label: 'Đã nhận',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  REJECTED:  { label: 'Từ chối',    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  CANCELLED: { label: 'Đã huỷ',     color: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
}

const TABS = [
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Chờ nhận' },
  { key: 'RECEIVED', label: 'Đã hoàn tất' },
  { key: '', label: 'Tất cả' },
]

export default function FleetTransfersPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [tab, setTab] = useState('PENDING')

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['fleet', 'transfers', tab],
    queryFn: async () => {
      const { data } = await api.get('/vehicles/transfers', { params: tab ? { status: tab } : {} })
      return data
    },
  })

  const actionMutation = useMutation({
    mutationFn: async ({ transferId, action, reason }: { transferId: string; action: 'approve' | 'receive' | 'reject'; reason?: string }) => {
      const { data } = await api.patch(`/vehicles/transfers/${transferId}/${action}`, action === 'reject' ? { reason } : {})
      return data
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'transfers'] })
      const msg = vars.action === 'approve' ? 'Đã duyệt điều chuyển'
        : vars.action === 'receive' ? 'Đã xác nhận nhận xe'
        : 'Đã từ chối điều chuyển'
      toast.success(msg)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi xử lý điều chuyển')
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6" />Điều chuyển xe
        </h1>
        <p className="text-sm text-slate-500 mt-1">Duyệt và xác nhận các yêu cầu điều chuyển xe giữa các đơn vị</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !transfers?.length ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Không có yêu cầu điều chuyển</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((transfer: any) => {
            const st = statusConfig[transfer.status] || statusConfig.PENDING
            const canApprove = TRANSFER_APPROVE_ROLES.includes(user?.role || '') && transfer.status === 'PENDING'
            const canReject = TRANSFER_APPROVE_ROLES.includes(user?.role || '') && ['PENDING', 'APPROVED'].includes(transfer.status)
            const canReceive = transfer.status === 'APPROVED' &&
              (HQ_ROLES.includes(user?.role || '') || user?.branchId === transfer.toBranchId)
            return (
              <div key={transfer.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {transfer.code && <span className="text-xs font-mono text-slate-400">{transfer.code}</span>}
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/vehicles/${transfer.vehicle?.id}`} className="font-semibold text-primary hover:underline">
                        {transfer.vehicle?.licensePlate}
                      </Link>
                      <span className="text-sm text-slate-400">{transfer.vehicle?.model?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{transfer.fromBranch?.name}</span>
                      <ArrowRightLeft className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{transfer.toBranch?.name}</span>
                    </div>
                    {transfer.reason && <p className="text-sm text-slate-500 mt-0.5">Lý do: {transfer.reason}</p>}
                    {transfer.rejectedReason && <p className="text-sm text-danger mt-0.5">Từ chối: {transfer.rejectedReason}</p>}
                    <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                      <p>Tạo bởi: {transfer.createdBy?.fullName || '—'} · {formatDate(transfer.createdAt)}</p>
                      {transfer.approvedBy && <p>Duyệt bởi: {transfer.approvedBy.fullName} · {formatDate(transfer.approvedAt)}</p>}
                      {transfer.receivedBy && <p>Nhận bởi: {transfer.receivedBy.fullName} · {formatDate(transfer.receivedAt)}</p>}
                    </div>
                  </div>
                  {(canApprove || canReject || canReceive) && (
                    <div className="flex flex-col gap-2 shrink-0">
                      {canApprove && (
                        <button
                          onClick={() => actionMutation.mutate({ transferId: transfer.id, action: 'approve' })}
                          disabled={actionMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Duyệt
                        </button>
                      )}
                      {canReceive && (
                        <button
                          onClick={() => actionMutation.mutate({ transferId: transfer.id, action: 'receive' })}
                          disabled={actionMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Đã nhận xe
                        </button>
                      )}
                      {canReject && (
                        <button
                          onClick={() => {
                            const reason = window.prompt('Lý do từ chối điều chuyển:')
                            if (reason && reason.trim()) {
                              actionMutation.mutate({ transferId: transfer.id, action: 'reject', reason: reason.trim() })
                            }
                          }}
                          disabled={actionMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-danger/40 text-danger hover:bg-danger/10 rounded-lg font-medium transition disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" /> Từ chối
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
