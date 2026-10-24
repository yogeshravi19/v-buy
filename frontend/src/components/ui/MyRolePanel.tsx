import React from 'react'
import { ShieldCheck, CheckCircle2, XCircle, Mail, MapPin, ExternalLink, X } from 'lucide-react'
import { ROLE_DEFINITIONS, normalizeRole } from '../../lib/permissions'
import type { UserRole } from '../../lib/permissions'

interface MyRolePanelProps {
  currentUser: any
  isOpen: boolean
  onClose: () => void
  currentOutletName?: string
}

export const MyRolePanel: React.FC<MyRolePanelProps> = ({
  currentUser,
  isOpen,
  onClose,
  currentOutletName
}) => {
  if (!isOpen) return null

  const roleKey = normalizeRole(currentUser?.role)
  const roleDef = ROLE_DEFINITIONS[roleKey]
  const fullName = currentUser?.full_name || 'V Foods User'
  const email = currentUser?.email || 'Authenticated User'
  const outletScope = roleKey === 'super_admin'
    ? 'All Campuses & Outlets (Global Scope)'
    : (currentOutletName || currentUser?.outlet_name || currentUser?.outlet_id || 'Campus Wide Customer Access')

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-role-title"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0F172A] text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-soft"
              style={{ backgroundColor: roleDef.badgeColor }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="my-role-title" className="text-base font-bold text-white m-0">My Role & Access</h3>
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-white"
                  style={{ backgroundColor: roleDef.badgeColor }}
                >
                  {roleDef.displayName}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 m-0">{roleDef.scopeDescription}</p>
            </div>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Identity Details */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Logged in as: </span>
            <strong className="text-slate-800 font-semibold">{fullName}</strong>
            <span className="text-slate-400 font-mono ml-1">({email})</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            <MapPin size={12} className="text-blue-700" />
            <span className="font-semibold">{outletScope}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[68vh] overflow-y-auto">
          {/* Account Creation Method */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
            <span className="font-bold uppercase tracking-wider text-[10px] text-blue-700 block mb-1">
              Account Provisioning Method
            </span>
            <p className="m-0 leading-relaxed">{roleDef.accountCreationMethod}</p>
          </div>

          {/* What I can do */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              What You Can Do
            </h4>
            <ul className="space-y-1.5 m-0 p-0 list-none">
              {roleDef.canDo.map((item, idx) => (
                <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What I cannot do */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <XCircle size={14} className="text-red-600" />
              Explicit Operational Restrictions
            </h4>
            <ul className="space-y-1.5 m-0 p-0 list-none">
              {roleDef.cannotDo.map((item, idx) => (
                <li key={idx} className="text-xs text-slate-600 flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Access Request & Contact */}
          <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Need expanded permissions or outlet reassignment?</span>
            <a
              href="mailto:support@vfoods.campus.in?subject=V%20Foods%20Access%20Elevation%20Request"
              className="inline-flex items-center gap-1 font-semibold text-blue-800 hover:text-blue-900"
            >
              <Mail size={12} /> Contact Super Admin
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            className="btn btn-primary text-xs py-1.5 px-4"
            onClick={onClose}
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  )
}
