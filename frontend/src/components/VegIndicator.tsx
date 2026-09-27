import React from 'react'

export interface VegIndicatorProps {
  isVeg?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showLabel?: boolean
  labelText?: string
  className?: string
}

/**
 * Standard Indian FSSAI Veg / Non-Veg Indicator
 * Green square with filled circle for Vegetarian
 * Brown/Red square with filled triangle/circle for Non-Vegetarian
 */
export const VegIndicator: React.FC<VegIndicatorProps> = ({
  isVeg = true,
  size = 'sm',
  showLabel = false,
  labelText,
  className = ''
}) => {
  const sizeMap = {
    xs: { box: 'w-3 h-3', symbol: 'w-1.5 h-1.5', text: 'text-[10px]' },
    sm: { box: 'w-3.5 h-3.5', symbol: 'w-1.5 h-1.5', text: 'text-xs' },
    md: { box: 'w-4 h-4', symbol: 'w-2 h-2', text: 'text-xs' },
    lg: { box: 'w-5 h-5', symbol: 'w-2.5 h-2.5', text: 'text-sm' },
  }

  const dim = sizeMap[size] || sizeMap.sm
  const isVegetarian = Boolean(isVeg)
  const defaultLabel = isVegetarian ? 'Pure Veg' : 'Non-Veg'
  const displayLabel = labelText || defaultLabel

  return (
    <span
      className={`inline-flex items-center gap-1.5 select-none ${className}`}
      title={isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}
      role="img"
      aria-label={isVegetarian ? 'Vegetarian dish' : 'Non-Vegetarian dish'}
    >
      <span
        className={`${dim.box} border rounded-sm flex items-center justify-center flex-shrink-0 transition-colors ${
          isVegetarian
            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
            : 'border-rose-600 bg-rose-50 dark:bg-rose-950/30'
        }`}
        style={{ borderWidth: '1.5px' }}
      >
        <span
          className={`${dim.symbol} rounded-full flex-shrink-0 ${
            isVegetarian ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        />
      </span>
      {showLabel && (
        <span
          className={`font-semibold tracking-wide ${dim.text} ${
            isVegetarian ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {displayLabel}
        </span>
      )}
    </span>
  )
}

export default VegIndicator
