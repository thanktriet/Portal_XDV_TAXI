'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import { Calendar, Plus, AlertTriangle, Settings2, CheckCircle2, Wrench } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

const statusConfig: Record<string, { label: string; color: string }> = {
  UPCOMING:  { label: 'Chưa đến hạn', color: 'bg-success/10 text-success' },
  DUE_SOON:  { label: 'Sắp đến hạn',  color: 'bg-warning/10 text-warning' },
  OVERDUE:   { label: 'Quá hạn',       color: 'bg-danger/10 text-danger' },
  COMPLETED: { label: 'Đã hoàn thành', color: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
}

const HQ_ROLES = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_XUONG']

export default function MaintenancePage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isHQ = HQ_ROLES.includes(user?.role || '')
  const userBranchId = !isHQ ? user?.branchId : undefined
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    vehicleId: '', planId: '', odoAtService: '',
    serviceDate: new Date().toISOString().slice(0, 10), cost: '', note: '',
  })
  const [tab, setTab] = useState<'due' | 'history'>('due')

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 200 } })
      return data.data
    },
  })

  const { data: plans } = useQuery({
    queryKey: ['maintenance-plans'],
    queryFn: async () => {
      const { data } = await api.get('/maintenance/plans')
      return data
    },
  })

  const { data: dueVehicles, isLoading: dueLoading } = useQuery({
    queryKey: ['maintenance-due', userBranchId],
    queryFn: async () => {
      const params: any = {}
      if (userBranchId) params.branchId = userBranchId
      const { data } = await api.get('/maintenance/due', { params })
      return data
    },
  })

  const { data: records, isLoading: recLoading } = useQuery({
    queryKey: ['maintenance-records'],
    queryFn: async () => {
      const { data } = await api.get('/maintenance/records', { params: { limit: 50 } })
      return data
    },
    enabled: tab === 'history',
  })

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/maintenance/records', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-records'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-due'] })
      toast.success('Ghi nhận bảo dưỡng thành công')
      setShowForm(false)
      setForm({ vehicleId: '', planId: '', odoAtService: '', serviceDate: new Date().toISOString().slice(0, 10), cost: '', note: '' })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vehicleId || !form.planId || !form.odoAtService) {
      toast.error('Điền đầy đủ: xe, kế hoạch và ODO')
      return
    }
    mutation.mutate({
      vehicleId: form.vehicleId,
      planId: form.planId,
      odoAtService: Number(form.odoAtService),
      serviceDate: form.serviceDate,
      cost: form.cost ? Number(form.cost) : undefined,
      note: form.note || undefined,
    })
  }

  const overdueCount = dueVehicles?.filter((v: any) => v.mostUrgent?.status === 'OVERDUE').length || 0
  const dueSoonCount = dueVehicles?.filter((v: any) => v.mostUrgent?.status === 'DUE_SOON').length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6" />Bảo dưỡng
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {dueVehicles?.length
              ? `${overdueCount > 0 ? `${overdueCount} xe quá hạn · ` : ''}${dueSoonCount} xe sắp đến hạn`
              : 'Tất cả xe trong ngưỡng an toàn'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/maintenance/plans"
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <Settings2 className="w-4 h-4" />Kế hoạch
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />Ghi nhận
          </button>
        </div>
      </div>

      {/* Summary chips */}
      {(overdueCount > 0 || dueSoonCount > 0) && (
        <div className="flex gap-3">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-danger/10 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-danger" />
              <span className="text-sm font-medium text-danger">{overdueCount} xe quá hạn</span>
            </div>
          )}
          {dueSoonCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-warning/10 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium text-warning">{dueSoonCount} xe sắp đến hạn (≤500 km)</span>
            </div>
          )}
        </div>
      )}

      {/* Form ghi nhận */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold mb-4 text-slate-900 dark:text-white">Ghi nhận bảo dưỡng</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Xe *</label>
              <select
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Chọn xe</option>
                {vehicles?.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} — {v.model?.name} (ODO: {formatNumber(v.currentOdo)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Kế hoạch *</label>
              <select
                value={form.planId}
                onChange={(e) => setForm({ ...form, planId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Chọn kế hoạch</option>
                {plans?.filter((p: any) => p.isActive).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} (mỗi {formatNumber(p.intervalKm)} km)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">ODO tại bảo dưỡng *</label>
              <input
                type="number" min={0}
                value={form.odoAtService}
                onChange={(e) => setForm({ ...form, odoAtService: e.target.value })}
                placeholder="15000"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ngày bảo dưỡng</label>
              <input
                type="date"
                value={form.serviceDate}
                onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Chi phí</label>
              <input
                type="number" min={0}
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder="500000"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ghi chú</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Tuỳ chọn..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-5 py-2 text-sm bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
              >
                {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {[
          { key: 'due', label: `Cần bảo dưỡng${dueVehicles?.length ? ` (${dueVehicles.length})` : ''}` },
          { key: 'history', label: 'Lịch sử' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
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

      {/* Due vehicles tab */}
      {tab === 'due' && (
        dueLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !dueVehicles?.length ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Tất cả xe đang trong ngưỡng an toàn</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dueVehicles.map((vehicle: any) => (
              <div
                key={vehicle.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border p-4 ${
                  vehicle.mostUrgent?.status === 'OVERDUE'
                    ? 'border-danger/30 dark:border-danger/20'
                    : 'border-warning/30 dark:border-warning/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-slate-900 dark:text-white">{vehicle.licensePlate}</span>
                      <span className="text-sm text-slate-400">{vehicle.modelName}</span>
                      {vehicle.branchName && (
                        <span className="text-xs text-slate-400">· {vehicle.branchName}</span>
                      )}
                      <span className="text-xs text-slate-500">
                        ODO hiện tại: <span className="font-medium text-slate-700 dark:text-slate-300">{formatNumber(vehicle.currentOdo)} km</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {vehicle.dueItems.map((item: any) => (
                        <div
                          key={item.planId}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                            item.status === 'OVERDUE'
                              ? 'bg-danger/10 text-danger'
                              : 'bg-warning/10 text-warning'
                          }`}
                        >
                          <span>{item.planName}</span>
                          <span className="opacity-70">·</span>
                          <span>
                            {item.remaining <= 0
                              ? `Quá hạn ${formatNumber(Math.abs(item.remaining))} km`
                              : `Còn ${formatNumber(item.remaining)} km`}
                          </span>
                          <span className="opacity-70">·</span>
                          <span>Hạn tại {formatNumber(item.nextDueOdo)} km</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/workshop/jobs/new?vehicleId=${vehicle.id}&planId=${vehicle.mostUrgent.planId}`}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition"
                  >
                    <Wrench className="w-3 h-3" />Tạo Job BD
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {recLoading ? (
            <div className="p-8 text-center text-slate-400">Đang tải...</div>
          ) : !records?.data?.length ? (
            <div className="p-8 text-center text-slate-400">Chưa có bản ghi bảo dưỡng</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Xe</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Kế hoạch</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">ODO</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Đến hạn tiếp</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Chi phí</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {records.data.map((rec: any) => (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3">
                      <Link href={`/vehicles/${rec.vehicle?.id}`} className="font-medium text-primary hover:underline">
                        {rec.vehicle?.licensePlate}
                      </Link>
                      <p className="text-xs text-slate-400">{rec.vehicle?.model?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rec.plan?.name}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                      {formatNumber(rec.odoAtService)} km
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                      {formatNumber(rec.nextDueOdo)} km
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                      {rec.cost ? formatCurrency(Number(rec.cost)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {rec.serviceDate ? formatDate(rec.serviceDate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
