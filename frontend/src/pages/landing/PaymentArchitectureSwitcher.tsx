import React, { useState } from 'react'
import {
  CreditCard, Wallet, ArrowRight, ShieldCheck, RefreshCw,
  CheckCircle2, AlertTriangle, Zap, Building, Lock, Check
} from 'lucide-react'

export const PaymentArchitectureSwitcher: React.FC = () => {
  const [phase, setPhase] = useState<'phase1' | 'phase2'>('phase1')

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl shadow-slate-200/50 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-6 border-b border-slate-100 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 mb-3">
            <CreditCard className="w-3.5 h-3.5" />
            <span>FINANCIAL INFRASTRUCTURE</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Designed for Campus High-Volume Split Settlement
          </h3>
          <p className="text-slate-600 text-sm mt-1 max-w-xl">
            Comparing how money flows between student bank accounts, canteen vendors, and the university.
          </p>
        </div>

        {/* Phase Toggle Tabs */}
        <div className="flex rounded-2xl bg-slate-100 p-1.5 border border-slate-200 shrink-0">
          <button
            onClick={() => setPhase('phase1')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              phase === 'phase1'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-orange-600" />
            <span>Phase 1: Campus Wallet (Current)</span>
          </button>
          <button
            onClick={() => setPhase('phase2')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              phase === 'phase2'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>Phase 2: Gateway Split (Scale)</span>
          </button>
        </div>
      </div>

      {/* PHASE 1: PREPAID CAMPUS WALLET */}
      {phase === 'phase1' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Step Flow Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 relative">
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block mb-1">Step 1</span>
              <h5 className="text-sm font-bold text-slate-900 mb-2">Student Top-Up</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                User loads ₹200–₹1000 via PhonePe UPI. 0% transaction fee for UPI and RuPay transfers.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 relative">
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block mb-1">Step 2</span>
              <h5 className="text-sm font-bold text-slate-900 mb-2">Ledger Reservation</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Wallet balance is securely reserved with atomic Postgres transactions and idempotency keys.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 relative">
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block mb-1">Step 3</span>
              <h5 className="text-sm font-bold text-slate-900 mb-2">Zero-Latency Checkout</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Orders process in &lt;100ms. No bank gateway timeouts or 2-factor delays while rushing between lectures.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 relative">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Step 4</span>
              <h5 className="text-sm font-bold text-slate-900 mb-2">Daily Vendor Payout</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated end-of-day bank transfer: 95% net revenue directly to Canteen Owner, 5% platform fee retained.
              </p>
            </div>
          </div>

          {/* Pros & Trade-offs comparison */}
          <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
              <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Why Campus Wallet Wins for Speed</span>
              </h5>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>99.98% checkout success rate:</strong> Unaffected by campus 4G cell tower congestion.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>1-tap re-orders:</strong> Eliminates entering UPI PIN 3 times a day for small snacks.</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200">
              <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Escrow Safeguards</span>
              </h5>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span><strong>Instant refunds:</strong> If a dish sells out, funds return to the wallet in under 1 second.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span><strong>Zero overdraft:</strong> Wallet accounts cannot run negative or accrue hidden interest fees.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2: GATEWAY SPLIT SETTLEMENT */}
      {phase === 'phase2' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs mb-3">
                01
              </div>
              <h5 className="text-sm font-bold text-slate-900 mb-2">Direct UPI App Intent</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Students pay exact order amounts (e.g. ₹65) directly through Google Pay, PhonePe, or Paytm at checkout without pre-loading a wallet.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs mb-3">
                02
              </div>
              <h5 className="text-sm font-bold text-slate-900 mb-2">Real-Time Split Routing</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Payment gateway API automatically bifurcates payment: 95% transfers to vendor sub-account, 5% routes to platform fees.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs mb-3">
                03
              </div>
              <h5 className="text-sm font-bold text-slate-900 mb-2">Auto Webhook Verification</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cryptographically signed HMAC webhooks confirm payment and fire KDS ticket in real time even on flaky Wi-Fi.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>Designed for enterprise scaling across Riviera &amp; Gravitas inter-college fests.</span>
            <span className="text-emerald-700 font-bold">Automated GST &amp; TDS Invoicing</span>
          </div>
        </div>
      )}
    </div>
  )
}
