'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { toast } from 'sonner'
import { ArrowLeft, ClipboardList } from 'lucide-react'

// Statuses where a repair order makes sense
const RO_ELIGIBLE_STATUSES = ['APPROVED', 'WAITING_PARTS', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED']

function NewRepairOrderForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedJobId = searchParams.get('jobId') || ''

  const [form, setForm] = useState({ jobId: preselectedJobId, odo: '', description: '', dmsRef: '' })

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['workshop-jobs', 'ro-eligible'],
    queryFn: async () => {
      const { data } = await api.get('/workshop/jobs', {
        params: { limit: 100 },
      })
      // Filter to jobs that are in a state where RO makes sense
      return {
        ...data,
        data: (data.data ?? []).filter((j: any) => RO_ELIGIBLE_STATUSES.includes(j.status)),
      }
    },
  })

  // Pre-fill ODO from preselected job
  useEffect(() => {
    if (preselectedJobId && jobsData?.data) {
      const job = jobsData.data.find((j: any) => j.id === preselectedJobId)
      if (job && !form.odo) {
        setForm((f) => ({ ...f, jobId: preselectedJobId, odo: String(job.odoAtEntry ?? '') }))
      }
    }
  }, [preselectedJobId, jobsData])

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/workshop/repair-orders', {
        jobId: form.jobId,
        odo: Number(form.odo),
        description: form.description,
        ...(form.dmsRef.trim() ? { dmsRef: form.dmsRef.trim() } : {}),
      })
      return data
    },
    onSuccess: (ro) => {
      toast.success(`Tạo lệnh ${ro.code} thành công`)
      router.push(`/workshop/repair-orders/${ro.id}`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi tạo lệnh sửa chữa')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.jobId) { toast.error('Chọn công việc'); return }
    if (!form.odo) { toast.error('Nhập ODO hiện tại'); return }
    createMutation.mutate()
  }

  const selectedJob = jobsData?.data?.find((j: any) => j.id === form.jobId)

  const statusLabel: Record<string, string> = {
    APPROVED: 'Duyệt sửa',
    WAITING_PARTS: 'Chờ phụ tùng',
    IN_PROGRESS: 'Đang sửa',
    QUALITY_CHECK: 'Kiểm tra CL',
    COMPLETED: 'Hoàn thành',
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={preselectedJobId ? `/workshop/jobs/${preselectedJobId}` : '/workshop/repair-orders'}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-6 h-6" />Tạo lệnh sửa chữa
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Job select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Công việc (Job) <span className="text-danger">*</span>
            </label>
            <select
              value={form.jobId}
              onChange={(e) => {
                const job = jobsData?.data?.find((j: any) => j.id === e.target.value)
                setForm({
                  ...form,
                  jobId: e.target.value,
                  odo: job?.odoAtEntry ? String(job.odoAtEntry) : form.odo,
                })
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              required
            >
              <option value="">
                {jobsLoading ? 'Đang tải...' : jobsData?.data?.length === 0 ? 'Không có công việc phù hợp' : '-- Chọn công việc --'}
              </option>
              {jobsData?.data?.map((job: any) => (
                <option key={job.id} value={job.id}>
                  {job.code} — {job.vehicle?.licensePlate} ({job.vehicle?.model?.name}) [{statusLabel[job.status] ?? job.status}]
                </option>
              ))}
            </select>
            {!jobsLoading && jobsData?.data?.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                Chỉ hiện công việc đã được duyệt (APPROVED trở lên). Kiểm tra lại trạng thái job.
              </p>
            )}
          </div>

          {/* Vehicle info preview */}
          {selectedJob && (
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm space-y-1">
              <div className="flex gap-4 flex-wrap">
                <span className="text-slate-500">Xe: <span className="font-medium text-slate-900 dark:text-white">{selectedJob.vehicle?.licensePlate}</span> — {selectedJob.vehicle?.model?.name}</span>
                <span className="text-slate-500">Trạng thái: <span className="font-medium text-primary">{statusLabel[selectedJob.status] ?? selectedJob.status}</span></span>
              </div>
              {selectedJob.entryReason && (
                <p className="text-slate-500">Lý do vào xưởng: <span className="text-slate-700 dark:text-slate-300">{selectedJob.entryReason}</span></p>
              )}
            </div>
          )}

          {/* ODO */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              ODO hiện tại (km) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.odo}
              onChange={(e) => setForm({ ...form, odo: e.target.value })}
              placeholder="15000"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mô tả công việc <span className="text-danger">*</span>
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="VD: Thay má phanh trước + sau, kiểm tra hệ thống điện..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              required
            />
          </div>

          {/* DMS Ref */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mã lệnh DMS <span className="text-slate-400 text-xs font-normal">(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              value={form.dmsRef}
              onChange={(e) => setForm({ ...form, dmsRef: e.target.value })}
              placeholder="VD: DMS-RO-2025-001"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo lệnh sửa chữa'}
            </button>
            <Link
              href={preselectedJobId ? `/workshop/jobs/${preselectedJobId}` : '/workshop/repair-orders'}
              className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Hủy
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewRepairOrderPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />}>
      <NewRepairOrderForm />
    </Suspense>
  )
}
