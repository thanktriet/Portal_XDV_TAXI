'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import {
  isPushSupported,
  getPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
  getSubscriptionStatus,
} from '@/lib/push-notifications'

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)

  useEffect(() => {
    async function checkStatus() {
      const isSupported = isPushSupported()
      setSupported(isSupported)

      if (isSupported) {
        const permission = getPermissionState()
        setPermissionDenied(permission === 'denied')
        const isSubscribed = await getSubscriptionStatus()
        setEnabled(isSubscribed)
      }
      setLoading(false)
    }
    checkStatus()
  }, [])

  const handleToggle = async () => {
    setLoading(true)
    try {
      if (enabled) {
        await unsubscribeFromPush()
        setEnabled(false)
      } else {
        const subscription = await subscribeToPush()
        if (subscription) {
          setEnabled(true)
        } else {
          // Permission was denied
          setPermissionDenied(getPermissionState() === 'denied')
        }
      }
    } catch (error) {
      console.error('Push toggle failed:', error)
    }
    setLoading(false)
  }

  if (!supported) {
    return (
      <div className="flex items-center gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60">
        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          <BellOff className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-900 dark:text-white">Push Notification</p>
          <p className="text-xs text-slate-500 mt-0.5">Trình duyệt không hỗ trợ push notification</p>
        </div>
      </div>
    )
  }

  if (permissionDenied) {
    return (
      <div className="flex items-center gap-4 p-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
          <BellOff className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-900 dark:text-white">Push Notification</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Quyền thông báo bị chặn. Vui lòng mở cài đặt trình duyệt để cho phép.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${enabled ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-slate-100 dark:bg-slate-700'}`}>
        <Bell className={`w-5 h-5 ${enabled ? 'text-emerald-600' : 'text-slate-400'}`} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-slate-900 dark:text-white">Push Notification</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {enabled ? 'Đang nhận thông báo đẩy' : 'Bật để nhận thông báo trên điện thoại'}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'} ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle push notifications"
      >
        {loading ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          </span>
        ) : (
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
          />
        )}
      </button>
    </div>
  )
}
