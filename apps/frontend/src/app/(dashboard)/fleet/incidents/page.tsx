'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { AlertTriangle, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

const statusConfig: Record<string, { label: string; color: string }> = {
  NEW: { label: 'Mới', color: 'bg-danger/10 text-danger' },
  ACKNOWLEDGED: { label: 'Đã tiếp nhận', color: 'bg-warning/10 text-warning' },
  IN_PROGRESS: { label: 'Đang xử lý', color: 'bg-primary/10 text-primary' },
  RESOLVED: { label: 'Đã giải quyết', color: 'bg-success/10 text-success' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Thấp', color: 'text-slate-500' },
  MEDIUM: { label: 'TB', color: 'text-warning' },
  HIGH: { label: 'Cao', color: 'text-orange-500' },
  CRITICAL: { label: 'Nghiêm trọng', color: 'text-danger' },
}

export default function FleetIncidentsPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ vehicleId: '', description: '', priority: 'MEDIUM' })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: async () => { const { data } = await api.get('/vehicles', { params: { limit: 200 } }); return data.data },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['fleet-incidents'],
    queryFn: async () => { const { data } = await api.get('/fleet/incidents', { params: { limit: 50 } }); return data },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => { const { data } = await api.post('/fleet/incidents', payload); return data },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-incidents'] })
      toast.success('Báo sự cố thành công')
      setShowForm(false)
      setForm({ vehicleId: '', description: '', priority: 'MEDIUM' })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/fleet/incidents/${id}/status`, { status })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-incidents'] })
      toast.success('Cập nhật trạng thái thành công')
    },
  })

  const canManage = user && ['SUPER_ADMIN', 'QUAN_LY_DOI_XE', 'GIAM_DOC_HAU_MAI'].includes(user.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />Sự cố đội xe
          </h1>
          <p className="text-sm text-slate-500 mt-1">Báo cáo và theo dõi sự cố</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-danger hover:bg-danger-600 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" />Báo sự cố
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold mb-4">Báo sự cố mới</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
              <option value="">Chọn xe</option>
              {vehicles?.map((v: any) => <option key={v.id} value={v.id}>{v.licensePlate} - {v.model?.name}</option>)}
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="CRITICAL">Nghiêm trọng</option>
            </select>
            <div />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả sự cố..." rows={2} className="md:col-span-3 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none" />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg">Hủy</button>
            <button onClick={() => form.vehicleId && form.description && createMutation.mutate(form)} disabled={createMutation.isPending} className="px-4 py-2 text-sm bg-danger text-white rounded-lg font-medium disabled:opacity-50">
              {createMutation.isPending ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Đang tải...</div>
        ) : !data?.data?.length ? (
          <div className="p-8 text-center text-slate-400">Chưa có sự cố nào</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Mã</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Xe</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Mô tả</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Mức độ</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Trạng thái</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Ngày</th>
                {canManage && <th className="text-center px-4 py-3 font-medium text-slate-500">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.data.map((inc: any) => {
                const st = statusConfig[inc.status] || statusConfig.NEW
                const pr = priorityConfig[inc.priority] || priorityConfig.MEDIUM
                return (
                  <tr key={inc.id}>
                    <td className="px-4 py-3 font-medium text-primary">{inc.code}</td>
                    <td className="px-4 py-3">{inc.vehicle?.licensePlate}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">{inc.description}</td>
                    <td className={`px-4 py-3 text-center text-xs font-medium ${pr.color}`}>{pr.label}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span></td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(inc.createdAt)}</td>
                    {canManage && (
                      <td className="px-4 py-3 text-center">
                        {inc.status !== 'RESOLVED' && (
                          <select
                            value={inc.status}
                            onChange={(e) => statusMutation.mutate({ id: inc.id, status: e.target.value })}
                            className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                          >
                            <option value="NEW">Mới</option>
                            <option value="ACKNOWLEDGED">Tiếp nhận</option>
                            <option value="IN_PROGRESS">Đang xử lý</option>
                            <option value="RESOLVED">Đã giải quyết</option>
                          </select>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
