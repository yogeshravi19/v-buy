import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Store,
  Shield,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { Card } from '../ui/card'
import { StatusBadge } from '../ui/status-badge'
import { cn } from '../../lib/utils'

export function OutletComparisonChart({ outlets = [], orders = [], money }) {
  const chartData = outlets.map(outlet => {
    const outletOrders = orders.filter(o => o.outlet_id === outlet.id)
    const gmv = outletOrders.reduce((sum, o) => sum + (o.total || 0), 0) || outlet.today_gmv || 0
    return {
      name: outlet.name.replace(/—.*$/, '').trim(),
      gmv,
      orders: outletOrders.length || outlet.order_count || 0,
      isOpen: outlet.is_open
    }
  })

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Cross-Outlet Turnover Comparison</h4>
          <p className="text-xs text-slate-500">Live GMV distribution across campus dining facilities</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          Control Tower
        </span>
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl border border-slate-200 shadow-md text-xs">
                      <p className="font-semibold text-slate-800">{label}</p>
                      <p className="text-blue-700 font-bold tabular-nums">
                        {money ? money(payload[0].value) : `₹${payload[0].value}`}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar
              dataKey="gmv"
              fill="#1E40AF"
              radius={[6, 6, 0, 0]}
              animationDuration={400}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function OutletHierarchyTree({ outlets = [], users = [] }) {
  const [expandedOutlets, setExpandedOutlets] = useState({})

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

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Governance & Role Hierarchy</h4>
          <p className="text-xs text-slate-500">
            Structure: Outlet &rarr; Shop Admin &rarr; Shop Staff
          </p>
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

      <div className="space-y-3">
        {outlets.map(outlet => {
          const isExpanded = Boolean(expandedOutlets[outlet.id])
          const outletAdmins = users.filter(u => u.outlet_id === outlet.id && u.role === 'shop_admin')
          const outletStaff = users.filter(u => u.outlet_id === outlet.id && u.role === 'staff')

          const displayAdmins = outletAdmins.length > 0 ? outletAdmins : [
            { id: `demo-admin-${outlet.id}`, full_name: outlet.owner_name || 'Assigned Franchise Lead', phone: outlet.owner_phone || '+91 98765 40001', role: 'shop_admin', is_active: true }
          ]

          const displayStaff = outletStaff.length > 0 ? outletStaff : [
            { id: `demo-staff-${outlet.id}-1`, full_name: 'Counter Operator A', phone: '+91 98765 40002', role: 'Counter Staff', is_active: true },
            { id: `demo-staff-${outlet.id}-2`, full_name: 'Prep Cook B', phone: '+91 98765 40003', role: 'Kitchen Lead', is_active: true }
          ]

          return (
            <div
              key={outlet.id}
              className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50"
            >
              {/* Outlet Level (Root) */}
              <button
                type="button"
                onClick={() => toggleOutlet(outlet.id)}
                className="w-full flex items-center justify-between p-3.5 hover:bg-slate-100/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                    <Store size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">{outlet.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">({outlet.id})</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{outlet.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
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

              {/* Children Nodes (Shop Admin & Staff) */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3.5 pt-1">
                      {/* Tree branch connector */}
                      <div className="ml-4 pl-4 border-l-2 border-blue-200 space-y-3">
                        {/* Shop Admin Node */}
                        <div>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-1.5">
                            <Shield size={13} />
                            <span>Shop Admin</span>
                          </div>
                          <div className="space-y-1.5">
                            {displayAdmins.map(admin => (
                              <div
                                key={admin.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-slate-900">{admin.full_name}</span>
                                  <span className="text-slate-400 ml-2 font-mono text-[11px]">{admin.phone}</span>
                                </div>
                                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                  Franchise Owner
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Shop Staff Node */}
                        <div>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">
                            <UserCheck size={13} />
                            <span>Shop Staff Roster ({displayStaff.length})</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {displayStaff.map(staff => (
                              <div
                                key={staff.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">{staff.full_name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{staff.phone}</div>
                                </div>
                                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                  {staff.role}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
