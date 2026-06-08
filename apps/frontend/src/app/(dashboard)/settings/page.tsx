'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Building2, Users, Settings } from 'lucide-react'
import { PushNotificationToggle } from '@/components/settings/push-notification-toggle'

const tabs = [
  { label: 'Chi nhánh', href: '/settings/branches', icon: Building2 },
  { label: 'Người dùng', href: '/settings/users', icon: Users },
]

export default function SettingsPage() {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-slate-500" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cài đặt</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-4 p-5 rounded-xl border transition hover:shadow-md',
              pathname === tab.href
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/40',
            )}
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <tab.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{tab.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {tab.label === 'Chi nhánh' ? 'Quản lý các chi nhánh' : 'Quản lý tài khoản người dùng'}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Push Notification */}
      <div className="max-w-xl">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Thông báo</h2>
        <PushNotificationToggle />
      </div>
    </div>
  )
}
