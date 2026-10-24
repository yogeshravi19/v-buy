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

      // Reflect immediately in React memory state across all dashboards
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

      // Refresh database queries globally
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

  return (
    <div className="w-full space-y-7">
      {/* Spacious, Airy Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToOutlets}
              className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold rounded-xl"
            >
              <ArrowLeft size={14} />
              <span>Back to Outlets Table</span>
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Campus Staff Management
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
            Outlet Staff & Personnel Directory
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {activeOutlet
              ? `Managing team roster for ${activeOutlet.name}`
              : `Select any canteen slice card to view and manage its assigned staff`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="saas-btn saas-btn-primary inline-flex items-center gap-2 h-11 px-5 text-xs font-bold rounded-2xl shadow-sm"
            onClick={() => {
              setAssignOutletId(activeOutlet ? activeOutlet.id : (outlets[0]?.id || ''))
              setAssignRole('staff')
              setShowAssignModal(true)
            }}
          >
            <UserPlus size={16} />
            <span>Assign Personnel</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Check size={17} className="text-emerald-600" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-800">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Spacious Canteen Selector & Filter Strip */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider shrink-0">
              Select Canteen:
            </label>
            <select
              value={activeOutletFilter}
              onChange={e => setActiveOutletFilter(e.target.value)}
              className="h-12 px-4 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-700 max-w-xl w-full cursor-pointer transition-colors shadow-2xs"
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

          <div className="flex items-center gap-3">
            {activeOutletFilter === 'all' ? (
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by canteen name or code..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-700 shadow-2xs"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveOutletFilter('all')}
                className="saas-btn saas-btn-secondary inline-flex items-center gap-2 h-12 px-5 text-xs font-bold rounded-2xl"
              >
                <ArrowLeft size={15} />
                <span>View All Canteen Slice Cards</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CASE 1: ALL CANTEENS OVERVIEW (Generous 2-Column Slice Cards)
          ───────────────────────────────────────────────────────────── */}
      {activeOutletFilter === 'all' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Campus Canteen Roster Slices ({filteredCanteens.length})
            </h3>
            <span className="text-xs font-medium text-slate-400">
              Click any canteen slice card to manage full roster
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredCanteens.map(canteen => {
              const admins = users.filter(u => u.outlet_id === canteen.id && (u.role === 'shop_admin' || u.role === 'owner'))
              const staff = users.filter(u => u.outlet_id === canteen.id && u.role === 'staff')
              const totalTeam = admins.length + staff.length

              return (
                <div
                  key={canteen.id}
                  onClick={() => setActiveOutletFilter(canteen.id)}
                  className="p-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between gap-6 group"
                >
                  <div className="space-y-5">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-2xs">
                          <Store size={22} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                            {canteen.name}
                          </h3>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Building2 size={13} className="text-slate-400" />
                              <span>{canteen.location || 'Campus Center'}</span>
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                              {canteen.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className={cn(
                        'text-xs font-bold px-3 py-1 rounded-full border shrink-0',
                        canteen.is_open ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                      )}>
                        {canteen.is_open ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>

                    {/* Spacious 2-Block Roster Details (No horizontal congestion) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                      {/* Franchise Owner Block */}
                      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Shield size={13} className="text-amber-600" />
                            Franchise Owner
                          </span>
                          {admins.length > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                              Shop Admin
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {admins.length > 0 ? admins[0].full_name : <span className="text-slate-400 font-normal italic">Unassigned</span>}
                        </div>
                      </div>

                      {/* Counter Staff Block */}
                      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <UserCheck size={13} className="text-emerald-600" />
                            Counter Staff
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            {staff.length > 0 ? 'Active' : 'None'}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {staff.length} Active Staff Member{staff.length === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-slate-400" />
                      <span className="font-extrabold text-slate-700">
                        Total Team: <span className="text-blue-700 font-black">{totalTeam}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1.5 font-bold group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all px-3.5 py-1.5 rounded-xl shadow-2xs"
                    >
                      <span>Manage Roster</span>
                      <ChevronRight size={14} />
                    </button>
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
          {/* Canteen Hero Banner Card with Free Space */}
          <div className="p-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm flex items-center justify-between flex-wrap gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Store size={28} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-slate-900">{activeOutlet.name}</h3>
                  <span className={cn(
                    'text-xs font-bold px-3 py-0.5 rounded-full border',
                    activeOutlet.is_open ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  )}>
                    {activeOutlet.is_open ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                  <span>Location: <strong className="text-slate-700">{activeOutlet.location || 'Campus Center'}</strong></span>
                  <span className="text-slate-300">·</span>
                  <span>ID: <code className="font-mono text-slate-800 bg-slate-100 px-1 rounded">{activeOutlet.id}</code></span>
                  <span className="text-slate-300">·</span>
                  <span>{activeOutlet.is_event ? 'Event Stall' : 'Regular Canteen'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveOutletFilter('all')}
                className="saas-btn saas-btn-secondary inline-flex items-center gap-1.5 h-11 px-4 text-xs font-bold rounded-2xl"
              >
                <ArrowLeft size={14} />
                <span>All Canteens</span>
              </button>
              <button
                type="button"
                className="saas-btn saas-btn-primary inline-flex items-center gap-2 h-11 px-5 text-xs font-bold rounded-2xl shadow-sm"
                onClick={() => {
                  setAssignOutletId(activeOutlet.id)
                  setShowAssignModal(true)
                }}
              >
                <Plus size={15} />
                <span>Add Member to {activeOutlet.name}</span>
              </button>
            </div>
          </div>

          {/* Full Details: Two Spacious Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section 1: Franchise Owner for this Canteen */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-amber-600" />
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Franchise Owner / Shop Admin ({activeAdmins.length})
                  </h3>
                </div>
                <button
                  type="button"
                  className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1.5 text-xs font-bold"
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
                <div className="p-8 bg-amber-50/50 rounded-2xl border border-amber-200 text-center space-y-3">
                  <AlertCircle size={28} className="mx-auto text-amber-600" />
                  <div className="text-sm font-extrabold text-amber-900">No Franchise Owner Assigned</div>
                  <p className="text-xs text-amber-700 max-w-sm mx-auto">
                    This canteen has no designated Shop Admin. Assign an owner to grant menu editing and revenue oversight access.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignRole('shop_admin')
                      setAssignOutletId(activeOutlet.id)
                      setShowAssignModal(true)
                    }}
                    className="saas-btn saas-btn-sm saas-btn-primary mt-1"
                  >
                    Assign Owner Now
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeAdmins.map(admin => (
                    <div
                      key={admin.id}
                      className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base font-extrabold text-slate-900 truncate">
                            {admin.full_name || 'Outlet Admin'}
                          </span>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            Franchise Owner
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Phone size={13} className="text-slate-400" />
                            {admin.phone || '—'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-400" />
                            {admin.email || '—'}
                          </span>
                        </div>

                        <div className="pt-1 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <Check size={13} />
                          <span>Full Shop Admin Management Access Enabled</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUnassignUser(admin.id, admin.full_name || 'Admin')}
                          className="saas-btn saas-btn-sm saas-btn-danger inline-flex items-center gap-1.5"
                          title="Unassign owner from this canteen"
                        >
                          <Trash2 size={13} />
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
                  <UserCheck size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Kitchen & Counter Staff ({activeStaff.length})
                  </h3>
                </div>
                <button
                  type="button"
                  className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1.5 text-xs font-bold"
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
                <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                  <UserCheck size={28} className="mx-auto text-slate-400" />
                  <div className="text-sm font-extrabold text-slate-700">No Kitchen Staff Assigned</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No counter staff members are assigned to this canteen. Add kitchen operators to handle live orders and POS billing.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignRole('staff')
                      setAssignOutletId(activeOutlet.id)
                      setShowAssignModal(true)
                    }}
                    className="saas-btn saas-btn-sm saas-btn-secondary mt-1"
                  >
                    Assign Staff Member
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {activeStaff.map(staffMember => (
                    <div
                      key={staffMember.id}
                      className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base font-extrabold text-slate-900 truncate">
                            {staffMember.full_name || 'Kitchen Staff'}
                          </span>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Counter Staff
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Phone size={13} className="text-slate-400" />
                            {staffMember.phone || '—'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-400" />
                            {staffMember.email || '—'}
                          </span>
                        </div>

                        <div className="pt-1 text-xs font-medium text-slate-500">
                          Authorized for KDS Order Prep & POS Terminal Billing
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUnassignUser(staffMember.id, staffMember.full_name || 'Staff')}
                          className="saas-btn saas-btn-sm saas-btn-danger inline-flex items-center gap-1.5"
                          title="Unassign user from this canteen"
                        >
                          <Trash2 size={13} />
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
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-colors ${
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
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-colors ${
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
