import React from 'react'
import {
  WifiOff,
  RefreshCw,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  ExternalLink,
  Smartphone
} from 'lucide-react'

// ── 1. OFFLINE BANNER ───────────────────────────────────────────────────────
export interface OfflineBannerProps {
  isOnline: boolean
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOnline }) => {
  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        backgroundColor: '#991B1B',
        color: '#FFFFFF',
        padding: '8px 16px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}
    >
      <WifiOff size={15} strokeWidth={2} />
      <span>Offline mode — browsing cached menu. Ordering is disabled until connection is restored.</span>
    </div>
  )
}

// ── 2. PWA UPDATE TOAST ────────────────────────────────────────────────────
export interface PwaUpdateToastProps {
  updateAvailable: boolean
  onReload: () => void
}

export const PwaUpdateToast: React.FC<PwaUpdateToastProps> = ({
  updateAvailable,
  onReload
}) => {
  if (!updateAvailable) return null

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        padding: '12px 18px',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 9999,
        border: '1px solid #334155'
      }}
    >
      <RefreshCw size={16} className="animate-spin" strokeWidth={2} />
      <span style={{ fontSize: '13px', fontWeight: 600 }}>A new version of V Foods is available.</span>
      <button
        onClick={onReload}
        style={{
          backgroundColor: '#2563EB',
          color: '#FFFFFF',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        Update Now
      </button>
    </div>
  )
}

// ── 3. IN-APP BROWSER WARNING ───────────────────────────────────────────────
export interface InAppBrowserBannerProps {
  isInAppBrowser: boolean
  onDismiss?: () => void
}

export const InAppBrowserBanner: React.FC<InAppBrowserBannerProps> = ({
  isInAppBrowser,
  onDismiss
}) => {
  const [dismissed, setDismissed] = React.useState(false)

  if (!isInAppBrowser || dismissed) return null

  return (
    <div
      style={{
        backgroundColor: '#1E293B',
        color: '#F8FAFC',
        padding: '10px 16px',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #334155',
        zIndex: 9990
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ExternalLink size={15} strokeWidth={2} color="#60A5FA" />
        <span>For the best experience and app installation, tap the menu and choose <strong>Open in Chrome / Safari</strong>.</span>
      </div>
      <button
        onClick={() => {
          setDismissed(true)
          if (onDismiss) onDismiss()
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#94A3B8',
          cursor: 'pointer',
          padding: '4px'
        }}
        aria-label="Dismiss banner"
      >
        <X size={15} strokeWidth={2} />
      </button>
    </div>
  )
}

// ── 4. IOS INSTALL MODAL ───────────────────────────────────────────────────
export interface IosInstallModalProps {
  isOpen: boolean
  onClose: () => void
}

export const IosInstallModal: React.FC<IosInstallModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 0 calc(16px + env(safe-area-inset-bottom, 0px)) 0'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          margin: '0 16px',
          animation: 'vfoods-slide-up 0.25s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={20} color="#2563EB" strokeWidth={2} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Install V Foods on iOS</h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>Add to your home screen for quick access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>
              1
            </div>
            <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
              Tap the <strong>Share</strong> button <Share size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} strokeWidth={2} /> in Safari's bottom toolbar.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>
              2
            </div>
            <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
              Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} strokeWidth={2} />.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>
              3
            </div>
            <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
              Tap <strong>Add</strong> in the top right corner. <CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px', color: '#10B981' }} strokeWidth={2} />
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            border: 'none',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}

// ── 5. DISMISSIBLE INSTALL CARD ─────────────────────────────────────────────
export interface InstallBannerCardProps {
  onInstall: () => void
  onDismiss: () => void
}

export const InstallBannerCard: React.FC<InstallBannerCardProps> = ({
  onInstall,
  onDismiss
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Download size={20} color="#2563EB" strokeWidth={2} />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Install V Foods</h4>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>Fast pre-ordering and live order status from your home screen.</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '6px 8px'
          }}
        >
          Later
        </button>
        <button
          onClick={onInstall}
          style={{
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Download size={14} strokeWidth={2} />
          Install
        </button>
      </div>
    </div>
  )
}
