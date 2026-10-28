import React, { useState, useEffect, useMemo } from 'react'
import {
  ShieldCheck,
  Users,
  Store,
  UserCheck,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Info,
  Save,
  RotateCcw,
  Undo2,
  Sparkles,
  Unlock,
  CheckSquare
} from 'lucide-react'
import {
  ROLE_DEFINITIONS,
  MODULE_CAPABILITY_MATRIX,
  getActiveCapabilityMatrix,
  saveCapabilityMatrixOverrides,
  resetCapabilityMatrixOverrides
} from '../../lib/permissions'
import type {
  UserRole,
  RoleCapability
} from '../../lib/permissions'
import { supabase } from '../../lib/supabase'

interface UserRecord {
  id: string
  full_name?: string
  email?: string
  phone?: string
  role: string
  outlet_id?: string
  is_active?: boolean
  created_at?: string
}

type ActionKey = 'view' | 'create' | 'edit' | 'delete' | 'manage'
type RoleKey = 'user' | 'staff' | 'shop_admin' | 'super_admin'

interface CapabilityRow {
  module: string
  user: { view: boolean; create: boolean; edit: boolean; delete: boolean; manage: boolean }
  staff: { view: boolean; create: boolean; edit: boolean; delete: boolean; manage: boolean }
  shop_admin: { view: boolean; create: boolean; edit: boolean; delete: boolean; manage: boolean }
  super_admin: { view: boolean; create: boolean; edit: boolean; delete: boolean; manage: boolean }
}

export const RolesAndPermissionsScreen: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('super_admin')
  const [activeTab, setActiveTab] = useState<'matrix' | 'roles' | 'roster'>('matrix')
  const [usersList, setUsersList] = useState<UserRecord[]>([])
  const [outletsMap, setOutletsMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [rosterSearch, setRosterSearch] = useState<string>('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [matrixSearch, setMatrixSearch] = useState<string>('')

  // Interactive capability matrix state
  const [matrix, setMatrix] = useState<CapabilityRow[]>(() => getActiveCapabilityMatrix())
  const [savedMatrix, setSavedMatrix] = useState<CapabilityRow[]>(() => getActiveCapabilityMatrix())
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)

  // Real verified counts from database
  const [roleCounts, setRoleCounts] = useState<{
    user: number
    staff: number
    shop_admin: number
    super_admin: number
    total: number
  }>({ user: 0, staff: 0, shop_admin: 0, super_admin: 0, total: 0 })

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        if (!supabase) return

        // 1. Fetch real outlets map
        const { data: outletsData } = await supabase.from('outlets').select('id, name')
        if (outletsData) {
          const m: Record<string, string> = {}
          outletsData.forEach((o: any) => { m[o.id] = o.name })
          setOutletsMap(m)
        }

        // 2. Fetch all profiles for roster and counts
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, role, outlet_id, is_active, created_at')
          .order('created_at', { ascending: false })

        if (profilesData) {
          setUsersList(profilesData)
          let uCount = 0
          let staffCount = 0
          let shopAdminCount = 0
          let superAdminCount = 0

          profilesData.forEach((p: any) => {
            const r = (p.role || '').toLowerCase()
            if (r === 'super_admin' || r === 'superadmin' || r === 'admin') superAdminCount++
            else if (r === 'shop_admin' || r === 'owner') shopAdminCount++
            else if (r === 'staff' || r === 'shop_staff') staffCount++
            else uCount++
          })

          setRoleCounts({
            user: uCount,
            staff: staffCount,
            shop_admin: shopAdminCount,
            super_admin: superAdminCount,
            total: profilesData.length
          })
        }
      } catch (err) {
        console.error('Failed to load roles data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Check if matrix has unsaved edits
  const isDirty = useMemo(() => {
    return JSON.stringify(matrix) !== JSON.stringify(savedMatrix)
  }, [matrix, savedMatrix])

  // Count changed capabilities
  const changeCount = useMemo(() => {
    let count = 0
    matrix.forEach((row, rIdx) => {
      const savedRow = savedMatrix[rIdx]
      if (!savedRow) return
      ;(['user', 'staff', 'shop_admin', 'super_admin'] as RoleKey[]).forEach(role => {
        ;(['view', 'create', 'edit', 'delete', 'manage'] as ActionKey[]).forEach(action => {
          if (row[role][action] !== savedRow[role][action]) count++
        })
      })
    })
    return count
  }, [matrix, savedMatrix])

  // Toggle individual cell
  const handleToggleCell = (moduleIndex: number, role: RoleKey, action: ActionKey) => {
    setMatrix(prev => {
      const updated = prev.map((row, idx) => {
        if (idx !== moduleIndex) return row
        return {
          ...row,
          [role]: {
            ...row[role],
            [action]: !row[role][action]
          }
        }
      })
      return updated
    })
  }

  // Grant full access to all roles & modules
  const handleGrantFullAccessAll = () => {
    setMatrix(prev =>
      prev.map(row => ({
        ...row,
        user: { view: true, create: true, edit: true, delete: true, manage: true },
        staff: { view: true, create: true, edit: true, delete: true, manage: true },
        shop_admin: { view: true, create: true, edit: true, delete: true, manage: true },
        super_admin: { view: true, create: true, edit: true, delete: true, manage: true }
      }))
    )
    setSaveSuccessMessage('Full Access granted across all modules and roles. Click "Save Matrix" to persist.')
  }

  // Grant full access to a single module across all roles
  const handleGrantFullAccessRow = (moduleIndex: number) => {
    setMatrix(prev =>
      prev.map((row, idx) => {
        if (idx !== moduleIndex) return row
        return {
          ...row,
          user: { view: true, create: true, edit: true, delete: true, manage: true },
          staff: { view: true, create: true, edit: true, delete: true, manage: true },
          shop_admin: { view: true, create: true, edit: true, delete: true, manage: true },
          super_admin: { view: true, create: true, edit: true, delete: true, manage: true }
        }
      })
    )
  }

  // Save changes to persistent storage and update application
  const handleSaveMatrix = () => {
    saveCapabilityMatrixOverrides(matrix)
    setSavedMatrix(JSON.parse(JSON.stringify(matrix)))
    setSaveSuccessMessage('Permissions matrix saved successfully! All custom capabilities are now active.')
    setTimeout(() => {
      setSaveSuccessMessage(null)
    }, 4500)
  }

  // Discard unsaved changes
  const handleDiscardChanges = () => {
    setMatrix(JSON.parse(JSON.stringify(savedMatrix)))
    setSaveSuccessMessage(null)
  }

  // Reset to default factory RLS policies
  const handleResetToBaseline = () => {
    resetCapabilityMatrixOverrides()
    const baseline = JSON.parse(JSON.stringify(MODULE_CAPABILITY_MATRIX))
    setMatrix(baseline)
    setSavedMatrix(baseline)
    setSaveSuccessMessage('Reset to factory Row Level Security (RLS) baseline.')
    setTimeout(() => {
      setSaveSuccessMessage(null)
    }, 4000)
  }

  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchRole = roleFilter === 'all' || u.role.toLowerCase() === roleFilter.toLowerCase()
      const searchLower = rosterSearch.toLowerCase()
      const matchSearch =
        !rosterSearch ||
        (u.full_name && u.full_name.toLowerCase().includes(searchLower)) ||
        (u.outlet_id && u.outlet_id.toLowerCase().includes(searchLower)) ||
        (u.id && u.id.toLowerCase().includes(searchLower))
      return matchRole && matchSearch
    })
  }, [usersList, roleFilter, rosterSearch])

  const filteredMatrix = useMemo(() => {
    if (!matrixSearch.trim()) return matrix
    const term = matrixSearch.toLowerCase()
    return matrix.filter(r => r.module.toLowerCase().includes(term))
  }, [matrix, matrixSearch])

  const currentRoleDef = ROLE_DEFINITIONS[selectedRole]

  return (
    <div className="gov-workspace">
      {/* Top Header */}
      <div className="gov-top-header">
        <div className="gov-title-wrap">
          <h1 className="gov-main-title">Roles & Permissions</h1>
        </div>

        {/* View Tabs */}
        <div className="gov-tabs-container">
          <button
            type="button"
            className={`gov-tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('matrix')}
          >
            Capability Matrix
          </button>
          <button
            type="button"
            className={`gov-tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            Role Specifications
          </button>
          <button
            type="button"
            className={`gov-tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            Active User Roster ({roleCounts.total})
          </button>
        </div>
      </div>

      {/* Headcount Metric Cards (Standard SAAS KPI Cards) */}
      <div className="saas-kpi-grid" style={{ marginBottom: 0 }}>
        <div className="saas-kpi-card">
          <div className="saas-kpi-head">
            <span>Users</span>
            <div className="saas-kpi-head-icon" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
              <Users size={16} />
            </div>
          </div>
          <div className="saas-kpi-value" style={{ color: '#0F172A', fontSize: '24px', fontWeight: 800, marginTop: '8px' }}>
            {roleCounts.user}
          </div>
          <div className="saas-kpi-sub" style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Campus customer base
          </div>
        </div>

        <div className="saas-kpi-card">
          <div className="saas-kpi-head">
            <span>Shop Staff</span>
            <div className="saas-kpi-head-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
              <UserCheck size={16} />
            </div>
          </div>
          <div className="saas-kpi-value" style={{ color: '#0F172A', fontSize: '24px', fontWeight: 800, marginTop: '8px' }}>
            {roleCounts.staff}
          </div>
          <div className="saas-kpi-sub" style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
            Counter & kitchen crew
          </div>
        </div>

        <div className="saas-kpi-card">
          <div className="saas-kpi-head">
            <span>Shop Admins</span>
            <div className="saas-kpi-head-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
              <Store size={16} />
            </div>
          </div>
          <div className="saas-kpi-value" style={{ color: '#0F172A', fontSize: '24px', fontWeight: 800, marginTop: '8px' }}>
            {roleCounts.shop_admin}
          </div>
          <div className="saas-kpi-sub" style={{ fontSize: '11px', color: '#D97706', fontWeight: 600, marginTop: '4px' }}>
            Outlet managers
          </div>
        </div>

        <div className="saas-kpi-card">
          <div className="saas-kpi-head">
            <span>Super Admins</span>
            <div className="saas-kpi-head-icon" style={{ background: '#FAF5FF', color: '#7C3AED' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="saas-kpi-value" style={{ color: '#0F172A', fontSize: '24px', fontWeight: 800, marginTop: '8px' }}>
            {roleCounts.super_admin}
          </div>
          <div className="saas-kpi-sub" style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 600, marginTop: '4px' }}>
            Platform governance
          </div>
        </div>
      </div>



      {/* Save Success Banner */}
      {saveSuccessMessage && (
        <div className="gov-banner-toast">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} style={{ color: '#059669', flexShrink: 0 }} />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMessage(null)}
            style={{ background: 'none', border: 'none', color: '#065F46', cursor: 'pointer', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* TAB 1: EDITABLE CAPABILITY MATRIX */}
      {activeTab === 'matrix' && (
        <div className="gov-matrix-card">
          {/* Action Bar with Discard, Save, and Full Access Actions */}
          <div className="gov-matrix-header">
            <div className="gov-matrix-title-box">
              <div className="gov-matrix-title-row">
                <h3 className="gov-matrix-heading">
                  Module Capability Matrix by Operational Role
                </h3>
                {isDirty ? (
                  <span style={{
                    background: '#FEF3C7',
                    color: '#92400E',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid #FDE68A',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706' }} />
                    Unsaved Edits ({changeCount})
                  </span>
                ) : (
                  <span style={{
                    background: '#ECFDF5',
                    color: '#065F46',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid #A7F3D0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Check size={10} /> Saved & Active
                  </span>
                )}
              </div>
            </div>

            {/* Matrix Action Buttons */}
            <div className="gov-matrix-actions">
              <button
                type="button"
                onClick={handleGrantFullAccessAll}
                className="gov-btn-full"
                title="Grant 100% full access to all roles and modules"
              >
                <Sparkles size={13} style={{ color: '#2563EB' }} />
                <span>Grant Full Access</span>
              </button>

              <button
                type="button"
                onClick={handleResetToBaseline}
                className="gov-btn-reset"
                title="Reset to default factory RLS policies"
              >
                <RotateCcw size={12} />
                <span>Reset Baseline</span>
              </button>

              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={!isDirty}
                className="gov-btn-discard"
                title="Discard unsaved changes"
              >
                <Undo2 size={12} />
                <span>Discard</span>
              </button>

              <button
                type="button"
                onClick={handleSaveMatrix}
                className="gov-btn-save"
                title="Save permissions matrix changes"
              >
                <Save size={13} />
                <span>Save Matrix</span>
              </button>
            </div>
          </div>

          {/* Search Filter for Matrix Modules */}
          <div className="gov-search-bar">
            <div className="gov-search-input-wrap">
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Filter modules (e.g. Menu, POS, Orders, KDS)..."
                className="gov-search-input"
                value={matrixSearch}
                onChange={e => setMatrixSearch(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              Showing {filteredMatrix.length} of {matrix.length} security domains
            </div>
          </div>

          <div className="gov-matrix-table-wrap">
            <table className="gov-matrix-table">
              <thead>
                <tr style={{ background: '#F8FAFC', color: '#475569' }}>
                  <th style={{ position: 'sticky', left: 0, background: '#F8FAFC', zIndex: 10, width: '180px' }}>
                    Module Name
                  </th>
                  <th style={{ textAlign: 'center', borderLeft: '1px solid #E2E8F0', width: '110px', background: 'rgba(239, 246, 255, 0.5)', color: '#1E40AF' }}>
                    User
                    <div style={{ fontSize: '9px', fontWeight: 600, color: '#2563EB', paddingTop: '2px' }}>VIEW</div>
                  </th>
                  <th colSpan={5} style={{ textAlign: 'center', borderLeft: '1px solid #E2E8F0', background: 'rgba(236, 253, 245, 0.5)', color: '#065F46' }}>
                    Shop Staff
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', fontSize: '9px', fontWeight: 600, color: '#059669', paddingTop: '3px' }}>
                      <span>VIEW</span><span>NEW</span><span>EDIT</span><span>DEL</span><span>MANAGE</span>
                    </div>
                  </th>
                  <th colSpan={5} style={{ textAlign: 'center', borderLeft: '1px solid #E2E8F0', background: 'rgba(255, 251, 235, 0.5)', color: '#92400E' }}>
                    Shop Admin
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', fontSize: '9px', fontWeight: 600, color: '#D97706', paddingTop: '3px' }}>
                      <span>VIEW</span><span>NEW</span><span>EDIT</span><span>DEL</span><span>MANAGE</span>
                    </div>
                  </th>
                  <th colSpan={5} style={{ textAlign: 'center', borderLeft: '1px solid #E2E8F0', background: 'rgba(250, 245, 255, 0.5)', color: '#581C87' }}>
                    Super Admin
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', fontSize: '9px', fontWeight: 600, color: '#7C3AED', paddingTop: '3px' }}>
                      <span>VIEW</span><span>NEW</span><span>EDIT</span><span>DEL</span><span>MANAGE</span>
                    </div>
                  </th>
                  <th style={{ textAlign: 'center', borderLeft: '1px solid #E2E8F0', width: '90px', background: '#F8FAFC', color: '#475569' }}>
                    Quick
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMatrix.map((row) => {
                  const originalIndex = matrix.findIndex(m => m.module === row.module)
                  return (
                    <tr key={row.module}>
                      {/* Module Name */}
                      <td style={{
                        position: 'sticky',
                        left: 0,
                        background: '#FFFFFF',
                        zIndex: 10,
                        fontWeight: 700,
                        color: '#0F172A',
                        boxShadow: '1px 0 0 0 #E2E8F0'
                      }}>
                        {row.module}
                      </td>

                      {/* User (Student) */}
                      <td style={{ textAlign: 'center', borderLeft: '1px solid #F1F5F9', background: 'rgba(239, 246, 255, 0.2)' }}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={row.user.view}
                          aria-label={`Toggle View for User on ${row.module}`}
                          onClick={() => handleToggleCell(originalIndex, 'user', 'view')}
                          className={`gov-checkbox-btn ${row.user.view ? 'checked-user' : ''}`}
                        >
                          {row.user.view && <Check size={13} strokeWidth={3} />}
                        </button>
                      </td>

                      {/* Shop Staff (5 sub-actions: View, Create, Edit, Delete, Manage) */}
                      {(['view', 'create', 'edit', 'delete', 'manage'] as ActionKey[]).map((action, aIdx) => (
                        <td
                          key={action}
                          style={{
                            textAlign: 'center',
                            borderLeft: aIdx === 0 ? '1px solid #F1F5F9' : undefined
                          }}
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={row.staff[action]}
                            aria-label={`Toggle ${action} for Staff on ${row.module}`}
                            onClick={() => handleToggleCell(originalIndex, 'staff', action)}
                            className={`gov-checkbox-btn ${row.staff[action] ? 'checked-staff' : ''}`}
                          >
                            {row.staff[action] && <Check size={11} strokeWidth={3} />}
                          </button>
                        </td>
                      ))}

                      {/* Shop Admin (5 sub-actions: View, Create, Edit, Delete, Manage) */}
                      {(['view', 'create', 'edit', 'delete', 'manage'] as ActionKey[]).map((action, aIdx) => (
                        <td
                          key={action}
                          style={{
                            textAlign: 'center',
                            borderLeft: aIdx === 0 ? '1px solid #F1F5F9' : undefined
                          }}
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={row.shop_admin[action]}
                            aria-label={`Toggle ${action} for Shop Admin on ${row.module}`}
                            onClick={() => handleToggleCell(originalIndex, 'shop_admin', action)}
                            className={`gov-checkbox-btn ${row.shop_admin[action] ? 'checked-shop-admin' : ''}`}
                          >
                            {row.shop_admin[action] && <Check size={11} strokeWidth={3} />}
                          </button>
                        </td>
                      ))}

                      {/* Super Admin (5 sub-actions: View, Create, Edit, Delete, Manage) */}
                      {(['view', 'create', 'edit', 'delete', 'manage'] as ActionKey[]).map((action, aIdx) => (
                        <td
                          key={action}
                          style={{
                            textAlign: 'center',
                            background: 'rgba(250, 245, 255, 0.2)',
                            borderLeft: aIdx === 0 ? '1px solid #F1F5F9' : undefined
                          }}
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={row.super_admin[action]}
                            aria-label={`Toggle ${action} for Super Admin on ${row.module}`}
                            onClick={() => handleToggleCell(originalIndex, 'super_admin', action)}
                            className={`gov-checkbox-btn ${row.super_admin[action] ? 'checked-super-admin' : ''}`}
                          >
                            {row.super_admin[action] && <Check size={11} strokeWidth={3} />}
                          </button>
                        </td>
                      ))}

                      {/* Quick Action: Unlock This Module */}
                      <td style={{ textAlign: 'center', borderLeft: '1px solid #F1F5F9' }}>
                        <button
                          type="button"
                          onClick={() => handleGrantFullAccessRow(originalIndex)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#1E40AF',
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                          title={`Grant full access to ${row.module} for all roles`}
                        >
                          Unlock All
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED ROLE SPECIFICATIONS */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {/* Role selector pill list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(['super_admin', 'shop_admin', 'staff', 'user'] as UserRole[]).map(r => {
              const def = ROLE_DEFINITIONS[r]
              const isSelected = selectedRole === r
              return (
                <button
                  key={r}
                  type="button"
                  style={{
                    textAlign: 'left',
                    padding: '14px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => setSelectedRole(r)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>{def.displayName}</span>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: def.badgeColor
                      }}
                    />
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748B', lineHeight: 1.4 }}>
                    {def.scopeDescription}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Role Detail Card */}
          <div style={{
            gridColumn: 'span 2',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 4px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {currentRoleDef.displayName} Specification
                  </h2>
                  <span
                    style={{
                      padding: '2px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      backgroundColor: currentRoleDef.badgeColor
                    }}
                  >
                    Level {currentRoleDef.hierarchyLevel}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>{currentRoleDef.scopeDescription}</p>
              </div>
            </div>

            {/* Account Creation Method */}
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
              <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.4px' }}>
                Account Provisioning Method
              </strong>
              <p style={{ margin: 0, color: '#334155', lineHeight: 1.5 }}>{currentRoleDef.accountCreationMethod}</p>
            </div>

            {/* What They Can See */}
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} style={{ color: '#1E40AF' }} />
                Data & Surfaces Visible
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                {currentRoleDef.canSee.map((item, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#334155', background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB', marginTop: '5px', flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What They Can Do */}
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} style={{ color: '#059669' }} />
                Allowed Operational Capabilities
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                {currentRoleDef.canDo.map((item, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#334155', background: '#ECFDF5', padding: '10px', borderRadius: '8px', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', marginTop: '5px', flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What They Cannot Do */}
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <X size={14} style={{ color: '#DC2626' }} />
                Strict Operational Restrictions
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                {currentRoleDef.cannotDo.map((item, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#64748B', background: '#FEF2F2', padding: '10px', borderRadius: '8px', border: '1px solid #FECACA', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', marginTop: '5px', flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Code and Policy Evidence */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px', fontSize: '11px', color: '#64748B', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Code Evidence:</strong> {currentRoleDef.codeEvidence}</div>
              <div><strong>RLS Policy:</strong> {currentRoleDef.rlsEvidence}</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE USER ROSTER */}
      {activeTab === 'roster' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.05)' }}>
          {/* Roster Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search by name, ID, or outlet..."
                style={{ width: '100%', padding: '7px 12px 7px 32px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '8px', outline: 'none' }}
                value={rosterSearch}
                onChange={e => setRosterSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={13} style={{ color: '#94A3B8' }} />
              <select
                style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '8px', outline: 'none', background: '#FFFFFF' }}
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles ({usersList.length})</option>
                <option value="super_admin">Super Admin ({roleCounts.super_admin})</option>
                <option value="shop_admin">Shop Admin ({roleCounts.shop_admin})</option>
                <option value="staff">Shop Staff ({roleCounts.staff})</option>
                <option value="customer">Users ({roleCounts.user})</option>
              </select>
            </div>
          </div>

          {/* Roster Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', color: '#475569', borderBottom: '1px solid #E2E8F0', fontWeight: 700 }}>
                  <th style={{ padding: '12px 14px' }}>User</th>
                  <th style={{ padding: '12px 14px' }}>Role</th>
                  <th style={{ padding: '12px 14px' }}>Assigned Outlet</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'monospace' }}>Profile ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                      No matching user records found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const r = (u.role || '').toLowerCase()
                    const outletName = u.outlet_id ? (outletsMap[u.outlet_id] || u.outlet_id) : 'Global / Campus'
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>
                          {u.full_name || 'V Foods User'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: r === 'super_admin' ? '#F3E8FF' : r === 'shop_admin' ? '#FEF3C7' : r === 'staff' ? '#ECFDF5' : '#EFF6FF',
                            color: r === 'super_admin' ? '#6B21A8' : r === 'shop_admin' ? '#92400E' : r === 'staff' ? '#065F46' : '#1E40AF'
                          }}>
                            {r.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {outletName}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: '#059669' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} /> Active
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '11px', color: '#94A3B8' }}>
                          {u.id.substring(0, 12)}...
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
