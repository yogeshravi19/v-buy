import React, { useState, useEffect, useMemo } from 'react'
import {
  Network,
  Search,
  Filter,
  Copy,
  Check,
  AlertTriangle,
  Route as RouteIcon,
  Repeat,
  Layers,
  Shield,
  FileCode,
  Database,
  Globe,
  Clock,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { SYSTEM_REGISTRY } from '../../lib/systemRegistry'
import type { RegistryEntry, RegistryEntryType } from '../../lib/systemRegistry'
import { supabase } from '../../lib/supabase'

interface ErrorSummary {
  count: number
  latestError?: {
    short_message: string
    created_at: string
    http_status?: number
    endpoint?: string
  }
}

export const SystemMapScreen: React.FC = () => {
  const isEnabled = import.meta.env.VITE_ENABLE_SYSTEM_MAP === 'true'

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [onlyErrors, setOnlyErrors] = useState<boolean>(false)
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null)
  const [loadingErrors, setLoadingErrors] = useState<boolean>(true)
  const [errorSummaries, setErrorSummaries] = useState<Record<string, ErrorSummary>>({})

  // Fetch real error telemetry from app_error_log for past 7 days
  const loadTelemetry = async () => {
    try {
      setLoadingErrors(true)
      if (!supabase) return

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('app_error_log')
        .select('card_id, short_message, created_at, http_status, endpoint')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })

      if (data && !error) {
        const summaries: Record<string, ErrorSummary> = {}
        data.forEach((err: any) => {
          if (!summaries[err.card_id]) {
            summaries[err.card_id] = {
              count: 1,
              latestError: {
                short_message: err.short_message,
                created_at: err.created_at,
                http_status: err.http_status,
                endpoint: err.endpoint
              }
            }
          } else {
            summaries[err.card_id].count++
          }
        })
        setErrorSummaries(summaries)
      }
    } catch (e) {
      console.error('Failed to load error telemetry:', e)
    } finally {
      setLoadingErrors(false)
    }
  }

  useEffect(() => {
    loadTelemetry()
  }, [])

  // Filter entries
  const filteredEntries = useMemo(() => {
    return SYSTEM_REGISTRY.filter(entry => {
      const matchSearch =
        !searchQuery ||
        entry.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.pathOrTrigger.toLowerCase().includes(searchQuery.toLowerCase())

      const matchType = selectedType === 'all' || entry.type === selectedType

      const matchRole =
        selectedRole === 'all' ||
        entry.rolesAllowed.includes(selectedRole as any)

      const errCount = errorSummaries[entry.id]?.count || 0
      const matchErrors = !onlyErrors || errCount > 0

      return matchSearch && matchType && matchRole && matchErrors
    })
  }, [searchQuery, selectedType, selectedRole, onlyErrors, errorSummaries])

  // Group by type for visual separation
  const groupedEntries = useMemo(() => {
    const routes = filteredEntries.filter(e => e.type === 'route')
    const redirects = filteredEntries.filter(e => e.type === 'redirect')
    const popups = filteredEntries.filter(e => e.type === 'popup')
    return { routes, redirects, popups }
  }, [filteredEntries])

  // Handle Copy Debug Info
  const handleCopyDebug = (entry: RegistryEntry) => {
    const errInfo = errorSummaries[entry.id]
    const debugBlock = [
      `=== V FOODS SYSTEM MAP DEBUG INFO ===`,
      `Card ID:       ${entry.id}`,
      `Name:          ${entry.name}`,
      `Type:          ${entry.type.toUpperCase()}`,
      `Path/Trigger:  ${entry.pathOrTrigger}`,
      `Allowed Roles: ${entry.rolesAllowed.join(', ')}`,
      `Opened From:   ${entry.openedFrom}`,
      entry.redirectTarget ? `Redirect To:   ${entry.redirectTarget}` : null,
      entry.redirectCondition ? `Condition:     ${entry.redirectCondition}` : null,
      entry.apiRoutes && entry.apiRoutes.length > 0 ? `API Routes:    ${entry.apiRoutes.join(', ')}` : null,
      entry.tables && entry.tables.length > 0 ? `Tables:        ${entry.tables.join(', ')}` : null,
      `Source Files:  ${entry.sourceFiles.join(', ')}`,
      `Protected:     ${entry.protected ? 'YES' : 'NO'}`,
      `Errors (7d):   ${errInfo?.count || 0}`,
      errInfo?.latestError ? `Latest Error:  [${errInfo.latestError.created_at}] ${errInfo.latestError.short_message}` : `Latest Error:  None`,
      `======================================`
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(debugBlock)
    setCopiedCardId(entry.id)
    setTimeout(() => setCopiedCardId(null), 2000)
  }

  if (!isEnabled) {
    return (
      <div style={{
        background: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: '16px',
        padding: '32px',
        textAlign: 'center',
        maxWidth: '520px',
        margin: '48px auto'
      }}>
        <AlertTriangle style={{ margin: '0 auto 12px auto', color: '#D97706' }} size={36} />
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#92400E', margin: 0 }}>System Map Feature Flag Disabled</h3>
        <p style={{ fontSize: '12px', color: '#B45309', marginTop: '8px', lineHeight: 1.5 }}>
          The Developer System Map is hidden. Set <code style={{ background: '#FEF3C7', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>VITE_ENABLE_SYSTEM_MAP=true</code> to activate diagnostic cards.
        </p>
      </div>
    )
  }

  const totalErrors = Object.values(errorSummaries).reduce((acc, curr) => acc + curr.count, 0)

  return (
    <div className="gov-workspace" style={{ padding: '4px 0 24px 0' }}>
      {/* Top Header */}
      <div className="gov-top-header">
        <div className="gov-title-wrap">
          <div className="gov-title-row">
            <h1 className="gov-main-title">Developer System Map</h1>
            <span style={{
              background: '#EFF6FF',
              color: '#1E40AF',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: '9999px',
              border: '1px solid #BFDBFE'
            }}>
              {SYSTEM_REGISTRY.length} Cards
            </span>
            {totalErrors > 0 && (
              <span style={{
                background: '#FEF2F2',
                color: '#991B1B',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: '9999px',
                border: '1px solid #FECACA'
              }}>
                {totalErrors} Errors (7 Days)
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={loadTelemetry}
          className="gov-btn-reset"
          title="Refresh error telemetry"
        >
          <RefreshCw size={13} className={loadingErrors ? 'animate-spin' : ''} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: '#FFFFFF',
        padding: '14px 18px',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search by ID (e.g. R-STAFF-POS) or Name..."
            className="gov-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Type Filter */}
          <select
            style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '8px', outline: 'none', background: '#FFFFFF' }}
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
          >
            <option value="all">All Types ({SYSTEM_REGISTRY.length})</option>
            <option value="route">Routes ({SYSTEM_REGISTRY.filter(e => e.type === 'route').length})</option>
            <option value="redirect">Redirects ({SYSTEM_REGISTRY.filter(e => e.type === 'redirect').length})</option>
            <option value="popup">Popups ({SYSTEM_REGISTRY.filter(e => e.type === 'popup').length})</option>
          </select>

          {/* Role Filter */}
          <select
            style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '8px', outline: 'none', background: '#FFFFFF' }}
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="staff">Shop Staff</option>
            <option value="shop_admin">Shop Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>

          {/* Has Errors Toggle */}
          <button
            type="button"
            className="gov-btn-reset"
            style={{
              background: onlyErrors ? '#FEF2F2' : '#FFFFFF',
              color: onlyErrors ? '#991B1B' : '#475569',
              borderColor: onlyErrors ? '#FECACA' : '#CBD5E1'
            }}
            onClick={() => setOnlyErrors(!onlyErrors)}
          >
            <AlertTriangle size={13} style={{ color: onlyErrors ? '#DC2626' : '#94A3B8' }} />
            <span>Errors Only</span>
          </button>
        </div>
      </div>

      {/* Render Card Groups */}
      {(['route', 'redirect', 'popup'] as RegistryEntryType[]).map(typeKey => {
        const entries = typeKey === 'route'
          ? groupedEntries.routes
          : typeKey === 'redirect'
          ? groupedEntries.redirects
          : groupedEntries.popups

        if (entries.length === 0) return null

        const groupTitle = typeKey === 'route' ? 'Routes' : typeKey === 'redirect' ? 'Redirects' : 'Popups & Modals'
        const GroupIcon = typeKey === 'route' ? RouteIcon : typeKey === 'redirect' ? Repeat : Layers

        return (
          <div key={typeKey} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
              <GroupIcon size={16} style={{ color: '#1E40AF' }} />
              <h2 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0 }}>
                {groupTitle} ({entries.length})
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {entries.map(entry => {
                const errSummary = errorSummaries[entry.id]
                const errCount = errSummary?.count || 0
                const hasErrors = errCount > 0

                return (
                  <div
                    key={entry.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: hasErrors ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
                      padding: '16px',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      minHeight: '190px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      {/* Top Card Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: '#F1F5F9',
                          color: '#334155',
                          border: '1px solid #E2E8F0'
                        }}>
                          {entry.id}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            background: entry.type === 'route' ? '#EFF6FF' : entry.type === 'popup' ? '#FFFBEB' : '#FAF5FF',
                            color: entry.type === 'route' ? '#1E40AF' : entry.type === 'popup' ? '#92400E' : '#6B21A8'
                          }}>
                            {entry.type}
                          </span>

                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '9999px',
                            fontFamily: 'monospace',
                            background: hasErrors ? '#FEF2F2' : '#F1F5F9',
                            color: hasErrors ? '#DC2626' : '#64748B'
                          }}>
                            {errCount} err
                          </span>
                        </div>
                      </div>

                      {/* Card Title & Path */}
                      <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                        {entry.name}
                      </h3>

                      <div style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#1D4ED8',
                        background: '#EFF6FF',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #DBEAFE',
                        wordBreak: 'break-all',
                        marginBottom: '8px'
                      }}>
                        {entry.pathOrTrigger}
                      </div>

                      {/* Allowed Roles */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                        {entry.rolesAllowed.map(r => (
                          <span
                            key={r}
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: r === 'super_admin' ? '#FAF5FF' : r === 'shop_admin' ? '#FFFBEB' : r === 'staff' ? '#ECFDF5' : '#EFF6FF',
                              color: r === 'super_admin' ? '#7C3AED' : r === 'shop_admin' ? '#D97706' : r === 'staff' ? '#059669' : '#1E40AF'
                            }}
                          >
                            {r.replace('_', ' ')}
                          </span>
                        ))}
                      </div>

                      {/* Source file */}
                      <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FileCode size={11} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.sourceFiles[0]}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Executable Actions */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #F1F5F9',
                      paddingTop: '10px',
                      marginTop: '8px',
                      gap: '8px'
                    }}>
                      {/* Executable direct route action */}
                      {entry.type === 'route' && entry.pathOrTrigger.startsWith('/') ? (
                        <a
                          href={entry.pathOrTrigger}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#1D4ED8',
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            textDecoration: 'none'
                          }}
                          title={`Open ${entry.pathOrTrigger}`}
                        >
                          <ExternalLink size={11} />
                          <span>Open</span>
                        </a>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'capitalize' }}>
                          {entry.type}
                        </span>
                      )}

                      {/* Copy Debug Info */}
                      <button
                        type="button"
                        className="gov-btn-discard"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => handleCopyDebug(entry)}
                      >
                        {copiedCardId === entry.id ? (
                          <>
                            <Check size={11} style={{ color: '#059669' }} />
                            <span style={{ color: '#059669' }}>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copy Debug</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
