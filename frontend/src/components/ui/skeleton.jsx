import React from 'react'
import { cn } from '../../lib/utils'

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-[10px] bg-[#E2E8F0]/80', className)}
      {...props}
    />
  )
}

export function MenuCardSkeleton() {
  return (
    <div className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 space-y-3 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.06)]">
      <Skeleton className="h-32 w-full rounded-[14px]" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-20 rounded-[10px]" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ columns = 5 }) {
  return (
    <tr className="border-b border-[#F1F5F9] animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3.5">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}
