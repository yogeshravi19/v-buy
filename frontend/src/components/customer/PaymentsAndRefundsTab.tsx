import React, { useState, useEffect, useCallback } from 'react'
import {
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  XCircle,
  CreditCard,
  X,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Info
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
  const [activeTab, setActiveTab] = useState<'all' | 'unresolved' | 'faq'>('all')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0)
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
        toast.success(data.message || `Payment verified: ${data.order_status}`)
        setCooldowns(prev => ({ ...prev, [orderId]: 10 }))
      }
      await loadPaymentsAndRefunds()
    } catch (err: any) {
      if (err.response?.status === 429) {
        const detail = err.response.data?.detail || ''
        const match = detail.match(/(\d+)\s*seconds/)
        const secs = match ? parseInt(match[1], 10) : 10
        setCooldowns(prev => ({ ...prev, [orderId]: secs }))
        toast(detail || `Rate limited. Please wait ${secs}s.`)
      } else {
        toast.error(err.response?.data?.detail || 'Could not verify status with gateway.')
      }
    } finally {
      setCheckingOrderId(null)
    }
  }

  const unresolvedRecords = records.filter(r => r.is_unresolved)

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
            <CheckCircle2 size={11} /> Paid
          </span>
        )
      case 'PENDING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>
            <Clock size={11} /> Pending
          </span>
        )
      case 'REFUNDED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
            <RefreshCw size={11} /> Refunded
          </span>
        )
      case 'FAILED':
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
            <XCircle size={11} /> Failed
          </span>
        )
    }
  }

  const getRefundStatusBadge = (status: string) => {
    switch (status) {
      case 'REFUND_SUCCESS':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
            <CheckCircle2 size={11} /> Refund Successful
          </span>
        )
      case 'REFUND_PROCESSING':
      case 'REFUND_INITIATED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
            <RefreshCw size={11} className="animate-spin" /> Refund in Progress
          </span>
        )
      case 'REFUND_FAILED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
            <XCircle size={11} /> Refund Failed
          </span>
        )
      default:
        return null
    }
  }

  const faqs = [
    {
      q: 'My payment was debited but my order was not confirmed. What should I do?',
      a: 'If money was debited from your bank or Paytm wallet but your token was not issued, click "Check Status" above. Our backend will query Paytm in real time. If the gateway confirms payment, your food order token is issued instantly. If unconfirmed or out of stock, an automatic 100% refund is initiated.'
    },
    {
      q: 'How can I check my payment status?',
      a: 'Locate your transaction in the history list and click "Check Status". The system securely queries Paytm gateway servers directly and synchronizes your order and refund state.'
    },
    {
      q: 'How can I check my refund?',
      a: 'All initiated, processing, and completed refunds appear directly in your Payment & Refund History with their unique Refund Reference ID.'
    },
    {
      q: 'What if my refund is still not visible in my bank account?',
      a: 'Once Paytm marks a refund successful, bank settlement completes within 2–4 business hours for UPI and 1–3 business days for cards. If unresolved, present your Order ID and Paytm Reference at the canteen counter.'
    },
    {
      q: 'Can I receive a refund if the order cannot be fulfilled?',
      a: 'Yes. If your payment is received and the outlet cannot fulfill your order (due to kitchen closure or stock running out), a 100% full refund is automatically issued.'
    },
    {
      q: 'Will I be charged twice if I retry payment?',
      a: 'No. The system strictly verifies prior payment state before creating or confirming another payment attempt, preventing duplicate debits.'
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#0F172A', background: '#FFFFFF' }}>
      {/* ── Polished Modal Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: '#EFF6FF', color: '#2563EB', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Receipt size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0F172A', letterSpacing: '-0.2px' }}>
              Payments &amp; Refunds
            </h2>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0' }}>
              Real-time payment tracking, gateway status &amp; refund FAQs
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={loadPaymentsAndRefunds}
            disabled={loading}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: '#64748B',
              transition: 'background 0.15s ease'
            }}
            title="Refresh payment records"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: 'none',
                background: '#F1F5F9',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                color: '#64748B',
                transition: 'background 0.15s ease'
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Segmented Navigation Filter ── */}
      <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            flex: 1,
            padding: '7px 12px',
            borderRadius: '9px',
            border: 'none',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'all' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'all' ? '#0F172A' : '#64748B',
            boxShadow: activeTab === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          All Payments ({records.length})
        </button>

        <button
          onClick={() => setActiveTab('unresolved')}
          style={{
            flex: 1,
            padding: '7px 12px',
            borderRadius: '9px',
            border: 'none',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'unresolved' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'unresolved' ? '#0F172A' : '#64748B',
            boxShadow: activeTab === 'unresolved' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <span>Issues</span>
          {unresolvedRecords.length > 0 && (
            <span style={{ background: '#FEF3C7', color: '#B45309', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>
              {unresolvedRecords.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('faq')}
          style={{
            flex: 1,
            padding: '7px 12px',
            borderRadius: '9px',
            border: 'none',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'faq' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'faq' ? '#0F172A' : '#64748B',
            boxShadow: activeTab === 'faq' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          Help &amp; FAQs
        </button>
      </div>

      {/* ── Active Issues Banner (Prominently displayed) ── */}
      {unresolvedRecords.length > 0 && activeTab !== 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D97706', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <AlertCircle size={15} />
            <span>Active Issues Requiring Attention ({unresolvedRecords.length})</span>
          </div>

          {unresolvedRecords.map(item => {
            const isChecking = checkingOrderId === item.order_id
            const cooldownLeft = item.order_id ? cooldowns[item.order_id] || 0 : 0

            return (
              <div
                key={item.payment_id}
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 8px -2px rgba(245, 158, 11, 0.08)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#92400E' }}>
                        {item.order_id ? `Order #${item.order_id}` : `Payment #${item.payment_id}`}
                      </span>
                      {item.token && (
                        <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 7px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>
                          Token #{item.token}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#B45309', margin: '4px 0 0', lineHeight: 1.4 }}>
                      {item.next_action}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                      ₹{item.amount.toFixed(2)}
                    </div>
                    <div style={{ marginTop: '3px' }}>
                      {getPaymentStatusBadge(item.payment_status)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #FEF3C7', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '11.5px', color: '#92400E' }}>
                    {item.paytm_txn_ref && (
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>Ref: {item.paytm_txn_ref} · </span>
                    )}
                    <span>{new Date(item.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {item.order_id && (
                    <button
                      onClick={() => handleCheckStatus(item.order_id!)}
                      disabled={isChecking || cooldownLeft > 0}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '9px',
                        background: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: isChecking || cooldownLeft > 0 ? 'not-allowed' : 'pointer',
                        opacity: isChecking || cooldownLeft > 0 ? 0.6 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                      }}
                    >
                      <RefreshCw size={13} className={isChecking ? 'animate-spin' : ''} />
                      <span>{cooldownLeft > 0 ? `Wait ${cooldownLeft}s` : 'Verify Status'}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Transaction History (Shown in 'all' or 'unresolved' tab) ── */}
      {activeTab !== 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Clock size={14} />
              <span>{activeTab === 'unresolved' ? 'Unresolved Transactions' : 'Payment & Refund History'}</span>
            </div>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>
              {records.length} {records.length === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B', fontSize: '12.5px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563EB' }} />
              <div>Loading payment records from database...</div>
            </div>
          ) : (activeTab === 'unresolved' ? unresolvedRecords : records).length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', color: '#64748B' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#ECFDF5', color: '#10B981', display: 'grid', placeItems: 'center', margin: '0 auto 10px' }}>
                <ShieldCheck size={24} />
              </div>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>
                {activeTab === 'unresolved' ? 'No Active Payment Issues' : 'No Payment Records Found'}
              </div>
              <p style={{ margin: '6px auto 0', fontSize: '12px', maxWidth: '340px', color: '#64748B', lineHeight: 1.4 }}>
                {activeTab === 'unresolved'
                  ? 'All your past canteen transactions are fully confirmed or settled.'
                  : 'Your completed food orders, payment receipts and refund tracking will appear here.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
              {(activeTab === 'unresolved' ? unresolvedRecords : records).map(r => (
                <div
                  key={r.payment_id}
                  onClick={() => setSelectedRecord(r)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                        {r.order_id ? `Order #${r.order_id}` : `Txn #${r.payment_id}`}
                      </span>
                      {r.token && (
                        <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '1px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace' }}>
                          Token #{r.token}
                        </span>
                      )}
                      <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                        · {new Date(r.order_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      {getPaymentStatusBadge(r.payment_status)}
                      {getRefundStatusBadge(r.refund_status)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                        ₹{r.amount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {r.payment_method}
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: '#94A3B8' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Frequently Asked Questions (FAQ) ── */}
      {(activeTab === 'all' || activeTab === 'faq') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: activeTab === 'all' ? '12px' : '0', borderTop: activeTab === 'all' ? '1px solid #F1F5F9' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <HelpCircle size={14} />
            <span>Frequently Asked Questions &amp; Help</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx
              return (
                <div
                  key={idx}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    background: isOpen ? '#F8FAFC' : '#FFFFFF',
                    borderLeft: isOpen ? '3px solid #2563EB' : '1px solid #E2E8F0',
                    overflow: 'hidden',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', paddingRight: '12px', lineHeight: 1.4 }}>
                      {faq.q}
                    </span>
                    {isOpen ? <ChevronUp size={16} color="#2563EB" /> : <ChevronDown size={16} color="#64748B" />}
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 16px 14px', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Transaction Details Modal ── */}
      {selectedRecord && (
        <div
          className="ios-modal-overlay"
          style={{ zIndex: 10000 }}
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="payment-modal-card modal-enter"
            style={{ maxWidth: '460px', padding: '22px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', display: 'grid', placeItems: 'center' }}>
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                    {selectedRecord.order_id ? `Order #${selectedRecord.order_id}` : `Payment #${selectedRecord.payment_id}`}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748B' }}>
                    {new Date(selectedRecord.order_date).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
                <span style={{ color: '#64748B' }}>Amount Debited:</span>
                <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>₹{selectedRecord.amount.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
                <span style={{ color: '#64748B' }}>Payment Gateway:</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedRecord.payment_method}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
                <span style={{ color: '#64748B' }}>Payment Status:</span>
                <div>{getPaymentStatusBadge(selectedRecord.payment_status)}</div>
              </div>

              {selectedRecord.token && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
                  <span style={{ color: '#64748B' }}>Pickup Token:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1D4ED8' }}>Token #{selectedRecord.token}</span>
                </div>
              )}

              {selectedRecord.refund_status && selectedRecord.refund_status !== 'REFUND_NOT_REQUIRED' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
                  <span style={{ color: '#64748B' }}>Refund Status:</span>
                  <div>{getRefundStatusBadge(selectedRecord.refund_status)}</div>
                </div>
              )}

              {selectedRecord.paytm_txn_ref && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
                  <span style={{ color: '#64748B' }}>Paytm Txn Ref:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>{selectedRecord.paytm_txn_ref}</span>
                </div>
              )}

              {selectedRecord.refund_ref && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
                  <span style={{ color: '#64748B' }}>Refund Ref:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>{selectedRecord.refund_ref}</span>
                </div>
              )}

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginTop: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resolution &amp; Next Action:</div>
                <div style={{ fontSize: '12px', color: '#0F172A', marginTop: '4px', lineHeight: 1.4 }}>{selectedRecord.next_action}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              {selectedRecord.order_id && (
                <button
                  onClick={() => {
                    handleCheckStatus(selectedRecord.order_id!)
                    setSelectedRecord(null)
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                  }}
                >
                  Verify Status
                </button>
              )}
              <button
                onClick={() => setSelectedRecord(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  background: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentsAndRefundsTab
