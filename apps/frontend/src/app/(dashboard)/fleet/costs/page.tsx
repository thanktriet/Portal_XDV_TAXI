'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { DollarSign, Plus } from 'lucide-react'

const categoryLabels: Record<string, string> = {
  ELECTRICITY: 'Điện',
  TIRE: 'Lốp',
  BRAKE: 'Phanh',
  INSURANCE: 'Bảo hiểm',
  MAINTENANCE: 'Bảo dưỡng',
  REPAIR: 'Sửa chữa',
  ACCIDENT: 'Tai nạn',
  OTHER: 'Khác',
}

export default function FleetCostsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ vehicleId: '', category: 'ELECTRICITY', amount: '', description: '', invoiceNo: '', costDate: new Date().toISOString().slice(0, 10) })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: async () => { const { data } = await api.get('/vehicles', { params: { limit: 200 } }); return data.data },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['fleet-costs'],
    queryFn: async () => { const { data } = await api.get('/fleet/costs', { params: { limit: 50 } }); return data },
  })

  const { data: summary } = useQuery({
    queryKey: ['fleet-costs-summary'],
    queryFn: async () => { const { data } = await api.get('/fleet/costs/summary'); return data },
  })

  const mutation = useMutation({
    mutationFn: async (payload: any) => { const { data } = await api.post('/fleet/costs', payload); return data },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-costs'] })
      queryClient.invalidateQueries({ queryKey: ['fleet-costs-summary'] })
      toast.success('Thêm chi phí thành công')
      setShowForm(false)
      setForm({ vehicleId: '', category: 'ELECTRICITY', amount: '', description: '', invoiceNo: '', costDate: new Date().toISOString().slice(0, 10) })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6" />Chi phí đội xe
          </h1>
          <p className="text-sm text-slate-500 mt-1">Theo dõi chi phí vận hành</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" />Thêm chi phí
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs text-slate-500">Tổng chi phí</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatNumber(summary.total)}đ</p>
          </div>
          {summary.byCategory?.slice(0, 3).map((cat: any) => (
            <div key={cat.category} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs text-slate-500">{categoryLabels[cat.category] || cat.category}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{formatNumber(cat.total)}đ</p>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold mb-4">Thêm chi phí mới</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
              <option value="">Chọn xe</option>
              {vehicles?.map((v: any) => <option key={v.id} value={v.id}>{v.licensePlate} - {v.model?.name}</option>)}
            </select>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
              {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="number" placeholder="Số tiền" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            <input type="text" placeholder="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            <input type="text" placeholder="Số hoá đơn" value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            <input type="date" value={form.costDate} onChange={(e) => setForm({ ...form, costDate: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg">Hủy</button>
            <button onClick={() => form.vehicleId && form.amount && mutation.mutate({ ...form, amount: Number(form.amount) })} disabled={mutation.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50">
              {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Đang tải...</div>
        ) : !data?.data?.length ? (
          <div className="p-8 text-center text-slate-400">Chưa có chi phí nào</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Ngày</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Xe</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Loại</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Số tiền</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Mô tả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.data.map((cost: any) => (
                <tr key={cost.id}>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(cost.costDate)}</td>
                  <td className="px-4 py-3 font-medium">{cost.vehicle?.licensePlate}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">{categoryLabels[cost.category] || cost.category}</span></td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{formatNumber(Number(cost.amount))}đ</td>
                  <td className="px-4 py-3 text-slate-500">{cost.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
