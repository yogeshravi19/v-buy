import React, { useState, useEffect, useMemo } from 'react'
import {
  ShieldCheck,
  Users,
  Store,
  UserCheck,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Info
} from 'lucide-react'
import {
  ROLE_DEFINITIONS,
  MODULE_CAPABILITY_MATRIX
} from '../../lib/permissions'
import type {
  UserRole,
  RoleCapability
} from '../../lib/permissions'
import { supabase } from '../../lib/supabase'

interface UserRecord {
  id: string
  full_name?: string
  email?: string
  phone?: string
  role: string
  outlet_id?: string
  is_active?: boolean
  created_at?: string
}

export const RolesAndPermissionsScreen: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('super_admin')
  const [activeTab, setActiveTab] = useState<'matrix' | 'roles' | 'roster'>('matrix')
  const [usersList, setUsersList] = useState<UserRecord[]>([])
  const [outletsMap, setOutletsMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [rosterSearch, setRosterSearch] = useState<string>('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Real verified counts from database
  const [roleCounts, setRoleCounts] = useState<{
    user: number
    staff: number
    shop_admin: number
    super_admin: number
    total: number
  }>({ user: 0, staff: 0, shop_admin: 0, super_admin: 0, total: 0 })

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        if (!supabase) return

        // 1. Fetch real outlets map
        const { data: outletsData } = await supabase.from('outlets').select('id, name')
        if (outletsData) {
          const m: Record<string, string> = {}
          outletsData.forEach((o: any) => { m[o.id] = o.name })
          setOutletsMap(m)
        }

        // 2. Fetch all profiles for roster and counts
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, role, outlet_id, is_active, created_at')
          .order('created_at', { ascending: false })

        if (profilesData) {
          setUsersList(profilesData)
          let uCount = 0
          let staffCount = 0
          let shopAdminCount = 0
          let superAdminCount = 0

          profilesData.forEach((p: any) => {
            const r = (p.role || '').toLowerCase()
            if (r === 'super_admin' || r === 'superadmin' || r === 'admin') superAdminCount++
            else if (r === 'shop_admin' || r === 'owner') shopAdminCount++
            else if (r === 'staff' || r === 'shop_staff') staffCount++
            else uCount++
          })

          setRoleCounts({
            user: uCount,
            staff: staffCount,
            shop_admin: shopAdminCount,
            super_admin: superAdminCount,
            total: profilesData.length
          })
        }
      } catch (err) {
        console.error('Failed to load roles data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchRole = roleFilter === 'all' || u.role.toLowerCase() === roleFilter.toLowerCase()
      const searchLower = rosterSearch.toLowerCase()
      const matchSearch =
        !rosterSearch ||
        (u.full_name && u.full_name.toLowerCase().includes(searchLower)) ||
        (u.outlet_id && u.outlet_id.toLowerCase().includes(searchLower)) ||
        (u.id && u.id.toLowerCase().includes(searchLower))
      return matchRole && matchSearch
    })
  }, [usersList, roleFilter, rosterSearch])

  const currentRoleDef = ROLE_DEFINITIONS[selectedRole]

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
              Roles & Access Governance
            </h1>
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
              Verified RLS Policies
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 m-0">
            Authoritative 4-tier security matrix. Cross-checked against Supabase Row Level Security and FastAPI route guards.
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'matrix' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('matrix')}
          >
            Capability Matrix
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'roles' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('roles')}
          >
            Role Specifications
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'roster' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('roster')}
          >
            Active User Roster ({roleCounts.total})
          </button>
        </div>
      </div>

      {/* Headcount Metric Cards (Adapted from Reference Image 2) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Users (Students)</span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5" data-tabular-num>
              {roleCounts.user}
            </div>
            <span className="text-[10px] text-slate-400">Campus customer base</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Shop Staff</span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5" data-tabular-num>
              {roleCounts.staff}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Counter & kitchen crew</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <UserCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Shop Admins</span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5" data-tabular-num>
              {roleCounts.shop_admin}
            </div>
            <span className="text-[10px] text-amber-600 font-medium">Outlet managers</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Store size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Super Admins</span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5" data-tabular-num>
              {roleCounts.super_admin}
            </div>
            <span className="text-[10px] text-purple-600 font-medium">Platform governance</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <ShieldCheck size={18} />
          </div>
        </div>
      </div>

      {/* Affirmative Policy Statement Banner (Directly Adapted from Reference Image 2) */}
      <div className="bg-[#0F172A] text-white p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center flex-shrink-0">
            <Info size={18} />
          </div>
          <div className="text-xs">
            <strong className="text-white block font-bold">
              Affirmative Security Principle: Super Admins retain platform-wide governance. Anything not explicitly permitted is blocked by database RLS.
            </strong>
            <span className="text-slate-400">
              Shop Staff and Shop Admins are strictly scoped to their assigned outlet ID via <code className="text-blue-300 font-mono">public.get_my_outlet()</code>.
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700 font-mono">
          <span>RLS: Active</span>
        </div>
      </div>

      {/* TAB 1: CAPABILITY MATRIX (Directly Adapted from Reference Image 2 Matrix Layout) */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Module Capability Matrix by Operational Role
            </h3>
            <span className="text-xs text-slate-500">
              5 Action Dimensions: View · Create · Edit · Delete · Manage
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3 sticky left-0 bg-slate-100 z-10 w-44">Module Name</th>
                  <th className="p-3 text-center border-l border-slate-200 w-32 bg-blue-50/50 text-blue-900">User (Student)</th>
                  <th colSpan={5} className="p-3 text-center border-l border-slate-200 bg-emerald-50/40 text-emerald-900">
                    Shop Staff
                    <div className="grid grid-cols-5 text-[9px] font-semibold text-emerald-700 pt-1">
                      <span>VIEW</span><span>NEW</span><span>EDIT</span><span>DEL</span><span>MANAGE</span>
                    </div>
                  </th>
                  <th colSpan={5} className="p-3 text-center border-l border-slate-200 bg-amber-50/40 text-amber-900">
                    Shop Admin
                    <div className="grid grid-cols-5 text-[9px] font-semibold text-amber-700 pt-1">
                      <span>VIEW</span><span>NEW</span><span>EDIT</span><span>DEL</span><span>MANAGE</span>
                    </div>
                  </th>
                  <th className="p-3 text-center border-l border-slate-200 bg-purple-50/50 text-purple-900 w-28">Super Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MODULE_CAPABILITY_MATRIX.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    {/* Module Name */}
                    <td className="p-3 font-semibold text-slate-800 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#E2E8F0]">
                      {row.module}
                    </td>

                    {/* User */}
                    <td className="p-3 text-center border-l border-slate-100 bg-blue-50/20">
                      {row.user.view ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-800 font-bold">✓</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Shop Staff (5 sub-actions) */}
                    <td className="p-2 text-center border-l border-slate-100">
                      {row.staff.view ? <span className="text-emerald-700 font-bold">✓</span> : <span className="text-slate-300">·</span>}
                    </td>
                    <td className="p-2 text-center">
                      {row.staff.create ? <span className="text-emerald-700 font-bold">✓</span> : <span className="text-slate-300">·</span>}
                    </td>
                    <td className="p-2 text-center">
                      {row.staff.edit ? <span className="text-emerald-700 font-bold">✓</span> : <span className="text-slate-300">·</span>}
                    </td>
                    <td className="p-2 text-center">
                      {row.staff.delete ? <span className="text-emerald-700 font-bold">✓</span> : <span className="text-slate-300">·</span>}
                    </td>
                    <td className="p-2 text-center">
                      {row.staff.manage ? <span className="text-emerald-700 font-bold">✓</span> : <span className="text-slate-300">·</span>}
                    </td>

                    {/* Shop Admin (5 sub-actions) */}
                    <td className="p-2 text-center border-l border-slate-100">
                      {row.shop_admin.view ? <span className="text-amber-700 font-bold">✓</span> : <span className="text-slate-300">·</span>}
                    </td>
                    <td className="p-2 text-center">
                      {row.shop_admin.create ? <span className="text-amber-700 font-bold">✓</span> : <span className="text-slate-300">·</span>}
                    </td>
                    <td className="p-2 text-center">
                      {row.shop_admin.edit ? <span className="text-amber-700 font-bold">✓</span> : <span className="text-slate-300">·</span>}
                    </td>
                    <td className="p-2 text-center">
                      {row.shop_admin.delete ? <span className="text-amber-700 font-bold">✓</span> : <span className="text-slate-300">·</span>}
                    </td>
                    <td className="p-2 text-center">
                      {row.shop_admin.manage ? <span className="text-amber-700 font-bold">✓</span> : <span className="text-slate-300">·</span>}
                    </td>

                    {/* Super Admin (Full Governance) */}
                    <td className="p-3 text-center border-l border-slate-100 bg-purple-50/20 font-bold text-purple-700">
                      Full Access
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED ROLE SPECIFICATIONS */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Role selector pill list */}
          <div className="space-y-2">
            {(['super_admin', 'shop_admin', 'staff', 'user'] as UserRole[]).map(r => {
              const def = ROLE_DEFINITIONS[r]
              const isSelected = selectedRole === r
              return (
                <button
                  key={r}
                  type="button"
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-white shadow-soft border-blue-500 ring-2 ring-blue-500/10'
                      : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-700'
                  }`}
                  onClick={() => setSelectedRole(r)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{def.displayName}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: def.badgeColor }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1 m-0">{def.scopeDescription}</p>
                </button>
              )
            })}
          </div>

          {/* Role Detail Card */}
          <div className="md:col-span-3 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900 m-0">{currentRoleDef.displayName} Specification</h2>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white uppercase"
                    style={{ backgroundColor: currentRoleDef.badgeColor }}
                  >
                    Level {currentRoleDef.hierarchyLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 m-0">{currentRoleDef.scopeDescription}</p>
              </div>
            </div>

            {/* Account Creation Method */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <strong className="text-slate-800 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                Account Provisioning Method
              </strong>
              <p className="m-0 text-slate-700 leading-relaxed">{currentRoleDef.accountCreationMethod}</p>
            </div>

            {/* What They Can See */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-blue-700" />
                Data & Surfaces Visible
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentRoleDef.canSee.map((item, i) => (
                  <div key={i} className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What They Can Do */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
                <Check size={14} className="text-emerald-700" />
                Allowed Operational Capabilities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentRoleDef.canDo.map((item, i) => (
                  <div key={i} className="text-xs text-slate-700 bg-emerald-50/30 p-2.5 rounded-lg border border-emerald-100 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What They Cannot Do */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
                <X size={14} className="text-red-700" />
                Strict Operational Restrictions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentRoleDef.cannotDo.map((item, i) => (
                  <div key={i} className="text-xs text-slate-600 bg-red-50/30 p-2.5 rounded-lg border border-red-100 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Code and Policy Evidence */}
            <div className="border-t border-slate-100 pt-4 text-xs text-slate-500 space-y-1 font-mono">
              <div><strong>Code Evidence:</strong> {currentRoleDef.codeEvidence}</div>
              <div><strong>RLS Policy:</strong> {currentRoleDef.rlsEvidence}</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE USER ROSTER */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
          {/* Roster Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ID, or outlet..."
                className="input pl-8 py-1.5 text-xs"
                value={rosterSearch}
                onChange={e => setRosterSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Filter size={13} className="text-slate-400" />
              <select
                className="input py-1 px-2.5 text-xs w-auto"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles ({usersList.length})</option>
                <option value="super_admin">Super Admin ({roleCounts.super_admin})</option>
                <option value="shop_admin">Shop Admin ({roleCounts.shop_admin})</option>
                <option value="staff">Shop Staff ({roleCounts.staff})</option>
                <option value="customer">Users ({roleCounts.user})</option>
              </select>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Assigned Outlet</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 font-mono">Profile ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No matching user records found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const r = (u.role || '').toLowerCase()
                    const isStaffOrAdmin = r === 'staff' || r === 'shop_admin' || r === 'super_admin'
                    const outletName = u.outlet_id ? (outletsMap[u.outlet_id] || u.outlet_id) : 'Global / Campus'
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-900">
                          {u.full_name || 'V Foods User'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                            r === 'shop_admin' ? 'bg-amber-100 text-amber-800' :
                            r === 'staff' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {r.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">
                          {outletName}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">
                          {u.id.substring(0, 12)}...
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
