import React from 'react'
import {
  ShieldCheck, Split, Database, Lock, RefreshCw,
  CheckCircle2, Building2, Store, CreditCard, Wallet,
  FileText, ShieldAlert, Cpu, ArrowRight
} from 'lucide-react'

export const PaymentArchitectureSwitcher: React.FC = () => {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden space-y-12">
      {/* ─── SECTION HEADER ──────────────────────────────────────────────── */}
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-800" />
          <span>PAYMENT INFRASTRUCTURE &amp; BACKEND SETTLEMENT</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          How Payments, Splits, and Data Work in V Foods
        </h3>
        <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed">
          A transparent look at server-authoritative payment verification, automated three-way revenue distribution, and data privacy boundaries across the platform.
        </p>
      </div>

      {/* ─── PART A: HOW PAYMENT CONFIRMATION WORKS ─────────────────────── */}
      <div className="space-y-6 pt-2 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-[11px] font-extrabold">A</span>
              <span>Part A &mdash; How Payment Confirmation Works</span>
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-slate-900">
              Server-Authoritative Confirmation Logic
            </h4>
          </div>
          <span className="text-xs text-slate-600">Zero trust in client-side state</span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* A.1 */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 flex items-center justify-center mb-3">
                <Cpu className="w-4 h-4" />
              </div>
              <h5 className="text-sm font-bold text-slate-900 mb-1.5">
                Client Shows Processing Only
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                The app on the user&apos;s phone never decides a payment succeeded. It only displays &quot;processing&quot; while awaiting server confirmation.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-200/80 text-[11px] font-semibold text-slate-600">
              No client-side triggers
            </div>
          </div>

          {/* A.2 */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 flex items-center justify-center mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h5 className="text-sm font-bold text-slate-900 mb-1.5">
                Cryptographic Webhook Message
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                When someone pays through Paytm, Paytm sends V Foods&apos; server a signed message confirming the result. Only that signed message, verified on the server, is trusted &mdash; never browser claims.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-200/80 text-[11px] font-semibold text-slate-600">
              HMAC-SHA256 signature
            </div>
          </div>

          {/* A.3 */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 flex items-center justify-center mb-3">
                <RefreshCw className="w-4 h-4" />
              </div>
              <h5 className="text-sm font-bold text-slate-900 mb-1.5">
                Connection Drop Resilience
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                If a user closes the app right after paying, or their mobile connection drops, this does not matter &mdash; the confirmation still reaches the server and the payment is recorded correctly.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-200/80 text-[11px] font-semibold text-slate-600">
              Direct server-to-server delivery
            </div>
          </div>

          {/* A.4 */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 flex items-center justify-center mb-3">
                <Lock className="w-4 h-4" />
              </div>
              <h5 className="text-sm font-bold text-slate-900 mb-1.5">
                Idempotency on Repeated Retries
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                If Paytm&apos;s confirmation message happens to arrive more than once due to network retries, the system recognizes the repeat and ignores it, so no one is ever charged or credited twice by accident.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-200/80 text-[11px] font-semibold text-slate-600">
              Locked transaction reference
            </div>
          </div>
        </div>
      </div>

      {/* ─── PART B: HOW PAYMENTS ARE SPLIT ─────────────────────────────── */}
      <div className="space-y-6 pt-8 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-extrabold">B</span>
              <span>Part B &mdash; How Payments Are Split</span>
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-slate-900">
              Automated Three-Way Revenue Distribution
            </h4>
          </div>
          <span className="text-xs text-slate-600">Calculated on every order</span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* B.1 */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                <Split className="w-4 h-4" />
              </div>
              <h5 className="text-sm font-bold text-slate-900 mb-1.5">
                Three Real Recipients
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                When a user pays for an order, that single payment is automatically divided three ways the moment it is confirmed: a share to the shop that made the food, a share to V Foods, and a share to the college.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-emerald-200/80 text-[11px] font-semibold text-emerald-800">
              Shop, Platform, College
            </div>
          </div>

          {/* B.2 */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                <Cpu className="w-4 h-4" />
              </div>
              <h5 className="text-sm font-bold text-slate-900 mb-1.5">
                System-Calculated Every Time
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                This split happens the same way every time, calculated directly by the system &mdash; never worked out by hand, never adjustable after the fact by guesswork.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-emerald-200/80 text-[11px] font-semibold text-emerald-800">
              Zero manual adjustments
            </div>
          </div>

          {/* B.3 */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                <Store className="w-4 h-4" />
              </div>
              <h5 className="text-sm font-bold text-slate-900 mb-1.5">
                Configurable Per Shop
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Each shop&apos;s share can be set individually per shop, while V Foods&apos; and the college&apos;s shares stay consistent across every order on this campus.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-emerald-200/80 text-[11px] font-semibold text-emerald-800">
              Fixed platform and campus rates
            </div>
          </div>

          {/* B.4 */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                <Wallet className="w-4 h-4" />
              </div>
              <h5 className="text-sm font-bold text-slate-900 mb-1.5">
                Top-Ups Are Never Split
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                A wallet top-up is never split &mdash; adding money to a personal wallet only ever adds to that one wallet. The split only happens later, when that money is actually used to pay for food.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-emerald-200/80 text-[11px] font-semibold text-emerald-800">
              Split triggered upon order
            </div>
          </div>
        </div>
      </div>

      {/* ─── PART C: WHAT GETS STORED ───────────────────────────────────── */}
      <div className="space-y-6 pt-8 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-900 flex items-center justify-center text-[11px] font-extrabold">C</span>
              <span>Part C &mdash; What Gets Stored</span>
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-slate-900">
              Data Storage &amp; Privacy Boundaries
            </h4>
          </div>
          <span className="text-xs text-slate-600">Minimal required footprint</span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* C.1 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
              <Database className="w-4 h-4" />
            </div>
            <h5 className="text-sm font-bold text-slate-900 mb-1.5">For a User</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Their account details, their wallet balance, and a history of their own orders and payments &mdash; nothing more than what is needed to run the app.
            </p>
          </div>

          {/* C.2 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
              <FileText className="w-4 h-4" />
            </div>
            <h5 className="text-sm font-bold text-slate-900 mb-1.5">For an Order</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              What was ordered, from which shop, the amount, which payment method was used, its current status (placed, preparing, ready, collected), and the payment record that funded it.
            </p>
          </div>

          {/* C.3 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
              <CreditCard className="w-4 h-4" />
            </div>
            <h5 className="text-sm font-bold text-slate-900 mb-1.5">For a Payment</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              One record per transaction, tagged as either a wallet top-up or a direct order payment, with its outcome and payment method type &mdash; never raw card or bank details, only the method category (UPI, card, etc.).
            </p>
          </div>

          {/* C.4 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
              <Split className="w-4 h-4" />
            </div>
            <h5 className="text-sm font-bold text-slate-900 mb-1.5">For a Split</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Its own clear record of exactly how much went to the shop, to V Foods, and to the college for that specific payment, so every split is traceable.
            </p>
          </div>

          {/* C.5 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
              <Store className="w-4 h-4" />
            </div>
            <h5 className="text-sm font-bold text-slate-900 mb-1.5">Outlet Isolation</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Each shop only ever sees its own orders, its own numbers, and its own share &mdash; never another shop&apos;s data. This is enforced by the system itself, not just hidden on screen.
            </p>
          </div>

          {/* C.6 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
              <Lock className="w-4 h-4" />
            </div>
            <h5 className="text-sm font-bold text-slate-900 mb-1.5">Excluded Sensitive Data</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Card numbers, CVVs, UPI PINs, and bank passwords are never stored by V Foods anywhere, at any point &mdash; that stays with Paytm, which exists specifically to handle it securely.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
