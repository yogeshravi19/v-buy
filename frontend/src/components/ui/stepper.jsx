import React from 'react'
import { motion } from 'framer-motion'
import { Check, Clock3, UtensilsCrossed, Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'

const STEPS = [
  { key: 'placed', label: 'Placed', icon: Clock3 },
  { key: 'preparing', label: 'Preparing', icon: UtensilsCrossed },
  { key: 'ready', label: 'Ready for Pickup', icon: Sparkles },
  { key: 'collected', label: 'Collected', icon: Check },
]

export function OrderStepper({ status = 'placed', className }) {
  const currentIndex = STEPS.findIndex(s => s.key === (status || '').toLowerCase())
  const activeIdx = currentIndex === -1 ? 0 : currentIndex

  return (
    <div className={cn('w-full py-3', className)}>
      <div className="relative flex items-center justify-between">
        {/* Background connector track */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-[#E2E8F0] -z-0" />
        {/* Animated fill track */}
        <motion.div
          className="absolute top-4 left-6 h-0.5 bg-[#1E40AF] -z-0"
          initial={false}
          animate={{
            width: `${(activeIdx / (STEPS.length - 1)) * 100}%`,
          }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        />

        {STEPS.map((step, idx) => {
          const isDone = idx < activeIdx
          const isCurrent = idx === activeIdx
          const isReadyHighlight = isCurrent && step.key === 'ready'
          const StepIcon = step.icon

          return (
            <div key={step.key} className="flex flex-col items-center z-10">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.08 : 1,
                  backgroundColor: isDone || isCurrent ? (isReadyHighlight ? '#059669' : '#1E40AF') : '#FFFFFF',
                  borderColor: isDone || isCurrent ? (isReadyHighlight ? '#059669' : '#1E40AF') : '#CBD5E1',
                  color: isDone || isCurrent ? '#FFFFFF' : '#94A3B8',
                }}
                transition={{ duration: 0.25 }}
                className={cn(
                  'w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-sm',
                  isReadyHighlight && 'ring-4 ring-emerald-100 ring-offset-1'
                )}
              >
                {isDone ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : (
                  <StepIcon size={14} strokeWidth={2} />
                )}
              </motion.div>
              <span
                className={cn(
                  'mt-2 text-[11px] font-semibold text-center whitespace-nowrap transition-colors',
                  isCurrent ? (isReadyHighlight ? 'text-[#059669] font-bold' : 'text-[#1E40AF] font-bold') : isDone ? 'text-[#0F172A]' : 'text-[#94A3B8]'
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
