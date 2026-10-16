import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './button'

export function ErrorState({
  title = 'Something went wrong',
  description = 'Unable to load data. Please check your connection and try again.',
  onRetry,
  className
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-8 py-10 rounded-[18px] border border-[#FECACA] bg-[#FEF2F2]', className)}>
      <div className="w-12 h-12 rounded-full bg-white border border-[#FCA5A5] flex items-center justify-center text-[#DC2626] mb-3.5 shadow-sm">
        <AlertCircle size={22} strokeWidth={1.75} />
      </div>
      <h4 className="text-sm font-bold text-[#991B1B] mb-1">{title}</h4>
      <p className="text-xs text-[#B91C1C] max-w-xs leading-relaxed mb-4">{description}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry} className="gap-1.5">
          <RefreshCw size={14} />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  )
}
