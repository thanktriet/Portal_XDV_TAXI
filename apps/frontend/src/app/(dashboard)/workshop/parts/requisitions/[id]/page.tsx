'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle, XCircle, Package, Truck, ClipboardCheck, Upload, FileText, ShieldCheck, UserCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  DRAFT:          { label: 'Nháp',              cls: 'bg-slate-100 text-slate-600' },
  SUBMITTED:      { label: 'Chờ QL đội xe',     cls: 'bg-yellow-100 text-yellow-700' },
  FLEET_APPROVED: { label: 'Chờ NV phụ tùng',   cls: 'bg-blue-100 text-blue-700' },
  PARTS_APPROVED: { label: 'Chờ GĐ duyệt',     cls: 'bg-indigo-100 text-indigo-700' },
  APPROVED:       { label: 'Đã duyệt',          cls: 'bg-purple-100 text-purple-700' },
  DISPATCHED:     { label: 'Đã gửi hàng',       cls: 'bg-orange-100 text-orange-700' },
  RECEIVED:       { label: 'Đã nhận',            cls: 'bg-green-100 text-green-700' },
  REJECTED:       { label: 'Từ chối',            cls: 'bg-red-100 text-red-700' },
  CANCELLED:      { label: 'Đã huỷ',            cls: 'bg-slate-100 text-slate-500' },
}

const STEPS = ['SUBMITTED', 'FLEET_APPROVED', 'PARTS_APPROVED', 'APPROVED', 'DISPATCHED', 'RECEIVED']
const STEP_LABELS = ['Gửi yêu cầu', 'QL Đội xe', 'NV Phụ tùng', 'GĐ Hậu mãi', 'Gửi hàng', 'Nhận hàng']

// Role groups
const FLEET_MANAGER_ROLES = ['SUPER_ADMIN', 'QUAN_LY_DOI_XE']
const PARTS_STAFF_ROLES = ['SUPER_ADMIN', 'QUAN_LY_XUONG']
const DIRECTOR_ROLES = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI']
const WORKSHOP_ROLES = ['SUPER_ADMIN', 'QUAN_LY_XUONG']
const BRANCH_ROLES = ['SUPER_ADMIN', 'QUAN_LY_DOI_XE', 'KTV_DOI_XE']

export default function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const userRole = user?.role || ''

  const [approvedQtys, setApprovedQtys] = useState<Record<string, number>>({})
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [dispatchNote, setDispatchNote] = useState('')
  const [receiptFileId, setReceiptFileId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: req, isLoading } = useQuery({
    queryKey: ['part-requisition', id],
    queryFn: async () => {
      const { data } = await api.get(`/parts/requisitions/${id}`)
      return data
    },
  })

  // Step 1: QL Đội xe duyệt
  const fleetApproveMutation = useMutation({
    mutationFn: () => api.patch(`/parts/requisitions/${id}/fleet-approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requisition', id] })
      toast.success('Quản lý đội xe đã duyệt')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  // Step 2: NV phụ tùng duyệt số lượng
  const partsApproveMutation = useMutation({
    mutationFn: async () => {
      const lines = req.lines.map((l: any) => ({
        lineId: l.id,
        approvedQty: approvedQtys[l.id] ?? l.requestedQty,
      }))
      return api.patch(`/parts/requisitions/${id}/parts-approve`, { lines })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requisition', id] })
      toast.success('NV phụ tùng đã duyệt số lượng')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  // Step 3: GĐ Hậu mãi duyệt cuối
  const finalApproveMutation = useMutation({
    mutationFn: () => api.patch(`/parts/requisitions/${id}/final-approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requisition', id] })
      toast.success('Giám đốc Hậu mãi đã duyệt — sẵn sàng xuất kho')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  // Step 4: Dispatch
  const dispatchMutation = useMutation({
    mutationFn: () => api.patch(`/parts/requisitions/${id}/dispatch`, { dispatchNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requisition', id] })
      toast.success('Đã xác nhận gửi hàng, kho xưởng đã trừ')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  // Step 5: Receive
  const receiveMutation = useMutation({
    mutationFn: () => api.patch(`/parts/requisitions/${id}/receive`, { receiptFileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requisition', id] })
      toast.success('Đã xác nhận nhận hàng, kho đội xe đã cộng')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.patch(`/parts/requisitions/${id}/reject?step=${req.status}`, { reason: rejectReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requisition', id] })
      toast.success('Đã từ chối phiếu')
      setShowReject(false)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  })

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setReceiptFileId(data.id)
      toast.success('Upload biên bản thành công')
    } catch {
      toast.error('Lỗi upload file')
    } finally {
      setUploading(false)
    }
  }

  if (isLoading) return <div className="h-64 flex items-center justify-center text-slate-400">Đang tải...</div>
  if (!req) return null

  const s = STATUS_CONFIG[req.status] || STATUS_CONFIG.SUBMITTED
  const currentStepIdx = STEPS.indexOf(req.status)

  // Permission checks
  const canFleetApprove = FLEET_MANAGER_ROLES.includes(userRole) && req.status === 'SUBMITTED'
  const canPartsApprove = PARTS_STAFF_ROLES.includes(userRole) && req.status === 'FLEET_APPROVED'
  const canFinalApprove = DIRECTOR_ROLES.includes(userRole) && req.status === 'PARTS_APPROVED'
  const canDispatch = WORKSHOP_ROLES.includes(userRole) && req.status === 'APPROVED'
  const canReceive = BRANCH_ROLES.includes(userRole) && req.status === 'DISPATCHED'
  const canReject = (
    (FLEET_MANAGER_ROLES.includes(userRole) && req.status === 'SUBMITTED') ||
    (PARTS_STAFF_ROLES.includes(userRole) && req.status === 'FLEET_APPROVED') ||
    (DIRECTOR_ROLES.includes(userRole) && req.status === 'PARTS_APPROVED')
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{req.code}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {req.fromBranch?.name} → {req.toBranch?.name} · {new Date(req.createdAt).toLocaleDateString('vi')}
          </p>
        </div>
      </div>

      {/* Progress stepper */}
      {req.status !== 'REJECTED' && req.status !== 'CANCELLED' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 overflow-x-auto">
          <div className="flex items-center min-w-[600px]">
            {STEPS.map((step, i) => {
              const done = currentStepIdx >= i
              const active = currentStepIdx === i
              return (
                <div key={step} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                      done
                        ? 'bg-primary border-primary text-white'
                        : 'border-slate-300 text-slate-400'
                    }`}>
                      {done && !active ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    <p className={`text-xs mt-1 text-center ${active ? 'text-primary font-medium' : done ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`}>
                      {STEP_LABELS[i]}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 transition ${currentStepIdx > i ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 mb-1">Chi nhánh đội xe yêu cầu</p>
          <p className="font-semibold text-slate-900 dark:text-white">{req.fromBranch?.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">Người tạo: {req.createdBy?.fullName}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 mb-1">Kho cấp phát (Xưởng)</p>
          <p className="font-semibold text-slate-900 dark:text-white">{req.toBranch?.name}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 mb-1">Lịch sử duyệt</p>
          <div className="space-y-1 text-xs">
            {req.fleetApprovedBy && (
              <p className="text-slate-600 dark:text-slate-300">
                <UserCheck className="inline w-3.5 h-3.5 mr-1 text-blue-500" />
                QL Đội xe: {req.fleetApprovedBy.fullName} — {new Date(req.fleetApprovedAt).toLocaleDateString('vi')}
              </p>
            )}
            {req.partsApprovedBy && (
              <p className="text-slate-600 dark:text-slate-300">
                <Package className="inline w-3.5 h-3.5 mr-1 text-indigo-500" />
                NV PT: {req.partsApprovedBy.fullName} — {new Date(req.partsApprovedAt).toLocaleDateString('vi')}
              </p>
            )}
            {req.approvedBy && (
              <p className="text-slate-600 dark:text-slate-300">
                <ShieldCheck className="inline w-3.5 h-3.5 mr-1 text-purple-500" />
                GĐ: {req.approvedBy.fullName} — {new Date(req.approvedAt).toLocaleDateString('vi')}
              </p>
            )}
            {req.dispatchedBy && (
              <p className="text-slate-600 dark:text-slate-300">
                <Truck className="inline w-3.5 h-3.5 mr-1 text-orange-500" />
                Gửi: {req.dispatchedBy.fullName} — {new Date(req.dispatchedAt).toLocaleDateString('vi')}
              </p>
            )}
            {req.receivedBy && (
              <p className="text-green-600 dark:text-green-400">
                <CheckCircle className="inline w-3.5 h-3.5 mr-1" />
                Nhận: {req.receivedBy.fullName} — {new Date(req.receivedAt).toLocaleDateString('vi')}
              </p>
            )}
            {!req.fleetApprovedBy && !req.approvedBy && <p className="text-slate-400">Chưa có duyệt</p>}
          </div>
        </div>
      </div>

      {req.note && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
          Ghi chú: {req.note}
        </div>
      )}
      {req.dispatchNote && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-sm text-orange-700 dark:text-orange-300">
          <Truck className="inline w-4 h-4 mr-1" /> Ghi chú giao hàng: {req.dispatchNote}
        </div>
      )}
      {req.rejectedReason && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
          Lý do từ chối ({req.rejectedStep || ''}): {req.rejectedReason}
        </div>
      )}

      {/* Biên bản */}
      {req.receiptFile && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <FileText className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">Biên bản giao nhận</p>
            <p className="text-xs text-green-600 dark:text-green-500">{req.receiptFile.originalName}</p>
          </div>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/files/${req.receiptFile.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-700 dark:text-green-400 underline"
          >
            Xem
          </a>
        </div>
      )}

      {/* Lines table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-4 h-4" /> Danh sách phụ tùng
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Phụ tùng</th>
              <th className="text-left px-4 py-3 font-medium">Danh mục</th>
              <th className="text-right px-4 py-3 font-medium">Yêu cầu</th>
              <th className="text-right px-4 py-3 font-medium">
                {canPartsApprove ? 'Số lượng duyệt' : 'Đã duyệt'}
              </th>
              <th className="text-left px-4 py-3 font-medium">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {req.lines?.map((line: any) => (
              <tr key={line.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-white">{line.part?.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{line.part?.code}</div>
                </td>
                <td className="px-4 py-3 text-slate-500">{line.part?.category?.name}</td>
                <td className="px-4 py-3 text-right font-medium">{line.requestedQty} {line.part?.unit}</td>
                <td className="px-4 py-3 text-right">
                  {canPartsApprove ? (
                    <input
                      type="number"
                      min={0}
                      max={line.requestedQty}
                      value={approvedQtys[line.id] ?? line.requestedQty}
                      onChange={(e) => setApprovedQtys({ ...approvedQtys, [line.id]: parseInt(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-right outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  ) : (
                    <span className={line.approvedQty != null ? 'font-medium text-primary' : 'text-slate-400'}>
                      {line.approvedQty ?? '—'}{line.approvedQty != null && ` ${line.part?.unit}`}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{line.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action area */}
      <div className="space-y-3">
        {/* Step 1: QL Đội xe duyệt */}
        {canFleetApprove && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-blue-500" /> Bước 1: Quản lý đội xe duyệt yêu cầu
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => fleetApproveMutation.mutate()}
                disabled={fleetApproveMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                <ClipboardCheck className="w-4 h-4" />
                {fleetApproveMutation.isPending ? 'Đang duyệt...' : 'Duyệt yêu cầu'}
              </button>
              <button onClick={() => setShowReject(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition">
                <XCircle className="w-4 h-4" /> Từ chối
              </button>
            </div>
          </div>
        )}

        {/* Step 2: NV Phụ tùng duyệt số lượng */}
        {canPartsApprove && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-indigo-500" /> Bước 2: NV phụ tùng duyệt số lượng cấp phát
            </p>
            <p className="text-xs text-slate-500 mb-3">Điều chỉnh số lượng duyệt trong bảng phụ tùng bên trên</p>
            <div className="flex gap-3">
              <button
                onClick={() => partsApproveMutation.mutate()}
                disabled={partsApproveMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                <ClipboardCheck className="w-4 h-4" />
                {partsApproveMutation.isPending ? 'Đang duyệt...' : 'Duyệt số lượng'}
              </button>
              <button onClick={() => setShowReject(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition">
                <XCircle className="w-4 h-4" /> Từ chối
              </button>
            </div>
          </div>
        )}

        {/* Step 3: GĐ Hậu mãi duyệt cuối */}
        {canFinalApprove && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-purple-500" /> Bước 3: Giám đốc Hậu mãi phê duyệt cuối cùng
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => finalApproveMutation.mutate()}
                disabled={finalApproveMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {finalApproveMutation.isPending ? 'Đang duyệt...' : 'Phê duyệt cấp phát'}
              </button>
              <button onClick={() => setShowReject(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition">
                <XCircle className="w-4 h-4" /> Từ chối
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Xưởng Dispatch */}
        {canDispatch && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-500" /> Bước 4: Xác nhận gửi hàng & Xuất kho xưởng
            </p>
            <input
              type="text"
              value={dispatchNote}
              onChange={(e) => setDispatchNote(e.target.value)}
              placeholder="Ghi chú vận chuyển (hãng vận chuyển, mã vận đơn...)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={() => dispatchMutation.mutate()}
              disabled={dispatchMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              <Truck className="w-4 h-4" />
              {dispatchMutation.isPending ? 'Đang xử lý...' : 'Xác nhận gửi hàng & Xuất kho'}
            </button>
          </div>
        )}

        {/* Step 5: Branch Receive */}
        {canReceive && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" /> Bước 5: Xác nhận nhận hàng & Nhập kho đội xe
            </p>

            {/* File upload */}
            <div>
              <p className="text-xs text-slate-500 mb-2">Upload biên bản giao nhận (PDF/ảnh)</p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }}
              />
              {receiptFileId ? (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <FileText className="w-4 h-4" /> Đã upload biên bản
                  <button onClick={() => setReceiptFileId(null)} className="text-xs text-slate-400 hover:text-red-500 ml-1">Xoá</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-500 hover:border-primary hover:text-primary transition disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Đang upload...' : 'Chọn file biên bản'}
                </button>
              )}
            </div>

            <button
              onClick={() => receiveMutation.mutate()}
              disabled={receiveMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {receiveMutation.isPending ? 'Đang xác nhận...' : 'Xác nhận nhận hàng & Nhập kho'}
            </button>
            {!receiptFileId && (
              <p className="text-xs text-amber-600 dark:text-amber-400">Khuyến nghị upload biên bản trước khi xác nhận</p>
            )}
          </div>
        )}

        {/* Reject form */}
        {showReject && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Lý do từ chối *</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-red-300 bg-white dark:bg-slate-800 text-sm outline-none resize-none"
              placeholder="Nhập lý do..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => { if (rejectReason.trim()) rejectMutation.mutate() }}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg disabled:opacity-50 transition"
              >
                Xác nhận từ chối
              </button>
              <button onClick={() => setShowReject(false)} className="px-4 py-2 border border-slate-300 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">Hủy</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
