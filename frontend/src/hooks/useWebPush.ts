import { useState, useEffect, useCallback } from 'react'
import {
  getPushSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush
} from '../utils/webPush'

export interface UseWebPushState {
  supported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  loading: boolean
  toggleSubscription: () => Promise<boolean>
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
}

export function useWebPush(userId?: string | null): UseWebPushState {
  const [supported, setSupported] = useState<boolean>(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  const checkStatus = useCallback(async () => {
    try {
      const status = await getPushSubscriptionStatus()
      setSupported(status.supported)
      setPermission(status.permission)
      setIsSubscribed(status.isSubscribed)
    } catch (e) {
      console.warn('Error reading Web Push status:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const subscribe = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    const result = await subscribeToPush(userId)
    await checkStatus()
    setLoading(false)
    return result.success
  }, [userId, checkStatus])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    const success = await unsubscribeFromPush(userId)
    await checkStatus()
    setLoading(false)
    return success
  }, [userId, checkStatus])

  const toggleSubscription = useCallback(async (): Promise<boolean> => {
    if (isSubscribed) {
      return await unsubscribe()
    } else {
      return await subscribe()
    }
  }, [isSubscribed, subscribe, unsubscribe])

  return {
    supported,
    permission,
    isSubscribed,
    loading,
    toggleSubscription,
    subscribe,
    unsubscribe
  }
}
