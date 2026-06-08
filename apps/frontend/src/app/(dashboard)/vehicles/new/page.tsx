'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'

export default function NewVehiclePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    licensePlate: '',
    vin: '',
    modelId: '',
    yearMfg: new Date().getFullYear(),
    branchId: '',
    currentOdo: 0,
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await api.get('/branches')
      return data
    },
  })

  const { data: models } = useQuery({
    queryKey: ['vehicle-models'],
    queryFn: async () => {
      const { data } = await api.get('/vehicle-models')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/vehicles', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Thêm xe thành công')
      router.push('/vehicles')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi thêm xe')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Thêm xe mới
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Biển số *
              </label>
              <input
                type="text"
                value={form.licensePlate}
                onChange={(e) => setForm({ ...form, licensePlate: e.target.value.toUpperCase() })}
                placeholder="30A-12345"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Số VIN *
              </label>
              <input
                type="text"
                value={form.vin}
                onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })}
                placeholder="VINFAST1234567890"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Model xe *
              </label>
              <select
                value={form.modelId}
                onChange={(e) => setForm({ ...form, modelId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Chọn model</option>
                {models?.map((m: any) => (
                  <option key={m.id || m.name} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Năm sản xuất *
              </label>
              <input
                type="number"
                value={form.yearMfg}
                onChange={(e) => setForm({ ...form, yearMfg: parseInt(e.target.value) })}
                min={2000}
                max={2030}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Chi nhánh *
              </label>
              <select
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Chọn chi nhánh</option>
                {branches?.filter((b: any) => b.type === 'FLEET' || b.type === 'COMBINED').map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                ODO hiện tại (km)
              </label>
              <input
                type="number"
                value={form.currentOdo}
                onChange={(e) => setForm({ ...form, currentOdo: parseInt(e.target.value) || 0 })}
                min={0}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2.5 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Đang tạo...' : 'Thêm xe'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
