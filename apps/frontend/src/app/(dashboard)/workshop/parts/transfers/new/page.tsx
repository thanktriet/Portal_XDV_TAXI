'use client'

import { useState, Suspense } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface TransferLine {
  itemDescription: string
  fromVehicleId: string
  toVehicleId: string
  quantity: number
  note: string
}

const emptyLine = (): TransferLine => ({
  itemDescription: '',
  fromVehicleId: '',
  toVehicleId: '',
  quantity: 1,
  note: '',
})

function NewTransferBatchForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedJobId = searchParams.get('jobId') || ''

  const [note, setNote] = useState('')
  const [lines, setLines] = useState<TransferLine[]>([emptyLine()])

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 200 } })
      return data.data
    },
  })

  // Pre-fill fromVehicle if job is preselected — fetch job to get vehicleId
  const { data: jobData } = useQuery({
    queryKey: ['workshop', 'jobs', preselectedJobId],
    queryFn: async () => {
      const { data } = await api.get(`/workshop/jobs/${preselectedJobId}`)
      return data
    },
    enabled: !!preselectedJobId,
  })

  const mutation = useMutation({
    mutationFn: async (payload: { note?: string; jobId?: string; lines: TransferLine[] }) => {
      const { data } = await api.post('/parts/transfer-batches', payload)
      return data
    },
    onSuccess: (batch) => {
      toast.success('Tạo lô hoán đổi thành công')
      if (preselectedJobId) {
        router.push(`/workshop/jobs/${preselectedJobId}`)
      } else {
        router.push(`/workshop/parts/transfers/${batch.id}`)
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi tạo lô hoán đổi')
    },
  })

  const updateLine = (index: number, field: keyof TransferLine, value: any) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    )
  }

  const addLine = () => setLines((prev) => [...prev, emptyLine()])

  const removeLine = (index: number) => {
    if (lines.length === 1) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    const invalid = lines.find(
      (l) => !l.itemDescription.trim() || !l.fromVehicleId || !l.toVehicleId,
    )
    if (invalid) {
      toast.error('Điền đầy đủ: mô tả linh kiện, xe nguồn và xe đích cho mỗi dòng')
      return
    }
    mutation.mutate({
      note: note || undefined,
      jobId: preselectedJobId || undefined,
      lines,
    })
  }

  const vehicleLabel = (id: string) => {
    const v = vehicles?.find((v: any) => v.id === id)
    return v ? `${v.licensePlate}` : ''
  }

  const backHref = preselectedJobId
    ? `/workshop/jobs/${preselectedJobId}`
    : '/workshop/parts/transfers'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backHref} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Tạo lô hoán đổi linh kiện
          </h1>
          {preselectedJobId && jobData && (
            <p className="text-sm text-primary mt-0.5">
              Gắn với công việc: {jobData.code} — {jobData.vehicle?.licensePlate}
            </p>
          )}
          <p className="text-sm text-slate-500 mt-0.5">
            Ghi nhận linh kiện được chuyển giữa các xe — lưu lịch sử, không ảnh hưởng tồn kho
          </p>
        </div>
      </div>

      {/* Note */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Ghi chú chung
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Lý do hoán đổi, ghi chú..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </div>

      {/* Lines */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Danh sách hoán đổi
          </h3>
          <button
            onClick={addLine}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />Thêm dòng
          </button>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => (
            <div
              key={index}
              className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Dòng {index + 1}
                </span>
                <button
                  onClick={() => removeLine(index)}
                  disabled={lines.length === 1}
                  className="p-1 text-danger hover:bg-danger/10 rounded transition disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Linh kiện / Phụ tùng *</label>
                <input
                  type="text"
                  value={line.itemDescription}
                  onChange={(e) => updateLine(index, 'itemDescription', e.target.value)}
                  placeholder="VD: Lọc dầu động cơ, má phanh trước, ắc quy 12V..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-11 gap-2 items-end">
                <div className="md:col-span-5">
                  <label className="block text-xs text-slate-500 mb-1">Xe nguồn (lấy từ) *</label>
                  <select
                    value={line.fromVehicleId}
                    onChange={(e) => updateLine(index, 'fromVehicleId', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">-- Chọn xe nguồn --</option>
                    {vehicles?.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.licensePlate} — {v.model?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1 flex justify-center pb-2">
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>

                <div className="md:col-span-5">
                  <label className="block text-xs text-slate-500 mb-1">Xe đích (chuyển sang) *</label>
                  <select
                    value={line.toVehicleId}
                    onChange={(e) => updateLine(index, 'toVehicleId', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">-- Chọn xe đích --</option>
                    {vehicles
                      ?.filter((v: any) => v.id !== line.fromVehicleId)
                      .map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.licensePlate} — {v.model?.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Số lượng</label>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Ghi chú dòng</label>
                  <input
                    type="text"
                    value={line.note}
                    onChange={(e) => updateLine(index, 'note', e.target.value)}
                    placeholder="Tuỳ chọn..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {line.itemDescription && line.fromVehicleId && line.toVehicleId && (
                <p className="text-xs text-slate-500 bg-white dark:bg-slate-700 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-600">
                  Ghi nhận: <span className="text-slate-700 dark:text-slate-300 font-medium">{line.itemDescription}</span>
                  {' '}(x{line.quantity}) từ <span className="text-primary font-medium">{vehicleLabel(line.fromVehicleId)}</span>
                  {' '}→ <span className="text-primary font-medium">{vehicleLabel(line.toVehicleId)}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link
          href={backHref}
          className="px-5 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          Hủy
        </Link>
        <button
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="px-6 py-2 text-sm bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
        >
          {mutation.isPending ? 'Đang tạo...' : 'Tạo lô hoán đổi'}
        </button>
      </div>
    </div>
  )
}

export default function NewTransferBatchPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />}>
      <NewTransferBatchForm />
    </Suspense>
  )
}
