'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useState } from 'react'
import { Building2, Plus, Pencil, Users, Car, Wrench } from 'lucide-react'

const TYPE_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  FLEET:    { label: 'Đội xe',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: Car },
  WORKSHOP: { label: 'Xưởng',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Wrench },
  COMBINED: { label: 'Kết hợp',   cls: 'bg-primary/10 text-primary', icon: Building2 },
}

const EMPTY_FORM = { name: '', code: '', type: 'COMBINED', address: '', phone: '' }

export default function BranchesPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingBranch, setEditingBranch] = useState<any>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await api.get('/branches')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingBranch) {
        return api.patch(`/branches/${editingBranch.id}`, data)
      }
      return api.post('/branches', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      toast.success(editingBranch ? 'Cập nhật chi nhánh thành công' : 'Tạo chi nhánh thành công')
      resetForm()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi')
    },
  })

  const resetForm = () => {
    setShowForm(false)
    setEditingBranch(null)
    setForm(EMPTY_FORM)
  }

  const startEdit = (branch: any) => {
    setEditingBranch(branch)
    setForm({
      name:    branch.name,
      code:    branch.code,
      type:    branch.type || 'COMBINED',
      address: branch.address || '',
      phone:   branch.phone || '',
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Quản lý chi nhánh
        </h1>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Thêm chi nhánh
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold mb-4 text-slate-900 dark:text-white">
            {editingBranch ? 'Sửa chi nhánh' : 'Thêm chi nhánh mới'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tên chi nhánh *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mã chi nhánh *
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                disabled={!!editingBranch}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Loại chi nhánh *
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="COMBINED">Kết hợp — vừa đội xe, vừa xưởng</option>
                <option value="FLEET">Đội xe taxi</option>
                <option value="WORKSHOP">Xưởng dịch vụ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Điện thoại
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Địa chỉ
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {createMutation.isPending ? 'Đang lưu...' : editingBranch ? 'Cập nhật' : 'Tạo mới'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            ))
          : branches?.map((branch: any) => {
              const typeConf = TYPE_CONFIG[branch.type] || TYPE_CONFIG.COMBINED
              const TypeIcon = typeConf.icon
              return (
                <div
                  key={branch.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TypeIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {branch.name}
                        </h3>
                        <p className="text-xs text-slate-500">{branch.code}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => startEdit(branch)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${typeConf.cls}`}>
                    {typeConf.label}
                  </span>

                  {branch.address && (
                    <p className="text-sm text-slate-500 mb-1 truncate">{branch.address}</p>
                  )}
                  {branch.phone && (
                    <p className="text-sm text-slate-500 mb-3">☎ {branch.phone}</p>
                  )}

                  <div className="flex items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Users className="w-4 h-4" />
                      <span>{branch._count?.users || 0} người</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Car className="w-4 h-4" />
                      <span>{branch._count?.vehicles || 0} xe</span>
                    </div>
                  </div>

                  {branch.manager && (
                    <p className="text-xs text-slate-400 mt-2">
                      Quản lý: {branch.manager.fullName}
                    </p>
                  )}
                </div>
              )
            })}
      </div>
    </div>
  )
}
