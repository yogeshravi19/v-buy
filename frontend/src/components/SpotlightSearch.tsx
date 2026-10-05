import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Utensils, Plus, Check, MapPin, Sparkles } from 'lucide-react'
import { VegIndicator } from './VegIndicator'
import { triggerHaptic } from '../hooks/useWebHaptics'

export interface SpotlightSearchProps {
  isOpen: boolean
  onClose: () => void
  outlets: any[]
  onAddToCart?: (item: any, outlet: any) => void
}

export const SpotlightSearch: React.FC<SpotlightSearchProps> = ({
  isOpen,
  onClose,
  outlets,
  onAddToCart,
}) => {
  const [query, setQuery] = useState('')
  const [vegOnly, setVegOnly] = useState(false)
  const [addedItemIds, setAddedItemIds] = useState<Set<number>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input automatically on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setVegOnly(false)
    }
  }, [isOpen])

  // Handle hotkey Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else {
          // Open signal can be handled by parent
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Aggregate all dishes across all 13 outlets
  const allDishes = useMemo(() => {
    const dishes: Array<{ item: any; outlet: any }> = []
    outlets.forEach(outlet => {
      (outlet.menu_items || []).forEach((item: any) => {
        dishes.push({ item, outlet })
      })
    })
    return dishes
  }, [outlets])

  // Fuzzy filter
  const filteredDishes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allDishes.filter(({ item }) => {
      if (vegOnly && !item.is_veg) return false
      if (!q) return true
      const matchesName = (item.name || '').toLowerCase().includes(q)
      const matchesCategory = (item.category || '').toLowerCase().includes(q)
      return matchesName || matchesCategory
    }).slice(0, 15) // Limit to top 15 results for performance
  }, [allDishes, query, vegOnly])

  const handleAdd = (item: any, outlet: any) => {
    triggerHaptic('tap')
    if (onAddToCart) onAddToCart(item, outlet)
    setAddedItemIds(prev => new Set(prev).add(item.id))
    setTimeout(() => {
      setAddedItemIds(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }, 1500)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-14 sm:pt-20 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative z-10 flex flex-col max-h-[80vh]"
          >
            {/* Search Input Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <Search size={20} className="text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search Dosa, Cold Coffee, Veg Puff across 13 canteens..."
                className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-base font-semibold focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X size={16} />
                </button>
              )}
              <kbd className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md border border-slate-200 dark:border-slate-700">
                ESC
              </kbd>
            </div>

            {/* Quick Filter Tags */}
            <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all border ${
                  vegOnly
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Veg Only
              </button>
              <span className="text-[11px] text-slate-400 ml-auto font-medium">
                {filteredDishes.length} matches
              </span>
            </div>

            {/* Results Scroll Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-50 dark:divide-slate-800/50">
              {filteredDishes.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Utensils size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-bold">No matching dishes found</p>
                  <p className="text-xs text-slate-500 mt-1">Try searching for generic terms like &quot;juice&quot; or &quot;noodles&quot;</p>
                </div>
              ) : (
                filteredDishes.map(({ item, outlet }) => {
                  const isAdded = addedItemIds.has(item.id)
                  const isAvailable = item.available !== false && (item.stock_qty === undefined || item.stock_qty > 0)

                  return (
                    <div
                      key={`${outlet.id}-${item.id}`}
                      className="p-3 rounded-2xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <VegIndicator isVeg={item.is_veg} size={15} />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-extrabold text-blue-600 dark:text-blue-400">₹{item.price}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 truncate">
                              <MapPin size={11} className="text-slate-400 shrink-0" />
                              {outlet.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAdd(item, outlet)}
                        disabled={!isAvailable}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shrink-0 transition-all ${
                          !isAvailable
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check size={13} />
                            <span>Added</span>
                          </>
                        ) : isAvailable ? (
                          <>
                            <Plus size={13} />
                            <span>Add</span>
                          </>
                        ) : (
                          <span>86 Out</span>
                        )}
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer with Campus Hint */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Live Campus Engine:</span> Searches across 13 canteen menus with real-time stock sync
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default SpotlightSearch
