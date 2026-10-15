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
    if (isOpen) {
      fetchLogs()
    }
  }, [isOpen, outletId])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-[2px] animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-auto max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <History size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Menu Change Audit Log
              </h3>
              <p className="text-[11px] text-slate-500">
                Outlet: <span className="font-semibold text-slate-700">{outletId}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchLogs}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Refresh log"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
              <Loader2 size={20} className="animate-spin text-blue-700" />
              <span>Loading audit trail...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No menu modifications recorded yet for this outlet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => {
                const dateStr = new Date(log.changed_at).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] bg-slate-200/80 px-2 py-0.5 rounded">
                          {log.field_name}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-slate-700">
                          Item #{log.item_id ?? 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap text-slate-600">
                        <span className="line-through text-slate-400 max-w-[140px] truncate">
                          {log.old_value ?? 'None'}
                        </span>
                        <ArrowRight size={12} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-blue-700 max-w-[180px] truncate">
                          {log.new_value ?? 'None'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end justify-between text-[11px] text-slate-400 shrink-0">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {dateStr}
                      </span>
                      {log.changed_by && (
                        <span className="font-mono text-[10px] text-slate-500 truncate max-w-[120px]">
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
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
