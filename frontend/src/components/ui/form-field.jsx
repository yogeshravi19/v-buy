import React from 'react'
import { cn } from '../../lib/utils'

export function FormField({ label, error, required, children, className, hint }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-xs font-bold text-[#334155] uppercase tracking-wider">
          {label}
          {required && <span className="text-[#DC2626] ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-[11px] text-[#64748B]">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] font-semibold text-[#DC2626]">{error}</p>
      )}
    </div>
  )
}
