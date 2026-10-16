import React from 'react'
import { cn } from '../../lib/utils'

export function PageHeader({ title, description, badge, actions, className }) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-6 border-b border-[#E2E8F0]', className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-[#475569] max-w-2xl">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  )
}
