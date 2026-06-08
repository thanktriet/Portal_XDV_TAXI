'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Users, Plus } from 'lucide-react'

export default function TechniciansPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ userId: '', title: 'Kỹ thuật viên', skillLevel: '3', specialty: '', branchId: '' })

  const { data: users } = useQuery({
    queryKey: ['users-for-tech'],
    queryFn: async () => { const { data } = await api.get('/users', { params: { limit: 100 } }); return data.data },
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => { const { data } = await api.get('/branches'); return data },
  })

  const { data: technicians, isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => { const { data } = await api.get('/technicians'); return data },
  })

  const mutation = useMutation({
    mutationFn: async (payload: any) => { const { data } = await api.post('/technicians', payload); return data },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] })
      toast.success('Thêm kỹ thuật viên thành công')
      setShowForm(false)
      setForm({ userId: '', title: 'Kỹ thuật viên', skillLevel: '3', specialty: '', branchId: '' })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6" />Kỹ thuật viên
          </h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý đội ngũ kỹ thuật</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" />Thêm KTV
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold mb-4">Thêm kỹ thuật viên</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
              <option value="">Chọn user</option>
              {users?.map((u: any) => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
            </select>
            <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
              <option value="">Chọn chi nhánh</option>
              {branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input type="text" placeholder="Chức danh" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            <select value={form.skillLevel} onChange={(e) => setForm({ ...form, skillLevel: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
              <option value="1">Level 1 - Mới</option>
              <option value="2">Level 2 - Cơ bản</option>
              <option value="3">Level 3 - Trung cấp</option>
              <option value="4">Level 4 - Cao cấp</option>
              <option value="5">Level 5 - Chuyên gia</option>
            </select>
            <input type="text" placeholder="Chuyên môn" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg">Hủy</button>
            <button onClick={() => form.userId && form.branchId && mutation.mutate({ ...form, skillLevel: Number(form.skillLevel) })} disabled={mutation.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50">
              {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Đang tải...</div>
        ) : !technicians?.length ? (
          <div className="p-8 text-center text-slate-400">Chưa có kỹ thuật viên nào</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Chức danh</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Chi nhánh</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Level</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Chuyên môn</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Đang xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {technicians.map((tech: any) => (
                <tr key={tech.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{tech.title}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{tech.branch?.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-0.5">
                      {'★'.repeat(tech.skillLevel)}{'☆'.repeat(5 - tech.skillLevel)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{tech.specialty || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tech.jobs?.length > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                      {tech.jobs?.length || 0} việc
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
