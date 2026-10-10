import React from 'react'
import { cn } from '../../lib/utils'

const STATUS_CONFIGS = {
  placed: {
    label: 'Placed',
    className: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  },
  preparing: {
    label: 'Preparing',
    className: 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]',
  },
  ready: {
    label: 'Ready for Pickup',
    className: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]',
  },
  collected: {
    label: 'Collected',
    className: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
  },
  available: {
    label: 'Available',
    className: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]',
  },
  unavailable: {
    label: 'Sold Out',
    className: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
  },
  kitchen_unavailable: {
    label: 'Unavailable',
    className: 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]',
  },
}

export function StatusBadge({ status, label, className }) {
  const norm = (status || '').toLowerCase().replace(/[\s-]/g, '_')
  const config = STATUS_CONFIGS[norm] || {
    label: label || status || 'Unknown',
    className: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border',
        config.className,
        className
      )}
    >
      {label || config.label}
    </span>
  )
}
