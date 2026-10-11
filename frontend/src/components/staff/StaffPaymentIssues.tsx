import React, { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronRight,
  Filter,
  ArrowRight
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface StaffIssueItem {
  order_id: number
  token: string | null
  created_at: string
  user_display: string
  total_amount: number
  payment_method: string
  payment_status: string
  order_status: string
  refund_status: string
  paytm_txn_ref: string | null
  issue_reason: string
  required_action: string
}

interface StaffPaymentIssuesProps {
  outletId: string
  onOrderUpdated?: () => void
}

export const StaffPaymentIssues: React.FC<StaffPaymentIssuesProps> = ({
  outletId,
  onOrderUpdated
}) => {
  const [issues, setIssues] = useState<StaffIssueItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [checkingOrderId, setCheckingOrderId] = useState<number | null>(null)
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    try {
      const session = (await supabase?.auth?.getSession())?.data?.session
      const token = session?.access_token
      const resp = await fetch(`${API}/staff/payment-issues`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      if (resp.ok) {
        const data = await resp.json()
        setIssues(data.issues || [])
      }
    } catch (err) {
      console.warn('Could not load staff payment issues:', err)
    } finally {
      setLoading(false)
    }
  }, [API])

  useEffect(() => {
    fetchIssues()
    const interval = setInterval(fetchIssues, 25000)
    return () => clearInterval(interval)
  }, [fetchIssues])

  const handleCheckStatus = async (orderId: number) => {
    setCheckingOrderId(orderId)
    setActionNotice(null)
    try {
      const session = (await supabase?.auth?.getSession())?.data?.session
      const token = session?.access_token
      const resp = await fetch(`${API}/order/${orderId}/check-payment-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      const data = await resp.json()
      if (resp.ok) {
        setActionNotice({
          type: 'success',
          message: data.message || `Order #${orderId} verified. Status: ${data.order_status || data.payment_status}`
        })
        await fetchIssues()
        if (onOrderUpdated) onOrderUpdated()
      } else {
        setActionNotice({
          type: 'error',
          message: data.detail || 'Could not verify payment status with gateway.'
        })
      }
    } catch {
      setActionNotice({
        type: 'error',
        message: 'Network error while contacting payment verification service.'
      })
    } finally {
      setCheckingOrderId(null)
      setTimeout(() => setActionNotice(null), 5000)
    }
  }

  const filteredIssues = issues.filter(item => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      item.order_id.toString().includes(q) ||
      (item.token && item.token.toLowerCase().includes(q)) ||
      item.user_display.toLowerCase().includes(q)
    )
  })

  const formatElapsed = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const mins = Math.max(0, Math.floor(diffMs / 60000))
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`
  }

  return (
    <div className="space-y-4">
      {/* Top Banner Notice */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-center justify-between border ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={16} className="text-red-600" />
            )}
            <span>{actionNotice.message}</span>
          </div>
        </div>
      )}

      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
            <CreditCard size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              Operational Payment Issues
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Discrepancies needing kitchen/counter attention for this outlet ({filteredIssues.length} active)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Order ID / Token..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchIssues}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Content list or empty state */}
      {filteredIssues.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center mb-3">
            <ShieldCheck size={24} />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">All Clear</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            No active payment discrepancies or unconfirmed orders requiring counter intervention.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-3">Order / Token</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Order Status</th>
                  <th className="p-3">Refund Status</th>
                  <th className="p-3">Issue Reason</th>
                  <th className="p-3">Required Action</th>
                  <th className="p-3 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredIssues.map(item => (
                  <tr key={item.order_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-medium">
                      <span className="font-bold text-slate-900 dark:text-white">#{item.order_id}</span>
                      {item.token && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono text-[11px] font-bold">
                          Token {item.token}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {formatElapsed(item.created_at)}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                      {item.user_display}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      ₹{item.total_amount}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                          item.payment_status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : item.payment_status === 'PENDING'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                        }`}
                      >
                        {item.payment_status}
                      </span>
                      {item.paytm_txn_ref && (
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                          {item.paytm_txn_ref}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {item.order_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                          item.refund_status === 'REFUND_SUCCESS'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.refund_status === 'REFUND_FAILED'
                            ? 'bg-red-100 text-red-700'
                            : item.refund_status === 'REFUND_NOT_REQUIRED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.refund_status.replace('REFUND_', '')}
                      </span>
                    </td>
                    <td className="p-3 text-red-600 dark:text-red-400 font-medium max-w-xs">
                      {item.issue_reason}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {item.required_action}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleCheckStatus(item.order_id)}
                        disabled={checkingOrderId === item.order_id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={11} className={checkingOrderId === item.order_id ? 'animate-spin' : ''} />
                        <span>Check Status</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
export default StaffPaymentIssues
