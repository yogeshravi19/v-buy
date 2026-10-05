import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChefHat, Bell, CheckCircle2, QrCode, Sparkles } from 'lucide-react'
import { triggerHaptic } from '../hooks/useWebHaptics'

export interface LiveOrderTrackerProps {
  order: {
    id: number | string
    token: string
    status: 'placed' | 'preparing' | 'ready' | 'collected' | 'cancelled'
    total: number
    outlet_name?: string
    created_at?: string
    items?: Array<{ name: string; qty: number }>
  }
  onShowQr?: () => void
}

const STEPS = [
  { key: 'placed', label: 'Order Placed', icon: Clock, desc: 'Sent to Kitchen' },
  { key: 'preparing', label: 'Cooking & Prep', icon: ChefHat, desc: 'Hot & Fresh' },
  { key: 'ready', label: 'Ready at Counter', icon: Bell, desc: 'Call Token Pass' },
  { key: 'collected', label: 'Collected', icon: CheckCircle2, desc: 'Enjoy your meal!' },
]

export const LiveOrderTracker: React.FC<LiveOrderTrackerProps> = ({ order, onShowQr }) => {
  const currentStepIdx = Math.max(0, STEPS.findIndex(s => s.key === order.status))
  const isReady = order.status === 'ready'
  const isCollected = order.status === 'collected'

  // Trigger tactile vibration when order becomes ready
  useEffect(() => {
    if (order.status === 'ready') {
      triggerHaptic('ready')
    }
  }, [order.status])

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden transition-all">
      {/* Background Ambience Glow for Ready Status */}
      <AnimatePresence>
        {isReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Header with Token & Status */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Live Campus Dining Tracker
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              TOKEN #{order.token}
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              #{order.id}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {order.outlet_name || 'Campus Canteen'}
          </p>
        </div>

        {/* QR Pass Trigger Button */}
        {onShowQr && !isCollected && (
          <button
            onClick={() => {
              triggerHaptic('tap')
              onShowQr()
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-2xl text-xs font-bold transition-all border border-blue-200/60 dark:border-blue-800 shadow-sm"
          >
            <QrCode size={16} />
            <span>Pass QR</span>
          </button>
        )}
      </div>

      {/* Step Timeline */}
      <div className="relative z-10 pt-2 pb-1">
        <div className="grid grid-cols-4 gap-2 relative">
          {/* Progress Connecting Line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-100 dark:bg-slate-800 -z-0">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStepIdx / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIdx
            const isCurrent = idx === currentStepIdx
            const Icon = step.icon

            let colorClasses = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
            if (isCompleted) {
              colorClasses = 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
            } else if (isCurrent) {
              if (step.key === 'ready') {
                colorClasses = 'bg-emerald-500 text-white border-emerald-400 ring-4 ring-emerald-100 dark:ring-emerald-950/50 shadow-md'
              } else if (step.key === 'preparing') {
                colorClasses = 'bg-amber-500 text-white border-amber-400 ring-4 ring-amber-100 dark:ring-amber-950/50 shadow-md'
              } else {
                colorClasses = 'bg-blue-600 text-white border-blue-500 ring-4 ring-blue-100 dark:ring-blue-950/50 shadow-md'
              }
            }

            return (
              <div key={step.key} className="flex flex-col items-center text-center relative z-10">
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${colorClasses}`}
                  animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Icon size={14} className={isCurrent ? 'stroke-[2.5]' : ''} />
                </motion.div>
                <span className={`text-[10px] font-bold mt-2 leading-tight ${isCurrent ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dynamic Status Callout Banner */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs relative z-10">
        <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
          {isReady ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <Sparkles size={14} className="animate-spin text-emerald-500" />
              HOT & READY! Please collect at counter
            </span>
          ) : order.status === 'preparing' ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Chef is preparing your order fresh
            </span>
          ) : (
            <span className="text-slate-500">Waiting for kitchen acceptance</span>
          )}
        </div>

        <span className="font-bold text-slate-900 dark:text-white">
          ₹{order.total}
        </span>
      </div>
    </div>
  )
}

export default LiveOrderTracker
