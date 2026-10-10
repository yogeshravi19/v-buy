import React from 'react'
import { cn } from '../../lib/utils'

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-8 py-12 rounded-[18px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC]', className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#1E40AF] mb-3.5">
          <Icon size={22} strokeWidth={1.75} />
        </div>
      )}
      {title && <h4 className="text-sm font-bold text-[#0F172A] mb-1">{title}</h4>}
      {description && <p className="text-xs text-[#64748B] max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
