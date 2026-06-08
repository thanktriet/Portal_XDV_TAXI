'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { formatNumber, formatDate, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { useState } from 'react'
import {
  ArrowLeft,
  Car,
  MapPin,
  Gauge,
  Calendar,
  Wrench,
  ArrowRightLeft,
  Plus,
  Package,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'

const VEHICLE_WRITE_ROLES = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_XUONG', 'QUAN_LY_DOI_XE']

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Hoạt động', color: 'bg-success/10 text-success' },
  RESTING: { label: 'Nghỉ', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  IN_WORKSHOP: { label: 'Trong xưởng', color: 'bg-warning/10 text-warning' },
  ACCIDENT: { label: 'Tai nạn', color: 'bg-danger/10 text-danger' },
  DECOMMISSIONED: { label: 'Thanh lý', color: 'bg-slate-100 text-slate-500' },
}

const maintenanceStatusColors: Record<string, string> = {
  UPCOMING: 'text-success',
  DUE_SOON: 'text-warning',
  OVERDUE: 'text-danger',
  COMPLETED: 'text-slate-400',
}

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canWrite = VEHICLE_WRITE_ROLES.includes(user?.role || '')
  const [showOdoForm, setShowOdoForm] = useState(false)
  const [newOdo, setNewOdo] = useState('')

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
  })

  const { data: partTransferHistory } = useQuery({
    queryKey: ['vehicles', id, 'part-transfer-history'],
    queryFn: async () => {
      const { data } = await api.get(`/parts/transfer-batches/vehicle/${id}/history`)
      return data
    },
  })

  const { data: maintenanceHistory } = useQuery({
    queryKey: ['vehicles', id, 'maintenance'],
    queryFn: async () => {
      const { data } = await api.get(`/maintenance/records?vehicleId=${id}&limit=50`)
      return data
    },
  })

  const { data: repairOrders } = useQuery({
    queryKey: ['vehicles', id, 'repair-orders'],
    queryFn: async () => {
      const { data } = await api.get(`/workshop/jobs?vehicleId=${id}&limit=50`)
      return data
    },
  })

  const { data: incidents } = useQuery({
    queryKey: ['vehicles', id, 'incidents'],
    queryFn: async () => {
      const { data } = await api.get(`/fleet/incidents?vehicleId=${id}&limit=50`)
      return data
    },
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

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
    )
  }

  if (!vehicle) {
    return <div className="text-center py-12 text-slate-500">Xe không tồn tại</div>
  }

  const status = statusLabels[vehicle.status] || statusLabels.ACTIVE

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {vehicle.licensePlate}
          </h1>
          <p className="text-sm text-slate-500">VIN: {vehicle.vin}</p>
        </div>
        <span className={`ml-4 inline-flex px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-slate-500">Model</p>
              <p className="font-medium text-slate-900 dark:text-white">
                {vehicle.model?.name}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-slate-500">Chi nhánh</p>
              <p className="font-medium text-slate-900 dark:text-white">
                {vehicle.branch?.name}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <Gauge className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-slate-500">ODO hiện tại</p>
              <p className="font-medium text-slate-900 dark:text-white">
                {formatNumber(vehicle.currentOdo)} km
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-slate-500">Năm SX</p>
              <p className="font-medium text-slate-900 dark:text-white">
                {vehicle.yearMfg}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ODO Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Lịch sử ODO
          </h3>
          {canWrite && (
            <button
              onClick={() => setShowOdoForm(!showOdoForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary hover:bg-primary-600 text-white rounded-lg transition"
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
              placeholder={`ODO mới (> ${formatNumber(vehicle.currentOdo)})`}
              className="flex-1 max-w-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={() => newOdo && odoMutation.mutate(parseInt(newOdo))}
              disabled={odoMutation.isPending}
              className="px-4 py-2 text-sm bg-success hover:bg-success-600 text-white rounded-lg transition disabled:opacity-50"
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 font-medium text-slate-500">Thời gian</th>
                <th className="text-right py-2 font-medium text-slate-500">ODO</th>
                <th className="text-right py-2 font-medium text-slate-500">Chênh lệch</th>
                <th className="text-left py-2 font-medium text-slate-500">Nguồn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {vehicle.odoLogs.map((log: any) => (
                <tr key={log.id}>
                  <td className="py-2 text-slate-600 dark:text-slate-300">
                    {formatDateTime(log.recordedAt)}
                  </td>
                  <td className="py-2 text-right font-medium text-slate-900 dark:text-white">
                    {formatNumber(log.odo)} km
                  </td>
                  <td className="py-2 text-right text-success">
                    +{formatNumber(log.delta)} km
                  </td>
                  <td className="py-2 text-slate-500">{log.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">Chưa có lịch sử ODO</p>
        )}
      </div>

      {/* Maintenance */}
      {vehicle.maintenanceRecords?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5" />
            Bảo dưỡng
          </h3>
          <div className="space-y-3">
            {vehicle.maintenanceRecords.map((record: any) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {record.plan?.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Tiếp theo: {formatNumber(record.nextDueOdo)} km
                  </p>
                </div>
                <span className={`text-sm font-medium ${maintenanceStatusColors[record.status] || ''}`}>
                  {record.status === 'UPCOMING' && 'Chưa đến hạn'}
                  {record.status === 'DUE_SOON' && 'Sắp đến hạn'}
                  {record.status === 'OVERDUE' && 'Quá hạn'}
                  {record.status === 'COMPLETED' && 'Đã hoàn thành'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer History */}
      {transfers?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <ArrowRightLeft className="w-5 h-5" />
            Lịch sử điều chuyển
          </h3>
          <div className="space-y-3">
            {transfers.map((transfer: any) => (
              <div
                key={transfer.id}
                className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{transfer.fromBranch?.name}</span>
                    {' → '}
                    <span className="font-medium">{transfer.toBranch?.name}</span>
                  </p>
                  {transfer.reason && (
                    <p className="text-xs text-slate-500 mt-0.5">Lý do: {transfer.reason}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    {formatDateTime(transfer.transferredAt)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {transfer.approvedBy?.fullName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Part Transfer History */}
      {partTransferHistory?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Package className="w-5 h-5" />
            Lịch sử hoán đổi linh kiện
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 font-medium text-slate-500">Ngày</th>
                <th className="text-left py-2 font-medium text-slate-500">Lô</th>
                <th className="text-left py-2 font-medium text-slate-500">Linh kiện</th>
                <th className="text-center py-2 font-medium text-slate-500">Hướng</th>
                <th className="text-left py-2 font-medium text-slate-500">Xe đối ứng</th>
                <th className="text-center py-2 font-medium text-slate-500">SL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {partTransferHistory.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-2 text-slate-600 dark:text-slate-300">
                    {formatDateTime(item.batch?.approvedAt || item.batch?.createdAt)}
                  </td>
                  <td className="py-2">
                    <Link
                      href={`/workshop/parts/transfers/${item.batch?.id}`}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      {item.batch?.code}
                    </Link>
                  </td>
                  <td className="py-2 text-slate-700 dark:text-slate-300">
                    {item.itemDescription}
                  </td>
                  <td className="py-2 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      item.direction === 'IN'
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {item.direction === 'IN' ? 'Nhận' : 'Cho'}
                    </span>
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-300">
                    {item.counterpartVehicle?.licensePlate}
                  </td>
                  <td className="py-2 text-center font-medium text-slate-900 dark:text-white">
                    {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Maintenance History */}
      {maintenanceHistory?.data?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5" />
            Lịch sử bảo dưỡng
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 font-medium text-slate-500">Kế hoạch</th>
                <th className="text-right py-2 font-medium text-slate-500">ODO</th>
                <th className="text-right py-2 font-medium text-slate-500">Đến hạn tiếp</th>
                <th className="text-left py-2 font-medium text-slate-500">Ngày</th>
                <th className="text-right py-2 font-medium text-slate-500">Chi phí</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {maintenanceHistory.data.map((rec: any) => (
                <tr key={rec.id}>
                  <td className="py-2 font-medium text-slate-900 dark:text-white">{rec.plan?.name}</td>
                  <td className="py-2 text-right text-slate-600 dark:text-slate-300">{formatNumber(rec.odoAtService)} km</td>
                  <td className="py-2 text-right font-medium text-primary">{formatNumber(rec.nextDueOdo)} km</td>
                  <td className="py-2 text-slate-500 text-xs">{rec.serviceDate ? formatDate(rec.serviceDate) : '—'}</td>
                  <td className="py-2 text-right text-slate-600 dark:text-slate-300">
                    {rec.cost ? `${Number(rec.cost).toLocaleString('vi-VN')}đ` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Workshop Jobs & Repair Orders */}
      {repairOrders?.data?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5" />
            Lịch sử sửa chữa
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 font-medium text-slate-500">Mã Job</th>
                <th className="text-left py-2 font-medium text-slate-500">Lý do vào xưởng</th>
                <th className="text-left py-2 font-medium text-slate-500">Trạng thái</th>
                <th className="text-right py-2 font-medium text-slate-500">Chi phí TT</th>
                <th className="text-left py-2 font-medium text-slate-500">Ngày vào</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {repairOrders.data.map((job: any) => (
                <tr key={job.id}>
                  <td className="py-2">
                    <Link href={`/workshop/jobs/${job.id}`} className="text-primary hover:underline font-medium">
                      {job.code}
                    </Link>
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-300 max-w-xs truncate">{job.entryReason}</td>
                  <td className="py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      job.status === 'DELIVERED' ? 'bg-success/10 text-success' :
                      job.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                      job.status === 'IN_PROGRESS' ? 'bg-warning/10 text-warning' :
                      job.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="py-2 text-right text-slate-700 dark:text-slate-300">
                    {job.actualCost ? `${Number(job.actualCost).toLocaleString('vi-VN')}đ` : '—'}
                  </td>
                  <td className="py-2 text-slate-500 text-xs">{formatDate(job.receivedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Incidents */}
      {incidents?.data?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" />
            Lịch sử sự cố
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 font-medium text-slate-500">Mã</th>
                <th className="text-left py-2 font-medium text-slate-500">Mô tả</th>
                <th className="text-left py-2 font-medium text-slate-500">Trạng thái</th>
                <th className="text-left py-2 font-medium text-slate-500">Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {incidents.data.map((inc: any) => (
                <tr key={inc.id}>
                  <td className="py-2 font-medium text-slate-900 dark:text-white">{inc.code}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-300 max-w-xs truncate">{inc.description}</td>
                  <td className="py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      inc.status === 'CLOSED' ? 'bg-slate-100 text-slate-500' :
                      inc.status === 'IN_PROGRESS' ? 'bg-warning/10 text-warning' :
                      'bg-danger/10 text-danger'
                    }`}>
                      {inc.status === 'OPEN' ? 'Mở' : inc.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Đóng'}
                    </span>
                  </td>
                  <td className="py-2 text-slate-500 text-xs">{formatDate(inc.incidentDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
