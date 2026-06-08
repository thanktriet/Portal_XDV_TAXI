'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useState } from 'react'
import { Users, Plus, Shield, Building2 } from 'lucide-react'

export default function UsersSettingsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    roleId: '',
    branchId: '',
  })

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users?limit=50')
      return data
    },
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await api.get('/branches')
      return data
    },
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      // We'll use a simple approach — roles from existing users
      return [
        { id: '', code: 'SUPER_ADMIN', name: 'Super Admin' },
        { id: '', code: 'GIAM_DOC_HAU_MAI', name: 'Giám đốc Hậu mãi' },
        { id: '', code: 'QUAN_LY_XUONG', name: 'Quản lý Xưởng' },
        { id: '', code: 'CO_VAN_DICH_VU', name: 'Cố vấn Dịch vụ' },
        { id: '', code: 'KY_THUAT_VIEN', name: 'Kỹ thuật viên' },
        { id: '', code: 'QUAN_LY_DOI_XE', name: 'Quản lý Đội xe' },
        { id: '', code: 'DIEU_HANH', name: 'Điều hành' },
        { id: '', code: 'TAI_XE', name: 'Tài xế' },
      ]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/users', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Tạo user thành công')
      setShowForm(false)
      setForm({ email: '', password: '', fullName: '', phone: '', roleId: '', branchId: '' })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi tạo user')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = { ...form }
    if (!payload.branchId) delete payload.branchId
    createMutation.mutate(payload)
  }

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    GIAM_DOC_HAU_MAI: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    QUAN_LY_XUONG: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    CO_VAN_DICH_VU: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    KY_THUAT_VIEN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    QUAN_LY_DOI_XE: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    DIEU_HANH: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    TAI_XE: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Quản lý người dùng
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Thêm user
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold mb-4 text-slate-900 dark:text-white">Thêm user mới</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Họ tên *</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mật khẩu *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Điện thoại</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vai trò *</label>
              <select
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Chọn vai trò</option>
                {usersData?.data?.[0]?.role &&
                  [...new Map(usersData.data.map((u: any) => [u.role.id, u.role])).values()].map((role: any) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))
                }
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chi nhánh</label>
              <select
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Không gắn chi nhánh</option>
                {branches?.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {createMutation.isPending ? 'Đang tạo...' : 'Tạo user'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Họ tên</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Vai trò</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Chi nhánh</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-4 py-3">
                        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                : usersData?.data?.map((user: any) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {user.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role?.code] || ''}`}>
                          {user.role?.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {user.branch?.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
