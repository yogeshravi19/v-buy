import React from 'react'
import { cn } from '../../lib/utils'

export const Input = React.forwardRef(({ className, type = 'text', error, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] transition-colors focus-visible:outline-none focus-visible:border-[#1E40AF] focus-visible:ring-2 focus-visible:ring-[#1E40AF]/20 disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-[#DC2626] focus-visible:border-[#DC2626] focus-visible:ring-[#DC2626]/20',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'
