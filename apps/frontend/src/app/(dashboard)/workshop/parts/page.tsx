'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { useState } from 'react'
import { Package, Plus, Search, AlertTriangle, Download } from 'lucide-react'

export default function PartsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importForm, setImportForm] = useState({ partId: '', quantity: 1, reference: '', note: '' })
  const [form, setForm] = useState({
    code: '',
    name: '',
    categoryId: '',
    unit: 'cái',
    initialQty: 0,
    minStock: 5,
    costPrice: 0,
    sellPrice: 0,
    supplier: '',
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await api.get('/branches')
      return data
    },
  })

  const workshopBranches = branches?.filter((b: any) => b.type === 'WORKSHOP')
  const defaultWorkshopBranchId = workshopBranches?.[0]?.id || ''

  const { data, isLoading } = useQuery({
    queryKey: ['parts', { search, page, branchId: defaultWorkshopBranchId }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (defaultWorkshopBranchId) params.set('branchId', defaultWorkshopBranchId)
      const { data } = await api.get(`/workshop/parts?${params}`)
      return data
    },
    enabled: !!defaultWorkshopBranchId,
  })

  const { data: categories } = useQuery({
    queryKey: ['part-categories'],
    queryFn: async () => {
      const { data } = await api.get('/workshop/parts/categories')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/workshop/parts', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      toast.success('Tạo phụ tùng thành công')
      setShowForm(false)
      setForm({ code: '', name: '', categoryId: '', unit: 'cái', initialQty: 0, minStock: 5, costPrice: 0, sellPrice: 0, supplier: '' })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi tạo phụ tùng')
    },
  })

  const importMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/workshop/parts/transactions', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      toast.success('Nhập kho thành công')
      setShowImport(false)
      setImportForm({ partId: '', quantity: 1, reference: '', note: '' })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi nhập kho')
    },
  })

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault()
    if (!importForm.partId) return toast.error('Vui lòng chọn phụ tùng')
    if (!importForm.reference) return toast.error('Vui lòng nhập số PO')
    importMutation.mutate({
      partId: importForm.partId,
      branchId: defaultWorkshopBranchId,
      type: 'IMPORT',
      quantity: importForm.quantity,
      reference: importForm.reference,
      note: importForm.note || `Nhập từ NCC - ${importForm.reference}`,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {
      code: form.code,
      name: form.name,
      categoryId: form.categoryId,
      unit: form.unit,
      minStock: form.minStock,
      costPrice: form.costPrice,
      sellPrice: form.sellPrice,
      initialStockBranchId: defaultWorkshopBranchId,
      initialQty: form.initialQty,
    }
    if (form.supplier) payload.supplier = form.supplier
    createMutation.mutate(payload)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Quản lý phụ tùng
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowImport(!showImport); setShowForm(false) }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Download className="w-4 h-4" />
            Nhập kho NCC
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowImport(false) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Thêm phụ tùng
          </button>
        </div>
      </div>

      {/* Import from Supplier Form */}
      {showImport && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-green-800 p-6">
          <h3 className="text-base font-semibold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-green-600" /> Nhập kho từ nhà cung cấp
          </h3>
          <form onSubmit={handleImport} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phụ tùng *</label>
              <select
                value={importForm.partId}
                onChange={(e) => setImportForm({ ...importForm, partId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-green-500/20"
                required
              >
                <option value="">Chọn phụ tùng đã có</option>
                {data?.data?.map((p: any) => {
                  const stockQty = p.stocks?.[0]?.stockQty ?? 0
                  return (
                    <option key={p.id} value={p.id}>{p.code} — {p.name} (tồn: {stockQty})</option>
                  )
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Số lượng nhập *</label>
              <input
                type="number"
                min={1}
                value={importForm.quantity}
                onChange={(e) => setImportForm({ ...importForm, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-green-500/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Số PO *</label>
              <input
                type="text"
                value={importForm.reference}
                onChange={(e) => setImportForm({ ...importForm, reference: e.target.value })}
                placeholder="PO-2025-001"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-green-500/20"
                required
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ghi chú</label>
              <input
                type="text"
                value={importForm.note}
                onChange={(e) => setImportForm({ ...importForm, note: e.target.value })}
                placeholder="NCC, lô hàng..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            <div className="md:col-span-4 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={importMutation.isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {importMutation.isPending ? 'Đang nhập...' : 'Xác nhận nhập kho'}
              </button>
              <button type="button" onClick={() => setShowImport(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold mb-1 text-slate-900 dark:text-white">Thêm phụ tùng vào catalog</h3>
          <p className="text-xs text-slate-400 mb-4">Phụ tùng được tạo chung cho toàn hệ thống. Số lượng nhập ban đầu sẽ vào kho xưởng.</p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mã phụ tùng *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="PT-BRAKE-001"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên phụ tùng *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Má phanh trước"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nhóm *</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Chọn nhóm</option>
                {categories?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Đơn vị</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Số lượng nhập ban đầu</label>
              <input
                type="number"
                min={0}
                value={form.initialQty}
                onChange={(e) => setForm({ ...form, initialQty: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tồn tối thiểu</label>
              <input
                type="number"
                min={0}
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Giá nhập *</label>
              <input
                type="number"
                min={0}
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Giá xuất *</label>
              <input
                type="number"
                min={0}
                value={form.sellPrice}
                onChange={(e) => setForm({ ...form, sellPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nhà cung cấp</label>
              <input
                type="text"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="md:col-span-3 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {createMutation.isPending ? 'Đang tạo...' : 'Tạo phụ tùng'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã hoặc tên phụ tùng..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Kho: <span className="font-medium text-slate-700 dark:text-slate-200">{workshopBranches?.[0]?.name || 'Xưởng chính'}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Mã</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Tên</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Nhóm</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Tồn kho xưởng</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Giá nhập</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Giá xuất</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">NCC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></td></tr>
                ))
              ) : data?.data?.length > 0 ? (
                data.data.map((part: any) => {
                  const stockQty = part.stocks?.[0]?.stockQty ?? 0
                  const isLow = stockQty <= part.minStock
                  return (
                    <tr key={part.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-4 py-3 font-medium text-primary">{part.code}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-white">{part.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{part.category?.name}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${isLow ? 'text-danger' : 'text-slate-900 dark:text-white'}`}>
                          {formatNumber(stockQty)}
                        </span>
                        {isLow && <AlertTriangle className="inline-block w-3.5 h-3.5 text-danger ml-1" />}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {formatCurrency(Number(part.costPrice))}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {formatCurrency(Number(part.sellPrice))}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{part.supplier || '—'}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Chưa có phụ tùng nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500">Trang {page}/{data.meta.totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Trước</button>
              <button onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))} disabled={page === data.meta.totalPages} className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Sau</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
