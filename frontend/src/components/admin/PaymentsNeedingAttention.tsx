import React, { useState, useEffect } from 'react'
import { AlertCircle, Clock, RefreshCw, ShieldAlert, CheckCircle2, ChevronRight, XCircle, ArrowUpRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface AttentionItem {
  payment_id?: number
  order_id?: number
  amount: number
  paytm_order_id?: string
  order_status?: string
  refund_id?: number
  refund_ref?: string
  status?: string
  reason: string
  created_at: string
}

interface AttentionData {
  role: string
  outlet_id: string
  pending_payments_stuck: AttentionItem[]
  success_payments_unconfirmed: AttentionItem[]
  refunds_needing_attention: AttentionItem[]
  total_items: number
}

export const PaymentsNeedingAttention: React.FC<{ outletId?: string }> = ({ outletId }) => {
  const [data, setData] = useState<AttentionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [reconciling, setReconciling] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const fetchAttentionList = async () => {
    setLoading(true)
    try {
      const token = (await supabase?.auth?.getSession())?.data?.session?.access_token
      const resp = await fetch(`${API}/admin/payments/attention`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      if (resp.ok) {
        const json = await resp.json()
        setData(json)
      } else {
        console.warn('Attention endpoint response:', resp.status)
      }
    } catch (e) {
      console.warn('Could not fetch attention payments:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttentionList()
    const interval = setInterval(fetchAttentionList, 20000)
    return () => clearInterval(interval)
  }, [outletId])

  const triggerReconciliation = async () => {
    setReconciling(true)
    setActionMessage(null)
    try {
      const token = (await supabase?.auth?.getSession())?.data?.session?.access_token
      const resp = await fetch(`${API}/admin/payments/reconcile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      if (resp.ok) {
        const res = await resp.json()
        setActionMessage(`Reconciliation completed: ${res.confirmed_count || 0} confirmed, ${res.refunded_count || 0} refunded, ${res.failed_count || 0} failed.`)
        await fetchAttentionList()
      } else {
        setActionMessage('Reconciliation job failed or unauthorized.')
      }
    } catch (e) {
      setActionMessage('Reconciliation network error.')
    } finally {
      setReconciling(false)
    }
  }

  const totalIssues = data?.total_items || 0

  return (
    <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight flex items-center gap-2">
              Payments Needing Attention
              {totalIssues > 0 && (
                <span className="px-2 py-0.5 text-xs font-black rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                  {totalIssues} Active
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live monitor for payments pending &gt; 5m, unconfirmed success payments, and pending/failed refunds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAttentionList}
            disabled={loading}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all disabled:opacity-50"
            title="Refresh monitor"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={triggerReconciliation}
            disabled={reconciling}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={13} className={reconciling ? 'animate-spin' : ''} />
            <span>Run Reconciliation</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 font-medium">
          {actionMessage}
        </div>
      )}

      {/* When no issues are detected */}
      {!loading && totalIssues === 0 && (
        <div className="py-6 text-center text-slate-500 dark:text-slate-400 space-y-1">
          <div className="inline-flex p-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 mb-1">
            <CheckCircle2 size={24} />
          </div>
          <div className="font-bold text-sm text-slate-800 dark:text-slate-200">All Transactions Reconciled &amp; Clean</div>
          <p className="text-xs text-slate-400">Zero orphaned payments, no stuck pendings, and all refunds processed cleanly.</p>
        </div>
      )}

      {/* 1. Stuck Pending Payments */}
      {data && data.pending_payments_stuck.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <Clock size={13} />
            <span>Pending Payments Stuck &gt; 5 Minutes ({data.pending_payments_stuck.length})</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2.5">Payment ID</th>
                  <th className="p-2.5">Order ID</th>
                  <th className="p-2.5">Amount</th>
                  <th className="p-2.5">Paytm Reference</th>
                  <th className="p-2.5">Issue Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.pending_payments_stuck.map(p => (
                  <tr key={p.payment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">#{p.payment_id}</td>
                    <td className="p-2.5 font-mono">{p.order_id ? `#${p.order_id}` : '—'}</td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">₹{p.amount}</td>
                    <td className="p-2.5 font-mono text-[11px] text-slate-500">{p.paytm_order_id || '—'}</td>
                    <td className="p-2.5 text-amber-600 dark:text-amber-400 font-medium">{p.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Success Payments Without Confirmed Order */}
      {data && data.success_payments_unconfirmed.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertCircle size={13} />
            <span>Paid but Unconfirmed Orders ({data.success_payments_unconfirmed.length})</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-red-200 dark:border-red-900/50">
            <table className="w-full text-xs text-left">
              <thead className="bg-red-50/50 dark:bg-red-950/30 text-red-700 font-bold border-b border-red-200 dark:border-red-900/50">
                <tr>
                  <th className="p-2.5">Payment ID</th>
                  <th className="p-2.5">Order ID</th>
                  <th className="p-2.5">Amount</th>
                  <th className="p-2.5">Order Status</th>
                  <th className="p-2.5">Audit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                {data.success_payments_unconfirmed.map(p => (
                  <tr key={p.payment_id} className="hover:bg-red-50/30">
                    <td className="p-2.5 font-mono font-bold">#{p.payment_id}</td>
                    <td className="p-2.5 font-mono">#{p.order_id}</td>
                    <td className="p-2.5 font-bold">₹{p.amount}</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 font-mono text-[10px] uppercase font-bold">{p.order_status}</span></td>
                    <td className="p-2.5 text-red-600 font-medium">{p.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Refunds Pending or Failed */}
      {data && data.refunds_needing_attention.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <XCircle size={13} />
            <span>Refunds Pending or Failed ({data.refunds_needing_attention.length})</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2.5">Refund Ref</th>
                  <th className="p-2.5">Payment ID</th>
                  <th className="p-2.5">Amount</th>
                  <th className="p-2.5">Refund Status</th>
                  <th className="p-2.5">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.refunds_needing_attention.map(r => (
                  <tr key={r.refund_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">{r.refund_ref}</td>
                    <td className="p-2.5 font-mono">#{r.payment_id}</td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">₹{r.amount}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${r.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400 font-medium">{r.reason || 'Pending gateway refund status'}</td>
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

export default PaymentsNeedingAttention
