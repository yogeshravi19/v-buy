/**
 * Web Haptic Feedback Utility
 * Uses native HTML5 navigator.vibrate() to provide tactile mobile feedback
 * for cart adjustments, token generation, and kitchen ready notifications.
 */

export const triggerHaptic = (type: 'tap' | 'light' | 'success' | 'ready' | 'error' = 'tap') => {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) {
    return
  }

  try {
    switch (type) {
      case 'tap':
      case 'light':
        // Short, crisp tap (10ms)
        navigator.vibrate(10)
        break
      case 'success':
        // Double-beat affirmation (20ms, 40ms pause, 20ms)
        navigator.vibrate([20, 40, 20])
        break
      case 'ready':
        // Distinctive arrival pulse for food ready at counter (50ms, 50ms pause, 100ms)
        navigator.vibrate([50, 50, 100])
        break
      case 'error':
        // Warning buzz (80ms, 40ms, 80ms)
        navigator.vibrate([80, 40, 80])
        break
    }
  } catch (e) {
    // Graceful fallback for non-supporting browsers or permission restrictions
  }
}

export const useWebHaptics = () => {
  return {
    tap: () => triggerHaptic('tap'),
    light: () => triggerHaptic('light'),
    success: () => triggerHaptic('success'),
    ready: () => triggerHaptic('ready'),
    error: () => triggerHaptic('error'),
  }
}
