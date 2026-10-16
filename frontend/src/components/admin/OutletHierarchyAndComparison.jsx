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
  const totalVolume = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const openCount = outlets.filter(o => o.is_open).length
  const regularCount = outlets.filter(o => !o.is_event).length
  const eventCount = outlets.filter(o => o.is_event).length

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <Card className="p-4 bg-white border border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Total Canteens</span>
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
          <span className="text-xs font-semibold text-slate-500">Live Kitchens</span>
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
          <span className="text-xs font-semibold text-slate-500">Today's Platform GMV</span>
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
          <span className="text-xs font-semibold text-slate-500">Total Orders Placed</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <ShoppingBag size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{orders.length}</div>
        <p className="mt-1 text-xs text-slate-500">Campus meal tokens issued today</p>
      </Card>
    </div>
  )
}

export function OutletHierarchyTree({ outlets = [], users = [], onUserUpdated }) {
  const [expandedOutlets, setExpandedOutlets] = useState({})
  const [assigningOutlet, setAssigningOutlet] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('staff')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const toggleOutlet = (id) => {
    setExpandedOutlets(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const expandAll = () => {
    const all = {}
    outlets.forEach(o => { all[o.id] = true })
    setExpandedOutlets(all)
  }

  const collapseAll = () => {
    setExpandedOutlets({})
  }

  const handleAssignRole = async (e) => {
    e.preventDefault()
    if (!assigningOutlet || !selectedUserId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          outlet_id: assigningOutlet.id,
          role: selectedRole
        })
        .eq('id', selectedUserId)

      if (error) {
        alert('Could not update role: ' + error.message)
      } else {
        setNotice(`Assigned user to ${assigningOutlet.name}`)
        setTimeout(() => setNotice(null), 3000)
        setAssigningOutlet(null)
        setSelectedUserId('')
        if (onUserUpdated) onUserUpdated()
      }
    } catch (err) {
      alert('Error updating user: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 space-y-4 bg-white border border-slate-200">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Outlet Staff & Management Directory</h4>
          <p className="text-xs text-slate-500">Live roster of assigned shop owners and kitchen staff per canteen</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium flex items-center gap-2">
          <Check size={14} />
          <span>{notice}</span>
        </div>
      )}

      <div className="space-y-2.5">
        {outlets.map(outlet => {
          const isExpanded = Boolean(expandedOutlets[outlet.id])
          const outletAdmins = users.filter(u => u.outlet_id === outlet.id && (u.role === 'shop_admin' || u.role === 'owner'))
          const outletStaff = users.filter(u => u.outlet_id === outlet.id && u.role === 'staff')

          return (
            <div
              key={outlet.id}
              className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs"
            >
              {/* Outlet Level */}
              <button
                type="button"
                onClick={() => toggleOutlet(outlet.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-50/80 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                    <Store size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{outlet.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">({outlet.id})</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{outlet.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-medium text-slate-400">
                    {outletAdmins.length + outletStaff.length} Team Members
                  </span>
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                    outlet.is_open ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  )}>
                    {outlet.is_open ? 'OPEN' : 'CLOSED'}
                  </span>
                  <span className="text-slate-400">
                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </span>
                </div>
              </button>

              {/* Children Nodes (Real Shop Admin & Staff) */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden bg-slate-50/60 border-t border-slate-100"
                  >
                    <div className="p-3.5 space-y-3">
                      {/* Shop Admins */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                            <Shield size={13} />
                            Shop Admin / Owner ({outletAdmins.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => { setAssigningOutlet(outlet); setSelectedRole('shop_admin'); }}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Plus size={12} /> Assign Admin
                          </button>
                        </div>

                        {outletAdmins.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-1">No shop owner assigned to this outlet</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {outletAdmins.map(admin => (
                              <div
                                key={admin.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">{admin.full_name}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">{admin.phone || admin.email || '—'}</div>
                                </div>
                                <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  Shop Admin
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Shop Staff */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                            <UserCheck size={13} />
                            Kitchen & Counter Staff ({outletStaff.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => { setAssigningOutlet(outlet); setSelectedRole('staff'); }}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Plus size={12} /> Assign Staff
                          </button>
                        </div>

                        {outletStaff.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-1">No kitchen staff assigned to this outlet</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {outletStaff.map(staff => (
                              <div
                                key={staff.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">{staff.full_name}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">{staff.phone || staff.email || '—'}</div>
                                </div>
                                <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                  Staff
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Assign Staff/Admin Modal */}
      {assigningOutlet && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assign Member to Outlet</h3>
                <p className="text-xs text-slate-500">{assigningOutlet.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningOutlet(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAssignRole} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700"
                >
                  <option value="">-- Choose a registered user --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.phone || u.email || 'No phone'}) - Current: {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700"
                >
                  <option value="staff">Shop Staff (Kitchen / POS Counter)</option>
                  <option value="shop_admin">Shop Admin (Franchise Owner / Manager)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningOutlet(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedUserId}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  )
}
