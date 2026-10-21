import React, { useState, useEffect } from 'react'
import { X, History, Clock, User, ArrowRight, Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface AuditLogEntry {
  id: number
  item_id: number | null
  outlet_id: string
  changed_by: string | null
  changed_at: string
  field_name: string
  old_value: string | null
  new_value: string | null
}

interface MenuAuditLogModalProps {
  isOpen: boolean
  onClose: () => void
  outletId: string
}

export function MenuAuditLogModal({ isOpen, onClose, outletId }: MenuAuditLogModalProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    if (!outletId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('menu_items_audit')
        .select('*')
        .eq('outlet_id', outletId)
        .order('changed_at', { ascending: false })
        .limit(100)

      if (err) throw err
      setLogs((data as AuditLogEntry[]) || [])
    } catch (e: any) {
      console.error('Error fetching menu audit logs:', e)
      setError(e.message || 'Unable to load menu audit log.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    fetchLogs()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, outletId])

  if (!isOpen) return null

  return (
    <div
      className="v-modal-overlay"
      onClick={onClose}
    >
      <div
        className="v-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="v-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <History size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Menu Change Audit Log
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Outlet: <span style={{ fontWeight: 600, color: '#334155' }}>{outletId}</span>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={fetchLogs}
              style={{
                padding: '6px',
                borderRadius: '8px',
                color: '#64748B',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
              title="Refresh log"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              className="saas-modal-close"
              onClick={onClose}
              aria-label="Close audit log"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="v-modal-body">
          {loading ? (
            <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748B', fontSize: '13px' }}>
              <Loader2 size={22} className="animate-spin" style={{ color: '#1E40AF' }} />
              <span>Loading audit trail...</span>
            </div>
          ) : error ? (
            <div style={{ padding: '14px 18px', backgroundColor: '#FFF1F2', border: '1px solid #FECDD3', color: '#9F1239', borderRadius: '12px', fontSize: '12px' }}>
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
              No menu modifications recorded yet for this outlet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {logs.map((log) => {
                const dateStr = new Date(log.changed_at).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })
                return (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '10.5px', backgroundColor: '#E2E8F0', padding: '2px 8px', borderRadius: '4px' }}>
                          {log.field_name}
                        </span>
                        <span style={{ color: '#94A3B8' }}>•</span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>
                          Item #{log.item_id ?? 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', color: '#475569' }}>
                        <span style={{ textDecoration: 'line-through', color: '#94A3B8', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.old_value ?? 'None'}
                        </span>
                        <ArrowRight size={12} style={{ color: '#94A3B8', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: '#1E40AF', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.new_value ?? 'None'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '11px', color: '#64748B', flexShrink: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} />
                        {dateStr}
                      </span>
                      {log.changed_by && (
                        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#64748B', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          By: {log.changed_by.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="v-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="v-btn-cancel"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
