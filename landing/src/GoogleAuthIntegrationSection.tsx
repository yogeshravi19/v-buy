import React, { useState } from 'react'
import {
  Shield, CheckCircle2, Lock, Globe, Key, Database,
  ArrowRight, Sparkles, ExternalLink, Terminal, Cpu, RefreshCw
} from 'lucide-react'

export const GoogleAuthIntegrationSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'flow' | 'dual' | 'security' | 'code'>('flow')

  const flowSteps = [
    {
      num: '01',
      title: 'User Clicks "Continue with Google"',
      actor: 'Frontend Web App (vfoods.onrender.com)',
      desc: 'The client initiates a secure OAuth 2.0 PKCE challenge via Supabase client, dynamically passing window.location.origin as the redirect target.',
      badge: 'Client Origin',
      color: 'border-blue-500/40 bg-blue-50/50 text-blue-700',
    },
    {
      num: '02',
      title: 'Google Cloud Identity Handshake',
      actor: 'Google Accounts (accounts.google.com)',
      desc: 'User approves consent on Google Auth Platform. Verified against Web Client ID and Authorised JavaScript origin (https://vfoods.onrender.com).',
      badge: 'OAuth 2.0 Auth Code',
      color: 'border-amber-500/40 bg-amber-50/50 text-amber-700',
    },
    {
      num: '03',
      title: 'Supabase Auth Broker Exchange',
      actor: 'Supabase Cloud (/auth/v1/callback)',
      desc: 'The authorization code is securely exchanged with Google OAuth servers for identity claims (email, name, picture, sub). No secrets ever exposed to browser.',
      badge: 'Secure Callback',
      color: 'border-emerald-500/40 bg-emerald-50/50 text-emerald-700',
    },
    {
      num: '04',
      title: 'PostgreSQL Profile & Wallet Sync',
      actor: 'Supabase Database (PostgreSQL 15)',
      desc: 'Database trigger atomically provisions a public.profiles record with role = "customer", initial encrypted wallet, and mirrors to public.app_users view.',
      badge: 'Atomic Trigger',
      color: 'border-indigo-500/40 bg-indigo-50/50 text-indigo-700',
    },
    {
      num: '05',
      title: 'Worldwide Redirect & Session Storage',
      actor: 'Live Web App Dashboard',
      desc: 'Browser receives JWT session tokens and navigates instantly to https://vfoods.onrender.com. Ready to pre-order food from any device worldwide.',
      badge: 'Worldwide Session',
      color: 'border-cyan-500/40 bg-cyan-50/50 text-cyan-700',
    },
  ]

  const dualPathComparison = [
    {
      feature: 'Primary Identifier',
      pathA: '10-digit Indian Mobile Number / Email',
      pathB: 'Google Account (Gmail / Workspace)',
    },
    {
      feature: 'Authentication Credential',
      pathA: 'Bcrypt-hashed password',
      pathB: 'Cryptographic OAuth 2.0 JWT with Google Signature',
    },
    {
      feature: 'Registration Friction',
      pathA: 'Manual entry: Full Name, Phone, Password',
      pathB: 'Zero friction: 1-Click Instant Login',
    },
    {
      feature: 'Profile Provisioning',
      pathA: 'Explicit database insert on form submission',
      pathB: 'Automated Supabase Auth trigger on initial login',
    },
    {
      feature: 'Campus Role Default',
      pathA: 'role: "customer" (accessible via app_users view)',
      pathB: 'role: "customer" (accessible via app_users view)',
    },
    {
      feature: 'Supported Platforms',
      pathA: 'All browsers, iOS, Android, PWA',
      pathB: 'Worldwide on any browser, phone, tablet, or desktop',
    },
  ]

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B192C] via-[#0F2540] to-[#1E3E62] text-white p-6 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Enterprise Authentication
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <CheckCircle2 size={12} />
                Live in Production
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Worldwide Google OAuth 2.0 &amp; Unified Authentication
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl">
              Complete architectural walkthrough of how V Foods integrates Google Cloud Identity, Supabase OAuth broker, and PostgreSQL Row-Level Security for seamless dining access.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15">
            <Globe className="w-4 h-4 text-cyan-300 animate-spin-slow" />
            <span className="text-xs font-mono text-cyan-200">vfoods.onrender.com</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-white/10">
          {[
            { id: 'flow', label: 'OAuth 2.0 PKCE Handshake Flow', icon: RefreshCw },
            { id: 'dual', label: 'Dual-Path Auth Protocol', icon: Shield },
            { id: 'security', label: 'Cloud Infrastructure & Origins', icon: Lock },
            { id: 'code', label: 'Implementation Snippet', icon: Terminal },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-brand-700' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Body */}
      <div className="p-6 sm:p-10 bg-slate-50/50">
        {/* 1. FLOW TAB */}
        {activeTab === 'flow' && (
          <div className="space-y-6">
            <div className="max-w-2xl mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                5-Step Automated OAuth Handshake Protocol
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Zero passwords required. Every login cryptographically signs and provisions user profiles securely.
              </p>
            </div>

            <div className="grid gap-4">
              {flowSteps.map((s, idx) => (
                <div
                  key={s.num}
                  className={`p-5 rounded-2xl bg-white border ${s.color} shadow-xs transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4`}
                >
                  <div className="flex items-start gap-4">
                    <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {s.num}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">{s.title}</h4>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {s.actor}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono px-3 py-1 rounded-lg bg-slate-100 text-slate-800 shrink-0 self-start md:self-center">
                    {s.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. DUAL-PATH TAB */}
        {activeTab === 'dual' && (
          <div className="space-y-6">
            <div className="max-w-2xl mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                Unified Authentication Matrix (Path A vs. Path B)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                V Foods offers flexibility: students and faculty can log in via standard mobile number/password or single-click Google accounts.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#0B192C] text-white">
                  <tr>
                    <th className="p-4 font-bold">Feature</th>
                    <th className="p-4 font-bold text-amber-300">Path A: Mobile Number &amp; Password</th>
                    <th className="p-4 font-bold text-cyan-300">Path B: 1-Click Google OAuth 2.0</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dualPathComparison.map((row, idx) => (
                    <tr key={row.feature} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="p-4 font-bold text-slate-900">{row.feature}</td>
                      <td className="p-4">{row.pathA}</td>
                      <td className="p-4 font-medium text-slate-900">{row.pathB}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="max-w-2xl mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                Institutional Security &amp; Cloud Origin Configuration
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Cryptographic trust boundaries established across Google Cloud Platform, Supabase, and Render Global CDN.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Key size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Google Cloud Platform</h4>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Authorised Origin:</strong> <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded">https://vfoods.onrender.com</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>OAuth Redirect URI:</strong> <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded">supabase.co/auth/v1/callback</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Scope:</strong> OpenID, Profile, Email</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Database size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Supabase Auth Broker</h4>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Site URL:</strong> <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded">https://vfoods.onrender.com</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Allowed Redirects:</strong> Wildcard pattern <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded">https://vfoods.onrender.com/**</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Token Lifetime:</strong> 3600s with auto-refresh</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Shield size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-900">PostgreSQL Relational Views</h4>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>app_users View:</strong> Filtered for <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded">role = 'customer'</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Security Invoker:</strong> Set to <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded">ON</code> to inherit caller RLS</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Zero Student Leaks:</strong> Legacy college IDs purged from DB</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 4. CODE TAB */}
        {activeTab === 'code' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Production TypeScript Client Implementation</h3>
                <p className="text-xs text-slate-500">Live code running in the frontend bundle at vfoods.onrender.com</p>
              </div>
              <span className="text-[11px] font-mono px-2 py-1 bg-slate-200 text-slate-800 rounded-md font-semibold">
                src/components/UnifiedAuthModal.tsx
              </span>
            </div>

            <div className="bg-[#0B192C] text-slate-200 rounded-2xl p-5 font-mono text-xs overflow-x-auto border border-[#1E3E62] leading-relaxed">
              <pre>{`// 1. Dynamic Origin-Aware OAuth Sign-In
const handleGoogleSignIn = async () => {
  setIsLoading(true)
  setError(null)
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Automatically adapts to https://vfoods.onrender.com in production
        // or http://localhost:5173 during local tests
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
  } catch (err: any) {
    setError(err.message || 'Google sign-in encountered an issue.')
    setIsLoading(false)
  }
}

// 2. Auth State Observer & Auto Profile Provisioning
useEffect(() => {
  const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      // Profile sync handled atomically server-side via Supabase auth hook
      setUser(session.user)
    }
  })
  return () => authListener.subscription.unsubscribe()
}, [])`}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer Callout */}
      <div className="bg-slate-100 border-t border-slate-200 p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Tested &amp; Verified Worldwide
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-600">
              Users on any phone, laptop, or browser in the world can authenticate seamlessly.
            </p>
          </div>
        </div>

        <a
          href="https://vfoods.onrender.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0B192C] text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <span>Test Live at vfoods.onrender.com</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}
