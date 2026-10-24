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
              count: 0,
              latestError: {
                short_message: err.short_message,
                created_at: err.created_at,
                http_status: err.http_status,
                endpoint: err.endpoint
              }
            }
          }
          summaries[err.card_id].count++
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

  // Filtered Registry Entries
  const filteredEntries = useMemo(() => {
    return SYSTEM_REGISTRY.filter(entry => {
      // Type filter
      if (selectedType !== 'all' && entry.type !== selectedType) return false

      // Role filter
      if (selectedRole !== 'all' && !entry.rolesAllowed.includes(selectedRole)) return false

      // Has errors filter
      const errCount = errorSummaries[entry.id]?.count || 0
      if (onlyErrors && errCount === 0) return false

      // Search filter (by ID or Name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchId = entry.id.toLowerCase().includes(q)
        const matchName = entry.name.toLowerCase().includes(q)
        const matchPath = entry.pathOrTrigger.toLowerCase().includes(q)
        if (!matchId && !matchName && !matchPath) return false
      }

      return true
    })
  }, [selectedType, selectedRole, onlyErrors, searchQuery, errorSummaries])

  // Group by type: Routes, Redirects, Popups
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
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-12">
        <AlertTriangle className="mx-auto text-amber-600 mb-3" size={36} />
        <h3 className="text-base font-bold text-amber-900 m-0">System Map Feature Flag Disabled</h3>
        <p className="text-xs text-amber-700 mt-2 leading-relaxed">
          The Developer System Map is hidden by default in production. Set <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-900">VITE_ENABLE_SYSTEM_MAP=true</code> in your environment to activate diagnostic telemetry cards.
        </p>
      </div>
    )
  }

  const totalErrors = Object.values(errorSummaries).reduce((acc, curr) => acc + curr.count, 0)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
              Developer System Map
            </h1>
            <span className="bg-blue-100 text-blue-900 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              {SYSTEM_REGISTRY.length} Registered Cards
            </span>
            {totalErrors > 0 && (
              <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-red-200">
                {totalErrors} Errors (7 Days)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 m-0">
            End-to-end registry mapping every Route, Redirect, and Popup directly to source files, API routes, database tables, and error logs.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTelemetry}
          className="btn btn-secondary text-xs py-1.5 px-3 self-start md:self-auto"
          title="Refresh error telemetry"
        >
          <RefreshCw size={13} className={loadingErrors ? 'animate-spin' : ''} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID (e.g. R-STAFF-POS) or Name..."
            className="input pl-8 py-1.5 text-xs w-full"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Type Filter */}
          <select
            className="input py-1 px-2.5 text-xs w-auto"
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="route">Routes ({SYSTEM_REGISTRY.filter(e => e.type === 'route').length})</option>
            <option value="redirect">Redirects ({SYSTEM_REGISTRY.filter(e => e.type === 'redirect').length})</option>
            <option value="popup">Popups ({SYSTEM_REGISTRY.filter(e => e.type === 'popup').length})</option>
          </select>

          {/* Role Filter */}
          <select
            className="input py-1 px-2.5 text-xs w-auto"
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
              onlyErrors
                ? 'bg-red-50 text-red-700 border-red-300 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            onClick={() => setOnlyErrors(!onlyErrors)}
          >
            <AlertTriangle size={13} className={onlyErrors ? 'text-red-600' : 'text-slate-400'} />
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
          <div key={typeKey} className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <GroupIcon size={16} className="text-blue-800" />
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider m-0">
                {groupTitle} ({entries.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entries.map(entry => {
                const errSummary = errorSummaries[entry.id]
                const errCount = errSummary?.count || 0
                const hasErrors = errCount > 0

                return (
                  <div
                    key={entry.id}
                    className={`bg-white rounded-xl border p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-soft ${
                      hasErrors ? 'border-red-300 ring-1 ring-red-400/20' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Top Card Row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {entry.id}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {entry.protected && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase" title="Payment-critical protected screen">
                              Protected
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            hasErrors ? 'bg-red-100 text-red-800 font-mono' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {errCount} err
                          </span>
                        </div>
                      </div>

                      {/* Card Title & Path */}
                      <h3 className="text-sm font-bold text-slate-900 m-0 leading-tight">
                        {entry.name}
                      </h3>
                      <div className="text-[11px] font-mono text-blue-700 bg-blue-50/60 px-2 py-1 rounded my-2 break-all border border-blue-100">
                        {entry.pathOrTrigger}
                      </div>

                      {/* Allowed Roles */}
                      <div className="flex flex-wrap gap-1 mb-2.5">
                        {entry.rolesAllowed.map(r => (
                          <span
                            key={r}
                            className={`text-[9.5px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              r === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                              r === 'shop_admin' ? 'bg-amber-100 text-amber-800' :
                              r === 'staff' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {r.replace('_', ' ')}
                          </span>
                        ))}
                      </div>

                      {/* Redirect or Popup Details */}
                      {entry.redirectTarget && (
                        <div className="text-[11px] text-slate-600 mb-2">
                          <span className="font-semibold text-slate-700">Target: </span>
                          <code className="text-slate-800 font-mono">{entry.redirectTarget}</code>
                        </div>
                      )}

                      {entry.popupActions && entry.popupActions.length > 0 && (
                        <div className="text-[11px] text-slate-600 mb-2">
                          <span className="font-semibold text-slate-700">Actions: </span>
                          <span>{entry.popupActions.join(' · ')}</span>
                        </div>
                      )}

                      {/* Endpoints & Tables */}
                      <div className="space-y-1 text-[10.5px] text-slate-500 my-2 pt-2 border-t border-slate-100">
                        {entry.apiRoutes && entry.apiRoutes.length > 0 && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Globe size={11} className="text-slate-400 flex-shrink-0" />
                            <span className="font-mono truncate">{entry.apiRoutes.join(', ')}</span>
                          </div>
                        )}
                        {entry.tables && entry.tables.length > 0 && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Database size={11} className="text-slate-400 flex-shrink-0" />
                            <span className="font-mono truncate">{entry.tables.join(', ')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 truncate">
                          <FileCode size={11} className="text-slate-400 flex-shrink-0" />
                          <span className="font-mono truncate">{entry.sourceFiles[0]}</span>
                        </div>
                      </div>

                      {/* Latest Error if Any */}
                      {hasErrors && errSummary.latestError && (
                        <div className="bg-red-50 p-2 rounded-lg border border-red-200 my-2 text-[10.5px] text-red-800 font-mono">
                          <div className="font-bold flex items-center gap-1">
                            <AlertTriangle size={10} /> Latest:
                          </div>
                          <div className="truncate">{errSummary.latestError.short_message}</div>
                          <div className="text-[9.5px] text-red-600 mt-0.5">
                            {new Date(errSummary.latestError.created_at).toLocaleString('en-IN')}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Copy Debug Info */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-3">
                      <span className="text-[10px] text-slate-400 truncate">
                        Opens: {entry.openedFrom}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary text-[10.5px] py-1 px-2.5 flex items-center gap-1 font-semibold"
                        onClick={() => handleCopyDebug(entry)}
                      >
                        {copiedCardId === entry.id ? (
                          <>
                            <Check size={11} className="text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copy Debug Info</span>
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
