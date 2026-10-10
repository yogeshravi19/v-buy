import React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import { lightHaptic } from '../../lib/haptics'

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary: 'bg-[#1E40AF] hover:bg-[#1D4ED8] active:bg-[#0B192C] text-white shadow-sm',
        secondary: 'bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] shadow-sm',
        outline: 'border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#334155]',
        ghost: 'hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A]',
        danger: 'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm',
        emerald: 'bg-[#059669] hover:bg-[#047857] text-white shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-[10px] gap-1.5',
        md: 'h-10 px-4 text-sm rounded-[11px] gap-2',
        lg: 'h-12 px-6 text-base rounded-[12px] gap-2.5',
        icon: 'h-9 w-9 rounded-[10px] p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export const Button = React.forwardRef(({ className, variant, size, onClick, children, ...props }, ref) => {
  const handleClick = (e) => {
    lightHaptic()
    if (onClick) onClick(e)
  }

  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
})
Button.displayName = 'Button'
