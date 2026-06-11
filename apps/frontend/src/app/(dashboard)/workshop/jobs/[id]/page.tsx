'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { formatNumber, formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { useState, type ReactNode } from 'react'
import { ArrowLeft, ChevronRight, FileText, X, Check, AlertTriangle, ArrowRightLeft, Wrench, Shield, Settings, Eye, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'

const statusLabels: Record<string, string> = {
  RECEIVED:      'Tiếp nhận',
  DIAGNOSING:    'Chẩn đoán',
  QUOTED:        'Đã báo giá',
  APPROVED:      'Duyệt sửa',
  WAITING_PARTS: 'Chờ phụ tùng',
  IN_PROGRESS:   'Đang sửa',
  QUALITY_CHECK: 'Kiểm tra CL',
  COMPLETED:     'Hoàn thành',
  DELIVERED:     'Đã bàn giao',
  REJECTED:      'Từ chối',
}

const statusColors: Record<string, string> = {
  RECEIVED:      'bg-slate-100 text-slate-600',
  DIAGNOSING:    'bg-blue-100 text-blue-700',
  QUOTED:        'bg-purple-100 text-purple-700',
  APPROVED:      'bg-primary/10 text-primary',
  WAITING_PARTS: 'bg-orange-100 text-orange-700',
  IN_PROGRESS:   'bg-warning/10 text-warning',
  QUALITY_CHECK: 'bg-cyan-100 text-cyan-700',
  COMPLETED:     'bg-success/10 text-success',
  DELIVERED:     'bg-success/10 text-success',
  REJECTED:      'bg-danger/10 text-danger',
}

const WORKFLOW_STEPS = [
  'RECEIVED', 'DIAGNOSING', 'QUOTED', 'APPROVED',
  'WAITING_PARTS', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED', 'DELIVERED',
]

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  RECEIVED:      ['DIAGNOSING'],
  DIAGNOSING:    ['QUOTED'],
  QUOTED:        ['APPROVED', 'REJECTED', 'DIAGNOSING'],
  APPROVED:      ['WAITING_PARTS', 'IN_PROGRESS'],
  WAITING_PARTS: ['IN_PROGRESS'],
  IN_PROGRESS:   ['QUALITY_CHECK'],
  QUALITY_CHECK: ['COMPLETED', 'IN_PROGRESS'],
  COMPLETED:     ['DELIVERED'],
  DELIVERED:     [],
  REJECTED:      ['DIAGNOSING'],
}

const FLEET_ROLES = ['QUAN_LY_DOI_XE', 'GIAM_DOC_HAU_MAI', 'SUPER_ADMIN']

const JOB_TYPE_CONFIG: Record<string, { label: string; desc: string; color: string; icon: ReactNode }> = {
  REPAIR:      { label: 'Sửa chữa tính phí', desc: 'Sửa chữa thông thường, khách hàng thanh toán', color: 'border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-400', icon: <Wrench className="w-5 h-5" /> },
  WARRANTY:    { label: 'Bảo hành',           desc: 'Sửa chữa trong thời gian bảo hành, không tính phí', color: 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400', icon: <Shield className="w-5 h-5" /> },
  MAINTENANCE: { label: 'Bảo dưỡng định kỳ', desc: 'Bảo dưỡng theo kế hoạch định kỳ',              color: 'border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400', icon: <Settings className="w-5 h-5" /> },
  INSPECTION:  { label: 'Kiểm tra',           desc: 'Kiểm tra tình trạng xe, không phát sinh sửa chữa', color: 'border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-400', icon: <Eye className="w-5 h-5" /> },
}

const DMS_HINTS: Record<string, string> = {
  QUOTED:        'Mã báo giá DMS (vd: BG-2025-001)',
  APPROVED:      'Mã duyệt / lệnh sửa chữa DMS',
  WAITING_PARTS: 'Mã đặt phụ tùng DMS (vd: PT-2025-001)',
  IN_PROGRESS:   'Mã lệnh sửa chữa / bảo hành DMS',
  COMPLETED:     'Mã hoàn công DMS',
  DELIVERED:     'Mã bàn giao DMS',
  REJECTED:      'Mã từ chối DMS (nếu có)',
}

function WorkflowStepper({ currentStatus }: { currentStatus: string }) {
  const currentIdx = WORKFLOW_STEPS.indexOf(currentStatus)
  const isRejected = currentStatus === 'REJECTED'
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {WORKFLOW_STEPS.map((step, idx) => (
        <div key={step} className="flex items-center">
          <div
            title={statusLabels[step]}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors ${
              isRejected && step === 'QUOTED'
                ? 'bg-danger/10 border-danger text-danger'
                : idx < currentIdx
                  ? 'bg-primary border-primary text-white'
                  : idx === currentIdx
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-slate-100 border-slate-300 text-slate-400 dark:bg-slate-700 dark:border-slate-600'
            }`}
          >
            {!isRejected && idx < currentIdx ? <Check className="w-3.5 h-3.5" /> : idx + 1}
          </div>
          {idx < WORKFLOW_STEPS.length - 1 && (
            <div className={`w-4 h-0.5 ${idx < currentIdx && !isRejected ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

interface TransitionForm {
  targetStatus: string
  note: string
  dmsRef: string
  estimatedCost: string
}

const statusConfigTransfer: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'Chờ duyệt', cls: 'bg-warning/10 text-warning' },
  APPROVED: { label: 'Đã duyệt',  cls: 'bg-success/10 text-success' },
  REJECTED: { label: 'Từ chối',   cls: 'bg-danger/10 text-danger' },
  REVERSED: { label: 'Hoàn trả',  cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' },
}

function TransferBatchesForJob({ jobId }: { jobId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['transfer-batches', 'job', jobId],
    queryFn: async () => {
      const { data } = await api.get('/parts/transfer-batches', { params: { jobId, limit: 20 } })
      return data
    },
  })

  if (isLoading) return <div className="py-4 text-center text-sm text-slate-400">Đang tải...</div>

  const batches = data?.data ?? []
  if (batches.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">Chưa có lô hoán đổi nào</p>
  }

  return (
    <div className="space-y-2">
      {batches.map((batch: any) => {
        const st = statusConfigTransfer[batch.status] || statusConfigTransfer.PENDING
        return (
          <Link
            key={batch.id}
            href={`/workshop/parts/transfers/${batch.id}`}
            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <div>
              <span className="font-medium text-sm text-primary">{batch.code}</span>
              <span className="text-xs text-slate-400 ml-2">{batch.lines?.length ?? batch._count?.lines ?? 0} dòng</span>
              {batch.note && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{batch.note}</p>}
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

export default function WorkshopJobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [transition, setTransition] = useState<TransitionForm | null>(null)
  const [editingJobType, setEditingJobType] = useState(false)

  const jobTypeMutation = useMutation({
    mutationFn: async (jobType: string) => {
      const { data } = await api.patch(`/workshop/jobs/${id}/job-type`, { jobType })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop', 'jobs', id] })
      toast.success('Đã cập nhật phân loại công việc')
      setEditingJobType(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật phân loại')
    },
  })

  const { data: job, isLoading } = useQuery({
    queryKey: ['workshop', 'jobs', id],
    queryFn: async () => {
      const { data } = await api.get(`/workshop/jobs/${id}`)
      return data
    },
  })

  const statusMutation = useMutation({
    mutationFn: async (payload: { status: string; note: string; dmsRef?: string; estimatedCost?: number }) => {
      const { data } = await api.patch(`/workshop/jobs/${id}/status`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop', 'jobs', id] })
      queryClient.invalidateQueries({ queryKey: ['workshop', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['fleet', 'approvals'] })
      toast.success('Cập nhật trạng thái thành công')
      setTransition(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật trạng thái')
    },
  })

  const handleConfirm = () => {
    if (!transition) return
    if (!transition.note.trim()) {
      toast.error('Vui lòng nhập ghi chú cho giai đoạn này')
      return
    }
    const payload: any = {
      status: transition.targetStatus,
      note: transition.note.trim(),
    }
    if (transition.dmsRef.trim()) payload.dmsRef = transition.dmsRef.trim()
    if (transition.targetStatus === 'QUOTED' && transition.estimatedCost) {
      payload.estimatedCost = Number(transition.estimatedCost)
    }
    statusMutation.mutate(payload)
  }

  const canTransitionTo = (targetStatus: string): boolean => {
    if (!user) return false
    if (targetStatus === 'APPROVED' || targetStatus === 'REJECTED') {
      return FLEET_ROLES.includes(user.role)
    }
    // Must have repair order with items before QUOTED
    if (targetStatus === 'QUOTED') {
      const hasItems = job?.repairOrders?.some((ro: any) => ro.items?.length > 0)
      if (!hasItems) return false
    }
    return true
  }

  if (isLoading || !job) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
    )
  }

  const nextStatuses = ALLOWED_TRANSITIONS[job.status] || []
  const isRejected = job.status === 'REJECTED'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{job.code}</h1>
          <p className="text-sm text-slate-500">{job.vehicle?.licensePlate} — {job.vehicle?.model?.name}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[job.status] || ''}`}>
          {statusLabels[job.status]}
        </span>
        {job.jobType && JOB_TYPE_CONFIG[job.jobType] && (
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${JOB_TYPE_CONFIG[job.jobType].color}`}>
            {JOB_TYPE_CONFIG[job.jobType].label}
          </span>
        )}
      </div>

      {/* Rejected banner */}
      {isRejected && (
        <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-danger">Báo giá bị từ chối</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Vui lòng xem lý do từ chối trong lịch sử tiến độ và cập nhật lại báo giá.
            </p>
          </div>
        </div>
      )}

      {/* Workflow Stepper */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <h3 className="text-sm font-medium text-slate-500">Tiến độ công việc</h3>
        <div className="overflow-x-auto pb-1">
          <WorkflowStepper currentStatus={job.status} />
        </div>

        <div className="flex flex-wrap gap-2">
          {nextStatuses.filter(canTransitionTo).map((next) => (
            <button
              key={next}
              onClick={() => setTransition({ targetStatus: next, note: '', dmsRef: '', estimatedCost: '' })}
              disabled={!!transition}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-40 ${
                next === 'REJECTED'
                  ? 'bg-danger hover:bg-danger/90 text-white'
                  : 'bg-primary hover:bg-primary/90 text-white'
              }`}
            >
              {next === 'REJECTED' ? <X className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {next === 'REJECTED' ? 'Từ chối báo giá'
                : next === 'DIAGNOSING' && isRejected ? 'Sửa lại báo giá'
                : statusLabels[next]}
            </button>
          ))}

          {nextStatuses.length > 0 && nextStatuses.filter(canTransitionTo).length === 0 && (
            <p className="text-sm text-slate-400 italic">
              {job.status === 'QUOTED'
                ? 'Đang chờ Quản lý Đội xe phê duyệt báo giá'
                : job.status === 'DIAGNOSING' && !job.repairOrders?.some((ro: any) => ro.items?.length > 0)
                  ? '⚠️ Tạo phiếu báo giá chi tiết trước khi gửi báo giá'
                  : 'Bạn không có quyền thực hiện bước tiếp theo'}
            </p>
          )}

          {job.status === 'DELIVERED' && (
            <span className="text-sm text-success font-medium flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Đã hoàn tất
            </span>
          )}
        </div>

        {transition && (
          <div className={`border rounded-xl p-4 space-y-3 ${
            transition.targetStatus === 'REJECTED'
              ? 'border-danger/30 bg-danger/5 dark:bg-danger/10'
              : 'border-primary/30 bg-primary/5 dark:bg-primary/10'
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                {transition.targetStatus === 'REJECTED' ? 'Từ chối báo giá — ' : 'Chuyển sang: '}
                <span className={transition.targetStatus === 'REJECTED' ? 'text-danger' : 'text-primary'}>
                  {transition.targetStatus === 'DIAGNOSING' && isRejected ? 'Sửa lại báo giá' : statusLabels[transition.targetStatus]}
                </span>
              </p>
              <button onClick={() => setTransition(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {transition.targetStatus === 'QUOTED' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Chi phí dự kiến (VNĐ) <span className="text-slate-400 font-normal">(tuỳ chọn)</span>
                </label>
                <input
                  type="number" min={0}
                  value={transition.estimatedCost}
                  onChange={(e) => setTransition({ ...transition, estimatedCost: e.target.value })}
                  placeholder="vd: 2500000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {transition.targetStatus === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú'}
                <span className="text-danger ml-0.5">*</span>
              </label>
              <textarea
                rows={2}
                value={transition.note}
                onChange={(e) => setTransition({ ...transition, note: e.target.value })}
                placeholder={transition.targetStatus === 'REJECTED'
                  ? 'Nêu rõ lý do từ chối để xưởng cập nhật lại...'
                  : 'Mô tả công việc đã thực hiện, kết quả kiểm tra...'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Mã lệnh DMS <span className="text-slate-400 font-normal">(tuỳ chọn)</span>
              </label>
              <input
                type="text"
                value={transition.dmsRef}
                onChange={(e) => setTransition({ ...transition, dmsRef: e.target.value })}
                placeholder={DMS_HINTS[transition.targetStatus] || 'Mã lệnh DMS'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={statusMutation.isPending || !transition.note.trim()}
                className={`flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 ${
                  transition.targetStatus === 'REJECTED' ? 'bg-danger hover:bg-danger/90' : 'bg-primary hover:bg-primary/90'
                }`}
              >
                <Check className="w-4 h-4" />
                {statusMutation.isPending ? 'Đang lưu...' : 'Xác nhận'}
              </button>
              <button onClick={() => setTransition(null)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Job Type Classification */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Phân loại công việc</h3>
          {job.jobType && !editingJobType && (
            <button
              onClick={() => setEditingJobType(true)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary transition"
            >
              <Pencil className="w-3.5 h-3.5" /> Thay đổi
            </button>
          )}
          {editingJobType && (
            <button
              onClick={() => setEditingJobType(false)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-danger transition"
            >
              <X className="w-3.5 h-3.5" /> Hủy
            </button>
          )}
        </div>
        {!job.jobType || editingJobType ? (
          <div className="space-y-2">
            {!job.jobType && (
              <p className="text-sm text-slate-500 mb-3">Chọn phân loại để tiếp tục xử lý công việc</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(JOB_TYPE_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => jobTypeMutation.mutate(key)}
                  disabled={jobTypeMutation.isPending}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition hover:shadow-sm disabled:opacity-50 ${
                    job.jobType === key
                      ? cfg.color + ' border-2'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  <span className={job.jobType === key ? '' : 'text-slate-400'}>{cfg.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{cfg.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cfg.desc}</p>
                  </div>
                  {job.jobType === key && <Check className="w-4 h-4 ml-auto shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${JOB_TYPE_CONFIG[job.jobType].color}`}>
            {JOB_TYPE_CONFIG[job.jobType].icon}
            <div>
              <p className="text-sm font-semibold">{JOB_TYPE_CONFIG[job.jobType].label}</p>
              <p className="text-xs opacity-75 mt-0.5">{JOB_TYPE_CONFIG[job.jobType].desc}</p>
            </div>
          </div>
        )}
      </div>

      {/* Job Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Thông tin</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Biển số</dt>
              <dd className="font-medium">
                <Link href={`/vehicles/${job.vehicle?.id}`} className="text-primary hover:underline">{job.vehicle?.licensePlate}</Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">VIN</dt>
              <dd className="font-medium text-xs">{job.vehicle?.vin}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">ODO vào xưởng</dt>
              <dd className="font-medium">{formatNumber(job.odoAtEntry)} km</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 shrink-0">Lý do vào xưởng</dt>
              <dd className="font-medium text-right">{job.entryReason}</dd>
            </div>
            {job.estimatedCost && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Chi phí dự kiến</dt>
                <dd className="font-semibold text-primary">{formatCurrency(Number(job.estimatedCost))}</dd>
              </div>
            )}
            {job.plan && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Kế hoạch BD</dt>
                <dd className="font-medium text-primary">{job.plan?.name}</dd>
              </div>
            )}
            {job.dmsRef && (
              <div className="flex justify-between">
                <dt className="text-slate-500 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Mã DMS</dt>
                <dd className="font-medium font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{job.dmsRef}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Cố vấn dịch vụ</dt>
              <dd className="font-medium">{job.advisor?.fullName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Kỹ thuật viên</dt>
              <dd className="font-medium">{job.technician?.title || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Chi nhánh</dt>
              <dd className="font-medium">{job.branch?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Ngày tiếp nhận</dt>
              <dd className="font-medium">{formatDateTime(job.receivedAt)}</dd>
            </div>
            {job.completedAt && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Ngày hoàn thành</dt>
                <dd className="font-medium">{formatDateTime(job.completedAt)}</dd>
              </div>
            )}
            {job.diagnosis && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 shrink-0">Chẩn đoán</dt>
                <dd className="font-medium text-right">{job.diagnosis}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Phiếu báo giá (RO)</h3>
            {['RECEIVED','DIAGNOSING','QUOTED','APPROVED','WAITING_PARTS','IN_PROGRESS','QUALITY_CHECK','COMPLETED'].includes(job.status) && (
              <Link href={`/workshop/repair-orders/new?jobId=${job.id}`} className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">+ Tạo báo giá</Link>
            )}
          </div>
          {job.repairOrders?.length > 0 ? (
            <div className="space-y-3">
              {job.repairOrders.map((ro: any) => (
                <Link key={ro.id} href={`/workshop/repair-orders/${ro.id}`}
                  className="block p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-primary">{ro.code}</span>
                    <span className="text-sm font-medium">{formatCurrency(Number(ro.totalCost))}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{ro.description}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">{ro.items?.length || 0} hạng mục</span>
                    <span className={`text-xs font-medium ${ro.status === 'COMPLETED' ? 'text-success' : 'text-warning'}`}>
                      {ro.status === 'COMPLETED' ? 'Hoàn thành' : ro.status === 'IN_PROGRESS' ? 'Đang thực hiện' : ro.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Chưa có RO nào</p>
          )}
        </div>
      </div>

      {/* Part Transfer Batches */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />Hoán đổi linh kiện
          </h3>
          {['APPROVED','WAITING_PARTS','IN_PROGRESS','QUALITY_CHECK','COMPLETED'].includes(job.status) && (
            <Link href={`/workshop/parts/transfers/new?jobId=${job.id}`} className="text-xs text-primary hover:underline">
              + Tạo lô hoán đổi
            </Link>
          )}
        </div>
        <TransferBatchesForJob jobId={job.id} />
      </div>

      {/* Status History */}
      {job.statusHistory?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Lịch sử tiến độ</h3>
          <div className="space-y-4">
            {job.statusHistory.map((log: any) => (
              <div key={log.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${log.toStatus === 'REJECTED' ? 'bg-danger' : 'bg-primary'}`} />
                  <div className="w-0.5 bg-slate-200 dark:bg-slate-600 flex-1 mt-1" />
                </div>
                <div className="pb-4 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[log.toStatus] || 'bg-slate-100 text-slate-500'}`}>
                      {statusLabels[log.toStatus]}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
                    <span className="text-xs text-slate-400">· {log.changedBy?.fullName}</span>
                  </div>
                  {log.note && <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{log.note}</p>}
                  {log.dmsRef && (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                      <FileText className="w-3 h-3" />{log.dmsRef}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
