'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Upload, Download, FileSpreadsheet } from 'lucide-react'

export default function VehicleImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)
  const [odoFile, setOdoFile] = useState<File | null>(null)
  const [odoResult, setOdoResult] = useState<any>(null)

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/vehicles/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: (data) => {
      setResult(data)
      toast.success(`Import thành công: ${data.created} xe`)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message
      const errors = err.response?.data?.errors
      if (errors) {
        setResult({ errors })
        toast.error(msg || 'File có lỗi')
      } else {
        toast.error(msg || 'Lỗi import')
      }
    },
  })

  const odoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/vehicles/import/odo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: (data) => {
      setOdoResult(data)
      toast.success(`Cập nhật ODO: ${data.updated} xe`)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message
      const errors = err.response?.data?.errors
      if (errors) {
        setOdoResult({ errors })
        toast.error(msg || 'File có lỗi')
      } else {
        toast.error(msg || 'Lỗi cập nhật ODO')
      }
    },
  })

  const downloadBlob = async (endpoint: string, filename: string) => {
    try {
      const response = await api.get(endpoint, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      toast.error('Lỗi tải template')
    }
  }

  const handleDownloadTemplate = () => downloadBlob('/vehicles/import/template', 'import-xe-template.xlsx')
  const handleDownloadOdoTemplate = () => downloadBlob('/vehicles/import/odo/template', 'cap-nhat-odo-template.xlsx')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6" />Import từ Excel
        </h1>
        <p className="text-sm text-slate-500 mt-1">Thêm xe mới hoặc cập nhật ODO hàng loạt bằng file Excel</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="space-y-4">
          {/* Template download */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <Download className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Template Excel</p>
              <p className="text-xs text-slate-500">Tải file mẫu với các cột: Biển số, VIN, Model, Năm SX, Mã CN, ODO</p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 text-sm bg-primary hover:bg-primary-600 text-white rounded-lg transition"
            >
              Tải template
            </button>
          </div>

          {/* Upload */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Chọn file Excel (.xlsx)</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null) }}
              className="block w-full max-w-xs mx-auto text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {file && (
              <p className="text-sm text-primary mt-2 font-medium">{file.name}</p>
            )}
          </div>

          {/* Import button */}
          <div className="flex justify-end">
            <button
              onClick={() => file && importMutation.mutate(file)}
              disabled={!file || importMutation.isPending}
              className="px-6 py-2 text-sm bg-success hover:bg-success-600 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {importMutation.isPending ? 'Đang import...' : 'Import'}
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold mb-4">Kết quả import</h3>

          {result.errors ? (
            <div className="space-y-2">
              <p className="text-sm text-danger font-medium">Lỗi dữ liệu:</p>
              <ul className="list-disc pl-5 space-y-1">
                {result.errors.map((err: string, i: number) => (
                  <li key={i} className="text-sm text-slate-600 dark:text-slate-300">{err}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{result.total}</p>
                  <p className="text-xs text-slate-500">Tổng dòng</p>
                </div>
                <div className="text-center p-3 bg-success/10 rounded-lg">
                  <p className="text-2xl font-bold text-success">{result.created}</p>
                  <p className="text-xs text-slate-500">Đã tạo</p>
                </div>
                <div className="text-center p-3 bg-warning/10 rounded-lg">
                  <p className="text-2xl font-bold text-warning">{result.skipped}</p>
                  <p className="text-xs text-slate-500">Bỏ qua</p>
                </div>
              </div>

              {result.skippedDetails?.length > 0 && (
                <div>
                  <p className="text-sm text-warning font-medium mb-1">Bỏ qua:</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {result.skippedDetails.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-slate-500">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CẬP NHẬT ODO ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Cập nhật ODO hàng loạt</h2>
        <p className="text-xs text-slate-500 mb-4">Cập nhật số ODO cho xe đã có (không thêm xe mới). Chỉ cập nhật khi ODO mới lớn hơn ODO hiện tại.</p>
        <div className="space-y-4">
          {/* Template download */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <Download className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Template cập nhật ODO</p>
              <p className="text-xs text-slate-500">Tải file mẫu với các cột: Biển số, VIN, ODO mới</p>
            </div>
            <button
              onClick={handleDownloadOdoTemplate}
              className="px-4 py-2 text-sm bg-primary hover:bg-primary-600 text-white rounded-lg transition"
            >
              Tải template
            </button>
          </div>

          {/* Upload */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Chọn file Excel (.xlsx)</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => { setOdoFile(e.target.files?.[0] || null); setOdoResult(null) }}
              className="block w-full max-w-xs mx-auto text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {odoFile && (
              <p className="text-sm text-primary mt-2 font-medium">{odoFile.name}</p>
            )}
          </div>

          {/* Import button */}
          <div className="flex justify-end">
            <button
              onClick={() => odoFile && odoMutation.mutate(odoFile)}
              disabled={!odoFile || odoMutation.isPending}
              className="px-6 py-2 text-sm bg-success hover:bg-success-600 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {odoMutation.isPending ? 'Đang cập nhật...' : 'Cập nhật ODO'}
            </button>
          </div>
        </div>
      </div>

      {/* ODO Result */}
      {odoResult && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold mb-4">Kết quả cập nhật ODO</h3>
          {odoResult.errors ? (
            <div className="space-y-2">
              <p className="text-sm text-danger font-medium">Lỗi dữ liệu:</p>
              <ul className="list-disc pl-5 space-y-1">
                {odoResult.errors.map((err: string, i: number) => (
                  <li key={i} className="text-sm text-slate-600 dark:text-slate-300">{err}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{odoResult.total}</p>
                  <p className="text-xs text-slate-500">Tổng dòng</p>
                </div>
                <div className="text-center p-3 bg-success/10 rounded-lg">
                  <p className="text-2xl font-bold text-success">{odoResult.updated}</p>
                  <p className="text-xs text-slate-500">Đã cập nhật</p>
                </div>
                <div className="text-center p-3 bg-warning/10 rounded-lg">
                  <p className="text-2xl font-bold text-warning">{odoResult.skipped}</p>
                  <p className="text-xs text-slate-500">Bỏ qua</p>
                </div>
              </div>
              {odoResult.skippedDetails?.length > 0 && (
                <div>
                  <p className="text-sm text-warning font-medium mb-1">Bỏ qua:</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {odoResult.skippedDetails.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-slate-500">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
