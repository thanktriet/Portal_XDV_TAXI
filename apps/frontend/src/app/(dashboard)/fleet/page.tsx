'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import Link from 'next/link'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  Car,
  CheckCircle2,
  Wrench,
  XCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  ArrowRight,
} from 'lucide-react'

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  href,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  href?: string
}) {
  const inner = (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function FleetDashboardPage() {
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', 'summary'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles?limit=1')
      return data
    },
  })

  const { data: incidents } = useQuery({
    queryKey: ['fleet-incidents', 'summary'],
    queryFn: async () => {
      const { data } = await api.get('/fleet/incidents?limit=5')
      return data
    },
  })

  const { data: costs } = useQuery({
    queryKey: ['fleet-costs', 'summary'],
    queryFn: async () => {
      const now = new Date()
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const yearFrom = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
      const [monthRes, yearRes] = await Promise.all([
        api.get(`/fleet/costs/summary?from=${from}`),
        api.get(`/fleet/costs/summary?from=${yearFrom}`),
      ])
      return {
        currentMonth: monthRes.data.total,
        currentYear: yearRes.data.total,
        byCategory: monthRes.data.byCategory,
        incidentCount: monthRes.data.count,
      }
    },
  })

  const { data: maintenance } = useQuery({
    queryKey: ['maintenance', 'due'],
    queryFn: async () => {
      const { data } = await api.get('/maintenance/due')
      return data
    },
  })

  const totalVehicles = vehicles?.meta?.total || 0
  const openIncidents = incidents?.meta?.total || 0
  const dueCount = Array.isArray(maintenance) ? maintenance.length : 0
  const monthCost = costs?.currentMonth || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Đội xe Taxi</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Tổng xe"
          value={formatNumber(totalVehicles)}
          icon={Car}
          color="bg-primary"
          href="/vehicles"
        />
        <KpiCard
          title="Sự cố đang mở"
          value={formatNumber(openIncidents)}
          icon={AlertTriangle}
          color="bg-danger"
          href="/fleet/incidents"
        />
        <KpiCard
          title="Sắp bảo dưỡng"
          value={formatNumber(dueCount)}
          icon={Calendar}
          color="bg-warning"
          href="/maintenance"
        />
        <KpiCard
          title="Chi phí tháng này"
          value={formatCurrency(monthCost)}
          icon={DollarSign}
          color="bg-success"
          href="/fleet/costs"
        />
        <KpiCard
          title="Tổng chi phí năm"
          value={formatCurrency(costs?.currentYear || 0)}
          icon={DollarSign}
          color="bg-slate-500"
          href="/fleet/costs"
        />
        <KpiCard
          title="Sự cố tháng này"
          value={formatNumber(costs?.incidentCount || 0)}
          icon={XCircle}
          color="bg-danger"
          href="/fleet/incidents"
        />
      </div>

      {/* Recent incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Sự cố gần đây</h3>
            <Link href="/fleet/incidents" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {incidents?.data?.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400 text-center">Không có sự cố nào</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {incidents?.data?.map((inc: any) => (
                <li key={inc.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{inc.code}</p>
                    <p className="text-xs text-slate-500 truncate">{inc.vehicle?.licensePlate} — {inc.description}</p>
                  </div>
                  <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    inc.status === 'OPEN' ? 'bg-danger/10 text-danger' :
                    inc.status === 'IN_PROGRESS' ? 'bg-warning/10 text-warning' :
                    'bg-success/10 text-success'
                  }`}>
                    {inc.status === 'OPEN' ? 'Mở' : inc.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Đóng'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cost by category */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Chi phí theo loại</h3>
            <Link href="/fleet/costs" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Chi tiết <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {!costs?.byCategory?.length ? (
            <p className="px-5 py-6 text-sm text-slate-400 text-center">Chưa có dữ liệu chi phí</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {costs.byCategory.map((cat: any) => (
                <li key={cat.category} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{cat.category}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatCurrency(cat._sum?.amount || 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
