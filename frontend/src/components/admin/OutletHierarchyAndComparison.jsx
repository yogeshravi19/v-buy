import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Store,
  Shield,
  UserCheck,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  ShoppingBag,
  Plus,
  X,
  Check,
  AlertTriangle
} from 'lucide-react'
import { Card } from '../ui/card'
import { cn } from '../../lib/utils'
import { supabase } from '../../lib/supabase'

export function OutletComparisonChart({ outlets = [], orders = [], money }) {
  const isToday = (d) => {
    if (!d) return false
    try {
      return new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    } catch (e) {
      return false
    }
  }
  const todayOrders = orders.filter(o => isToday(o.created_at))
  const totalVolume = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  const openCount = outlets.filter(o => o.is_open).length
  const regularCount = outlets.filter(o => !o.is_event).length
  const eventCount = outlets.filter(o => o.is_event).length

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4 bg-white border border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Total canteens</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Store size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{outlets.length}</div>
        <p className="mt-1 text-xs text-slate-500">
          {regularCount} regular counters · {eventCount} event stalls
        </p>
      </Card>

      <Card className="p-4 bg-white border border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Live kitchens</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-emerald-700 tabular-nums">{openCount} Open</div>
        <p className="mt-1 text-xs text-slate-500">
          {outlets.length - openCount} canteens currently offline
        </p>
      </Card>

      <Card className="p-4 bg-white border border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Platform turnover</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <TrendingUp size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
          {money ? money(totalVolume) : `₹${totalVolume.toLocaleString('en-IN')}`}
        </div>
        <p className="mt-1 text-xs text-slate-500">Total sales across all outlets</p>
      </Card>

      <Card className="p-4 bg-white border border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Total orders placed</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <ShoppingBag size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{todayOrders.length}</div>
        <p className="mt-1 text-xs text-slate-500">Campus meal tokens issued today</p>
      </Card>
    </div>
  )
}

export function OutletStaffDrawer({
  isOpen,
  onClose,
  outlet,
  outlets = [],
  users = [],
  onSelectOutlet,
  onUserUpdated
}) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('staff')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  if (!isOpen) return null

  const activeOutlet = outlet || (outlets.length > 0 ? outlets[0] : null)
  if (!activeOutlet) return null

  const outletAdmins = users.filter(u => u.outlet_id === activeOutlet.id && (u.role === 'shop_admin' || u.role === 'owner'))
  const outletStaff = users.filter(u => u.outlet_id === activeOutlet.id && u.role === 'staff')

  const handleAssignRole = async (e) => {
    e.preventDefault()
    if (!selectedUserId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          outlet_id: activeOutlet.id,
          role: selectedRole
        })
        .eq('id', selectedUserId)

      if (error) {
        alert('Could not assign role: ' + error.message)
      } else {
        setNotice(`Assigned user to ${activeOutlet.name}`)
        setTimeout(() => setNotice(null), 3500)
        setShowAssignModal(false)
        setSelectedUserId('')
        if (onUserUpdated) onUserUpdated()
      }
    } catch (err) {
      alert('Error updating user: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUnassignUser = async (userId, userName) => {
    if (!window.confirm(`Unassign ${userName} from ${activeOutlet.name}?`)) return
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
    } catch (err) {
      alert('Error unassigning user: ' + err.message)
    }
  }

  return (
    <div className="saas-drawer-backdrop" onClick={onClose}>
      <div className="saas-drawer-panel" onClick={e => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="saas-drawer-header">
          <div>
            <div className="flex items-center gap-2">
              <Store size={18} className="text-blue-700" />
              <h3 className="saas-drawer-title">Outlet Staff & Management</h3>
            </div>
            <p className="saas-drawer-subtitle">Assigned shop owners and kitchen staff directory</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="saas-modal-close"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Outlet Switcher & Status Bar */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Canteen:</span>
            <select
              value={activeOutlet.id}
              onChange={e => {
                const found = outlets.find(o => o.id === e.target.value)
                if (found && onSelectOutlet) onSelectOutlet(found)
              }}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-700 flex-1"
            >
              {outlets.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.id}) — {o.is_open ? 'Open' : 'Closed'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              'text-[11px] font-bold px-2.5 py-1 rounded-full border',
              activeOutlet.is_open ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
            )}>
              {activeOutlet.is_open ? 'OPEN' : 'CLOSED'}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {outletAdmins.length + outletStaff.length} Team Members
            </span>
          </div>
        </div>

        {notice && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium flex items-center gap-2 shrink-0">
            <Check size={15} />
            <span>{notice}</span>
          </div>
        )}

        {/* Drawer Body */}
        <div className="saas-drawer-body">
          {/* Outlet Info Banner */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">{activeOutlet.name}</div>
              <div className="text-[11px] text-slate-500">{activeOutlet.location} · ID: {activeOutlet.id}</div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              {activeOutlet.is_event ? 'Event Stall' : 'Regular Outlet'}
            </span>
          </div>

          {/* 1. Shop Admin / Franchise Owner Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Shield size={14} className="text-amber-600" />
                Shop Admin / Franchise Owner ({outletAdmins.length})
              </span>
              <button
                type="button"
                onClick={() => { setSelectedRole('shop_admin'); setShowAssignModal(true); }}
                className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Assign Admin</span>
              </button>
            </div>

            {outletAdmins.length === 0 ? (
              <div className="p-4 bg-white rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                No shop admin assigned to this canteen.
              </div>
            ) : (
              <div className="space-y-2">
                {outletAdmins.map(admin => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{admin.full_name || 'Admin User'}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{admin.phone || admin.email || '—'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Shop Admin
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUnassignUser(admin.id, admin.full_name)}
                        className="text-xs text-slate-400 hover:text-rose-600 font-medium px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors"
                        title="Unassign user from this outlet"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Kitchen & Counter Staff Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                <UserCheck size={14} className="text-blue-600" />
                Kitchen & Counter Staff ({outletStaff.length})
              </span>
              <button
                type="button"
                onClick={() => { setSelectedRole('staff'); setShowAssignModal(true); }}
                className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Assign Staff</span>
              </button>
            </div>

            {outletStaff.length === 0 ? (
              <div className="p-4 bg-white rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                No kitchen or counter staff assigned to this canteen.
              </div>
            ) : (
              <div className="space-y-2">
                {outletStaff.map(staff => (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{staff.full_name || 'Staff User'}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{staff.phone || staff.email || '—'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Staff
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUnassignUser(staff.id, staff.full_name)}
                        className="text-xs text-slate-400 hover:text-rose-600 font-medium px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors"
                        title="Unassign user from this outlet"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="saas-drawer-footer">
          <button
            type="button"
            onClick={onClose}
            className="saas-btn saas-btn-primary"
          >
            <span>Done</span>
          </button>
        </div>

        {/* Assign Modal Popup inside Drawer */}
        {showAssignModal && (
          <div className="saas-modal-backdrop" onClick={() => setShowAssignModal(false)}>
            <div className="saas-modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
              <div className="saas-modal-header">
                <h3 className="saas-modal-title">
                  {selectedRole === 'shop_admin' ? 'Assign Shop Admin' : 'Assign Counter Staff'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="saas-modal-close"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAssignRole} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Select User</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700"
                  >
                    <option value="">-- Choose a registered user --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || 'Unnamed'} ({u.phone || u.email || 'No phone'}) - Current: {u.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Assignment Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700"
                  >
                    <option value="staff">Shop Staff (Kitchen / POS Counter)</option>
                    <option value="shop_admin">Shop Admin (Franchise Owner / Manager)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="saas-btn saas-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !selectedUserId}
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
    </div>
  )
}

// Backward-compatible trigger for any existing test references
export function OutletHierarchyTree({ outlets = [], users = [], onUserUpdated }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedOutlet, setSelectedOutlet] = useState(null)

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Outlet Staff & Management</h4>
          <p className="text-xs text-slate-500">View and manage assigned shop owners and kitchen staff in slide drawer</p>
        </div>
        <button
          type="button"
          onClick={() => { setSelectedOutlet(outlets[0] || null); setDrawerOpen(true); }}
          className="saas-btn saas-btn-secondary inline-flex items-center gap-1.5"
        >
          <Store size={14} className="text-blue-700" />
          <span>Open Staff Directory Drawer</span>
        </button>
      </div>

      <OutletStaffDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        outlet={selectedOutlet}
        outlets={outlets}
        users={users}
        onSelectOutlet={setSelectedOutlet}
        onUserUpdated={onUserUpdated}
      />
    </>
  )
}
