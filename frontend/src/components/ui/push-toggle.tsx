import React from 'react'
import { BellRing, BellOff, Loader2 } from 'lucide-react'
import { useWebPush } from '../../hooks/useWebPush'

export interface PushToggleProps {
  userId?: string | null
  className?: string
  showLabel?: boolean
}

export const PushNotificationToggle: React.FC<PushToggleProps> = ({
  userId,
  className = '',
  showLabel = true
}) => {
  const { supported, isSubscribed, loading, toggleSubscription } = useWebPush(userId)

  if (!supported) return null

  return (
    <button
      type="button"
      className={`saas-btn saas-btn-secondary saas-btn-sm ${className}`}
      onClick={toggleSubscription}
      disabled={loading}
      title={isSubscribed ? 'Web push notifications active' : 'Enable web push notifications for live order updates'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: isSubscribed ? '#EFF6FF' : '#FFFFFF',
        borderColor: isSubscribed ? '#93C5FD' : '#CBD5E1',
        color: isSubscribed ? '#1D4ED8' : '#475569',
        fontWeight: isSubscribed ? 700 : 600,
        cursor: 'pointer'
      }}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : isSubscribed ? (
        <BellRing size={13} color="#2563EB" strokeWidth={2} />
      ) : (
        <BellOff size={13} color="#64748B" strokeWidth={2} />
      )}
      {showLabel && (
        <span>{isSubscribed ? 'Push Alerts ON' : 'Enable Push'}</span>
      )}
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isSubscribed ? '#22C55E' : '#94A3B8'
        }}
      />
    </button>
  )
}
