'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { formatNumber } from '@/lib/utils'

function NewReplacementForm() {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    vehicleId: '',
    branchId: user?.branchId || '',
    description: '',
    odoAtService: 0,
    note: '',
  })
  const [items, setItems] = useState<{ partId: string; quantity: number; description: string; oldPartCondition: string; note: string }[]>([
    { partId: '', quantity: 1, description: '', oldPartCondition: '', note: '' },
  ])

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', { branchId: form.branchId, limit: 100 }],
    enabled: !!form.branchId,
    queryFn: async () => {
      const { data } = await api.get(`/vehicles?branchId=${form.branchId}&limit=100`)
      return data.data
    },
  })

  const { data: parts } = useQuery({
    queryKey: ['parts', { branchId: form.branchId }],
    enabled: !!form.branchId,
    queryFn: async () => {
      const { data } = await api.get(`/workshop/parts?branchId=${form.branchId}&limit=200`)
      return data.data
    },
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await api.get('/branches')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/fleet/part-replacements', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-part-replacements'] })
      toast.success('Tạo lệnh thay thế thành công')
      router.push('/fleet/part-replacements')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi tạo lệnh'),
  })

  const addItem = () => setItems([...items, { partId: '', quantity: 1, description: '', oldPartCondition: '', note: '' }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: string, value: any) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)))

  const handleVehicleChange = (vehicleId: string) => {
    const v = vehicles?.find((v: any) => v.id === vehicleId)
    setForm({ ...form, vehicleId, odoAtService: v?.currentOdo || form.odoAtService })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (items.some((it) => !it.partId || !it.description))
      return toast.error('Vui lòng điền đầy đủ phụ tùng và mô tả')
    createMutation.mutate({ ...form, items })
  }

  const fleetBranches = branches?.filter((b: any) => b.type === 'FLEET' || b.type === 'COMBINED')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tạo lệnh thay thế phụ tùng</h1>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chi nhánh *</label>
              <select
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value, vehicleId: '' })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Chọn chi nhánh</option>
                {fleetBranches?.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Xe *</label>
              <select
                value={form.vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
                disabled={!form.branchId}
              >
                <option value="">Chọn xe</option>
                {vehicles?.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} — {v.model?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ODO khi thay (km) *</label>
              <input
                type="number"
                min={0}
                value={form.odoAtService}
                onChange={(e) => setForm({ ...form, odoAtService: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mô tả công việc *</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="VD: Thay lốp xe, thay dầu hộp số..."
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ghi chú</label>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Ghi chú thêm..."
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Phụ tùng thay thế *</p>
              <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-primary hover:underline">
                <Plus className="w-4 h-4" /> Thêm phụ tùng
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, i) => {
                const selectedPart = parts?.find((p: any) => p.id === item.partId)
                return (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-5">
                        <label className="block text-xs text-slate-500 mb-1">Phụ tùng *</label>
                        <select
                          value={item.partId}
                          onChange={(e) => {
                            const p = parts?.find((pt: any) => pt.id === e.target.value)
                            updateItem(i, 'partId', e.target.value)
                            if (p && !item.description) updateItem(i, 'description', p.name)
                          }}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          required
                          disabled={!form.branchId}
                        >
                          <option value="">Chọn phụ tùng</option>
                          {parts?.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — tồn: {p.stockQty} {p.unit}
                            </option>
                          ))}
                        </select>
                        {selectedPart && (
                          <p className="text-xs text-slate-400 mt-0.5">Tồn kho: {formatNumber(selectedPart.stockQty)} {selectedPart.unit}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">Số lượng *</label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          required
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-xs text-slate-500 mb-1">Mô tả chi tiết *</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(i, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Mô tả phụ tùng thay thế"
                          required
                        />
                      </div>
                      <div className="col-span-1 flex items-end pb-1">
                        <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1} className="p-1.5 text-slate-400 hover:text-red-500 transition disabled:opacity-30">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Tình trạng PT cũ</label>
                        <input
                          type="text"
                          value={item.oldPartCondition}
                          onChange={(e) => updateItem(i, 'oldPartCondition', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="VD: Mòn, hỏng, rò rỉ..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Ghi chú dòng</label>
                        <input
                          type="text"
                          value={item.note}
                          onChange={(e) => updateItem(i, 'note', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Ghi chú thêm..."
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo lệnh thay thế'}
            </button>
            <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewFleetReplacementPage() {
  return (
    <Suspense>
      <NewReplacementForm />
    </Suspense>
  )
}
