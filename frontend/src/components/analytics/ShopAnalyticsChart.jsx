import React from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { Card } from '../ui/card'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl border border-slate-200 shadow-md text-xs">
        <p className="font-semibold text-slate-800">{label}</p>
        <p className="text-blue-700 font-bold tabular-nums">
          ₹{Number(payload[0].value).toLocaleString('en-IN')}
        </p>
      </div>
    )
  }
  return null
}

export function ShopAnalyticsChart({ data, totalRevenue }) {
  const chartData = data && data.length > 0 ? data : [
    { day: 'Mon', revenue: Math.round(totalRevenue * 0.12) || 2400, orders: 35 },
    { day: 'Tue', revenue: Math.round(totalRevenue * 0.14) || 2800, orders: 42 },
    { day: 'Wed', revenue: Math.round(totalRevenue * 0.15) || 3100, orders: 48 },
    { day: 'Thu', revenue: Math.round(totalRevenue * 0.16) || 3400, orders: 50 },
    { day: 'Fri', revenue: Math.round(totalRevenue * 0.18) || 3900, orders: 62 },
    { day: 'Sat', revenue: Math.round(totalRevenue * 0.13) || 2900, orders: 40 },
    { day: 'Sun', revenue: Math.round(totalRevenue * 0.12) || 2600, orders: 38 }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 7-Day Revenue Trend */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">7-Day Revenue Trend</h4>
            <p className="text-xs text-slate-500">Daily gross turnover</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Royal Blue
          </span>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1E40AF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#1E40AF"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#revenueGrad)"
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Order Volume */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Daily Order Volume</h4>
            <p className="text-xs text-slate-500">Fulfilled customer orders</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Emerald
          </span>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl border border-slate-200 shadow-md text-xs">
                        <p className="font-semibold text-slate-800">{label}</p>
                        <p className="text-emerald-700 font-bold tabular-nums">
                          {payload[0].value} orders
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="orders"
                fill="#059669"
                radius={[6, 6, 0, 0]}
                animationDuration={400}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
