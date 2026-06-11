'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { toast } from 'sonner'
import { ArrowLeft, ClipboardList, Plus, Trash2, Wrench, Package } from 'lucide-react'

const RO_ELIGIBLE_STATUSES = ['RECEIVED', 'DIAGNOSING', 'QUOTED', 'APPROVED', 'WAITING_PARTS', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED']

interface ROItem {
  type: 'LABOR' | 'PART'
  description: string
  partId: string
  quantity: number
  unitPrice: number
}

function NewRepairOrderForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedJobId = searchParams.get('jobId') || ''

  const [form, setForm] = useState({ jobId: preselectedJobId, odo: '', description: '', dmsRef: '' })
  const [items, setItems] = useState<ROItem[]>([
    { type: 'LABOR', description: '', partId: '', quantity: 1, unitPrice: 0 },
  ])

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['workshop-jobs', 'ro-eligible'],
    queryFn: async () => {
      const { data } = await api.get('/workshop/jobs', { params: { limit: 100 } })
      return {
        ...data,
        data: (data.data ?? []).filter((j: any) => RO_ELIGIBLE_STATUSES.includes(j.status)),
      }
    },
  })

  const { data: partsData } = useQuery({
    queryKey: ['parts-list'],
    queryFn: async () => {
      const { data } = await api.get('/workshop/parts?limit=200')
      return data
    },
  })

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
      // 1. Create RO
      const { data: ro } = await api.post('/workshop/repair-orders', {
        jobId: form.jobId,
        odo: Number(form.odo),
        description: form.description,
        ...(form.dmsRef.trim() ? { dmsRef: form.dmsRef.trim() } : {}),
      })
      // 2. Add items
      const validItems = items.filter((i) => i.description.trim() && i.unitPrice > 0)
      for (const item of validItems) {
        await api.post(`/workshop/repair-orders/${ro.id}/items`, {
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          ...(item.type === 'PART' && item.partId ? { partId: item.partId } : {}),
        })
      }
      return ro
    },
    onSuccess: (ro) => {
      toast.success(`Tạo báo giá ${ro.code} thành công`)
      router.push(`/workshop/repair-orders/${ro.id}`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi tạo báo giá')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.jobId) { toast.error('Chọn công việc'); return }
    if (!form.odo) { toast.error('Nhập ODO'); return }
    if (!form.description.trim()) { toast.error('Nhập mô tả'); return }
    const validItems = items.filter((i) => i.description.trim() && i.unitPrice > 0)
    if (validItems.length === 0) { toast.error('Thêm ít nhất 1 hạng mục có giá tiền'); return }
    createMutation.mutate()
  }

  const addItem = () => {
    setItems([...items, { type: 'LABOR', description: '', partId: '', quantity: 1, unitPrice: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ROItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const selectPart = (index: number, partId: string) => {
    const part = partsData?.data?.find((p: any) => p.id === partId)
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      partId,
      description: part?.name || newItems[index].description,
      unitPrice: Number(part?.sellPrice) || newItems[index].unitPrice,
    }
    setItems(newItems)
  }

  const selectedJob = jobsData?.data?.find((j: any) => j.id === form.jobId)

  const statusLabel: Record<string, string> = {
    RECEIVED: 'Tiếp nhận', DIAGNOSING: 'Chẩn đoán', QUOTED: 'Đã báo giá',
    APPROVED: 'Duyệt sửa', WAITING_PARTS: 'Chờ phụ tùng', IN_PROGRESS: 'Đang sửa',
    QUALITY_CHECK: 'Kiểm tra CL', COMPLETED: 'Hoàn thành',
  }

  const totalLabor = items.filter((i) => i.type === 'LABOR').reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const totalParts = items.filter((i) => i.type === 'PART').reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const grandTotal = totalLabor + totalParts

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={preselectedJobId ? `/workshop/jobs/${preselectedJobId}` : '/workshop/repair-orders'}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-6 h-6" />Tạo báo giá
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Thông tin cơ bản */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Thông tin chung</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Công việc (Job) <span className="text-danger">*</span>
              </label>
              <select
                value={form.jobId}
                onChange={(e) => {
                  const job = jobsData?.data?.find((j: any) => j.id === e.target.value)
                  setForm({ ...form, jobId: e.target.value, odo: job?.odoAtEntry ? String(job.odoAtEntry) : form.odo })
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">{jobsLoading ? 'Đang tải...' : '-- Chọn công việc --'}</option>
                {jobsData?.data?.map((job: any) => (
                  <option key={job.id} value={job.id}>
                    {job.code} — {job.vehicle?.licensePlate} ({job.vehicle?.model?.name}) [{statusLabel[job.status] ?? job.status}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                ODO (km) <span className="text-danger">*</span>
              </label>
              <input
                type="number" min={0} value={form.odo}
                onChange={(e) => setForm({ ...form, odo: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
          </div>

          {selectedJob && (
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm">
              <span className="text-slate-500">Xe: </span>
              <span className="font-medium">{selectedJob.vehicle?.licensePlate}</span>
              <span className="text-slate-400 mx-2">·</span>
              <span className="text-slate-500">{selectedJob.vehicle?.model?.name}</span>
              <span className="text-slate-400 mx-2">·</span>
              <span className="text-slate-500">Lý do: </span>
              <span className="text-slate-700 dark:text-slate-300">{selectedJob.entryReason}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mô tả chung <span className="text-danger">*</span>
            </label>
            <textarea
              rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="VD: Thay má phanh + kiểm tra hệ thống treo"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              required
            />
          </div>
        </div>

        {/* Hạng mục báo giá */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Hạng mục báo giá</h3>
            <button
              type="button" onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" />Thêm
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-700/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">#{idx + 1}</span>
                    {item.type === 'LABOR'
                      ? <span className="flex items-center gap-1 text-xs font-medium text-blue-600"><Wrench className="w-3.5 h-3.5" />Công</span>
                      : <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><Package className="w-3.5 h-3.5" />Phụ tùng</span>
                    }
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="p-1 text-danger hover:bg-danger/10 rounded transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Loại</label>
                    <select
                      value={item.type}
                      onChange={(e) => updateItem(idx, 'type', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="LABOR">Công lao động</option>
                      <option value="PART">Phụ tùng</option>
                    </select>
                  </div>

                  {item.type === 'PART' && (
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Chọn phụ tùng</label>
                      <select
                        value={item.partId}
                        onChange={(e) => selectPart(idx, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">-- Chọn hoặc nhập tay --</option>
                        {partsData?.data?.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name} — {Number(p.sellPrice).toLocaleString('vi-VN')}đ</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs text-slate-500 mb-1">Mô tả</label>
                    <input
                      type="text" value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="Tên công việc / phụ tùng"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Số lượng</label>
                    <input
                      type="number" min={1} value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Đơn giá (VNĐ)</label>
                    <input
                      type="number" min={0} value={item.unitPrice || ''}
                      onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value) || 0)}
                      placeholder="500000"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {item.quantity > 0 && item.unitPrice > 0 && (
                  <p className="text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                    Thành tiền: <span className="text-primary">{(item.quantity * item.unitPrice).toLocaleString('vi-VN')}đ</span>
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Tổng cộng */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Công lao động:</span>
              <span className="font-medium">{totalLabor.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Phụ tùng:</span>
              <span className="font-medium">{totalParts.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
              <span>Tổng báo giá:</span>
              <span className="text-primary">{grandTotal.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
          >
            {createMutation.isPending ? 'Đang tạo...' : 'Tạo báo giá'}
          </button>
          <Link
            href={preselectedJobId ? `/workshop/jobs/${preselectedJobId}` : '/workshop/repair-orders'}
            className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Hủy
          </Link>
        </div>
      </form>
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
