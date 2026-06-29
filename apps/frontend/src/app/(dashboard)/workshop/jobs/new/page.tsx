'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { ArrowLeft, Wrench, Lock } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

export default function NewWorkshopJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const preVehicleId = searchParams.get('vehicleId') || ''
  const prePlanId = searchParams.get('planId') || ''

  const [form, setForm] = useState({
    vehicleId: preVehicleId,
    branchId: '',
    workshopBranchId: '',
    planId: prePlanId,
    odoAtEntry: 0,
    entryReason: '',
    diagnosis: '',
    advisorId: '',
    technicianId: '',
    deliveryPersonName: '',
    deliveryPersonPhone: '',
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', { limit: 100 }],
    queryFn: async () => {
      const { data } = await api.get('/vehicles?limit=100')
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

  const { data: users } = useQuery({
    queryKey: ['users', { limit: 50 }],
    queryFn: async () => {
      const { data } = await api.get('/users?limit=50')
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

  const selectedVehicle = vehicles?.find((v: any) => v.id === form.vehicleId)
  const selectedFleetBranch = branches?.find((b: any) => b.id === form.branchId)
  const workshopBranches = branches?.filter((b: any) => b.type === 'WORKSHOP')

  // Pre-fill branch + ODO when vehicle is pre-selected from query param
  useEffect(() => {
    if (preVehicleId && vehicles?.length) {
      const vehicle = vehicles.find((v: any) => v.id === preVehicleId)
      if (vehicle) {
        setForm((f) => ({
          ...f,
          branchId: vehicle.branchId || f.branchId,
          odoAtEntry: vehicle.currentOdo || 0,
          entryReason: prePlanId
            ? `Bảo dưỡng định kỳ — ${plans?.find((p: any) => p.id === prePlanId)?.name || ''}`
            : f.entryReason,
        }))
      }
    }
  }, [preVehicleId, vehicles, plans, prePlanId])

  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/workshop/jobs', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['workshop'] })
      toast.success('Tiếp nhận xe vào xưởng thành công')
      router.push(`/workshop/jobs/${res.data.id}`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi tạo workshop job')
    },
  })

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles?.find((v: any) => v.id === vehicleId)
    setForm({
      ...form,
      vehicleId,
      branchId: vehicle?.branchId || '',
      odoAtEntry: vehicle?.currentOdo || 0,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.workshopBranchId) return toast.error('Vui lòng chọn xưởng dịch vụ')
    const payload: any = {
      ...form,
      branchId: form.workshopBranchId, // Job thuộc xưởng
    }
    delete payload.workshopBranchId
    if (!payload.technicianId) delete payload.technicianId
    if (!payload.diagnosis) delete payload.diagnosis
    if (!payload.planId) delete payload.planId
    if (!payload.deliveryPersonName) delete payload.deliveryPersonName
    if (!payload.deliveryPersonPhone) delete payload.deliveryPersonPhone
    createMutation.mutate(payload)
  }

  const advisors = users?.filter((u: any) =>
    ['CO_VAN_DICH_VU', 'QUAN_LY_XUONG', 'SUPER_ADMIN'].includes(u.role?.code || u.role)
  )

  const isMaintenance = !!prePlanId
  const selectedPlan = plans?.find((p: any) => p.id === form.planId)
  const branchLocked = !!form.vehicleId

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Tiếp nhận xe vào xưởng
          </h1>
          {isMaintenance && (
            <p className="text-sm text-primary flex items-center gap-1.5 mt-0.5">
              <Wrench className="w-4 h-4" />
              Job bảo dưỡng định kỳ — sẽ tự ghi nhận bảo dưỡng khi hoàn thành
            </p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Xe + Chi nhánh đội xe */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Xe *</label>
              <select
                value={form.vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Chi nhánh đội xe
                {branchLocked && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-slate-400">
                    <Lock className="w-3 h-3" /> theo xe
                  </span>
                )}
              </label>
              <div className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-300">
                {selectedFleetBranch?.name || 'Chưa chọn xe'}
              </div>
            </div>
          </div>

          {/* Xưởng dịch vụ */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Xưởng dịch vụ tiếp nhận *</label>
            <select
              value={form.workshopBranchId}
              onChange={(e) => setForm({ ...form, workshopBranchId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              required
            >
              <option value="">Chọn xưởng</option>
              {workshopBranches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* ODO + Cố vấn */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ODO khi vào (km) *</label>
              <input
                type="number"
                value={form.odoAtEntry}
                onChange={(e) => setForm({ ...form, odoAtEntry: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
              {selectedVehicle && (
                <p className="text-xs text-slate-400 mt-1">
                  ODO hiện tại xe: {formatNumber(selectedVehicle.currentOdo)} km
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cố vấn DV *</label>
              <select
                value={form.advisorId}
                onChange={(e) => setForm({ ...form, advisorId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Chọn cố vấn</option>
                {advisors?.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Người mang xe đến */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Người mang xe đến</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Họ tên</label>
                <input
                  type="text"
                  value={form.deliveryPersonName}
                  onChange={(e) => setForm({ ...form, deliveryPersonName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={form.deliveryPersonPhone}
                  onChange={(e) => setForm({ ...form, deliveryPersonPhone: e.target.value })}
                  placeholder="0912 345 678"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Kế hoạch bảo dưỡng */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Kế hoạch bảo dưỡng
              <span className="ml-1 text-xs font-normal text-slate-400">(tuỳ chọn)</span>
            </label>
            <select
              value={form.planId}
              onChange={(e) => setForm({ ...form, planId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Không liên kết</option>
              {plans?.filter((p: any) => p.isActive).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} (mỗi {formatNumber(p.intervalKm)} km)
                </option>
              ))}
            </select>
            {selectedPlan && form.odoAtEntry > 0 && (
              <p className="text-xs text-primary mt-1">
                Hạn BD tiếp theo sẽ tự động tạo tại {formatNumber(form.odoAtEntry + selectedPlan.intervalKm)} km
              </p>
            )}
          </div>

          {/* Lý do + Chẩn đoán */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lý do vào xưởng *</label>
            <textarea
              value={form.entryReason}
              onChange={(e) => setForm({ ...form, entryReason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Mô tả lý do xe vào xưởng..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chẩn đoán ban đầu</label>
            <textarea
              value={form.diagnosis}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Chẩn đoán sơ bộ (nếu có)..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Đang tạo...' : 'Tiếp nhận xe'}
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
