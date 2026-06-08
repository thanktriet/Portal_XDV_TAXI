'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { formatNumber } from '@/lib/utils'

function NewRequisitionForm() {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [note, setNote] = useState('')
  const [toBranchId, setToBranchId] = useState('')
  const [lines, setLines] = useState<{ partId: string; requestedQty: number; note: string }[]>([
    { partId: '', requestedQty: 1, note: '' },
  ])

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await api.get('/branches')
      return data
    },
  })

  const hqBranches = branches?.filter((b: any) => b.type === 'WORKSHOP')
  const fromBranchId = user?.branchId || ''

  const { data: hqParts } = useQuery({
    queryKey: ['parts', { branchId: toBranchId }],
    enabled: !!toBranchId,
    queryFn: async () => {
      const { data } = await api.get(`/workshop/parts?branchId=${toBranchId}&limit=200`)
      // Normalize: attach stockQty from stocks[0] for easy access
      return data.data.map((p: any) => ({
        ...p,
        stockQty: p.stocks?.[0]?.stockQty ?? 0,
      }))
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/parts/requisitions', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requisitions'] })
      toast.success('Tạo phiếu yêu cầu thành công')
      router.push('/workshop/parts/requisitions')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi tạo phiếu'),
  })

  const addLine = () => setLines([...lines, { partId: '', requestedQty: 1, note: '' }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: string, value: any) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!toBranchId) return toast.error('Vui lòng chọn kho cấp phát')
    if (lines.some((l) => !l.partId)) return toast.error('Vui lòng chọn phụ tùng cho tất cả các dòng')
    createMutation.mutate({ fromBranchId, toBranchId, note, lines })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tạo phiếu yêu cầu cấp phát</h1>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chi nhánh yêu cầu</label>
              <div className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-300">
                {branches?.find((b: any) => b.id === fromBranchId)?.name || 'Chi nhánh của bạn'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kho cấp phát (HQ) *</label>
              <select
                value={toBranchId}
                onChange={(e) => { setToBranchId(e.target.value); setLines([{ partId: '', requestedQty: 1, note: '' }]) }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Chọn kho HQ</option>
                {hqBranches?.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Ghi chú cho phiếu yêu cầu..."
            />
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Danh sách phụ tùng yêu cầu *</p>
              <button type="button" onClick={addLine} className="flex items-center gap-1 text-sm text-primary hover:underline">
                <Plus className="w-4 h-4" /> Thêm dòng
              </button>
            </div>
            <div className="space-y-3">
              {lines.map((line, i) => {
                const selectedPart = hqParts?.find((p: any) => p.id === line.partId)
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                    <div className="col-span-5">
                      <label className="block text-xs text-slate-500 mb-1">Phụ tùng *</label>
                      <select
                        value={line.partId}
                        onChange={(e) => updateLine(i, 'partId', e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      >
                        <option value="">Chọn phụ tùng</option>
                        {hqParts?.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code}) — tồn: {p.stockQty}
                          </option>
                        ))}
                      </select>
                      {selectedPart && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Đơn vị: {selectedPart.unit} · Tồn kho HQ: {formatNumber(selectedPart.stockQty)}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Số lượng *</label>
                      <input
                        type="number"
                        min={1}
                        value={line.requestedQty}
                        onChange={(e) => updateLine(i, 'requestedQty', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs text-slate-500 mb-1">Ghi chú dòng</label>
                      <input
                        type="text"
                        value={line.note}
                        onChange={(e) => updateLine(i, 'note', e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Ghi chú..."
                      />
                    </div>
                    <div className="col-span-1 flex items-end pb-1">
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={lines.length === 1}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
            <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewRequisitionPage() {
  return (
    <Suspense>
      <NewRequisitionForm />
    </Suspense>
  )
}
