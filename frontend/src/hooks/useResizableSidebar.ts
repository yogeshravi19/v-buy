import React, { useState, useEffect, useCallback, useRef } from 'react'

interface UseResizableSidebarOptions {
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  storageKey?: string
}

export function useResizableSidebar({
  defaultWidth = 265,
  minWidth = 200,
  maxWidth = 440,
  storageKey = 'vfoods_sidebar_width'
}: UseResizableSidebarOptions = {}) {
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const val = parseInt(saved, 10)
        if (!isNaN(val) && val >= minWidth && val <= maxWidth) {
          return val
        }
      }
    } catch {
      // Fallback
    }
    return defaultWidth
  })

  const [isResizing, setIsResizing] = useState(false)
  const isResizingRef = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only respond to left clicks
    if (e.button !== 0) return
    e.preventDefault()
    setIsResizing(true)
    isResizingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return
      const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      if (!isResizingRef.current) return
      isResizingRef.current = false
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setSidebarWidth(w => {
        try {
          localStorage.setItem(storageKey, String(w))
        } catch {
          // Fallback
        }
        return w
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [minWidth, maxWidth, storageKey])

  return {
    sidebarWidth,
    isResizing,
    handleMouseDown,
    resetWidth: () => {
      setSidebarWidth(defaultWidth)
      try {
        localStorage.removeItem(storageKey)
      } catch {}
    }
  }
}
