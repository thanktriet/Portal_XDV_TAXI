'use client'

import { useAuthStore } from '@/stores/auth.store'
import { useTheme } from 'next-themes'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Bell, Moon, Sun, LogOut, User, ChevronDown, Menu, Check } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'

interface HeaderProps {
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const queryClient = useQueryClient()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count')
      return data
    },
    refetchInterval: 30000,
  })

  const { data: recentNotifs } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: async () => {
      const { data } = await api.get('/notifications', { params: { limit: 5 } })
      return data
    },
    enabled: showNotifMenu,
  })

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => { await api.patch(`/notifications/${id}/read`) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unreadCount = unreadData?.count ?? 0

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 sm:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
          aria-label="Mở menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white hidden sm:block">
          Dashboard
        </h2>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifMenu(!showNotifMenu); setShowUserMenu(false) }}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">Thông báo</p>
                  {unreadCount > 0 && (
                    <span className="text-xs text-danger font-medium">{unreadCount} chưa đọc</span>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                  {recentNotifs?.data?.length > 0 ? recentNotifs.data.map((n: any) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 text-sm ${!n.isRead ? 'bg-primary/5' : ''} hover:bg-slate-50 dark:hover:bg-slate-700/50 transition`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`truncate ${!n.isRead ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(n.createdAt)}</p>
                        </div>
                        {!n.isRead && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(n.id) }}
                            className="shrink-0 p-1 text-primary hover:bg-primary/10 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">Không có thông báo</div>
                  )}
                </div>
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifMenu(false)}
                  className="block px-4 py-2.5 text-center text-sm text-primary font-medium border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                >
                  Xem tất cả
                </Link>
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifMenu(false) }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {user?.fullName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.role}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {user?.fullName}
                  </p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
