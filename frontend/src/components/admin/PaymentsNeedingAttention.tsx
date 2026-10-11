import React, { useState, useEffect, useCallback } from 'react'
import {
  AlertCircle,
  Clock,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  XCircle,
  Filter,
  Search,
  Calendar,
  Layers,
  ArrowUpRight,
  CreditCard,
  Receipt
} from 'lucide-react'
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

interface ReconciliationSummary {
  total_revenue: number
  total_online_volume: number
  total_refunded: number
  successful_payments_count: number
  refunded_count: number
}

interface ReconciliationRecord {
  id: number
  order_id?: number
  created_at: string
  amount: number
  payment_method: string
  payment_status: string
  order_status: string
  token?: string
  refund_status: string
  refund_amount: number
  refund_ref?: string
  paytm_txn_ref?: string
  is_discrepancy: boolean
}

export const PaymentsNeedingAttention: React.FC<{ outletId?: string }> = ({ outletId }) => {
  const [data, setData] = useState<AttentionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [reconciling, setReconciling] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  
  // Accounting & filter state
  const [activeSubTab, setActiveSubTab] = useState<'attention' | 'reconciliation' | 'webhooks'>('attention')
  const [reconSummary, setReconSummary] = useState<ReconciliationSummary | null>(null)
  const [reconRecords, setReconRecords] = useState<ReconciliationRecord[]>([])
  const [webhooksList, setWebhooksList] = useState<any[]>([])
  
  // Filters
  const [searchFilter, setSearchFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL')
  const [refundStatusFilter, setRefundStatusFilter] = useState('ALL')

  const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const fetchAttentionList = useCallback(async () => {
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
      }
    } catch (e) {
      console.warn('Could not fetch attention payments:', e)
    } finally {
      setLoading(false)
    }
  }, [API])

  const fetchReconciliationData = useCallback(async () => {
    try {
      const token = (await supabase?.auth?.getSession())?.data?.session?.access_token
      const queryParams = new URLSearchParams()
      if (paymentStatusFilter !== 'ALL') queryParams.append('payment_status', paymentStatusFilter)
      if (refundStatusFilter !== 'ALL') queryParams.append('refund_status', refundStatusFilter)
      if (searchFilter) queryParams.append('order_id', searchFilter)

      const resp = await fetch(`${API}/shop/payments-reconciliation?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      if (resp.ok) {
        const json = await resp.json()
        setReconSummary(json.accounting_summary || null)
        setReconRecords(json.records || [])
      }
    } catch (err) {
      console.warn('Could not load reconciliation accounting:', err)
    }
  }, [API, paymentStatusFilter, refundStatusFilter, searchFilter])

  const fetchAdminOverview = useCallback(async () => {
    try {
      const token = (await supabase?.auth?.getSession())?.data?.session?.access_token
      const resp = await fetch(`${API}/admin/payments/overview`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      if (resp.ok) {
        const json = await resp.json()
        setWebhooksList(json.recent_webhooks || [])
      }
    } catch (err) {
      console.warn('Could not load admin webhook overview:', err)
    }
  }, [API])

  useEffect(() => {
    fetchAttentionList()
    fetchReconciliationData()
    fetchAdminOverview()
    const interval = setInterval(() => {
      fetchAttentionList()
      fetchReconciliationData()
    }, 25000)
    return () => clearInterval(interval)
  }, [fetchAttentionList, fetchReconciliationData, fetchAdminOverview, outletId])

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
        await fetchReconciliationData()
      } else {
        setActionMessage('Reconciliation job failed or unauthorized.')
      }
    } catch {
      setActionMessage('Reconciliation network error.')
    } finally {
      setReconciling(false)
    }
  }

  const totalIssues = data?.total_items || 0

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight flex items-center gap-2">
              Payments, Refunds &amp; Reconciliation
              {totalIssues > 0 && (
                <span className="px-2 py-0.5 text-xs font-black rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                  {totalIssues} Needing Attention
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Role-based accounting, live payment status verification, and deterministic refund tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchAttentionList(); fetchReconciliationData(); fetchAdminOverview(); }}
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

      {/* Accounting Summary Metrics */}
      {reconSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Revenue</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">₹{reconSummary.total_revenue.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Online UPI Volume</div>
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">₹{reconSummary.total_online_volume.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Refunded</div>
            <div className="text-sm font-bold text-red-600 dark:text-red-400 mt-0.5">₹{reconSummary.total_refunded.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Successful Txns</div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{reconSummary.successful_payments_count}</div>
          </div>
        </div>
      )}

      {/* View Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('attention')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            activeSubTab === 'attention'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          Discrepancies ({totalIssues})
        </button>
        <button
          onClick={() => setActiveSubTab('reconciliation')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            activeSubTab === 'reconciliation'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          Ledger &amp; Reconciliation ({reconRecords.length})
        </button>
        <button
          onClick={() => setActiveSubTab('webhooks')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            activeSubTab === 'webhooks'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          Webhook Audit ({webhooksList.length})
        </button>
      </div>

      {/* SUBTAB 1: ATTENTION / DISCREPANCIES */}
      {activeSubTab === 'attention' && (
        <div className="space-y-4">
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
      )}

      {/* SUBTAB 2: RECONCILIATION LEDGER */}
      {activeSubTab === 'reconciliation' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Filter size={13} />
              <span className="font-semibold">Filters:</span>
            </div>
            <select
              value={paymentStatusFilter}
              onChange={e => setPaymentStatusFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
            </select>

            <select
              value={refundStatusFilter}
              onChange={e => setRefundStatusFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="ALL">All Refund Statuses</option>
              <option value="REFUND_SUCCESS">REFUND_SUCCESS</option>
              <option value="REFUND_PENDING">REFUND_PENDING</option>
              <option value="REFUND_FAILED">REFUND_FAILED</option>
            </select>

            <input
              type="text"
              placeholder="Search Order ID..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs w-36"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2.5">Order ID</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Method</th>
                  <th className="p-2.5">Amount</th>
                  <th className="p-2.5">Payment</th>
                  <th className="p-2.5">Order</th>
                  <th className="p-2.5">Refund</th>
                  <th className="p-2.5">Gateway Ref</th>
                  <th className="p-2.5">Discrepancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reconRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">
                      #{rec.order_id || rec.id}
                      {rec.token && <span className="ml-1 text-[10px] text-blue-600 font-bold">[{rec.token}]</span>}
                    </td>
                    <td className="p-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400 font-medium">
                      {rec.payment_method}
                    </td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                      ₹{rec.amount}
                    </td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                        rec.payment_status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                        rec.payment_status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {rec.payment_status}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                      {rec.order_status}
                    </td>
                    <td className="p-2.5 font-mono text-[10px]">
                      {rec.refund_status.replace('REFUND_', '')}
                      {rec.refund_amount > 0 && <span className="text-red-600 font-bold ml-1">(₹{rec.refund_amount})</span>}
                    </td>
                    <td className="p-2.5 font-mono text-[10px] text-slate-500">
                      {rec.paytm_txn_ref || '—'}
                    </td>
                    <td className="p-2.5">
                      {rec.is_discrepancy ? (
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">MISMATCH</span>
                      ) : (
                        <span className="text-emerald-600 font-bold text-[10px]">MATCH</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: WEBHOOK AUDIT */}
      {activeSubTab === 'webhooks' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Real-time audit log of Paytm Server-to-Server (S2S) Payment &amp; Refund webhooks received by FastAPI.
          </div>
          {webhooksList.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
              No webhook events logged yet in current session.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">Event Type</th>
                    <th className="p-2.5">Order Ref</th>
                    <th className="p-2.5">Signature Valid</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Duplicate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {webhooksList.map((evt, idx) => (
                    <tr key={evt.id || idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 text-slate-500 whitespace-nowrap">
                        {new Date(evt.received_at || evt.created_at).toLocaleTimeString()}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-purple-700 dark:text-purple-300">
                        {evt.event_type}
                      </td>
                      <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                        {evt.order_ref || '—'}
                      </td>
                      <td className="p-2.5">
                        {evt.signature_valid ? (
                          <span className="text-emerald-600 font-bold">VERIFIED</span>
                        ) : (
                          <span className="text-red-600 font-bold">INVALID</span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono text-[10px]">
                        {evt.processing_status}
                      </td>
                      <td className="p-2.5">
                        {evt.is_duplicate ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">DUPLICATE</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">NO</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PaymentsNeedingAttention
