import React from 'react'
import { Compass, ArrowLeft, Home } from 'lucide-react'

interface NotFoundPageProps {
  onGoHome?: () => void
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  const handleHome = () => {
    if (onGoHome) {
      onGoHome()
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#0B192C',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      color: '#F8FAFC',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#0F172A',
        border: '1px solid #1E293B',
        borderRadius: '24px',
        padding: '36px 28px',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          color: '#3B82F6',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          border: '1px solid rgba(59, 130, 246, 0.25)'
        }}>
          <Compass size={30} strokeWidth={2} />
        </div>

        <span style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#60A5FA'
        }}>
          404 Error
        </span>

        <h1 style={{
          fontSize: '22px',
          fontWeight: 800,
          color: '#FFFFFF',
          margin: '8px 0'
        }}>
          Page Not Found
        </h1>

        <p style={{
          fontSize: '13px',
          color: '#94A3B8',
          lineHeight: 1.6,
          margin: '0 0 24px'
        }}>
          The requested address does not exist or may have been moved. Return to your dashboard to continue.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => window.history.back()}
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: '#1E293B',
              color: '#CBD5E1',
              fontWeight: 700,
              fontSize: '13px',
              borderRadius: '12px',
              border: '1px solid #334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={15} strokeWidth={2} />
            <span>Go Back</span>
          </button>

          <button
            type="button"
            onClick={handleHome}
            style={{
              flex: 1.2,
              padding: '12px 16px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
            }}
          >
            <Home size={15} strokeWidth={2} />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
