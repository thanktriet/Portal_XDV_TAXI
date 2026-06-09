'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Shield, Users, Check, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'

const ACTIONS = ['create', 'read', 'update', 'delete', 'approve', 'transfer']

const RESOURCE_LABELS: Record<string, string> = {
  users: 'Người dùng',
  branches: 'Chi nhánh',
  vehicles: 'Phương tiện',
  workshop_jobs: 'Lệnh sửa chữa',
  repair_orders: 'Phiếu sửa chữa',
  parts: 'Linh kiện',
  technicians: 'Kỹ thuật viên',
  part_transfers: 'Hoán đổi LK',
  maintenance: 'Bảo dưỡng',
  maintenance_plans: 'Kế hoạch BD',
  fleet_costs: 'Chi phí đội xe',
  fleet_incidents: 'Sự cố',
  fleet_part_replacements: 'Thay LK đội xe',
  notifications: 'Thông báo',
  audit_logs: 'Nhật ký',
}

interface Permission {
  id: string
  resource: string
  action: string
}

interface Role {
  id: string
  code: string
  name: string
  description: string | null
  _count: { permissions: number; users: number }
}

interface RoleDetail extends Role {
  permissions: { permission: Permission }[]
}

interface PermissionGroup {
  resource: string
  permissions: Permission[]
}

export default function RolesPermissionsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [isDirty, setIsDirty] = useState(false)

  // Redirect non-SUPER_ADMIN
  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      router.replace('/settings')
    }
  }, [user, router])

  // Fetch roles list
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get('/roles')
      return data
    },
  })

  // Fetch all permissions
  const { data: permissionGroups = [] } = useQuery<PermissionGroup[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await api.get('/permissions')
      return data
    },
  })

  // Fetch selected role detail
  const { data: roleDetail, isLoading: loadingDetail } = useQuery<RoleDetail>({
    queryKey: ['roles', selectedRoleId],
    queryFn: async () => {
      const { data } = await api.get(`/roles/${selectedRoleId}`)
      return data
    },
    enabled: !!selectedRoleId,
  })

  // Sync checkedIds when roleDetail loads
  useEffect(() => {
    if (roleDetail) {
      const ids = new Set(roleDetail.permissions.map((rp) => rp.permission.id))
      setCheckedIds(ids)
      setIsDirty(false)
    }
  }, [roleDetail])

  // Permission lookup map: resource:action → permissionId
  const permissionMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const group of permissionGroups) {
      for (const perm of group.permissions) {
        map.set(`${perm.resource}:${perm.action}`, perm.id)
      }
    }
    return map
  }, [permissionGroups])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/roles/${selectedRoleId}/permissions`, {
        permissionIds: Array.from(checkedIds),
      })
    },
    onSuccess: () => {
      toast.success('Đã lưu phân quyền')
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['roles', selectedRoleId] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi lưu phân quyền')
    },
  })

  const togglePermission = (permId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) next.delete(permId)
      else next.add(permId)
      return next
    })
    setIsDirty(true)
  }

  const toggleRow = (resource: string) => {
    const rowIds = ACTIONS.map((a) => permissionMap.get(`${resource}:${a}`)).filter(Boolean) as string[]
    const allChecked = rowIds.every((id) => checkedIds.has(id))
    setCheckedIds((prev) => {
      const next = new Set(prev)
      rowIds.forEach((id) => (allChecked ? next.delete(id) : next.add(id)))
      return next
    })
    setIsDirty(true)
  }

  const toggleColumn = (action: string) => {
    const colIds = permissionGroups
      .flatMap((g) => g.permissions)
      .filter((p) => p.action === action)
      .map((p) => p.id)
    const allChecked = colIds.every((id) => checkedIds.has(id))
    setCheckedIds((prev) => {
      const next = new Set(prev)
      colIds.forEach((id) => (allChecked ? next.delete(id) : next.add(id)))
      return next
    })
    setIsDirty(true)
  }

  const isSuperAdminRole = roleDetail?.code === 'SUPER_ADMIN'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Phân quyền hệ thống</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: Role List */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 pb-1">Danh sách Role</p>
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition ${
                  selectedRoleId === role.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <p className={`font-medium text-sm ${selectedRoleId === role.id ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                  {role.name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {role._count.permissions} quyền · {role._count.users} người dùng
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Permission Matrix */}
        <div className="flex-1 min-w-0">
          {!selectedRoleId ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Chọn một Role bên trái để xem và chỉnh sửa phân quyền</p>
            </div>
          ) : loadingDetail ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Role info header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{roleDetail?.name}</h3>
                  <p className="text-sm text-slate-400">{roleDetail?.description}</p>
                </div>
                {!isSuperAdminRole && (
                  <button
                    onClick={() => saveMutation.mutate()}
                    disabled={!isDirty || saveMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition"
                  >
                    <Check className="w-4 h-4" />
                    {saveMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                )}
              </div>

              {isSuperAdminRole ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-sm">SUPER_ADMIN có toàn quyền hệ thống — không thể chỉnh sửa.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                        <th className="text-left py-3 px-4 font-medium text-slate-500 sticky left-0 bg-slate-50 dark:bg-slate-700/30">
                          Resource
                        </th>
                        {ACTIONS.map((action) => (
                          <th key={action} className="text-center py-3 px-2 font-medium text-slate-500 min-w-[64px]">
                            <button
                              onClick={() => toggleColumn(action)}
                              className="hover:text-primary transition capitalize"
                              title={`Toggle all ${action}`}
                            >
                              {action}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {permissionGroups.map((group) => {
                        const rowIds = ACTIONS.map((a) => permissionMap.get(`${group.resource}:${a}`)).filter(Boolean) as string[]
                        const allChecked = rowIds.length > 0 && rowIds.every((id) => checkedIds.has(id))
                        return (
                          <tr key={group.resource} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                            <td className="py-2.5 px-4 sticky left-0 bg-white dark:bg-slate-800">
                              <button
                                onClick={() => toggleRow(group.resource)}
                                className="flex items-center gap-2 hover:text-primary transition"
                                title="Toggle toàn bộ hàng"
                              >
                                <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                                  allChecked ? 'bg-primary border-primary text-white' : 'border-slate-300 dark:border-slate-600'
                                }`}>
                                  {allChecked && <Check className="w-3 h-3" />}
                                </span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {RESOURCE_LABELS[group.resource] || group.resource}
                                </span>
                              </button>
                            </td>
                            {ACTIONS.map((action) => {
                              const permId = permissionMap.get(`${group.resource}:${action}`)
                              if (!permId) return <td key={action} className="text-center py-2.5 px-2"><X className="w-4 h-4 text-slate-200 mx-auto" /></td>
                              const isChecked = checkedIds.has(permId)
                              return (
                                <td key={action} className="text-center py-2.5 px-2">
                                  <button
                                    onClick={() => togglePermission(permId)}
                                    className={`w-6 h-6 rounded border inline-flex items-center justify-center transition ${
                                      isChecked
                                        ? 'bg-primary border-primary text-white'
                                        : 'border-slate-300 dark:border-slate-600 hover:border-primary/50'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-3.5 h-3.5" />}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
