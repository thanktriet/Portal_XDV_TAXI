'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import {
  LayoutDashboard,
  Wrench,
  Car,
  Gauge,
  Settings,
  ClipboardList,
  ClipboardCheck,
  Package,
  PackagePlus,
  Truck,
  Users,
  Building2,
  AlertTriangle,
  DollarSign,
  Calendar,
  Bell,
  ArrowRightLeft,
  Upload,
  Shield,
  X,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: string[]
}

export const navigation: { section: string; items: NavItem[] }[] = [
  {
    section: 'Tổng quan',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Xưởng Dịch vụ',
    items: [
      { label: 'Dashboard', href: '/workshop', icon: Wrench, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_XUONG', 'CO_VAN_DICH_VU', 'KY_THUAT_VIEN'] },
      { label: 'Công việc', href: '/workshop/jobs', icon: ClipboardList, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_XUONG', 'CO_VAN_DICH_VU', 'KY_THUAT_VIEN'] },
      { label: 'Lệnh sửa chữa', href: '/workshop/repair-orders', icon: ClipboardList, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_XUONG', 'CO_VAN_DICH_VU'] },
      { label: 'Phụ tùng', href: '/workshop/parts', icon: Package, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_XUONG'] },
      { label: 'Hoán đổi PT', href: '/workshop/parts/transfers', icon: ArrowRightLeft, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_XUONG', 'CO_VAN_DICH_VU'] },
      { label: 'Cấp phát PT', href: '/workshop/parts/requisitions', icon: PackagePlus, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_XUONG'] },
      { label: 'Kỹ thuật viên', href: '/workshop/technicians', icon: Users, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_XUONG'] },
    ],
  },
  {
    section: 'Đội xe Taxi',
    items: [
      { label: 'Fleet', href: '/fleet', icon: Car, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_DOI_XE', 'DIEU_HANH'] },
      { label: 'Phê duyệt', href: '/fleet/approvals', icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_DOI_XE'] },
      { label: 'Điều chuyển xe', href: '/fleet/transfers', icon: ArrowRightLeft, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_DOI_XE'] },
      { label: 'Phụ tùng', href: '/fleet/parts', icon: Package, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_DOI_XE', 'KTV_DOI_XE'] },
      { label: 'Yêu cầu PT', href: '/fleet/parts/requisitions', icon: PackagePlus, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_DOI_XE', 'KTV_DOI_XE'] },
      { label: 'Thay thế PT', href: '/fleet/part-replacements', icon: Truck, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_DOI_XE', 'KTV_DOI_XE'] },
      { label: 'Chi phí', href: '/fleet/costs', icon: DollarSign, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_DOI_XE'] },
      { label: 'Sự cố', href: '/fleet/incidents', icon: AlertTriangle, roles: ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_DOI_XE', 'DIEU_HANH', 'TAI_XE'] },
    ],
  },
  {
    section: 'Chung',
    items: [
      { label: 'Quản lý xe', href: '/vehicles', icon: Gauge },
      { label: 'Import xe', href: '/vehicles/import', icon: Upload, roles: ['SUPER_ADMIN', 'QUAN_LY_DOI_XE'] },
      { label: 'Bảo dưỡng', href: '/maintenance', icon: Calendar },
      { label: 'Cấu hình BD', href: '/maintenance/plans', icon: Settings, roles: ['SUPER_ADMIN', 'QUAN_LY_XUONG', 'QUAN_LY_DOI_XE'] },
      { label: 'Thông báo', href: '/notifications', icon: Bell },
    ],
  },
  {
    section: 'Cài đặt',
    items: [
      { label: 'Chi nhánh', href: '/settings/branches', icon: Building2, roles: ['SUPER_ADMIN'] },
      { label: 'Người dùng', href: '/settings/users', icon: Users, roles: ['SUPER_ADMIN'] },
      { label: 'Phân quyền', href: '/settings/roles', icon: Shield, roles: ['SUPER_ADMIN'] },
      { label: 'Cấu hình', href: '/settings', icon: Settings, roles: ['SUPER_ADMIN'] },
    ],
  },
]

function getSectionTheme(section: string, pathname: string) {
  if (section === 'Xưởng Dịch vụ') return 'text-blue-600 dark:text-blue-400'
  if (section === 'Đội xe Taxi') return 'text-emerald-600 dark:text-emerald-400'
  return 'text-slate-400'
}

const FLEET_APPROVAL_ROLES = ['SUPER_ADMIN', 'GIAM_DOC_HAU_MAI', 'QUAN_LY_DOI_XE']

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)

  const canSeeApprovals = user ? FLEET_APPROVAL_ROLES.includes(user.role) : false

  const { data: pendingData } = useQuery({
    queryKey: ['fleet', 'approvals', 'count'],
    queryFn: async () => {
      const { data } = await api.get('/workshop/jobs', { params: { status: 'QUOTED', limit: 1 } })
      return data.meta?.total ?? 0
    },
    enabled: canSeeApprovals,
    refetchInterval: 60_000,
  })

  const pendingCount: number = pendingData ?? 0

  const isWorkshop = pathname.startsWith('/workshop')
  const isFleet = pathname.startsWith('/fleet')

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    // exact match for top-level section roots to avoid parent highlighting when child is active
    if (href === '/fleet' || href === '/workshop' || href === '/vehicles' || href === '/maintenance' ||
        href === '/fleet/parts' || href === '/workshop/parts') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const canSee = (item: NavItem) => {
    if (!item.roles) return true
    if (!user) return false
    return item.roles.includes(user.role)
  }

  const logoLabel = isFleet ? 'Đội xe Taxi' : isWorkshop ? 'Xưởng Dịch vụ' : 'XDV Taxi'
  const LogoIcon = isFleet ? Car : isWorkshop ? Wrench : Car
  const logoBg = isFleet ? 'bg-emerald-600' : 'bg-primary'

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors', logoBg)}>
            <LogoIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white transition-all">
            {logoLabel}
          </span>
        </div>
        {/* Close button — mobile only */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-6">
        {navigation.map((group) => {
          const visibleItems = group.items.filter(canSee)
          if (visibleItems.length === 0) return null

          return (
            <div key={group.section}>
              <h3 className={cn(
                'text-xs font-semibold uppercase tracking-wider mb-2 px-3',
                getSectionTheme(group.section, pathname),
              )}>
                {group.section}
              </h3>
              <ul className="space-y-1">
                {visibleItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive(item.href)
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
                      )}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.href === '/fleet/approvals' && pendingCount > 0 && (
                        <span className="min-w-[1.25rem] h-5 flex items-center justify-center rounded-full bg-danger text-white text-xs font-bold px-1">
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden lg:block overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside className="fixed left-0 top-0 h-screen w-72 bg-white dark:bg-slate-800 shadow-xl overflow-y-auto animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
