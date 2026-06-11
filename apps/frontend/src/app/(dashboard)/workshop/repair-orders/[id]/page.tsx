'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Plus, Wrench, Package, ClipboardList } from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Đang mở', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  IN_PROGRESS: { label: 'Đang thực hiện', cls: 'bg-warning/10 text-warning' },
  COMPLETED: { label: 'Hoàn tất', cls: 'bg-success/10 text-success' },
  CANCELLED: { label: 'Hủy', cls: 'bg-slate-100 text-slate-500' },
}

const ALLOWED_RO_TRANSITIONS: Record<string, { status: string; label: string; cls: string }[]> = {
  OPEN: [
    { status: 'IN_PROGRESS', label: 'Bắt đầu thực hiện', cls: 'bg-warning hover:bg-warning/90 text-white' },
    { status: 'CANCELLED', label: 'Hủy', cls: 'bg-slate-500 hover:bg-slate-600 text-white' },
  ],
  IN_PROGRESS: [
    { status: 'COMPLETED', label: 'Hoàn tất', cls: 'bg-success hover:bg-success/90 text-white' },
    { status: 'OPEN', label: 'Quay lại Mở', cls: 'bg-slate-500 hover:bg-slate-600 text-white' },
  ],
  COMPLETED: [],
  CANCELLED: [
    { status: 'OPEN', label: 'Mở lại', cls: 'bg-blue-500 hover:bg-blue-600 text-white' },
  ],
}

const EMPTY_ITEM = { type: 'LABOR' as 'LABOR' | 'PART', description: '', partId: '', quantity: '1', unitPrice: '' }

export default function RepairOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [showAddItem, setShowAddItem] = useState(false)
  const [item, setItem] = useState(EMPTY_ITEM)

  const { data: ro, isLoading } = useQuery({
    queryKey: ['repair-order', id],
    queryFn: async () => {
      const { data } = await api.get(`/workshop/repair-orders/${id}`)
      return data
    },
  })

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { data } = await api.patch(`/workshop/repair-orders/${id}/status`, { status })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-order', id] })
      toast.success('Cập nhật trạng thái thành công')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật trạng thái')
    },
  })

  const { data: parts } = useQuery({
    queryKey: ['parts-list'],
    queryFn: async () => {
      const { data } = await api.get('/workshop/parts?limit=200')
      return data
    },
    enabled: showAddItem && item.type === 'PART',
  })

  const addItemMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        type: item.type,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      }
      if (item.type === 'PART' && item.partId) payload.partId = item.partId
      const { data } = await api.post(`/workshop/repair-orders/${id}/items`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-order', id] })
      toast.success('Thêm hạng mục thành công')
      setShowAddItem(false)
      setItem(EMPTY_ITEM)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi thêm hạng mục')
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
    )
  }

  if (!ro) return null

  const status = STATUS_LABEL[ro.status] || { label: ro.status, cls: '' }
  const transitions = ALLOWED_RO_TRANSITIONS[ro.status] || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/workshop/repair-orders"
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-6 h-6" />{ro.code}
            </h1>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
              {status.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Mở lúc {formatDate(ro.openedAt)}</p>
        </div>
        {/* Status transition buttons */}
        {transitions.length > 0 && (
          <div className="flex gap-2 shrink-0">
            {transitions.map((t) => (
              <button
                key={t.status}
                onClick={() => statusMutation.mutate(t.status)}
                disabled={statusMutation.isPending}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50 ${t.cls}`}
              >
                {statusMutation.isPending ? '...' : t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-slate-500 mb-1">Xe</p>
            <p className="font-semibold text-slate-900 dark:text-white">{ro.job?.vehicle?.licensePlate}</p>
            <p className="text-xs text-slate-400">{ro.job?.vehicle?.model?.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">ODO</p>
            <p className="font-semibold text-slate-900 dark:text-white">{ro.odo?.toLocaleString()} km</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Chi nhánh</p>
            <p className="font-semibold text-slate-900 dark:text-white">{ro.job?.branch?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Người tạo</p>
            <p className="font-semibold text-slate-900 dark:text-white">{ro.createdBy?.fullName}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500 mb-1">Mô tả</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">{ro.description}</p>
        </div>
        {ro.dmsRef && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <p className="text-xs text-slate-500">Mã lệnh DMS:</p>
            <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
              {ro.dmsRef}
            </span>
          </div>
        )}
      </div>

      {/* Cost summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Công lao động', value: ro.laborCost },
          { label: 'Phụ tùng', value: ro.partsCost },
          { label: 'Tổng cộng', value: ro.totalCost, highlight: true },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className={`rounded-xl border p-4 ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
          >
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${highlight ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
              {formatCurrency(value || 0)}
            </p>
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">Hạng mục ({ro.items?.length || 0})</h3>
          {ro.status !== 'CLOSED' && ro.status !== 'CANCELLED' && (
            <button
              onClick={() => setShowAddItem(!showAddItem)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" />Thêm hạng mục
            </button>
          )}
        </div>

        {/* Add item form */}
        {showAddItem && (
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Loại</label>
                <select
                  value={item.type}
                  onChange={(e) => setItem({ ...item, type: e.target.value as 'LABOR' | 'PART', partId: '' })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="LABOR">Công lao động</option>
                  <option value="PART">Phụ tùng</option>
                </select>
              </div>

              {item.type === 'PART' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phụ tùng</label>
                  <select
                    value={item.partId}
                    onChange={(e) => {
                      const part = parts?.data?.find((p: any) => p.id === e.target.value)
                      setItem({ ...item, partId: e.target.value, description: part?.name || item.description, unitPrice: String(part?.sellPrice || item.unitPrice) })
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">-- Chọn phụ tùng --</option>
                    {parts?.data?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Mô tả *</label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => setItem({ ...item, description: e.target.value })}
                  placeholder="VD: Thay dầu động cơ"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Số lượng *</label>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => setItem({ ...item, quantity: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Đơn giá (VNĐ) *</label>
                <input
                  type="number"
                  min={0}
                  value={item.unitPrice}
                  onChange={(e) => setItem({ ...item, unitPrice: e.target.value })}
                  placeholder="500000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {item.quantity && item.unitPrice && (
                <div className="md:col-span-2 text-sm text-slate-500">
                  Thành tiền: <span className="font-semibold text-primary">
                    {formatCurrency(Number(item.quantity) * Number(item.unitPrice))}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => addItemMutation.mutate()}
                disabled={addItemMutation.isPending || !item.description || !item.unitPrice}
                className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {addItemMutation.isPending ? 'Đang thêm...' : 'Thêm'}
              </button>
              <button
                onClick={() => { setShowAddItem(false); setItem(EMPTY_ITEM) }}
                className="px-4 py-1.5 border border-slate-300 dark:border-slate-600 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Items list */}
        {ro.items?.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-400 text-sm">Chưa có hạng mục nào</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/30">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium text-slate-500">Loại</th>
                <th className="text-left px-5 py-2.5 font-medium text-slate-500">Mô tả</th>
                <th className="text-right px-5 py-2.5 font-medium text-slate-500">SL</th>
                <th className="text-right px-5 py-2.5 font-medium text-slate-500">Đơn giá</th>
                <th className="text-right px-5 py-2.5 font-medium text-slate-500">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {ro.items.map((it: any) => (
                <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                  <td className="px-5 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      it.type === 'LABOR'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}>
                      {it.type === 'LABOR' ? <Wrench className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                      {it.type === 'LABOR' ? 'Công' : 'PT'}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-slate-700 dark:text-slate-300">
                    {it.description}
                    {it.part && <span className="text-xs text-slate-400 ml-1">({it.part.sku})</span>}
                  </td>
                  <td className="px-5 py-2.5 text-right text-slate-700 dark:text-slate-300">{it.quantity}</td>
                  <td className="px-5 py-2.5 text-right text-slate-600 dark:text-slate-400">{formatCurrency(it.unitPrice)}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(it.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
