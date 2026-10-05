import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, Clock, Flame, ShieldCheck, ShoppingBag } from 'lucide-react'
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

export const ItemDetailBottomSheet: React.FC<ItemDetailBottomSheetProps> = ({
  item,
  outlet,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [qty, setQty] = useState(1)

  if (!item) return null

  const imageUrl = item.image_url || getFoodImage(item.name)
  const isAvailable = item.available !== false && (item.stock_qty === undefined || item.stock_qty > 0)

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
        <div className="fixed inset-0 z-[9999] flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl border-t border-slate-200 dark:border-slate-800 overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 rounded-full z-20"
            >
              <X size={18} />
            </button>

            {/* Image Header */}
            <div className="relative h-48 sm:h-56 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <img
                src={imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <VegIndicator isVeg={item.is_veg} size={18} />
                <span className="text-white text-xs font-bold uppercase tracking-wider bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full">
                  {item.category || 'Kitchen Special'}
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Served hot at {outlet?.name || 'Campus Canteen'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    ₹{item.price}
                  </span>
                </div>
              </div>

              {/* Quick Info Badges */}
              <div className="flex items-center gap-3 pt-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                  <Clock size={14} className="text-blue-500" />
                  <span>5-8 mins prep</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>Fresh daily</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                  <Flame size={14} className="text-amber-500" />
                  <span>~240 kcal</span>
                </div>
              </div>

              {item.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                  {item.description}
                </p>
              )}
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4">
              {/* Stepper */}
              <div className="flex items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl p-1 shrink-0 shadow-sm">
                <button
                  onClick={handleDecrement}
                  disabled={qty <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Minus size={15} />
                </button>
                <span className="w-8 text-center text-sm font-extrabold text-slate-900 dark:text-white">
                  {qty}
                </span>
                <button
                  onClick={handleIncrement}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAdd}
                disabled={!isAvailable}
                className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-2xl font-bold text-sm flex items-center justify-between shadow-lg shadow-blue-600/20 transition-all"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} />
                  <span>{isAvailable ? 'Add to Tray' : 'Currently 86 (Out of Stock)'}</span>
                </div>
                {isAvailable && <span>₹{item.price * qty}</span>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default ItemDetailBottomSheet
