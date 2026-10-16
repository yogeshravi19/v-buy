import React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors border',
  {
    variants: {
      variant: {
        default: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
        blue: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
        emerald: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
        amber: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
        danger: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]',
        slate: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
        outline: 'text-[#0F172A] border-[#CBD5E1] bg-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export function Badge({ className, variant, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  )
}
