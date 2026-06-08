'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { formatNumber } from '@/lib/utils'
import { Settings2, Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react'

const EMPTY_FORM = { name: '', intervalKm: '', description: '', tasks: '' }

export default function MaintenancePlansPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: plans, isLoading } = useQuery({
    queryKey: ['maintenance-plans'],
    queryFn: async () => {
      const { data } = await api.get('/maintenance/plans')
      return data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        intervalKm: Number(form.intervalKm),
        description: form.description.trim() || undefined,
        tasks: form.tasks
          ? form.tasks.split('\n').map((t) => t.trim()).filter(Boolean)
          : [],
      }
      if (editing) {
        const { data } = await api.patch(`/maintenance/plans/${editing.id}`, payload)
        return data
      }
      const { data } = await api.post('/maintenance/plans', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      toast.success(editing ? 'Cập nhật kế hoạch thành công' : 'Tạo kế hoạch thành công')
      resetForm()
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi lưu kế hoạch'),
  })

  const toggleMutation = useMutation({
    mutationFn: async (plan: any) => {
      const { data } = await api.patch(`/maintenance/plans/${plan.id}`, {
        isActive: !plan.isActive,
      })
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] }),
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/maintenance/plans/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      toast.success('Đã xóa kế hoạch')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi xóa'),
  })

  const resetForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const startEdit = (plan: any) => {
    setEditing(plan)
    setForm({
      name: plan.name,
      intervalKm: String(plan.intervalKm),
      description: plan.description || '',
      tasks: (plan.tasks || []).join('\n'),
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.intervalKm) return
    saveMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings2 className="w-6 h-6" />Cấu hình kế hoạch bảo dưỡng
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Định nghĩa các mốc bảo dưỡng theo số km — hệ thống sẽ tự nhắc khi xe đến ngưỡng
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />Thêm kế hoạch
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            {editing ? 'Sửa kế hoạch' : 'Thêm kế hoạch mới'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tên kế hoạch *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Thay dầu động cơ"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Chu kỳ (km) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.intervalKm}
                  onChange={(e) => setForm({ ...form, intervalKm: e.target.value })}
                  placeholder="5000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mô tả
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mô tả ngắn về kế hoạch..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Danh sách công việc <span className="text-slate-400 font-normal">(mỗi dòng 1 việc)</span>
              </label>
              <textarea
                rows={4}
                value={form.tasks}
                onChange={(e) => setForm({ ...form, tasks: e.target.value })}
                placeholder={'Thay dầu động cơ\nThay lọc dầu\nKiểm tra phanh'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Tạo mới'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2 border border-slate-300 dark:border-slate-600 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plans list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !plans?.length ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400">
          <Settings2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chưa có kế hoạch bảo dưỡng nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan: any) => (
            <div
              key={plan.id}
              className={`bg-white dark:bg-slate-800 rounded-xl border p-5 transition ${
                plan.isActive
                  ? 'border-slate-200 dark:border-slate-700'
                  : 'border-slate-200 dark:border-slate-700 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{plan.name}</h3>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatNumber(plan.intervalKm)} km
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(plan)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition"
                    title="Sửa"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleMutation.mutate(plan)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    title={plan.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                  >
                    {plan.isActive
                      ? <CheckCircle2 className="w-4 h-4 text-success" />
                      : <XCircle className="w-4 h-4 text-slate-400" />
                    }
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Xóa kế hoạch "${plan.name}"?`)) deleteMutation.mutate(plan.id)
                    }}
                    className="p-1.5 rounded-lg hover:bg-danger/10 text-slate-400 hover:text-danger transition"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {plan.description && (
                <p className="text-xs text-slate-500 mb-3">{plan.description}</p>
              )}

              {plan.tasks?.length > 0 && (
                <ul className="space-y-1">
                  {plan.tasks.map((task: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                      {task}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-400">
                  {plan._count?.records || 0} lần bảo dưỡng đã ghi
                  {!plan.isActive && ' · Đã vô hiệu'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
