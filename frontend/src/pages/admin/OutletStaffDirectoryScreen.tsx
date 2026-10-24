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
  RefreshCw,
  Users
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
}

export const OutletStaffDirectoryScreen: React.FC<OutletStaffDirectoryScreenProps> = ({
  outlets = [],
  users = [],
  selectedOutletId = null,
  onBackToOutlets,
  onUserUpdated
}) => {
  const [activeOutletFilter, setActiveOutletFilter] = useState<string>(selectedOutletId || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'shop_admin' | 'staff' | 'unassigned'>('all')

  // Modals & form state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignUserId, setAssignUserId] = useState('')
  const [assignOutletId, setAssignOutletId] = useState(selectedOutletId || (outlets[0]?.id || ''))
  const [assignRole, setAssignRole] = useState<'shop_admin' | 'staff'>('staff')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // Filtered staff list
  const staffUsers = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (roleFilter === 'shop_admin' && u.role !== 'shop_admin' && u.role !== 'owner') return false
      if (roleFilter === 'staff' && u.role !== 'staff') return false
      if (roleFilter === 'unassigned' && (u.outlet_id || (u.role !== 'staff' && u.role !== 'shop_admin'))) return false
      if (roleFilter === 'all' && u.role !== 'shop_admin' && u.role !== 'owner' && u.role !== 'staff') return false

      // Outlet filter
      if (activeOutletFilter !== 'all' && u.outlet_id !== activeOutletFilter) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const name = (u.full_name || '').toLowerCase()
        const email = (u.email || '').toLowerCase()
        const phone = (u.phone || '').toLowerCase()
        const outletName = (outlets.find(o => o.id === u.outlet_id)?.name || '').toLowerCase()
        return name.includes(q) || email.includes(q) || phone.includes(q) || outletName.includes(q)
      }

      return true
    })
  }, [users, roleFilter, activeOutletFilter, searchQuery, outlets])

  const shopAdmins = staffUsers.filter(u => u.role === 'shop_admin' || u.role === 'owner')
  const kitchenStaff = staffUsers.filter(u => u.role === 'staff')

  // Summary counts
  const totalAssignedAdmins = users.filter(u => (u.role === 'shop_admin' || u.role === 'owner') && u.outlet_id).length
  const totalAssignedStaff = users.filter(u => u.role === 'staff' && u.outlet_id).length
  const outletsWithStaff = new Set(users.filter(u => u.outlet_id).map(u => u.outlet_id)).size

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
        alert('Could not assign role: ' + error.message)
      } else {
        const outletName = outlets.find(o => o.id === assignOutletId)?.name || assignOutletId
        setNotice(`Assigned user to ${outletName}`)
        setTimeout(() => setNotice(null), 3500)
        setShowAssignModal(false)
        setAssignUserId('')
        if (onUserUpdated) onUserUpdated()
      }
    } catch (err: any) {
      alert('Error updating user: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUnassignUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Unassign ${userName} from their canteen?`)) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ outlet_id: null })
        .eq('id', userId)

      if (error) {
        alert('Could not unassign user: ' + error.message)
      } else {
        setNotice(`Unassigned ${userName}`)
        setTimeout(() => setNotice(null), 3500)
        if (onUserUpdated) onUserUpdated()
      }
    } catch (err: any) {
      alert('Error unassigning user: ' + err.message)
    }
  }

  const activeOutlet = outlets.find(o => o.id === activeOutletFilter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <button
            type="button"
            onClick={onBackToOutlets}
            className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-2 mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to Outlets</span>
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Outlet Staff & Personnel Directory
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Manage assigned shop franchise owners and kitchen counter staff across campus canteens
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="saas-btn saas-btn-primary inline-flex items-center gap-1.5"
            onClick={() => {
              setAssignOutletId(activeOutletFilter !== 'all' ? activeOutletFilter : (outlets[0]?.id || ''))
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

      {/* Overview Stat Cards */}
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

      {/* Filter and Search Bar */}
      <div className="saas-card p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Canteen Selector */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Canteen:
            </span>
            <select
              value={activeOutletFilter}
              onChange={e => setActiveOutletFilter(e.target.value)}
              className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-700 flex-1"
            >
              <option value="all">All Campus Outlets ({outlets.length})</option>
              {outlets.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.id}) — {o.is_open ? 'Open' : 'Closed'}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-700"
            />
          </div>
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
          {(['all', 'shop_admin', 'staff', 'unassigned'] as const).map(rf => (
            <button
              key={rf}
              type="button"
              onClick={() => setRoleFilter(rf)}
              className={`saas-btn saas-btn-sm ${roleFilter === rf ? 'saas-btn-primary' : 'saas-btn-secondary'}`}
            >
              {rf === 'all' && `All Personnel (${staffUsers.length})`}
              {rf === 'shop_admin' && `Shop Admins (${shopAdmins.length})`}
              {rf === 'staff' && `Kitchen Staff (${kitchenStaff.length})`}
              {rf === 'unassigned' && 'Unassigned Members'}
            </button>
          ))}
        </div>
      </div>

      {/* Active Canteen Details Banner (when filtered to a specific canteen) */}
      {activeOutlet && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Store size={18} className="text-blue-700" />
              <h3 className="text-sm font-extrabold text-slate-900">{activeOutlet.name}</h3>
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                activeOutlet.is_open ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
              )}>
                {activeOutlet.is_open ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Location: {activeOutlet.location || 'Campus Center'} · ID: <span className="font-mono">{activeOutlet.id}</span>
            </p>
          </div>

          <button
            type="button"
            className="saas-btn saas-btn-sm saas-btn-secondary"
            onClick={() => {
              setAssignOutletId(activeOutlet.id)
              setShowAssignModal(true)
            }}
          >
            <Plus size={14} />
            <span>Add Staff to {activeOutlet.name}</span>
          </button>
        </div>
      )}

      {/* Main Personnel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Franchise Owners & Shop Admins */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Franchise Owners & Admins ({shopAdmins.length})
              </h3>
            </div>
            <button
              type="button"
              className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1"
              onClick={() => {
                setAssignRole('shop_admin')
                setAssignOutletId(activeOutletFilter !== 'all' ? activeOutletFilter : (outlets[0]?.id || ''))
                setShowAssignModal(true)
              }}
            >
              <Plus size={13} />
              <span>Assign Owner</span>
            </button>
          </div>

          {shopAdmins.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              No franchise owners found matching your filter.
            </div>
          ) : (
            <div className="space-y-3">
              {shopAdmins.map(admin => {
                const outletInfo = outlets.find(o => o.id === admin.outlet_id)
                return (
                  <div
                    key={admin.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {admin.full_name || 'Outlet Admin'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          Shop Admin
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

                      <div className="mt-2 text-xs font-semibold text-blue-700 flex items-center gap-1">
                        <Building2 size={13} />
                        <span>{outletInfo ? `${outletInfo.name} (${outletInfo.id})` : 'Unassigned'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUnassignUser(admin.id, admin.full_name || 'Admin')}
                        className="saas-btn saas-btn-sm saas-btn-danger inline-flex items-center gap-1"
                        title="Unassign user from outlet"
                      >
                        <Trash2 size={12} />
                        <span>Unassign</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Section 2: Kitchen & Counter Staff */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Kitchen & Counter Staff ({kitchenStaff.length})
              </h3>
            </div>
            <button
              type="button"
              className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1"
              onClick={() => {
                setAssignRole('staff')
                setAssignOutletId(activeOutletFilter !== 'all' ? activeOutletFilter : (outlets[0]?.id || ''))
                setShowAssignModal(true)
              }}
            >
              <Plus size={13} />
              <span>Assign Staff</span>
            </button>
          </div>

          {kitchenStaff.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              No kitchen staff found matching your filter.
            </div>
          ) : (
            <div className="space-y-3">
              {kitchenStaff.map(staff => {
                const outletInfo = outlets.find(o => o.id === staff.outlet_id)
                return (
                  <div
                    key={staff.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {staff.full_name || 'Kitchen Staff'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Counter Staff
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Phone size={12} className="text-slate-400" />
                          {staff.phone || '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail size={12} className="text-slate-400" />
                          {staff.email || '—'}
                        </span>
                      </div>

                      <div className="mt-2 text-xs font-semibold text-blue-700 flex items-center gap-1">
                        <Building2 size={13} />
                        <span>{outletInfo ? `${outletInfo.name} (${outletInfo.id})` : 'Unassigned'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUnassignUser(staff.id, staff.full_name || 'Staff')}
                        className="saas-btn saas-btn-sm saas-btn-danger inline-flex items-center gap-1"
                        title="Unassign user from outlet"
                      >
                        <Trash2 size={12} />
                        <span>Unassign</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
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
                    Select Member
                  </label>
                  <select
                    value={assignUserId}
                    onChange={e => setAssignUserId(e.target.value)}
                    required
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-700"
                  >
                    <option value="">-- Choose User --</option>
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
                  {saving ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
