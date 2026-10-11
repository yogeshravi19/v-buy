import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ReceiptText,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  XCircle,
  Store,
  CreditCard,
  Smartphone,
  Wallet
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

interface PaymentRefundRecord {
  payment_id: number
  order_id: number | null
  order_date: string
  amount: number
  payment_method: string
  payment_status: string
  order_status: string
  token: string | null
  refund_status: string
  refund_amount: number
  refund_ref: string | null
  paytm_txn_ref: string | null
  failure_reason: string | null
  last_status_update: string
  is_unresolved: boolean
  next_action: string
}

export function PaymentsAndRefundsTab({ onClose }: { onClose?: () => void } = {}) {
  const [records, setRecords] = useState<PaymentRefundRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingOrderId, setCheckingOrderId] = useState<number | null>(null)
  const [cooldowns, setCooldowns] = useState<Record<number, number>>({})
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<PaymentRefundRecord | null>(null)

  const loadPaymentsAndRefunds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/user/payments-refunds')
      const data = res.data || {}
      setRecords(data.payments || [])
    } catch (err: any) {
      console.warn('Could not fetch payments & refunds:', err)
      toast.error('Unable to load payment history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPaymentsAndRefunds()
  }, [loadPaymentsAndRefunds])

  // Cooldown countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns(prev => {
        let changed = false
        const next = { ...prev }
        for (const orderId in next) {
          if (next[orderId] > 0) {
            next[orderId] -= 1
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleCheckStatus = async (orderId: number) => {
    if (cooldowns[orderId] && cooldowns[orderId] > 0) {
      toast(`Please wait ${cooldowns[orderId]}s before re-checking.`)
      return
    }

    setCheckingOrderId(orderId)
    try {
      const res = await api.post(`/order/${orderId}/check-payment-status`)
      const data = res.data || {}

      if (data.cooldown_remaining && data.cooldown_remaining > 0) {
        setCooldowns(prev => ({ ...prev, [orderId]: data.cooldown_remaining }))
        toast(data.message || `Please wait ${data.cooldown_remaining}s before checking again.`)
      } else {
        setCooldowns(prev => ({ ...prev, [orderId]: 10 }))
        toast.success(data.message || 'Status verified from gateway')
      }

      // Refresh list to update state
      await loadPaymentsAndRefunds()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to check payment status')
    } finally {
      setCheckingOrderId(null)
    }
  }

  const unresolvedRecords = records.filter(r => r.is_unresolved)
  const resolvedRecords = records.filter(r => !r.is_unresolved)

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={11} /> Paid
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock size={11} /> Pending
          </span>
        )
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <RefreshCw size={11} /> Refunded
          </span>
        )
      case 'FAILED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle size={11} /> Failed
          </span>
        )
    }
  }

  const getRefundStatusBadge = (status: string) => {
    switch (status) {
      case 'REFUND_SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={11} /> Refund Successful
          </span>
        )
      case 'REFUND_INITIATED':
      case 'REFUND_PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock size={11} /> Refund Processing
          </span>
        )
      case 'REFUND_FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertCircle size={11} /> Refund Failed
          </span>
        )
      case 'REFUND_NOT_REQUIRED':
      default:
        return null
    }
  }

  const faqs = [
    {
      q: 'My payment was debited but my order was not confirmed. What should I do?',
      a: 'Your payment may have reached the payment gateway even if the order confirmation was interrupted. V Foods will verify the payment status with the payment gateway and update the order accordingly. If the order cannot be fulfilled after successful payment verification, the applicable refund process will be initiated.'
    },
    {
      q: 'How can I check my payment status?',
      a: 'Open the affected order or use the Check Status button in this section. V Foods will verify the latest payment status directly with the gateway and update your order state.'
    },
    {
      q: 'How can I check my refund?',
      a: 'Open the affected order or check this Payments & Refunds section to view the latest refund status and available refund reference.'
    },
    {
      q: 'What if my refund is still not visible in my bank account?',
      a: 'If the refund remains unresolved after the expected processing period, use the Contact Outlet option and provide your Order ID and payment/refund reference.'
    },
    {
      q: 'Can I receive a refund if the order cannot be fulfilled?',
      a: 'If payment has been successfully received and V Foods cannot fulfil the order (due to outlet closure or items being sold out), the system will follow the configured refund process.'
    },
    {
      q: 'Will I be charged twice if I retry payment?',
      a: 'The system must verify the previous payment status before creating or confirming another payment attempt to prevent duplicate debits.'
    }
  ]

  return (
    <div className="space-y-6 pb-20 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-orange-400" />
            Payments &amp; Refunds
          </h2>
          <p className="text-xs text-white/50">
            Trace payments, verify gateway status, and monitor refunds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPaymentsAndRefunds}
            disabled={loading}
            className="btn-icon btn-sm"
            title="Refresh payment records"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="btn-icon btn-sm"
              title="Close"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Active Payment / Refund Issues ── */}
      {unresolvedRecords.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <AlertCircle size={14} />
            <span>Active Issues Requiring Attention ({unresolvedRecords.length})</span>
          </div>

          {unresolvedRecords.map(item => (
            <motion.div
              key={item.payment_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4 border border-amber-500/30 bg-amber-500/5 space-y-3 rounded-xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">
                      {item.order_id ? `Order #${item.order_id}` : `Payment #${item.payment_id}`}
                    </span>
                    {getPaymentStatusBadge(item.payment_status)}
                    {getRefundStatusBadge(item.refund_status)}
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    {new Date(item.order_date).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
                <span className="text-base font-bold text-white">₹{item.amount.toFixed(2)}</span>
              </div>

              {/* Status explanation */}
              <div className="bg-white/5 p-2.5 rounded-lg text-xs space-y-1">
                <p className="text-amber-200/90 font-medium">{item.next_action}</p>
                {item.refund_ref && (
                  <p className="text-white/40 font-mono text-[11px]">
                    Refund Ref: <span className="text-white/80">{item.refund_ref}</span>
                  </p>
                )}
                {item.paytm_txn_ref && (
                  <p className="text-white/40 font-mono text-[11px]">
                    Gateway Ref: <span className="text-white/80">{item.paytm_txn_ref}</span>
                  </p>
                )}
              </div>

              {/* Contextual Actions */}
              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                {item.order_id && (
                  <button
                    onClick={() => handleCheckStatus(item.order_id!)}
                    disabled={checkingOrderId === item.order_id || (cooldowns[item.order_id!] || 0) > 0}
                    className="btn-primary btn-sm px-3 text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw
                      size={13}
                      className={checkingOrderId === item.order_id ? 'animate-spin' : ''}
                    />
                    <span>
                      {cooldowns[item.order_id!] && cooldowns[item.order_id!] > 0
                        ? `Wait ${cooldowns[item.order_id!]}s`
                        : 'Check Status'}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedRecord(item)}
                  className="btn-ghost btn-sm text-xs text-white/70 hover:text-white"
                >
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Payment & Refund History ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-white/40" />
          Payment &amp; Refund History
        </h3>

        {loading ? (
          <div className="card p-8 text-center text-white/40 text-xs">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-white/30" />
            Loading transaction records...
          </div>
        ) : records.length === 0 ? (
          <div className="card p-8 text-center text-white/40 text-xs rounded-xl">
            No payments or refund records found.
          </div>
        ) : (
          <div className="space-y-2">
            {records.map(r => (
              <div
                key={r.payment_id}
                onClick={() => setSelectedRecord(r)}
                className="card p-3.5 hover:bg-white/5 transition-colors cursor-pointer border border-white/5 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    {r.payment_method === 'wallet' ? (
                      <Wallet size={16} className="text-cyan-400" />
                    ) : r.payment_method.includes('CARD') ? (
                      <CreditCard size={16} className="text-purple-400" />
                    ) : (
                      <Smartphone size={16} className="text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-white text-xs truncate">
                        {r.order_id ? `Order #${r.order_id}` : `Payment #${r.payment_id}`}
                      </span>
                      {getPaymentStatusBadge(r.payment_status)}
                      {getRefundStatusBadge(r.refund_status)}
                    </div>
                    <p className="text-[11px] text-white/40 mt-0.5 truncate">
                      {new Date(r.order_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short'
                      })}{' '}
                      &bull; {r.payment_method}
                      {r.paytm_txn_ref ? ` &bull; ${r.paytm_txn_ref}` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="font-bold text-white text-sm">₹{r.amount.toFixed(2)}</span>
                  {r.refund_amount > 0 && (
                    <p className="text-[10px] text-sky-400 mt-0.5">
                      Refunded: ₹{r.refund_amount.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Contextual FAQ Section ── */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-orange-400" />
          Frequently Asked Questions
        </h3>

        <div className="space-y-2">
          {faqs.map((faq, idx) => {
            const isExpanded = expandedFaq === idx
            return (
              <div
                key={idx}
                className="card p-3 border border-white/5 bg-surface-900 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                  className="w-full flex items-center justify-between text-left gap-2"
                >
                  <span className="text-xs font-semibold text-white/90">{faq.q}</span>
                  {isExpanded ? (
                    <ChevronUp size={14} className="text-white/40 flex-shrink-0" />
                  ) : (
                    <ChevronDown size={14} className="text-white/40 flex-shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="text-xs text-white/60 pt-2.5 leading-relaxed"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Detailed Record Modal ── */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="card max-w-sm w-full p-5 space-y-4 bg-surface-900 border border-white/10 rounded-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h4 className="font-bold text-white text-sm">Transaction Details</h4>
                  <p className="text-[11px] text-white/40">
                    {selectedRecord.order_id
                      ? `Order #${selectedRecord.order_id}`
                      : `Payment #${selectedRecord.payment_id}`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="btn-icon btn-sm text-white/50 hover:text-white"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/50">Amount:</span>
                  <span className="font-bold text-white">₹{selectedRecord.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/50">Payment Status:</span>
                  <span>{getPaymentStatusBadge(selectedRecord.payment_status)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/50">Order Status:</span>
                  <span className="text-white capitalize">{selectedRecord.order_status}</span>
                </div>
                {selectedRecord.token && (
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/50">Pickup Token:</span>
                    <span className="font-bold text-orange-400">#{selectedRecord.token}</span>
                  </div>
                )}
                {selectedRecord.refund_status !== 'REFUND_NOT_REQUIRED' && (
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/50">Refund Status:</span>
                    <span>{getRefundStatusBadge(selectedRecord.refund_status)}</span>
                  </div>
                )}
                {selectedRecord.refund_ref && (
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/50">Refund Reference:</span>
                    <span className="font-mono text-white/80">{selectedRecord.refund_ref}</span>
                  </div>
                )}
                {selectedRecord.paytm_txn_ref && (
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/50">Gateway Reference:</span>
                    <span className="font-mono text-white/80">{selectedRecord.paytm_txn_ref}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/50">Date &amp; Time:</span>
                  <span className="text-white/80">
                    {new Date(selectedRecord.order_date).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>
              </div>

              {/* Status explanation */}
              <div className="p-2.5 rounded-lg bg-white/5 text-xs text-white/70">
                <span className="font-semibold text-white">Guidance: </span>
                {selectedRecord.next_action}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2">
                {selectedRecord.order_id && (
                  <button
                    onClick={() => {
                      handleCheckStatus(selectedRecord.order_id!)
                      setSelectedRecord(null)
                    }}
                    className="btn-primary btn-sm flex-1 text-xs"
                  >
                    Check Status
                  </button>
                )}
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="btn-secondary btn-sm flex-1 text-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PaymentsAndRefundsTab
