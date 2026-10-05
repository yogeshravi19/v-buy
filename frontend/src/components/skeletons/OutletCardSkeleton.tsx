import React from 'react'

export const OutletCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
        <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full w-16" />
      </div>
      <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/3" />
      <div className="flex items-center gap-2 pt-2">
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-24" />
      </div>
    </div>
  )
}

export default OutletCardSkeleton
