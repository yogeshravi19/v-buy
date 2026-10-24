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

const getInitials = (name?: string) => {
  if (!name) return 'VF'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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
          CASE 1: ALL CANTEENS OVERVIEW (Spacious 3-Column Curved Squared Boxes)
          ───────────────────────────────────────────────────────────── */}
      {activeOutletFilter === 'all' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Campus Canteen Roster Slices ({filteredCanteens.length} Canteens)
            </h3>
            <span className="text-xs font-medium text-slate-400">
              Select any canteen to open its dedicated personnel roster
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCanteens.map(canteen => {
              const admins = users.filter(u => u.outlet_id === canteen.id && (u.role === 'shop_admin' || u.role === 'owner'))
              const staff = users.filter(u => u.outlet_id === canteen.id && u.role === 'staff')
              const totalTeam = admins.length + staff.length

              return (
                <div
                  key={canteen.id}
                  onClick={() => setActiveOutletFilter(canteen.id)}
                  style={{ padding: '24px', borderRadius: '24px', minHeight: '340px' }}
                  className="bg-white border border-slate-200/90 shadow-sm hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Header Row: Curved Square Icon + Open Pill */}
                    <div className="flex items-start justify-between gap-4">
                      <div
                        style={{ width: '56px', height: '56px', borderRadius: '16px' }}
                        className="bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs"
                      >
                        <Store size={24} />
                      </div>

                      <span className={cn(
                        'text-xs font-bold px-3 py-1 rounded-full border shrink-0',
                        canteen.is_open ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                      )}>
                        {canteen.is_open ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>

                    {/* Canteen Title & Location */}
                    <div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                        {canteen.name}
                      </h3>
                      <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{canteen.location || 'Campus Center'}</span>
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold">
                          {canteen.id}
                        </span>
                      </div>
                    </div>

                    {/* Two Distinct Curved Sub-Boxes (One for Owner, One for Staff) */}
                    <div className="space-y-2.5 pt-2">
                      {/* Franchise Owner Curved Box */}
                      <div
                        style={{ padding: '14px', borderRadius: '16px' }}
                        className="bg-amber-50/50 border border-amber-100 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Shield size={13} className="text-amber-600" />
                            Franchise Owner
                          </span>
                          {admins.length > 0 && (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
                              Shop Admin
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-extrabold text-slate-900 truncate">
                          {admins.length > 0 ? admins[0].full_name : <span className="text-slate-400 font-normal italic">Unassigned</span>}
                        </div>
                      </div>

                      {/* Counter Staff Curved Box */}
                      <div
                        style={{ padding: '14px', borderRadius: '16px' }}
                        className="bg-emerald-50/50 border border-emerald-100 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <UserCheck size={13} className="text-emerald-600" />
                            Counter Staff
                          </span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            {staff.length > 0 ? 'Active' : 'None'}
                          </span>
                        </div>
                        <div className="text-xs font-extrabold text-slate-900">
                          {staff.length} Active Staff Member{staff.length === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs mt-3">
                    <div className="flex items-center gap-1.5">
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
          CASE 2: SINGLE CANTEEN SELECTED — FULL DETAILS AS CURVED SQUARED BOXES
          ───────────────────────────────────────────────────────────── */}
      {activeOutlet && (
        <div className="space-y-8">
          {/* Canteen Hero Banner Card with Free Space */}
          <div
            style={{ padding: '24px', borderRadius: '24px' }}
            className="bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5"
          >
            <div className="flex items-center gap-4">
              <div
                style={{ width: '64px', height: '64px', borderRadius: '20px' }}
                className="bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs"
              >
                <Store size={32} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-2xl font-black text-slate-900">{activeOutlet.name}</h3>
                  <span className={cn(
                    'text-xs font-bold px-3 py-1 rounded-full border',
                    activeOutlet.is_open ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  )}>
                    {activeOutlet.is_open ? 'OPEN FOR ORDERS' : 'CLOSED'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                  <span>Location: <strong className="text-slate-800">{activeOutlet.location || 'Campus Center'}</strong></span>
                  <span className="text-slate-300">·</span>
                  <span>ID: <code className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded font-bold">{activeOutlet.id}</code></span>
                  <span className="text-slate-300">·</span>
                  <span className="font-bold text-blue-700">Total Roster: {activeAdmins.length + activeStaff.length} Members</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveOutletFilter('all')}
                className="saas-btn saas-btn-secondary inline-flex items-center gap-2 h-11 px-5 text-xs font-bold rounded-2xl"
              >
                <ArrowLeft size={15} />
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
                <Plus size={16} />
                <span>Add Member to {activeOutlet.name}</span>
              </button>
            </div>
          </div>

          {/* Unified Canteen Personnel Grid (Spacious Curved Squared Boxes) */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 px-1">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Assigned Personnel & Roster ({activeAdmins.length + activeStaff.length} Members)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Each personnel member is granted role-based POS billing, KDS prep, or store administration access
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1.5 text-xs font-bold rounded-xl"
                  onClick={() => {
                    setAssignRole('shop_admin')
                    setAssignOutletId(activeOutlet.id)
                    setShowAssignModal(true)
                  }}
                >
                  <Shield size={13} className="text-amber-600" />
                  <span>+ Franchise Owner</span>
                </button>
                <button
                  type="button"
                  className="saas-btn saas-btn-sm saas-btn-primary inline-flex items-center gap-1.5 text-xs font-bold rounded-xl shadow-xs"
                  onClick={() => {
                    setAssignRole('staff')
                    setAssignOutletId(activeOutlet.id)
                    setShowAssignModal(true)
                  }}
                >
                  <UserPlus size={13} />
                  <span>+ Counter Staff</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: '24px' }}>
              {/* 1. Franchise Owner Curved Squared Box */}
              {activeAdmins.length > 0 ? (
                activeAdmins.map(admin => (
                  <div
                    key={admin.id}
                    style={{ padding: '24px', borderRadius: '24px', minHeight: '320px' }}
                    className="bg-white border-2 border-amber-200/90 shadow-sm flex flex-col justify-between space-y-5 hover:shadow-lg transition-all group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div
                          style={{ width: '56px', height: '56px', borderRadius: '16px' }}
                          className="bg-amber-100 text-amber-900 font-black text-lg flex items-center justify-center shrink-0 shadow-2xs"
                        >
                          {getInitials(admin.full_name)}
                        </div>
                        <span className="text-[11px] font-black px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                          Franchise Owner
                        </span>
                      </div>

                      <div>
                        <h4 className="text-lg font-black text-slate-900 leading-snug">
                          {admin.full_name || 'Outlet Admin'}
                        </h4>
                        <p className="text-xs font-bold text-amber-700 mt-0.5">
                          Designated Shop Administrator
                        </p>
                      </div>

                      <div
                        style={{ padding: '14px', borderRadius: '16px' }}
                        className="bg-amber-50/50 border border-amber-100 space-y-1.5 text-xs text-slate-600"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Phone size={13} className="text-amber-600 shrink-0" />
                          <span className="font-semibold">{admin.phone || 'No phone recorded'}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <Mail size={13} className="text-amber-600 shrink-0" />
                          <span className="font-semibold">{admin.email || 'No email recorded'}</span>
                        </div>
                      </div>

                      <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
                        <Check size={14} className="shrink-0" />
                        <span>Full Store Menu & Financial Management</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnassignUser(admin.id, admin.full_name || 'Admin')}
                      className="saas-btn saas-btn-danger w-full inline-flex items-center justify-center gap-2 h-10 text-xs font-bold rounded-xl shadow-2xs mt-2"
                      title="Unassign owner from this canteen"
                    >
                      <Trash2 size={14} />
                      <span>Unassign Owner</span>
                    </button>
                  </div>
                ))
              ) : (
                <div
                  onClick={() => {
                    setAssignRole('shop_admin')
                    setAssignOutletId(activeOutlet.id)
                    setShowAssignModal(true)
                  }}
                  style={{ padding: '24px', borderRadius: '24px', minHeight: '320px' }}
                  className="border-2 border-dashed border-amber-300 bg-amber-50/30 hover:bg-amber-50/70 hover:border-amber-500 transition-all flex flex-col items-center justify-center text-center cursor-pointer space-y-4 group"
                >
                  <div
                    style={{ width: '56px', height: '56px', borderRadius: '16px' }}
                    className="bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-all shadow-2xs"
                  >
                    <Shield size={26} />
                  </div>
                  <div>
                    <div className="text-base font-black text-amber-900">
                      No Franchise Owner Assigned
                    </div>
                    <p className="text-xs text-amber-700 mt-1 max-w-[240px]">
                      Assign a designated shop administrator to manage menus and revenue.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="saas-btn saas-btn-sm saas-btn-primary inline-flex items-center gap-1.5 font-bold rounded-xl px-4 py-2"
                  >
                    <Plus size={14} />
                    <span>Assign Owner</span>
                  </button>
                </div>
              )}

              {/* 2. Kitchen & Counter Staff Curved Squared Boxes */}
              {activeStaff.map(staffMember => (
                <div
                  key={staffMember.id}
                  style={{ padding: '24px', borderRadius: '24px', minHeight: '320px' }}
                  className="bg-white border-2 border-emerald-200/90 shadow-sm flex flex-col justify-between space-y-5 hover:shadow-lg transition-all group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        style={{ width: '56px', height: '56px', borderRadius: '16px' }}
                        className="bg-emerald-100 text-emerald-900 font-black text-lg flex items-center justify-center shrink-0 shadow-2xs"
                      >
                        {getInitials(staffMember.full_name)}
                      </div>
                      <span className="text-[11px] font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                        Counter Staff
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-black text-slate-900 leading-snug">
                        {staffMember.full_name || 'Kitchen Staff'}
                      </h4>
                      <p className="text-xs font-bold text-emerald-700 mt-0.5">
                        KDS Prep & Counter Cashier
                      </p>
                    </div>

                    <div
                      style={{ padding: '14px', borderRadius: '16px' }}
                      className="bg-emerald-50/50 border border-emerald-100 space-y-1.5 text-xs text-slate-600"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Phone size={13} className="text-emerald-600 shrink-0" />
                        <span className="font-semibold">{staffMember.phone || 'No phone recorded'}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Mail size={13} className="text-emerald-600 shrink-0" />
                        <span className="font-semibold">{staffMember.email || 'No email recorded'}</span>
                      </div>
                    </div>

                    <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>Authorized for KDS Order Prep & POS Terminal</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUnassignUser(staffMember.id, staffMember.full_name || 'Staff')}
                    className="saas-btn saas-btn-danger w-full inline-flex items-center justify-center gap-2 h-10 text-xs font-bold rounded-xl shadow-2xs mt-2"
                    title="Unassign user from this canteen"
                  >
                    <Trash2 size={14} />
                    <span>Unassign Staff</span>
                  </button>
                </div>
              ))}

              {/* 3. Assign New Counter Staff Matching Curved Squared Box */}
              <div
                onClick={() => {
                  setAssignRole('staff')
                  setAssignOutletId(activeOutlet.id)
                  setShowAssignModal(true)
                }}
                style={{ padding: '24px', borderRadius: '24px', minHeight: '320px' }}
                className="border-2 border-dashed border-blue-300 bg-blue-50/20 hover:bg-blue-50/50 hover:border-blue-500 transition-all flex flex-col items-center justify-center text-center cursor-pointer space-y-4 group"
              >
                <div
                  style={{ width: '56px', height: '56px', borderRadius: '16px' }}
                  className="bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs"
                >
                  <Plus size={26} />
                </div>
                <div>
                  <div className="text-base font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                    Assign Counter Staff
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                    Add staff to operate the live KDS prep screen and POS counter terminal.
                  </p>
                </div>
                <button
                  type="button"
                  className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1.5 font-bold rounded-xl px-4 py-2 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600"
                >
                  <UserPlus size={14} />
                  <span>Add Personnel</span>
                </button>
              </div>
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
