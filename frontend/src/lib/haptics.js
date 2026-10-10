import { Haptics, ImpactStyle } from '@capacitor/haptics'

export async function lightHaptic() {
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (_) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12)
      }
    } catch (_) {
      // Silent no-op where neither exists
    }
  }
}

export async function mediumHaptic() {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch (_) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(25)
      }
    } catch (_) {
      // Silent no-op
    }
  }
}

export async function successHaptic() {
  try {
    await Haptics.notification({ type: 'SUCCESS' })
  } catch (_) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([15, 50, 15])
      }
    } catch (_) {
      // Silent no-op
    }
  }
}
