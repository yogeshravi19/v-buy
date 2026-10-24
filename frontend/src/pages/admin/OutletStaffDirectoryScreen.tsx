import React, { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Store,
  Shield,
  UserCheck,
  Plus,
  Search,
  Check,
  X,
  Phone,
  Mail,
  Building2,
  Trash2,
  UserPlus,
  Users,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/card'
import { cn } from '../../lib/utils'

export interface OutletRecord {
  id: string
  name: string
  location?: string
  is_open?: boolean
  is_event?: boolean
}

export interface PlatformUser {
  id: string
  full_name?: string
  phone?: string
  email?: string
  role?: string
  outlet_id?: string | null
  is_active?: boolean
  created_at?: string
}

interface OutletStaffDirectoryScreenProps {
  outlets: OutletRecord[]
  users: PlatformUser[]
  selectedOutletId?: string | null
  onBackToOutlets: () => void
  onUserUpdated?: () => void
  onUpdateUserLocal?: (userId: string, updates: Partial<PlatformUser>) => void
}

export const OutletStaffDirectoryScreen: React.FC<OutletStaffDirectoryScreenProps> = ({
  outlets = [],
  users = [],
  selectedOutletId = null,
  onBackToOutlets,
  onUserUpdated,
  onUpdateUserLocal
}) => {
  const [activeOutletFilter, setActiveOutletFilter] = useState<string>(selectedOutletId || 'all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals & form state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignUserId, setAssignUserId] = useState('')
  const [assignOutletId, setAssignOutletId] = useState(
    selectedOutletId && selectedOutletId !== 'all' ? selectedOutletId : (outlets[0]?.id || '')
  )
  const [assignRole, setAssignRole] = useState<'shop_admin' | 'staff'>('staff')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // Sync state if selectedOutletId changes externally
  React.useEffect(() => {
    if (selectedOutletId) {
      setActiveOutletFilter(selectedOutletId)
      if (selectedOutletId !== 'all') {
        setAssignOutletId(selectedOutletId)
      }
    }
  }, [selectedOutletId])

  // Summary counts
  const totalAssignedAdmins = users.filter(u => (u.role === 'shop_admin' || u.role === 'owner') && u.outlet_id).length
  const totalAssignedStaff = users.filter(u => u.role === 'staff' && u.outlet_id).length
  const outletsWithStaff = new Set(users.filter(u => u.outlet_id).map(u => u.outlet_id)).size

  // Active canteen (if single-canteen mode)
  const activeOutlet = outlets.find(o => o.id === activeOutletFilter)

  // Personnel for active canteen
  const activeAdmins = useMemo(() => {
    if (!activeOutlet) return []
    return users.filter(u => u.outlet_id === activeOutlet.id && (u.role === 'shop_admin' || u.role === 'owner'))
  }, [users, activeOutlet])

  const activeStaff = useMemo(() => {
    if (!activeOutlet) return []
    return users.filter(u => u.outlet_id === activeOutlet.id && u.role === 'staff')
  }, [users, activeOutlet])

  // Canteens list with filtering for Slice Cards Overview
  const filteredCanteens = useMemo(() => {
    if (!searchQuery.trim()) return outlets
    const q = searchQuery.toLowerCase()
    return outlets.filter(o =>
      o.name.toLowerCase().includes(q) ||
      (o.location || '').toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
    )
  }, [outlets, searchQuery])

  // 1. Assign Role & Outlet in Database and App State
  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignUserId || !assignOutletId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          outlet_id: assignOutletId,
          role: assignRole
        })
        .eq('id', assignUserId)

      if (error) {
        console.warn('Supabase profiles update error, updating local memory state:', error.message)
      }

      // 1. Reflect immediately in React memory state across all dashboards
      if (onUpdateUserLocal) {
        onUpdateUserLocal(assignUserId, {
          outlet_id: assignOutletId,
          role: assignRole
        })
      }

      const outletName = outlets.find(o => o.id === assignOutletId)?.name || assignOutletId
      const targetUser = users.find(u => u.id === assignUserId)
      setNotice(`Assigned ${targetUser?.full_name || 'User'} to ${outletName}`)
      setTimeout(() => setNotice(null), 3500)
      setShowAssignModal(false)
      setAssignUserId('')

      // 2. Refresh database queries globally
      if (onUserUpdated) onUserUpdated()
    } catch (err: any) {
      alert('Error updating user: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // 2. Unassign User from Outlet in Database and App State
  const handleUnassignUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Unassign ${userName} from this canteen?`)) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ outlet_id: null })
        .eq('id', userId)

      if (error) {
        console.warn('Supabase profiles update error, updating local state:', error.message)
      }

      // Reflect in local memory state immediately
      if (onUpdateUserLocal) {
        onUpdateUserLocal(userId, { outlet_id: null })
      }

      setNotice(`Unassigned ${userName}`)
      setTimeout(() => setNotice(null), 3500)

      if (onUserUpdated) onUserUpdated()
    } catch (err: any) {
      alert('Error unassigning user: ' + err.message)
    }
  }

  // 3. Delete Staff Access entirely (revert to customer)
  const handleDeleteStaffAccess = async (userId: string, userName: string) => {
    if (!window.confirm(`Revoke all staff access for ${userName}? They will be converted to a regular customer.`)) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ outlet_id: null, role: 'customer' })
        .eq('id', userId)

      if (error) {
        console.warn('Supabase error, updating memory state:', error.message)
      }

      if (onUpdateUserLocal) {
        onUpdateUserLocal(userId, { outlet_id: null, role: 'customer' })
      }

      setNotice(`Revoked staff role for ${userName}`)
      setTimeout(() => setNotice(null), 3500)

      if (onUserUpdated) onUserUpdated()
    } catch (err: any) {
      alert('Error updating user: ' + err.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <button
            type="button"
            onClick={onBackToOutlets}
            className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-2 mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to Outlets Table</span>
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Outlet Staff & Personnel Directory
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Select a canteen to manage its assigned franchise owners and kitchen counter team
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="saas-btn saas-btn-primary inline-flex items-center gap-1.5"
            onClick={() => {
              setAssignOutletId(activeOutlet ? activeOutlet.id : (outlets[0]?.id || ''))
              setAssignRole('staff')
              setShowAssignModal(true)
            }}
          >
            <UserPlus size={15} />
            <span>Assign Personnel</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Overview Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active Staff</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
            {totalAssignedAdmins + totalAssignedStaff}
          </div>
          <p className="mt-1 text-xs text-slate-500">Personnel currently assigned to counters</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Franchise Owners</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Shield size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-800 tabular-nums">
            {totalAssignedAdmins}
          </div>
          <p className="mt-1 text-xs text-slate-500">Shop Admins with menu & revenue access</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kitchen & Counter</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700 tabular-nums">
            {totalAssignedStaff}
          </div>
          <p className="mt-1 text-xs text-slate-500">Active live KDS and POS billing staff</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staffed Outlets</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Store size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
            {outletsWithStaff} / {outlets.length}
          </div>
          <p className="mt-1 text-xs text-slate-500">Canteens with verified team rosters</p>
        </Card>
      </div>

      {/* Canteen Selector Bar */}
      <div className="saas-card p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Canteen Selector:
            </span>
            <select
              value={activeOutletFilter}
              onChange={e => setActiveOutletFilter(e.target.value)}
              className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-700 flex-1"
            >
              <option value="all">Overview: All Campus Canteens ({outlets.length} Slice Cards)</option>
              {outlets.map(o => {
                const outletPersonnel = users.filter(u => u.outlet_id === o.id)
                return (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.id}) — {outletPersonnel.length} Staff ({o.is_open ? 'Open' : 'Closed'})
                  </option>
                )
              })}
            </select>
          </div>

          {activeOutletFilter === 'all' && (
            <div className="relative flex-1 min-w-[240px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search canteen name or location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-700"
              />
            </div>
          )}

          {activeOutletFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveOutletFilter('all')}
              className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={13} />
              <span>View All Canteens</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CASE 1: ALL CANTEENS OVERVIEW (Separate Slice Cards per Canteen)
          ───────────────────────────────────────────────────────────── */}
      {activeOutletFilter === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Campus Canteen Roster Slices ({filteredCanteens.length})
            </h3>
            <span className="text-xs text-slate-500">
              Click any canteen slice card to view its personnel details
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCanteens.map(canteen => {
              const admins = users.filter(u => u.outlet_id === canteen.id && (u.role === 'shop_admin' || u.role === 'owner'))
              const staff = users.filter(u => u.outlet_id === canteen.id && u.role === 'staff')
              const totalTeam = admins.length + staff.length

              return (
                <div
                  key={canteen.id}
                  onClick={() => setActiveOutletFilter(canteen.id)}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div>
                    {/* Card Top Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                          {canteen.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {canteen.location || 'Campus Center'} · ID: <span className="font-mono">{canteen.id}</span>
                        </div>
                      </div>

                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                        canteen.is_open ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                      )}>
                        {canteen.is_open ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>

                    {/* Personnel Summary Rows */}
                    <div className="mt-3.5 space-y-2 pt-3 border-t border-slate-100 text-xs">
                      {/* Franchise Owner Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                          <Shield size={13} className="text-amber-600" />
                          Owner:
                        </span>
                        {admins.length > 0 ? (
                          <span className="font-bold text-slate-800 truncate max-w-[170px]">
                            {admins[0].full_name}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md text-[11px]">
                            Unassigned
                          </span>
                        )}
                      </div>

                      {/* Kitchen Staff Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                          <UserCheck size={13} className="text-emerald-600" />
                          Staff:
                        </span>
                        <span className="font-bold text-slate-800">
                          {staff.length} Kitchen Members
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">
                      {totalTeam} Total Team
                    </span>
                    <span className="text-blue-700 font-bold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>View Full Details</span>
                      <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CASE 2: SINGLE CANTEEN SELECTED — FULL DETAILS REGARDING THAT CANTEEN
          ───────────────────────────────────────────────────────────── */}
      {activeOutlet && (
        <div className="space-y-6">
          {/* Canteen Hero Banner Card */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Store size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">{activeOutlet.name}</h3>
                  <span className={cn(
                    'text-xs font-bold px-2.5 py-0.5 rounded-full border',
                    activeOutlet.is_open ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  )}>
                    {activeOutlet.is_open ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Location: <span className="font-medium text-slate-700">{activeOutlet.location || 'Campus Center'}</span> · ID: <span className="font-mono text-slate-700">{activeOutlet.id}</span> · Type: <span className="font-medium text-slate-700">{activeOutlet.is_event ? 'Event Stall' : 'Regular Outlet'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                className="saas-btn saas-btn-primary inline-flex items-center gap-1.5"
                onClick={() => {
                  setAssignOutletId(activeOutlet.id)
                  setShowAssignModal(true)
                }}
              >
                <Plus size={14} />
                <span>Add Member to {activeOutlet.name}</span>
              </button>
            </div>
          </div>

          {/* Full Details: Two Focused Columns for THIS Canteen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section 1: Franchise Owner for this Canteen */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Franchise Owner / Shop Admin ({activeAdmins.length})
                  </h3>
                </div>
                <button
                  type="button"
                  className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1"
                  onClick={() => {
                    setAssignRole('shop_admin')
                    setAssignOutletId(activeOutlet.id)
                    setShowAssignModal(true)
                  }}
                >
                  <Plus size={13} />
                  <span>Assign Owner</span>
                </button>
              </div>

              {activeAdmins.length === 0 ? (
                <div className="p-6 bg-amber-50/50 rounded-2xl border border-amber-200 text-center text-xs space-y-2">
                  <AlertCircle size={24} className="mx-auto text-amber-600" />
                  <div className="font-bold text-amber-900">No Franchise Owner Assigned</div>
                  <p className="text-amber-700 max-w-sm mx-auto">
                    This canteen has no designated Shop Admin. Assign an owner to grant menu editing and revenue oversight access.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignRole('shop_admin')
                      setAssignOutletId(activeOutlet.id)
                      setShowAssignModal(true)
                    }}
                    className="saas-btn saas-btn-sm saas-btn-primary mt-2"
                  >
                    Assign Owner Now
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeAdmins.map(admin => (
                    <div
                      key={admin.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {admin.full_name || 'Outlet Admin'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            Franchise Owner
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Phone size={12} className="text-slate-400" />
                            {admin.phone || '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail size={12} className="text-slate-400" />
                            {admin.email || '—'}
                          </span>
                        </div>

                        <div className="mt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <Check size={13} />
                          <span>Full Shop Admin Management Access Enabled</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUnassignUser(admin.id, admin.full_name || 'Admin')}
                          className="saas-btn saas-btn-sm saas-btn-danger inline-flex items-center gap-1"
                          title="Unassign owner from this canteen"
                        >
                          <Trash2 size={12} />
                          <span>Unassign</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Kitchen & Counter Staff for this Canteen */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Kitchen & Counter Staff ({activeStaff.length})
                  </h3>
                </div>
                <button
                  type="button"
                  className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1"
                  onClick={() => {
                    setAssignRole('staff')
                    setAssignOutletId(activeOutlet.id)
                    setShowAssignModal(true)
                  }}
                >
                  <Plus size={13} />
                  <span>Assign Staff</span>
                </button>
              </div>

              {activeStaff.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs space-y-2">
                  <UserCheck size={24} className="mx-auto text-slate-400" />
                  <div className="font-bold text-slate-700">No Kitchen Staff Assigned</div>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    No counter staff members are assigned to this canteen. Add kitchen operators to handle live orders and POS billing.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignRole('staff')
                      setAssignOutletId(activeOutlet.id)
                      setShowAssignModal(true)
                    }}
                    className="saas-btn saas-btn-sm saas-btn-secondary mt-2"
                  >
                    Assign Staff Member
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeStaff.map(staffMember => (
                    <div
                      key={staffMember.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {staffMember.full_name || 'Kitchen Staff'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Counter Staff
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Phone size={12} className="text-slate-400" />
                            {staffMember.phone || '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail size={12} className="text-slate-400" />
                            {staffMember.email || '—'}
                          </span>
                        </div>

                        <div className="mt-2 text-xs font-medium text-slate-500">
                          Authorized for KDS Order Prep & POS Terminal Billing
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUnassignUser(staffMember.id, staffMember.full_name || 'Staff')}
                          className="saas-btn saas-btn-sm saas-btn-danger inline-flex items-center gap-1"
                          title="Unassign user from this canteen"
                        >
                          <Trash2 size={12} />
                          <span>Unassign</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal (Updates Supabase profiles + live React state) */}
      {showAssignModal && (
        <div className="saas-modal-backdrop" onClick={() => setShowAssignModal(false)}>
          <div className="saas-modal-card" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3>Assign Personnel to Outlet</h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="saas-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignRole}>
              <div className="saas-modal-body space-y-4">
                <div className="saas-form-group">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Select User
                  </label>
                  <select
                    value={assignUserId}
                    onChange={e => setAssignUserId(e.target.value)}
                    required
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-700"
                  >
                    <option value="">-- Choose User from Database --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || 'Member'} ({u.role}) — {u.phone || u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="saas-form-group">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Target Canteen / Outlet
                  </label>
                  <select
                    value={assignOutletId}
                    onChange={e => setAssignOutletId(e.target.value)}
                    required
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-700"
                  >
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="saas-form-group">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Operational Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignRole('staff')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-colors ${
                        assignRole === 'staff'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Kitchen & Counter Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignRole('shop_admin')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-colors ${
                        assignRole === 'shop_admin'
                          ? 'bg-amber-50 border-amber-500 text-amber-800'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Franchise Owner
                    </button>
                  </div>
                </div>
              </div>

              <div className="saas-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="saas-btn saas-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !assignUserId}
                  className="saas-btn saas-btn-primary"
                >
                  {saving ? 'Saving...' : 'Save to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
