import { useState, useEffect, useCallback } from 'react'

export interface PwaState {
  isOnline: boolean
  isStandalone: boolean
  isIos: boolean
  isInAppBrowser: boolean
  isInstallable: boolean
  updateAvailable: boolean
  showIosInstallModal: boolean
  setShowIosInstallModal: (show: boolean) => void
  promptInstall: () => Promise<boolean>
  reloadApp: () => void
}

export function usePwa(): PwaState {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isStandalone, setIsStandalone] = useState<boolean>(false)
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [showIosInstallModal, setShowIosInstallModal] = useState<boolean>(false)

  // Detect iOS
  const isIos = typeof window !== 'undefined' && (
    (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )

  // Detect In-App Browsers (Instagram, Facebook, LinkedIn, Messenger, MicroMessenger, etc.)
  const isInAppBrowser = typeof window !== 'undefined' && (
    /FBAN|FBAV|Instagram|LinkedInApp|Twitter|musical_ly|BytedanceWebview|MicroMessenger/i.test(navigator.userAgent)
  )

  useEffect(() => {
    // 1. Online / Offline listeners
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 2. Standalone display check
    const checkStandalone = () => {
      const isStandaloneMode = (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
      )
      setIsStandalone(isStandaloneMode)
    }
    checkStandalone()
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleMediaChange = (e: MediaQueryListEvent) => setIsStandalone(e.matches)
    mediaQuery.addEventListener('change', handleMediaChange)

    // 3. BeforeInstallPrompt listener for Android / Chrome / Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // 4. Service Worker update registration & waiting detection
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Check if there is already a waiting worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting)
          setUpdateAvailable(true)
        }

        // Listen for new updates found
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker)
                setUpdateAvailable(true)
              }
            })
          }
        })
      })

      // When controller changes (after skipWaiting), reload page
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      mediaQuery.removeEventListener('change', handleMediaChange)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  // Trigger Install
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        return true
      }
      return false
    }

    if (isIos && !isStandalone) {
      setShowIosInstallModal(true)
      return false
    }

    return false
  }, [deferredPrompt, isIos, isStandalone])

  // Apply PWA update
  const reloadApp = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    } else {
      window.location.reload()
    }
  }, [waitingWorker])

  const isInstallable = !isStandalone && (deferredPrompt !== null || (isIos && !isStandalone))

  return {
    isOnline,
    isStandalone,
    isIos,
    isInAppBrowser,
    isInstallable,
    updateAvailable,
    showIosInstallModal,
    setShowIosInstallModal,
    promptInstall,
    reloadApp
  }
}
