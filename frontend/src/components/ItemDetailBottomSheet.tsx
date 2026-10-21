import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, Clock, Flame, ShieldCheck, ShoppingBag, UtensilsCrossed, AlertTriangle } from 'lucide-react'
import { VegIndicator } from './VegIndicator'
import { getFoodImage } from '../lib/foodImages'
import { triggerHaptic } from '../hooks/useWebHaptics'

export interface ItemDetailBottomSheetProps {
  item: any | null
  outlet: any | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (item: any, qty: number) => void
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  onClose?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ItemDetailErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ItemDetailBottomSheet caught render error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] p-6 text-center shadow-2xl">
            <AlertTriangle size={36} className="text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to display item details</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">A temporary display error occurred for this item.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false })
                if (this.props.onClose) this.props.onClose()
              }}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const ItemDetailContent: React.FC<ItemDetailBottomSheetProps> = ({
  item,
  outlet,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [qty, setQty] = useState(1)
  const [imgError, setImgError] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Reset qty & image error on item change
  useEffect(() => {
    setQty(1)
    setImgError(false)
  }, [item?.id])

  // Lock background scroll when open
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  // Handle Escape key and mobile back button
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    // Push history state to capture back button
    window.history.pushState({ itemModalOpen: true }, '')
    const handlePopState = () => {
      onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isOpen, onClose])

  // Trap focus inside modal
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return
    const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length > 0) {
      focusable[0].focus()
    }
  }, [isOpen])

  if (!item) return null

  // Availability Window computation
  const isWithinWindow = (() => {
    if (!item.available_from && !item.available_to) return true
    const now = new Date()
    const currentMin = now.getHours() * 60 + now.getMinutes()
    if (item.available_from) {
      const [h, m] = item.available_from.split(':').map(Number)
      if (currentMin < h * 60 + m) return false
    }
    if (item.available_to) {
      const [h, m] = item.available_to.split(':').map(Number)
      if (currentMin > h * 60 + m) return false
    }
    return true
  })()

  const isSoldOut = item.stock_qty !== undefined && item.stock_qty !== null && item.stock_qty <= 0
  const isArchived = Boolean(item.is_archived)
  const isAvailable = item.available !== false && !isSoldOut && isWithinWindow && !isArchived

  const rawImageUrl = item.image_url || getFoodImage(item.name, item.category).url
  const itemName = item.name || 'Menu Item'
  const firstLetter = itemName.charAt(0).toUpperCase()

  const handleIncrement = () => {
    triggerHaptic('light')
    setQty(prev => prev + 1)
  }

  const handleDecrement = () => {
    triggerHaptic('light')
    setQty(prev => Math.max(1, prev - 1))
  }

  const handleAdd = () => {
    triggerHaptic('success')
    onAddToCart(item, qty)
    setQty(1)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="item-detail-sheet fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Drawer / Modal Panel */}
          <motion.div
            ref={drawerRef}
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[28px] shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 overflow-hidden relative z-10 flex flex-col max-h-[90vh] sm:max-h-[85vh] my-0 sm:my-auto"
          >
            {/* Grab Handle (mobile only) */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close item details"
              className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-full z-20 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Image Header or Fallback Tile */}
            <div className="relative h-48 sm:h-56 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
              {rawImageUrl && !imgError ? (
                <img
                  src={rawImageUrl}
                  alt={itemName}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-700 to-indigo-900 flex flex-col items-center justify-center text-white">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-3xl font-black mb-1 border border-white/20">
                    {firstLetter}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-blue-200 font-medium">
                    <UtensilsCrossed size={13} />
                    <span>V Foods Catalog</span>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <VegIndicator isVeg={item.is_veg} size={18} />
                <span className="text-white text-xs font-bold uppercase tracking-wider bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                  {item.category || 'Special'}
                </span>
                {isSoldOut && (
                  <span className="text-amber-300 text-xs font-bold uppercase tracking-wider bg-amber-950/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/30">
                    Sold Out
                  </span>
                )}
                {!isWithinWindow && (
                  <span className="text-orange-300 text-xs font-bold tracking-wider bg-orange-950/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-orange-500/30">
                    Time Window {item.available_from} - {item.available_to}
                  </span>
                )}
              </div>
            </div>

            {/* Content Details */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                    {itemName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Served hot at {outlet?.name || 'Campus Canteen'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    ₹{item.price || 0}
                  </span>
                </div>
              </div>

              {/* Quick Info Badges */}
              <div className="flex items-center flex-wrap gap-2 pt-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                  <Clock size={14} className="text-blue-500" />
                  <span>5-8 mins prep</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>Fresh daily</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                  <Flame size={14} className="text-amber-500" />
                  <span>Freshly made</span>
                </div>
              </div>

              {item.description ? (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                  {item.description}
                </p>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic pt-1">
                  Prepared with fresh ingredients to order at the counter.
                </p>
              )}

              {/* Availability Notice */}
              {!isAvailable && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Clock size={15} className="shrink-0 text-amber-600" />
                  <span>
                    {isSoldOut
                      ? 'This item is currently sold out for the day.'
                      : !isWithinWindow
                      ? `This item is available only between ${item.available_from} and ${item.available_to}.`
                      : 'This item is currently unavailable from the kitchen.'}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4">
              {/* Stepper */}
              <div className="flex items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl p-1 shrink-0 shadow-sm">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Minus size={15} />
                </button>
                <span className="w-8 text-center text-sm font-extrabold text-slate-900 dark:text-white">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  aria-label="Increase quantity"
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                onClick={handleAdd}
                disabled={!isAvailable}
                className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-2xl font-bold text-sm flex items-center justify-between shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} />
                  <span>{isAvailable ? 'Add to Tray' : isSoldOut ? 'Sold Out' : 'Unavailable'}</span>
                </div>
                {isAvailable && <span>₹{(item.price || 0) * qty}</span>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export const ItemDetailBottomSheet: React.FC<ItemDetailBottomSheetProps> = (props) => {
  return (
    <ItemDetailErrorBoundary onClose={props.onClose}>
      <ItemDetailContent {...props} />
    </ItemDetailErrorBoundary>
  )
}

export default ItemDetailBottomSheet
