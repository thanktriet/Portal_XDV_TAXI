'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { Bell, Check } from 'lucide-react'

const typeLabels: Record<string, string> = {
  MAINTENANCE_DUE: '🔧 Bảo dưỡng đến hạn',
  MAINTENANCE_OVERDUE: '⚠️ Bảo dưỡng quá hạn',
  VEHICLE_IN_WORKSHOP_LONG: '🏭 Xe ở xưởng lâu',
  PARTS_LOW_STOCK: '📦 Phụ tùng sắp hết',
  INCIDENT_NEW: '🚨 Sự cố mới',
  WORKSHOP_STATUS_CHANGED: '🔄 Cập nhật xưởng',
  VEHICLE_TRANSFERRED: '🚗 Điều chuyển xe',
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => { const { data } = await api.get('/notifications', { params: { limit: 50 } }); return data },
  })

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => { await api.patch(`/notifications/${id}/read`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllMutation = useMutation({
    mutationFn: async () => { await api.patch('/notifications/read-all') },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Đã đọc tất cả thông báo')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6" />Thông báo
          </h1>
          {data?.unreadCount > 0 && (
            <p className="text-sm text-slate-500 mt-1">{data.unreadCount} chưa đọc</p>
          )}
        </div>
        {data?.unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <Check className="w-4 h-4" />Đọc tất cả
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Đang tải...</div>
        ) : !data?.data?.length ? (
          <div className="p-8 text-center text-slate-400">Chưa có thông báo nào</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {data.data.map((notif: any) => (
              <div
                key={notif.id}
                className={`px-6 py-4 flex items-start gap-4 transition ${
                  !notif.isRead ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex-1">
                  <p className="text-xs text-slate-400 mb-1">
                    {typeLabels[notif.type] || notif.type}
                  </p>
                  <p className={`text-sm ${!notif.isRead ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                    {notif.title}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">{notif.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDateTime(notif.createdAt)}</p>
                </div>
                {!notif.isRead && (
                  <button
                    onClick={() => markReadMutation.mutate(notif.id)}
                    className="shrink-0 p-1.5 text-primary hover:bg-primary/10 rounded transition"
                    title="Đánh dấu đã đọc"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
