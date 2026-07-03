'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { useState } from 'react'
import {
  ArrowLeft, Car, MapPin, Gauge, Calendar, Wrench,
  ArrowRightLeft, Plus, Package, AlertTriangle,
  ClipboardList, Hash, FileText, TrendingUp, User,
  ShieldCheck, Upload, Loader2, Trash2, Download, Pencil, Check, X,
} from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'

const VEHICLE_WRITE_ROLES = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_XUONG', 'QUAN_LY_DOI_XE']
const TRANSFER_APPROVE_ROLES = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_DOI_XE']
const HQ_ROLES = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI']

const transferStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Chờ duyệt',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  APPROVED:  { label: 'Đã duyệt',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  RECEIVED:  { label: 'Đã nhận',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  REJECTED:  { label: 'Từ chối',    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  CANCELLED: { label: 'Đã huỷ',     color: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
}

const DOC_CATEGORY_LABELS: Record<string, string> = {
  REGISTRATION: 'Đăng ký xe',
  INSPECTION:   'Đăng kiểm',
  INSURANCE:    'Bảo hiểm',
  OTHER:        'Khác',
}

const DOC_CATEGORY_ORDER = ['REGISTRATION', 'INSPECTION', 'INSURANCE', 'OTHER']

// Trạng thái hạn: đỏ nếu đã hết, cam nếu còn <=30 ngày, xanh nếu còn hạn
function expiryStatus(date?: string | null): { label: string; cls: string } | null {
  if (!date) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const days = Math.round((target.getTime() - now.getTime()) / 86400000)
  if (days < 0) return { label: `Quá hạn ${Math.abs(days)} ngày`, cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
  if (days <= 30) return { label: `Còn ${days} ngày`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' }
  return { label: `Còn ${days} ngày`, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE:        { label: 'Hoạt động',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  RESTING:       { label: 'Nghỉ',        color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  IN_WORKSHOP:   { label: 'Trong xưởng', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  ACCIDENT:      { label: 'Tai nạn',     color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  DECOMMISSIONED:{ label: 'Thanh lý',    color: 'bg-slate-100 text-slate-400' },
}

const jobStatusConfig: Record<string, { label: string; color: string }> = {
  RECEIVED:       { label: 'Tiếp nhận',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  DIAGNOSING:     { label: 'Chẩn đoán',      color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  QUOTED:         { label: 'Đã báo giá',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  APPROVED:       { label: 'Đã duyệt',       color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  WAITING_PARTS:  { label: 'Chờ linh kiện',  color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  IN_PROGRESS:    { label: 'Đang sửa',       color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  QUALITY_CHECK:  { label: 'Kiểm tra CL',    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  COMPLETED:      { label: 'Hoàn thành',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  DELIVERED:      { label: 'Đã giao',        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  REJECTED:       { label: 'Từ chối',        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}

const incidentStatusConfig: Record<string, { label: string; color: string }> = {
  NEW:          { label: 'Mới',          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  ACKNOWLEDGED: { label: 'Đã ghi nhận', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  IN_PROGRESS:  { label: 'Đang xử lý',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  RESOLVED:     { label: 'Đã giải quyết', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
}

const maintenanceStatusConfig: Record<string, { label: string; color: string }> = {
  UPCOMING: { label: 'Chưa đến hạn', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  DUE_SOON: { label: 'Sắp đến hạn',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  OVERDUE:  { label: 'Quá hạn',      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  COMPLETED:{ label: 'Đã thực hiện', color: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
}

const TABS = [
  { key: 'overview',     label: 'Tổng quan',       icon: Car },
  { key: 'documents',    label: 'Giấy tờ',          icon: FileText },
  { key: 'maintenance',  label: 'Bảo dưỡng',       icon: Wrench },
  { key: 'workshop',     label: 'Sửa chữa',         icon: ClipboardList },
  { key: 'incidents',    label: 'Sự cố',            icon: AlertTriangle },
  { key: 'transfers',    label: 'Điều chuyển',      icon: ArrowRightLeft },
  { key: 'parts',        label: 'Hoán đổi LK',      icon: Package },
]

function StatusBadge({ status, config }: { status: string; config: Record<string, { label: string; color: string }> }) {
  const cfg = config[status] || { label: status, color: 'bg-slate-100 text-slate-500' }
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canWrite = VEHICLE_WRITE_ROLES.includes(user?.role || '')
  const [activeTab, setActiveTab] = useState('overview')
  const [showOdoForm, setShowOdoForm] = useState(false)
  const [newOdo, setNewOdo] = useState('')
  const [docCategory, setDocCategory] = useState('REGISTRATION')
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [editingDates, setEditingDates] = useState(false)
  const [dateForm, setDateForm] = useState({ inspectionExpiry: '', insuranceExpiry: '', ownerName: '', driverCode: '', driverName: '', driverPhone: '' })
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [transferForm, setTransferForm] = useState({ toBranchId: '', reason: '' })

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicles', id],
    queryFn: async () => {
      const { data } = await api.get(`/vehicles/${id}`)
      return data
    },
  })

  const { data: transfers } = useQuery({
    queryKey: ['vehicles', id, 'transfers'],
    queryFn: async () => {
      const { data } = await api.get(`/vehicles/${id}/transfer-history`)
      return data
    },
    enabled: activeTab === 'transfers',
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await api.get('/branches')
      return data
    },
    enabled: activeTab === 'transfers',
  })

  const { data: partTransferHistory } = useQuery({
    queryKey: ['vehicles', id, 'part-transfer-history'],
    queryFn: async () => {
      const { data } = await api.get(`/parts/transfer-batches/vehicle/${id}/history`)
      return data
    },
    enabled: activeTab === 'parts',
  })

  const { data: maintenanceHistory } = useQuery({
    queryKey: ['vehicles', id, 'maintenance'],
    queryFn: async () => {
      const { data } = await api.get(`/maintenance/records?vehicleId=${id}&limit=100`)
      return data
    },
    enabled: activeTab === 'maintenance',
  })

  const { data: workshopJobs } = useQuery({
    queryKey: ['vehicles', id, 'workshop-jobs'],
    queryFn: async () => {
      const { data } = await api.get(`/workshop/jobs?vehicleId=${id}&limit=100`)
      return data
    },
    enabled: activeTab === 'workshop',
  })

  const { data: incidents } = useQuery({
    queryKey: ['vehicles', id, 'incidents'],
    queryFn: async () => {
      const { data } = await api.get(`/fleet/incidents?vehicleId=${id}&limit=100`)
      return data
    },
    enabled: activeTab === 'incidents',
  })

  const odoMutation = useMutation({
    mutationFn: async (odo: number) => {
      const { data } = await api.post(`/vehicles/${id}/odo`, { odo, source: 'manual' })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', id] })
      toast.success('Cập nhật ODO thành công')
      setShowOdoForm(false)
      setNewOdo('')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật ODO')
    },
  })

  const datesMutation = useMutation({
    mutationFn: async (payload: { inspectionExpiry?: string | null; insuranceExpiry?: string | null; ownerName?: string | null; driverCode?: string | null; driverName?: string | null; driverPhone?: string | null }) => {
      const { data } = await api.patch(`/vehicles/${id}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', id] })
      toast.success('Đã cập nhật hạn')
      setEditingDates(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật hạn')
    },
  })

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(`/vehicles/${id}/documents/${docId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', id] })
      toast.success('Đã xoá giấy tờ')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi xoá giấy tờ')
    },
  })

  const transferMutation = useMutation({
    mutationFn: async (payload: { toBranchId: string; reason?: string }) => {
      const { data } = await api.post(`/vehicles/${id}/transfers`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', id, 'transfers'] })
      toast.success('Điều chuyển xe thành công')
      setShowTransferForm(false)
      setTransferForm({ toBranchId: '', reason: '' })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi điều chuyển xe')
    },
  })

  const transferActionMutation = useMutation({
    mutationFn: async ({ transferId, action, reason }: { transferId: string; action: 'approve' | 'receive' | 'reject'; reason?: string }) => {
      const { data } = await api.patch(`/vehicles/transfers/${transferId}/${action}`, action === 'reject' ? { reason } : {})
      return data
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', id, 'transfers'] })
      const msg = vars.action === 'approve' ? 'Đã duyệt điều chuyển'
        : vars.action === 'receive' ? 'Đã xác nhận nhận xe'
        : 'Đã từ chối điều chuyển'
      toast.success(msg)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi xử lý điều chuyển')
    },
  })

  const handleUploadDoc = async (file: File) => {
    setUploadingDoc(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await api.post(`/vehicles/${id}/documents`, { fileId: data.id, category: docCategory })
      queryClient.invalidateQueries({ queryKey: ['vehicles', id] })
      toast.success('Đã tải lên giấy tờ')
    } catch {
      toast.error('Lỗi tải lên giấy tờ')
    } finally {
      setUploadingDoc(false)
    }
  }

  // Endpoint /files/:id yêu cầu JWT trong header, nên phải tải qua axios (có token)
  // rồi mở bằng blob URL — không thể dùng <a href> trực tiếp (sẽ bị 401).
  const openFile = async (fileId: string) => {
    try {
      const res = await api.get(`/files/${fileId}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      window.open(url, '_blank')
      // Thu hồi URL sau khi tab mới đã có thời gian nạp
      setTimeout(() => window.URL.revokeObjectURL(url), 60000)
    } catch {
      toast.error('Không mở được file')
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
    )
  }

  if (!vehicle) {
    return <div className="text-center py-12 text-slate-500">Xe không tồn tại</div>
  }

  const status = statusConfig[vehicle.status] || statusConfig.ACTIVE

  // Tính stats cho overview
  const totalWorkshopJobs = vehicle._count?.workshopJobs ?? null
  const openIncidents = vehicle.incidents?.filter((i: any) => i.status !== 'RESOLVED').length ?? null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {vehicle.licensePlate}
            </h1>
            <StatusBadge status={vehicle.status} config={statusConfig} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {vehicle.model?.brand} {vehicle.model?.name} · {vehicle.yearMfg} · VIN: {vehicle.vin}
          </p>
        </div>
      </div>

      {/* Hồ sơ xe */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Hồ sơ xe</h3>
          {canWrite && !editingDates && (
            <button
              onClick={() => {
                setDateForm({
                  inspectionExpiry: vehicle.inspectionExpiry ? String(vehicle.inspectionExpiry).slice(0, 10) : '',
                  insuranceExpiry: vehicle.insuranceExpiry ? String(vehicle.insuranceExpiry).slice(0, 10) : '',
                  ownerName: vehicle.ownerName || '',
                  driverCode: vehicle.driverCode || '',
                  driverName: vehicle.driverName || '',
                  driverPhone: vehicle.driverPhone || '',
                })
                setEditingDates(true)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Car className="w-3.5 h-3.5" /> Model</p>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">{vehicle.model?.name}</p>
            <p className="text-xs text-slate-400">{vehicle.model?.brand}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Chi nhánh hiện tại</p>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">{vehicle.branch?.name}</p>
            <p className="text-xs text-slate-400">{vehicle.branch?.code}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Gauge className="w-3.5 h-3.5" /> ODO hiện tại</p>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">{formatNumber(vehicle.currentOdo)} km</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Năm SX</p>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">{vehicle.yearMfg}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> Số khung (VIN)</p>
            <p className="font-semibold text-slate-900 dark:text-white text-sm font-mono text-xs">{vehicle.vin}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Đơn vị sở hữu</p>
            {editingDates ? (
              <input
                type="text"
                value={dateForm.ownerName}
                onChange={(e) => setDateForm({ ...dateForm, ownerName: e.target.value })}
                placeholder="VD: Công ty TNHH Taxi ABC"
                className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {vehicle.ownerName || '—'}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> Số tài</p>
            {editingDates ? (
              <input
                type="text"
                value={dateForm.driverCode}
                onChange={(e) => setDateForm({ ...dateForm, driverCode: e.target.value })}
                placeholder="VD: 1234"
                className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {vehicle.driverCode || '—'}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Tài xế</p>
            {editingDates ? (
              <input
                type="text"
                value={dateForm.driverName}
                onChange={(e) => setDateForm({ ...dateForm, driverName: e.target.value })}
                placeholder="VD: Nguyễn Văn A"
                className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {vehicle.driverName || '—'}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><User className="w-3.5 h-3.5" /> SĐT tài xế</p>
            {editingDates ? (
              <input
                type="text"
                value={dateForm.driverPhone}
                onChange={(e) => setDateForm({ ...dateForm, driverPhone: e.target.value })}
                placeholder="VD: 0912345678"
                className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {vehicle.driverPhone || '—'}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Đăng ký</p>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">
              {vehicle.registeredAt ? formatDate(vehicle.registeredAt) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Hạn đăng kiểm</p>
            {editingDates ? (
              <input
                type="date"
                value={dateForm.inspectionExpiry}
                onChange={(e) => setDateForm({ ...dateForm, inspectionExpiry: e.target.value })}
                className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                  {vehicle.inspectionExpiry ? formatDate(vehicle.inspectionExpiry) : '—'}
                </p>
                {(() => { const s = expiryStatus(vehicle.inspectionExpiry); return s ? <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span> : null })()}
              </>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Hạn bảo hiểm</p>
            {editingDates ? (
              <input
                type="date"
                value={dateForm.insuranceExpiry}
                onChange={(e) => setDateForm({ ...dateForm, insuranceExpiry: e.target.value })}
                className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                  {vehicle.insuranceExpiry ? formatDate(vehicle.insuranceExpiry) : '—'}
                </p>
                {(() => { const s = expiryStatus(vehicle.insuranceExpiry); return s ? <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span> : null })()}
              </>
            )}
          </div>
        </div>

        {editingDates && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => datesMutation.mutate({
                inspectionExpiry: dateForm.inspectionExpiry || null,
                insuranceExpiry: dateForm.insuranceExpiry || null,
                ownerName: dateForm.ownerName.trim() || null,
                driverCode: dateForm.driverCode.trim() || null,
                driverName: dateForm.driverName.trim() || null,
                driverPhone: dateForm.driverPhone.trim() || null,
              })}
              disabled={datesMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />{datesMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            <button
              onClick={() => setEditingDates(false)}
              className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Hủy
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-700 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition border-b-2 ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">

          {/* ── GIẤY TỜ ── */}
          {activeTab === 'documents' && (
            <div className="space-y-5">
              {canWrite && (
                <div className="flex flex-wrap items-end gap-3 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Loại giấy tờ</label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {DOC_CATEGORY_ORDER.map((c) => (
                        <option key={c} value={c}>{DOC_CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition">
                    {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingDoc ? 'Đang tải lên...' : 'Tải giấy tờ (PDF/ảnh)'}
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      disabled={uploadingDoc}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadDoc(f); e.target.value = '' }}
                    />
                  </label>
                </div>
              )}

              {vehicle.documents?.length > 0 ? (
                <div className="space-y-5">
                  {DOC_CATEGORY_ORDER.map((cat) => {
                    const docs = vehicle.documents.filter((d: any) => d.category === cat)
                    if (docs.length === 0) return null
                    return (
                      <div key={cat}>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />{DOC_CATEGORY_LABELS[cat]}
                          <span className="text-xs text-slate-400 font-normal">({docs.length})</span>
                        </h4>
                        <div className="space-y-2">
                          {docs.map((doc: any) => (
                            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                              <button
                                onClick={() => openFile(doc.file?.id)}
                                className="flex-1 min-w-0 text-sm text-primary hover:underline truncate text-left"
                                title={doc.file?.originalName}
                              >
                                {doc.file?.originalName}
                              </button>
                              <span className="text-xs text-slate-400 shrink-0">{formatDate(doc.createdAt)}</span>
                              <button
                                onClick={() => openFile(doc.file?.id)}
                                className="text-slate-400 hover:text-primary transition shrink-0"
                                title="Xem / tải xuống"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              {canWrite && (
                                <button
                                  onClick={() => deleteDocMutation.mutate(doc.id)}
                                  disabled={deleteDocMutation.isPending}
                                  className="text-slate-400 hover:text-danger transition shrink-0 disabled:opacity-40"
                                  title="Xoá"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Chưa có giấy tờ nào</p>
                </div>
              )}
            </div>
          )}

          {/* ── TỔNG QUAN ── */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Trạng thái bảo dưỡng sắp tới */}
              {vehicle.maintenanceRecords?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> Tình trạng bảo dưỡng
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {vehicle.maintenanceRecords.map((record: any) => {
                      const remaining = record.nextDueOdo - vehicle.currentOdo
                      const pct = Math.min(100, Math.max(0, (vehicle.currentOdo - (record.nextDueOdo - (record.plan?.intervalKm || 5000))) / (record.plan?.intervalKm || 5000) * 100))
                      return (
                        <div key={record.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-slate-900 dark:text-white text-sm">{record.plan?.name}</p>
                            <StatusBadge status={record.status} config={maintenanceStatusConfig} />
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 mb-2">
                            <div
                              className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500">
                            {remaining > 0
                              ? <>Còn <span className="font-medium text-slate-700 dark:text-slate-300">{formatNumber(remaining)} km</span> đến hạn</>
                              : <span className="text-red-500 font-medium">Quá hạn {formatNumber(Math.abs(remaining))} km</span>
                            }
                            {' · '}Đến hạn tại <span className="font-medium">{formatNumber(record.nextDueOdo)} km</span>
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ODO history */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Lịch sử ODO gần đây
                  </h4>
                  {canWrite && (
                    <button
                      onClick={() => setShowOdoForm(!showOdoForm)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg transition"
                    >
                      <Plus className="w-4 h-4" />
                      Ghi nhận ODO
                    </button>
                  )}
                </div>

                {showOdoForm && (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <input
                      type="number"
                      value={newOdo}
                      onChange={(e) => setNewOdo(e.target.value)}
                      placeholder={`Nhập ODO mới (> ${formatNumber(vehicle.currentOdo)} km)`}
                      className="flex-1 max-w-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onClick={() => newOdo && odoMutation.mutate(parseInt(newOdo))}
                      disabled={odoMutation.isPending}
                      className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition disabled:opacity-50"
                    >
                      {odoMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                    </button>
                    <button
                      onClick={() => { setShowOdoForm(false); setNewOdo('') }}
                      className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      Hủy
                    </button>
                  </div>
                )}

                {vehicle.odoLogs?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2 font-medium text-slate-500">Thời gian</th>
                          <th className="text-right py-2 font-medium text-slate-500">ODO</th>
                          <th className="text-right py-2 font-medium text-slate-500">+Km</th>
                          <th className="text-left py-2 font-medium text-slate-500 pl-4">Người nhập</th>
                          <th className="text-left py-2 font-medium text-slate-500 pl-4">Nguồn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {vehicle.odoLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="py-2.5 text-slate-600 dark:text-slate-300">{formatDateTime(log.recordedAt)}</td>
                            <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-white">{formatNumber(log.odo)} km</td>
                            <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">+{formatNumber(log.delta)} km</td>
                            <td className="py-2.5 text-slate-600 dark:text-slate-300 text-xs pl-4">{log.user?.fullName || '—'}</td>
                            <td className="py-2.5 text-slate-400 text-xs pl-4 capitalize">{log.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">Chưa có lịch sử ODO</p>
                )}
              </div>
            </div>
          )}

          {/* ── BẢO DƯỠNG ── */}
          {activeTab === 'maintenance' && (
            <div>
              {maintenanceHistory?.data?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 font-medium text-slate-500">Kế hoạch bảo dưỡng</th>
                        <th className="text-right py-3 font-medium text-slate-500">ODO thực hiện</th>
                        <th className="text-right py-3 font-medium text-slate-500">Đến hạn tiếp theo</th>
                        <th className="text-left py-3 font-medium text-slate-500">Ngày</th>
                        <th className="text-right py-3 font-medium text-slate-500">Chi phí</th>
                        <th className="text-left py-3 font-medium text-slate-500">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {maintenanceHistory.data.map((rec: any) => (
                        <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="py-3 font-medium text-slate-900 dark:text-white">{rec.plan?.name}</td>
                          <td className="py-3 text-right text-slate-600 dark:text-slate-300">{formatNumber(rec.odoAtService)} km</td>
                          <td className="py-3 text-right font-semibold text-primary">{formatNumber(rec.nextDueOdo)} km</td>
                          <td className="py-3 text-slate-500 text-xs">{rec.serviceDate ? formatDate(rec.serviceDate) : '—'}</td>
                          <td className="py-3 text-right text-slate-700 dark:text-slate-300">
                            {rec.cost ? `${Number(rec.cost).toLocaleString('vi-VN')}đ` : '—'}
                          </td>
                          <td className="py-3">
                            <StatusBadge status={rec.status} config={maintenanceStatusConfig} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Chưa có lịch sử bảo dưỡng</p>
                </div>
              )}
            </div>
          )}

          {/* ── SỬA CHỮA ── */}
          {activeTab === 'workshop' && (
            <div>
              {workshopJobs?.data?.length > 0 ? (
                <div className="space-y-3">
                  {workshopJobs.data.map((job: any) => (
                    <div key={job.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link href={`/workshop/jobs/${job.id}`} className="font-semibold text-primary hover:underline">
                              {job.code}
                            </Link>
                            <StatusBadge status={job.status} config={jobStatusConfig} />
                            {job.jobType && (
                              <span className="text-xs text-slate-400 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded">
                                {job.jobType === 'REPAIR' ? 'Sửa chữa' : job.jobType === 'WARRANTY' ? 'Bảo hành' : job.jobType === 'MAINTENANCE' ? 'Bảo dưỡng' : 'Kiểm tra'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{job.entryReason}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{formatNumber(job.odoAtEntry)} km</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(job.receivedAt)}</span>
                            {job.advisor && <span className="flex items-center gap-1"><User className="w-3 h-3" />CV: {job.advisor?.fullName}</span>}
                            {job.technician && <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />KTV: {job.technician?.user?.fullName || 'N/A'}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {job.actualCost ? (
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {Number(job.actualCost).toLocaleString('vi-VN')}đ
                            </p>
                          ) : job.estimatedCost ? (
                            <p className="text-slate-400 text-sm">~{Number(job.estimatedCost).toLocaleString('vi-VN')}đ</p>
                          ) : null}
                          {job.completedAt && (
                            <p className="text-xs text-slate-400 mt-0.5">Hoàn thành: {formatDate(job.completedAt)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Chưa có lịch sử sửa chữa</p>
                </div>
              )}
            </div>
          )}

          {/* ── SỰ CỐ ── */}
          {activeTab === 'incidents' && (
            <div>
              {incidents?.data?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 font-medium text-slate-500">Mã</th>
                        <th className="text-left py-3 font-medium text-slate-500">Mô tả</th>
                        <th className="text-left py-3 font-medium text-slate-500">Mức độ</th>
                        <th className="text-left py-3 font-medium text-slate-500">Trạng thái</th>
                        <th className="text-left py-3 font-medium text-slate-500">Ngày</th>
                        <th className="text-left py-3 font-medium text-slate-500">Người báo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {incidents.data.map((inc: any) => (
                        <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="py-3 font-medium text-slate-900 dark:text-white">{inc.code}</td>
                          <td className="py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">{inc.description}</td>
                          <td className="py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              inc.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                              inc.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                              inc.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {inc.priority === 'CRITICAL' ? 'Nghiêm trọng' :
                               inc.priority === 'HIGH' ? 'Cao' :
                               inc.priority === 'MEDIUM' ? 'Trung bình' : 'Thấp'}
                            </span>
                          </td>
                          <td className="py-3">
                            <StatusBadge status={inc.status} config={incidentStatusConfig} />
                          </td>
                          <td className="py-3 text-slate-500 text-xs">{formatDate(inc.createdAt)}</td>
                          <td className="py-3 text-slate-500 text-xs">{inc.reporter?.fullName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Chưa có sự cố nào</p>
                </div>
              )}
            </div>
          )}

          {/* ── ĐIỀU CHUYỂN ── */}
          {activeTab === 'transfers' && (
            <div>
              {canWrite && (
                <div className="mb-4">
                  {!showTransferForm ? (
                    <button
                      onClick={() => { setTransferForm({ toBranchId: '', reason: '' }); setShowTransferForm(true) }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition"
                    >
                      <ArrowRightLeft className="w-4 h-4" /> Điều chuyển xe
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 space-y-3">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">
                        Điều chuyển xe sang đơn vị khác
                      </p>
                      <p className="text-xs text-slate-500">
                        Chi nhánh hiện tại: <span className="font-medium">{vehicle.branch?.name}</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Chuyển đến <span className="text-danger">*</span></label>
                          <select
                            value={transferForm.toBranchId}
                            onChange={(e) => setTransferForm({ ...transferForm, toBranchId: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">-- Chọn đơn vị --</option>
                            {branches?.filter((b: any) => b.id !== vehicle.branchId).map((b: any) => (
                              <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Lý do</label>
                          <input
                            type="text"
                            value={transferForm.reason}
                            onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                            placeholder="Tuỳ chọn..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (!transferForm.toBranchId) { toast.error('Chọn đơn vị nhận'); return }
                            transferMutation.mutate({ toBranchId: transferForm.toBranchId, reason: transferForm.reason.trim() || undefined })
                          }}
                          disabled={transferMutation.isPending}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition disabled:opacity-50"
                        >
                          <ArrowRightLeft className="w-4 h-4" />{transferMutation.isPending ? 'Đang chuyển...' : 'Xác nhận điều chuyển'}
                        </button>
                        <button
                          onClick={() => setShowTransferForm(false)}
                          className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {transfers?.length > 0 ? (
                <div className="space-y-3">
                  {transfers.map((transfer: any) => {
                    const st = transferStatusConfig[transfer.status] || transferStatusConfig.PENDING
                    const canApprove = TRANSFER_APPROVE_ROLES.includes(user?.role || '') && transfer.status === 'PENDING'
                    const canReject = TRANSFER_APPROVE_ROLES.includes(user?.role || '') && ['PENDING', 'APPROVED'].includes(transfer.status)
                    const canReceive = transfer.status === 'APPROVED' &&
                      (HQ_ROLES.includes(user?.role || '') || user?.branchId === transfer.toBranchId)
                    return (
                      <div key={transfer.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {transfer.code && <span className="text-xs font-mono text-slate-400">{transfer.code}</span>}
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-slate-900 dark:text-white">{transfer.fromBranch?.name}</span>
                              <ArrowRightLeft className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="font-medium text-slate-900 dark:text-white">{transfer.toBranch?.name}</span>
                            </div>
                            {transfer.reason && <p className="text-sm text-slate-500 mt-0.5">Lý do: {transfer.reason}</p>}
                            {transfer.rejectedReason && <p className="text-sm text-danger mt-0.5">Từ chối: {transfer.rejectedReason}</p>}
                            <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                              <p>Tạo bởi: {transfer.createdBy?.fullName || '—'} · {formatDate(transfer.createdAt)}</p>
                              {transfer.approvedBy && <p>Duyệt bởi: {transfer.approvedBy.fullName} · {formatDate(transfer.approvedAt)}</p>}
                              {transfer.receivedBy && <p>Nhận bởi: {transfer.receivedBy.fullName} · {formatDate(transfer.receivedAt)}</p>}
                            </div>
                          </div>
                          {(canApprove || canReject || canReceive) && (
                            <div className="flex flex-col gap-2 shrink-0">
                              {canApprove && (
                                <button
                                  onClick={() => transferActionMutation.mutate({ transferId: transfer.id, action: 'approve' })}
                                  disabled={transferActionMutation.isPending}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" /> Duyệt
                                </button>
                              )}
                              {canReceive && (
                                <button
                                  onClick={() => transferActionMutation.mutate({ transferId: transfer.id, action: 'receive' })}
                                  disabled={transferActionMutation.isPending}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" /> Đã nhận xe
                                </button>
                              )}
                              {canReject && (
                                <button
                                  onClick={() => {
                                    const reason = window.prompt('Lý do từ chối điều chuyển:')
                                    if (reason && reason.trim()) {
                                      transferActionMutation.mutate({ transferId: transfer.id, action: 'reject', reason: reason.trim() })
                                    }
                                  }}
                                  disabled={transferActionMutation.isPending}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-danger/40 text-danger hover:bg-danger/10 rounded-lg font-medium transition disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" /> Từ chối
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Chưa có lịch sử điều chuyển</p>
                </div>
              )}
            </div>
          )}

          {/* ── HOÁN ĐỔI LINH KIỆN ── */}
          {activeTab === 'parts' && (
            <div>
              {partTransferHistory?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 font-medium text-slate-500">Ngày</th>
                        <th className="text-left py-3 font-medium text-slate-500">Lô</th>
                        <th className="text-left py-3 font-medium text-slate-500">Linh kiện</th>
                        <th className="text-center py-3 font-medium text-slate-500">Hướng</th>
                        <th className="text-left py-3 font-medium text-slate-500">Xe đối ứng</th>
                        <th className="text-center py-3 font-medium text-slate-500">SL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {partTransferHistory.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="py-3 text-slate-500 text-xs">{formatDate(item.batch?.approvedAt || item.batch?.createdAt)}</td>
                          <td className="py-3">
                            <Link href={`/workshop/parts/transfers/${item.batch?.id}`} className="text-primary hover:underline text-xs font-medium">
                              {item.batch?.code}
                            </Link>
                          </td>
                          <td className="py-3 text-slate-700 dark:text-slate-300">{item.itemDescription}</td>
                          <td className="py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.direction === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {item.direction === 'IN' ? '↓ Nhận' : '↑ Cho'}
                            </span>
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-300">{item.counterpartVehicle?.licensePlate || '—'}</td>
                          <td className="py-3 text-center font-semibold text-slate-900 dark:text-white">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Chưa có lịch sử hoán đổi linh kiện</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
