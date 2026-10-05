import React from 'react'

export const MenuCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm animate-pulse flex flex-col justify-between h-[210px]">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 space-y-2">
            {/* Veg Badge Skeleton */}
            <div className="w-4 h-4 rounded-sm bg-slate-200 dark:bg-slate-800" />
            {/* Title Skeleton */}
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
            {/* Category / Subtitle Skeleton */}
            <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/2" />
          </div>
          {/* Image Thumbnail Skeleton */}
          <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800/60">
        {/* Price Skeleton */}
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-14" />
        {/* Add Button Skeleton */}
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-full w-20" />
      </div>
    </div>
  )
}

export const MenuGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, idx) => (
        <MenuCardSkeleton key={idx} />
      ))}
    </div>
  )
}

export default MenuCardSkeleton
