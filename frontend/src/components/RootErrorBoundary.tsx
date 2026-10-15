import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Trash2, Home } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('V Foods Uncaught Application Error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleHardReset = async () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map(r => r.unregister()))
      }
    } catch (e) {
      console.error('Error during hard reset:', e)
    } finally {
      window.location.href = '/'
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0B192C',
          color: '#F8FAFC',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: '16px',
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#EF4444'
            }}>
              <AlertCircle size={28} strokeWidth={2} />
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px', color: '#FFFFFF' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '14px', color: '#94A3B8', margin: '0 0 24px', lineHeight: 1.5 }}>
              The application encountered an unexpected issue. You can try refreshing or resetting your local session cache.
            </p>

            {this.state.error && (
              <div style={{
                textAlign: 'left',
                backgroundColor: '#0B192C',
                border: '1px solid #1E293B',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                color: '#EF4444',
                fontFamily: 'monospace',
                marginBottom: '24px',
                overflowX: 'auto',
                maxHeight: '120px'
              }}>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} strokeWidth={2} />
                Reload Application
              </button>

              <button
                onClick={this.handleHardReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#1E293B',
                  color: '#CBD5E1',
                  fontWeight: 500,
                  fontSize: '14px',
                  border: '1px solid #334155',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={16} strokeWidth={2} />
                Clear Cache & Reset
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default RootErrorBoundary
