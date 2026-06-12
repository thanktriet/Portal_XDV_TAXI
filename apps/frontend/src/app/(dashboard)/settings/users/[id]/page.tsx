'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'
import { ArrowLeft, User, Save, Key, Shield, Building2, History } from 'lucide-react'

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ fullName: '', phone: '', roleId: '', branchId: '', isActive: true })
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' })

  const { data: user, isLoading } = useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data } = await api.get(`/users/${id}`)
      return data as any
    },
  })

  // Sync form when user data loads
  const userLoaded = user?.id
  useState(() => {})
  if (user && form.fullName === '' && user.fullName) {
    setForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      roleId: user.roleId || '',
      branchId: user.branchId || '',
      isActive: user.isActive ?? true,
    })
  }

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => { const { data } = await api.get('/roles'); return data },
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => { const { data } = await api.get('/branches'); return data },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.patch(`/users/${id}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Cập nhật thành công')
      setEditMode(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật')
    },
  })

  const passwordMutation = useMutation({
    mutationFn: async (password: string) => {
      const { data } = await api.patch(`/users/${id}`, { password })
      return data
    },
    onSuccess: () => {
      toast.success('Đổi mật khẩu thành công')
      setShowPassword(false)
      setPasswordForm({ password: '', confirmPassword: '' })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi đổi mật khẩu')
    },
  })

  const handleSave = () => {
    const payload: any = { fullName: form.fullName, phone: form.phone, isActive: form.isActive }
    if (form.roleId) payload.roleId = form.roleId
    if (form.branchId) payload.branchId = form.branchId
    else payload.branchId = null
    updateMutation.mutate(payload)
  }

  const handlePasswordChange = () => {
    if (passwordForm.password.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự')
      return
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }
    passwordMutation.mutate(passwordForm.password)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
    )
  }

  if (!user) return <div className="text-center py-12 text-slate-500">User không tồn tại</div>

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700',
    GIAM_DOC_HAU_MAI: 'bg-blue-100 text-blue-700',
    QUAN_LY_XUONG: 'bg-amber-100 text-amber-700',
    CO_VAN_DICH_VU: 'bg-teal-100 text-teal-700',
    KY_THUAT_VIEN: 'bg-emerald-100 text-emerald-700',
    QUAN_LY_DOI_XE: 'bg-sky-100 text-sky-700',
    DIEU_HANH: 'bg-indigo-100 text-indigo-700',
    TAI_XE: 'bg-slate-100 text-slate-700',
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings/users" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-6 h-6" />{user.fullName}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
        </div>
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {user.isActive ? 'Hoạt động' : 'Vô hiệu'}
        </span>
      </div>

      {/* Info card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Thông tin tài khoản</h3>
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition">
              Chỉnh sửa
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={updateMutation.isPending} className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-success text-white rounded-lg hover:bg-success/90 transition disabled:opacity-50">
                <Save className="w-4 h-4" />{updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button onClick={() => setEditMode(false)} className="px-4 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                Hủy
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Họ tên</label>
            {editMode ? (
              <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            ) : (
              <p className="font-medium text-slate-900 dark:text-white">{user.fullName}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Email</label>
            <p className="font-medium text-slate-900 dark:text-white">{user.email}</p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Điện thoại</label>
            {editMode ? (
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            ) : (
              <p className="font-medium text-slate-900 dark:text-white">{user.phone || '—'}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1"><Shield className="w-3.5 h-3.5" />Vai trò</label>
            {editMode ? (
              <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                {roles?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            ) : (
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role?.code] || 'bg-slate-100 text-slate-700'}`}>
                {user.role?.name}
              </span>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />Chi nhánh</label>
            {editMode ? (
              <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Không gắn chi nhánh</option>
                {branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            ) : (
              <p className="font-medium text-slate-900 dark:text-white">{user.branch?.name || '—'}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Trạng thái</label>
            {editMode ? (
              <select value={String(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                <option value="true">Hoạt động</option>
                <option value="false">Vô hiệu</option>
              </select>
            ) : (
              <p className={`font-medium ${user.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                {user.isActive ? 'Hoạt động' : 'Vô hiệu'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5" />Đổi mật khẩu
          </h3>
          {!showPassword && (
            <button onClick={() => setShowPassword(true)} className="px-4 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              Đổi mật khẩu
            </button>
          )}
        </div>

        {showPassword && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Mật khẩu mới (tối thiểu 6 ký tự)</label>
              <input
                type="password" value={passwordForm.password}
                onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Nhập mật khẩu mới"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Xác nhận mật khẩu</label>
              <input
                type="password" value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Nhập lại mật khẩu"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePasswordChange}
                disabled={passwordMutation.isPending}
                className="px-4 py-2 text-sm bg-danger text-white rounded-lg hover:bg-danger/90 transition disabled:opacity-50"
              >
                {passwordMutation.isPending ? 'Đang lưu...' : 'Xác nhận đổi mật khẩu'}
              </button>
              <button
                onClick={() => { setShowPassword(false); setPasswordForm({ password: '', confirmPassword: '' }) }}
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Logs */}
      <AuditLogSection userId={id} />
    </div>
  )
}

function AuditLogSection({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', userId],
    queryFn: async () => {
      const { data } = await api.get(`/audit-logs/user/${userId}`, { params: { limit: 30 } })
      return data
    },
  })

  const actionLabels: Record<string, { label: string; color: string }> = {
    LOGIN: { label: 'Đăng nhập', color: 'bg-blue-100 text-blue-700' },
    CREATE: { label: 'Tạo mới', color: 'bg-emerald-100 text-emerald-700' },
    UPDATE: { label: 'Cập nhật', color: 'bg-amber-100 text-amber-700' },
    DELETE: { label: 'Xóa', color: 'bg-red-100 text-red-700' },
    APPROVE: { label: 'Duyệt', color: 'bg-purple-100 text-purple-700' },
    REJECT: { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
  }

  const resourceLabels: Record<string, string> = {
    auth: 'Xác thực',
    vehicles: 'Xe',
    workshop_jobs: 'Công việc xưởng',
    repair_orders: 'Phiếu sửa chữa',
    fleet_incidents: 'Sự cố',
    maintenance: 'Bảo dưỡng',
    users: 'Tài khoản',
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
        <History className="w-5 h-5" />Lịch sử thao tác
      </h3>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded" />)}
        </div>
      ) : !data?.data?.length ? (
        <p className="text-sm text-slate-400 text-center py-6">Chưa có lịch sử thao tác</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 font-medium text-slate-500">Thời gian</th>
                <th className="text-left py-2 font-medium text-slate-500">Hành động</th>
                <th className="text-left py-2 font-medium text-slate-500">Tài nguyên</th>
                <th className="text-left py-2 font-medium text-slate-500">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {data.data.map((log: any) => {
                const act = actionLabels[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-600' }
                return (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-2.5 text-slate-600 dark:text-slate-300 text-xs">{formatDateTime(log.createdAt)}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${act.color}`}>{act.label}</span>
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300 text-xs">{resourceLabels[log.resource] || log.resource}</td>
                    <td className="py-2.5 text-slate-400 text-xs font-mono">{log.ipAddress || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
