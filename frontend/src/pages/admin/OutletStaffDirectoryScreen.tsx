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
  AlertCircle,
  Edit3
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

  // 3. Edit Personnel State & Handlers
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<'shop_admin' | 'staff'>('staff')
  const [editOutletId, setEditOutletId] = useState('')

  const openEditModal = (user: PlatformUser) => {
    setEditingUser(user)
    setEditFullName(user.full_name || '')
    setEditPhone(user.phone || '')
    setEditEmail(user.email || '')
    setEditRole((user.role === 'shop_admin' || user.role === 'owner') ? 'shop_admin' : 'staff')
    setEditOutletId(user.outlet_id || activeOutlet?.id || '')
  }

  const handleSaveEditedUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setSaving(true)
    try {
      const updates = {
        full_name: editFullName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        role: editRole,
        outlet_id: editOutletId || null
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', editingUser.id)

      if (error) {
        console.warn('Supabase profiles update error, updating local state:', error.message)
      }

      if (onUpdateUserLocal) {
        onUpdateUserLocal(editingUser.id, updates)
      }

      setNotice(`Updated ${editFullName || 'User'}`)
      setTimeout(() => setNotice(null), 3000)
      setEditingUser(null)

      if (onUserUpdated) onUserUpdated()
    } catch (err: any) {
      alert('Error updating user: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full space-y-7">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToOutlets}
              className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold rounded-xl"
            >
              <ArrowLeft size={14} />
              <span>Back to Outlets Table</span>
            </button>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
            Staff Directory
          </h2>
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
      <div className="p-6 bg-white rounded-3xl border-2 border-slate-300 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
              <span>Select Canteen:</span>
            </label>
            <select
              value={activeOutletFilter}
              onChange={e => setActiveOutletFilter(e.target.value)}
              className="h-12 px-4 bg-white border-2 border-slate-300 hover:border-blue-500 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-700 max-w-xl w-full cursor-pointer transition-colors shadow-2xs"
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
                  className="w-full h-12 pl-10 pr-4 bg-white border-2 border-slate-300 hover:border-blue-500 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-700 shadow-2xs"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveOutletFilter('all')}
                className="saas-btn saas-btn-secondary inline-flex items-center gap-2 h-12 px-5 text-xs font-bold rounded-2xl border-2 border-slate-300 hover:border-slate-400"
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
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">
              Campus Canteens ({filteredCanteens.length})
            </h3>
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
                  style={{ padding: '24px', borderRadius: '24px', minHeight: '380px' }}
                  className="relative overflow-hidden bg-white border-2 border-slate-300 hover:border-blue-600 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_40px_-4px_rgba(30,64,175,0.18)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                >
                  {/* Vibrant Top Accent Strip */}
                  <div
                    className={cn(
                      'absolute top-0 left-0 right-0 h-1.5 transition-colors',
                      canteen.is_open
                        ? 'bg-gradient-to-r from-blue-700 via-indigo-600 to-emerald-500'
                        : 'bg-slate-300'
                    )}
                  />

                  <div className="space-y-4 pt-1">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div
                        style={{ width: '56px', height: '56px', borderRadius: '16px' }}
                        className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white group-hover:shadow-md transition-all shadow-xs"
                      >
                        <Store size={24} />
                      </div>

                      <span className={cn(
                        'text-xs font-black px-3.5 py-1.5 rounded-full border-2 shrink-0 flex items-center gap-1.5 shadow-2xs',
                        canteen.is_open
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      )}>
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            canteen.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          )}
                        />
                        <span>{canteen.is_open ? 'OPEN' : 'CLOSED'}</span>
                      </span>
                    </div>

                    {/* Canteen Title & Location */}
                    <div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                        {canteen.name}
                      </h3>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1 min-w-0">
                          <Building2 size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{canteen.location || 'Campus Center'}</span>
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] font-bold">
                          {canteen.id}
                        </span>
                      </div>
                    </div>

                    {/* Sub-Boxes */}
                    <div className="space-y-2.5 pt-1">
                      <div
                        style={{ padding: '14px 16px', borderRadius: '16px' }}
                        className="bg-gradient-to-br from-amber-50/90 via-amber-50/60 to-amber-100/40 border-2 border-amber-300/80 hover:border-amber-400 transition-colors space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px] font-black text-amber-900 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Shield size={13} className="text-amber-700" />
                            Franchise Owner
                          </span>
                        </div>
                        <div className="text-xs font-black text-slate-900 truncate">
                          {admins.length > 0 ? admins[0].full_name : <span className="text-slate-400 font-normal italic">Unassigned</span>}
                        </div>
                      </div>

                      <div
                        style={{ padding: '14px 16px', borderRadius: '16px' }}
                        className="bg-gradient-to-br from-emerald-50/90 via-emerald-50/60 to-emerald-100/40 border-2 border-emerald-300/80 hover:border-emerald-400 transition-colors space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px] font-black text-emerald-900 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <UserCheck size={13} className="text-emerald-700" />
                            Counter Staff
                          </span>
                        </div>
                        <div className="text-xs font-black text-slate-900">
                          {staff.length} Active Member{staff.length === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-4 border-t-2 border-slate-100 flex items-center justify-between text-xs mt-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 font-extrabold text-slate-700">
                      Team: <span className="text-blue-700 font-black">{totalTeam}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveOutletFilter(canteen.id)
                        }}
                        className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1 font-bold px-3 py-1.5 rounded-xl border-2 border-slate-200 hover:border-slate-300"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="saas-btn saas-btn-sm saas-btn-primary inline-flex items-center gap-1 font-bold px-3.5 py-1.5 rounded-xl shadow-xs"
                      >
                        <span>Open</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
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
          {/* Canteen Hero Banner Card */}
          <div
            style={{ padding: '24px', borderRadius: '24px' }}
            className="relative overflow-hidden bg-white border-2 border-slate-300 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-5"
          >
            {/* Top Accent Strip */}
            <div
              className={cn(
                'absolute top-0 left-0 right-0 h-1.5 transition-colors',
                activeOutlet.is_open
                  ? 'bg-gradient-to-r from-blue-700 via-indigo-600 to-emerald-500'
                  : 'bg-slate-300'
              )}
            />
            <div className="flex items-center gap-4 pt-1">
              <div
                style={{ width: '64px', height: '64px', borderRadius: '20px' }}
                className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 text-blue-700 flex items-center justify-center shrink-0 shadow-xs"
              >
                <Store size={32} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-2xl font-black text-slate-900">{activeOutlet.name}</h3>
                  <span className={cn(
                    'text-xs font-black px-3.5 py-1.5 rounded-full border-2 flex items-center gap-1.5 shadow-2xs',
                    activeOutlet.is_open
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  )}>
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        activeOutlet.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      )}
                    />
                    <span>{activeOutlet.is_open ? 'OPEN FOR ORDERS' : 'CLOSED'}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                  <span>Location: <strong className="text-slate-800">{activeOutlet.location || 'Campus Center'}</strong></span>
                  <span className="text-slate-300">·</span>
                  <span>ID: <code className="font-mono text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold">{activeOutlet.id}</code></span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveOutletFilter('all')}
                className="saas-btn saas-btn-secondary inline-flex items-center gap-2 h-11 px-5 text-xs font-bold rounded-2xl border-2 border-slate-300 hover:border-slate-400"
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
                <span>Add Member</span>
              </button>
            </div>
          </div>

          {/* Unified Canteen Personnel Grid */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 px-1">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Personnel ({activeAdmins.length + activeStaff.length})
                </h3>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1.5 text-xs font-bold rounded-xl border-2 border-slate-200"
                  onClick={() => {
                    setAssignRole('shop_admin')
                    setAssignOutletId(activeOutlet.id)
                    setShowAssignModal(true)
                  }}
                >
                  <Plus size={13} />
                  <span>Owner</span>
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
                  <Plus size={13} />
                  <span>Staff</span>
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
                    className="relative overflow-hidden bg-white border-2 border-amber-300 hover:border-amber-400 shadow-[0_4px_20px_-2px_rgba(245,158,11,0.08)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400" />
                    <div className="space-y-4 pt-1">
                      <div className="flex items-start justify-between gap-3">
                        <div
                          style={{ width: '56px', height: '56px', borderRadius: '16px' }}
                          className="bg-gradient-to-br from-amber-100 to-amber-200 border-2 border-amber-300 text-amber-900 font-black text-lg flex items-center justify-center shrink-0 shadow-2xs"
                        >
                          {getInitials(admin.full_name)}
                        </div>
                        <span className="text-[11px] font-black px-3 py-1 rounded-full bg-amber-50 text-amber-900 border-2 border-amber-300 uppercase tracking-wider shadow-2xs">
                          Franchise Owner
                        </span>
                      </div>

                      <div>
                        <h4 className="text-lg font-black text-slate-900 leading-snug">
                          {admin.full_name || 'Outlet Admin'}
                        </h4>
                      </div>

                      <div
                        style={{ padding: '14px 16px', borderRadius: '16px' }}
                        className="bg-amber-50/70 border-2 border-amber-200/90 space-y-1.5 text-xs text-slate-700 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Phone size={13} className="text-amber-700 shrink-0" />
                          <span className="font-bold">{admin.phone || 'No phone recorded'}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <Mail size={13} className="text-amber-700 shrink-0" />
                          <span className="font-bold">{admin.email || 'No email recorded'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t-2 border-slate-100 mt-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(admin)}
                        className="saas-btn saas-btn-secondary inline-flex items-center justify-center gap-1.5 h-10 text-xs font-bold rounded-xl border-2 border-slate-200"
                      >
                        <Edit3 size={14} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnassignUser(admin.id, admin.full_name || 'Admin')}
                        className="saas-btn saas-btn-danger inline-flex items-center justify-center gap-1.5 h-10 text-xs font-bold rounded-xl shadow-2xs"
                        title="Unassign owner from this canteen"
                      >
                        <Trash2 size={14} />
                        <span>Unassign</span>
                      </button>
                    </div>
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
                  className="border-2 border-dashed border-amber-400 bg-amber-50/40 hover:bg-amber-50/80 hover:border-amber-500 transition-all flex flex-col items-center justify-center text-center cursor-pointer space-y-4 group rounded-3xl"
                >
                  <div
                    style={{ width: '56px', height: '56px', borderRadius: '16px' }}
                    className="bg-amber-100 border-2 border-amber-300 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-all shadow-2xs"
                  >
                    <Shield size={26} />
                  </div>
                  <div>
                    <div className="text-base font-black text-amber-950">
                      No Owner Assigned
                    </div>
                  </div>
                  <button
                    type="button"
                    className="saas-btn saas-btn-sm saas-btn-primary inline-flex items-center gap-1.5 font-bold rounded-xl px-4 py-2 shadow-xs"
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
                  className="relative overflow-hidden bg-white border-2 border-emerald-300 hover:border-emerald-400 shadow-[0_4px_20px_-2px_rgba(16,185,129,0.08)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
                  <div className="space-y-4 pt-1">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        style={{ width: '56px', height: '56px', borderRadius: '16px' }}
                        className="bg-gradient-to-br from-emerald-100 to-emerald-200 border-2 border-emerald-300 text-emerald-900 font-black text-lg flex items-center justify-center shrink-0 shadow-2xs"
                      >
                        {getInitials(staffMember.full_name)}
                      </div>
                      <span className="text-[11px] font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border-2 border-emerald-300 uppercase tracking-wider shadow-2xs">
                        Counter Staff
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-black text-slate-900 leading-snug">
                        {staffMember.full_name || 'Kitchen Staff'}
                      </h4>
                    </div>

                    <div
                      style={{ padding: '14px 16px', borderRadius: '16px' }}
                      className="bg-emerald-50/70 border-2 border-emerald-200/90 space-y-1.5 text-xs text-slate-700 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Phone size={13} className="text-emerald-700 shrink-0" />
                        <span className="font-bold">{staffMember.phone || 'No phone recorded'}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Mail size={13} className="text-emerald-700 shrink-0" />
                        <span className="font-bold">{staffMember.email || 'No email recorded'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t-2 border-slate-100 mt-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(staffMember)}
                      className="saas-btn saas-btn-secondary inline-flex items-center justify-center gap-1.5 h-10 text-xs font-bold rounded-xl border-2 border-slate-200"
                    >
                      <Edit3 size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnassignUser(staffMember.id, staffMember.full_name || 'Staff')}
                      className="saas-btn saas-btn-danger inline-flex items-center justify-center gap-1.5 h-10 text-xs font-bold rounded-xl shadow-2xs"
                      title="Unassign user from this canteen"
                    >
                      <Trash2 size={14} />
                      <span>Unassign</span>
                    </button>
                  </div>
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
                className="border-2 border-dashed border-blue-400 bg-blue-50/30 hover:bg-blue-50/60 hover:border-blue-500 transition-all flex flex-col items-center justify-center text-center cursor-pointer space-y-4 group rounded-3xl"
              >
                <div
                  style={{ width: '56px', height: '56px', borderRadius: '16px' }}
                  className="bg-blue-100 border-2 border-blue-300 text-blue-700 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all shadow-2xs"
                >
                  <Plus size={26} />
                </div>
                <div>
                  <div className="text-base font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                    Assign Staff
                  </div>
                </div>
                <button
                  type="button"
                  className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1.5 font-bold rounded-xl px-4 py-2 border-2 border-slate-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600"
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
                    className="w-full h-11 px-3.5 bg-white border-2 border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-700"
                  >
                    <option value="">-- Choose Staff/Admin Member --</option>
                    {users.filter(u => u.role === 'staff' || u.role === 'shop_admin').map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || 'Member'} ({u.role === 'shop_admin' ? 'Shop Admin' : 'Shop Staff'}) — {u.phone || u.email}
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
                    className="w-full h-11 px-3.5 bg-white border-2 border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-700"
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
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold text-center transition-colors ${
                        assignRole === 'staff'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      Kitchen & Counter Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignRole('shop_admin')}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold text-center transition-colors ${
                        assignRole === 'shop_admin'
                          ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
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

      {/* Edit Personnel Modal (Updates Supabase profiles + live React state) */}
      {editingUser && (
        <div className="saas-modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="saas-modal-card" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3>Edit Personnel Details</h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="saas-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedUser}>
              <div className="saas-modal-body space-y-4">
                <div className="saas-form-group">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    required
                    placeholder="Enter full name"
                    className="w-full h-11 px-3.5 bg-white border-2 border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div className="saas-form-group">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full h-11 px-3.5 bg-white border-2 border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div className="saas-form-group">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="user@vfood.vit.ac.in"
                    className="w-full h-11 px-3.5 bg-white border-2 border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div className="saas-form-group">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Assigned Canteen / Outlet
                  </label>
                  <select
                    value={editOutletId}
                    onChange={e => setEditOutletId(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border-2 border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-700"
                  >
                    <option value="">-- None (Unassigned) --</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="saas-form-group">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditRole('staff')}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold text-center transition-colors ${
                        editRole === 'staff'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      Counter Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditRole('shop_admin')}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold text-center transition-colors ${
                        editRole === 'shop_admin'
                          ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
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
                  onClick={() => setEditingUser(null)}
                  className="saas-btn saas-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="saas-btn saas-btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
