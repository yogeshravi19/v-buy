import React from 'react'
import { Skeleton } from './skeleton'

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 max-w-6xl mx-auto space-y-4 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 bg-white rounded-[18px] border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded-[11px]" />
      </div>

      {/* Hero skeleton */}
      <div className="p-6 bg-white rounded-[18px] border border-[#E2E8F0] space-y-3 shadow-sm">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Grid cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 bg-white rounded-[18px] border border-[#E2E8F0] space-y-3 shadow-sm">
            <Skeleton className="h-32 w-full rounded-[14px]" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
