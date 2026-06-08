'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'
import { formatNumber, formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { ClipboardCheck, Check, X, ChevronDown, ChevronUp } from 'lucide-react'

interface InlineForm {
  jobId: string
  targetStatus: 'APPROVED' | 'REJECTED'
  note: string
  dmsRef: string
}

export default function FleetApprovalsPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<InlineForm | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['fleet', 'approvals'],
    queryFn: async () => {
      const { data } = await api.get('/workshop/jobs', { params: { status: 'QUOTED', limit: 50 } })
      return data
    },
  })

  const mutation = useMutation({
    mutationFn: async (payload: { jobId: string; status: string; note: string; dmsRef?: string }) => {
      const { jobId, ...body } = payload
      const { data } = await api.patch(`/workshop/jobs/${jobId}/status`, body)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fleet', 'approvals'] })
      queryClient.invalidateQueries({ queryKey: ['workshop', 'jobs', variables.jobId] })
      queryClient.invalidateQueries({ queryKey: ['workshop', 'dashboard'] })
      toast.success(variables.status === 'APPROVED' ? 'Đã duyệt báo giá' : 'Đã từ chối báo giá')
      setForm(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật trạng thái')
    },
  })

  const handleSubmit = () => {
    if (!form) return
    if (!form.note.trim()) {
      toast.error('Vui lòng nhập ghi chú')
      return
    }
    mutation.mutate({
      jobId: form.jobId,
      status: form.targetStatus,
      note: form.note.trim(),
      ...(form.dmsRef.trim() ? { dmsRef: form.dmsRef.trim() } : {}),
    })
  }

  const jobs = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6" />Phê duyệt báo giá
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Danh sách công việc xưởng đang chờ phê duyệt
          {jobs.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-danger text-white text-xs font-medium">{jobs.length}</span>
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-16 text-center">
          <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Không có báo giá nào chờ duyệt</p>
          <p className="text-sm text-slate-400 mt-1">Xưởng sẽ gửi báo giá khi hoàn tất chẩn đoán</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job: any) => {
            const isExpanded = expanded === job.id
            const isActing = form?.jobId === job.id
            return (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                {/* Job card header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-primary">{job.code}</span>
                        {job.isWarranty && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">Bảo hành</span>
                        )}
                        {job.plan && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">BD: {job.plan.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 flex-wrap">
                        <span className="font-medium text-slate-900 dark:text-white">{job.vehicle?.licensePlate}</span>
                        <span className="text-slate-400">·</span>
                        <span>{job.vehicle?.model?.name}</span>
                        <span className="text-slate-400">·</span>
                        <span>{job.branch?.name}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : job.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">ODO vào xưởng</p>
                      <p className="font-medium">{formatNumber(job.odoAtEntry)} km</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Ngày tiếp nhận</p>
                      <p className="font-medium">{formatDateTime(job.receivedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Chi phí dự kiến</p>
                      <p className={`font-semibold ${job.estimatedCost ? 'text-primary' : 'text-slate-400'}`}>
                        {job.estimatedCost ? formatCurrency(Number(job.estimatedCost)) : 'Chưa có'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Cố vấn</p>
                      <p className="font-medium truncate">{job.advisor?.fullName || '—'}</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm">
                      <p className="text-xs text-slate-400 mb-1">Lý do vào xưởng</p>
                      <p className="text-slate-700 dark:text-slate-300">{job.entryReason}</p>
                      {job.diagnosis && (
                        <>
                          <p className="text-xs text-slate-400 mt-2 mb-1">Chẩn đoán</p>
                          <p className="text-slate-700 dark:text-slate-300">{job.diagnosis}</p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  {!isActing && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setForm({ jobId: job.id, targetStatus: 'APPROVED', note: '', dmsRef: '' })}
                        className="flex items-center gap-1.5 px-4 py-2 bg-success hover:bg-success/90 text-white text-sm font-medium rounded-lg transition"
                      >
                        <Check className="w-4 h-4" />Duyệt
                      </button>
                      <button
                        onClick={() => setForm({ jobId: job.id, targetStatus: 'REJECTED', note: '', dmsRef: '' })}
                        className="flex items-center gap-1.5 px-4 py-2 bg-danger hover:bg-danger/90 text-white text-sm font-medium rounded-lg transition"
                      >
                        <X className="w-4 h-4" />Từ chối
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline form */}
                {isActing && form && (
                  <div className={`border-t px-5 py-4 space-y-3 ${
                    form.targetStatus === 'REJECTED'
                      ? 'border-danger/20 bg-danger/5 dark:bg-danger/10'
                      : 'border-success/20 bg-success/5 dark:bg-success/10'
                  }`}>
                    <p className={`text-sm font-semibold ${form.targetStatus === 'REJECTED' ? 'text-danger' : 'text-success'}`}>
                      {form.targetStatus === 'APPROVED' ? 'Xác nhận duyệt báo giá' : 'Xác nhận từ chối báo giá'}
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {form.targetStatus === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú duyệt'}
                        <span className="text-danger ml-0.5">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                        placeholder={
                          form.targetStatus === 'REJECTED'
                            ? 'Nêu rõ lý do để xưởng cập nhật lại báo giá...'
                            : 'Ghi chú kèm theo (nếu có)...'
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Mã lệnh DMS <span className="text-slate-400 font-normal">(tuỳ chọn)</span>
                      </label>
                      <input
                        type="text"
                        value={form.dmsRef}
                        onChange={(e) => setForm({ ...form, dmsRef: e.target.value })}
                        placeholder={form.targetStatus === 'APPROVED' ? 'Mã duyệt DMS (vd: DMS-APV-001)' : 'Mã từ chối DMS (nếu có)'}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSubmit}
                        disabled={mutation.isPending || !form.note.trim()}
                        className={`flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 ${
                          form.targetStatus === 'REJECTED' ? 'bg-danger hover:bg-danger/90' : 'bg-success hover:bg-success/90'
                        }`}
                      >
                        {form.targetStatus === 'APPROVED' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {mutation.isPending ? 'Đang lưu...' : form.targetStatus === 'APPROVED' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                      </button>
                      <button
                        onClick={() => setForm(null)}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
