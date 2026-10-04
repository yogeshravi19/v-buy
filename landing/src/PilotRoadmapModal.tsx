import React, { useState } from 'react'
import {
  Calendar, CheckCircle2, Tablet, Printer,
  Sparkles, Send, X, ArrowRight, ShieldCheck, Mail
} from 'lucide-react'

interface PilotRoadmapProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const WaitlistModal: React.FC<PilotRoadmapProps> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    canteen: 'Gazebo C1',
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {!submitted ? (
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>EARLY ACCESS PILOT</span>
            </div>
            <h4 className="text-xl font-extrabold text-slate-900 mb-1">Join the V Foods Campus Pilot</h4>
            <p className="text-xs text-slate-600 mb-5">
              Be the first to skip lines at Gazebo C1 and North Square with early wallet perks.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Alex Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Campus Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="alex.sharma@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                  >
                    <option value="student">User / Student</option>
                    <option value="vendor">Canteen Owner</option>
                    <option value="faculty">Faculty / Staff</option>
                    <option value="admin">University Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Fav Canteen</label>
                  <select
                    value={formData.canteen}
                    onChange={e => setFormData({ ...formData, canteen: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                  >
                    <option value="Gazebo C1">Gazebo C1</option>
                    <option value="North Square">North Square</option>
                    <option value="Main Canteen">Main Canteen</option>
                    <option value="Riviera Stalls">Riviera Food Stalls</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all mt-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Reserve My Pilot Access</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">You're On the Priority List!</h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              We've reserved your slot for <strong>{formData.canteen}</strong>. We will email <strong>{formData.email}</strong> when your invite token unlocks.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export const PilotRoadmapSection: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false)

  const steps = [
    {
      phase: 'Phase 1 • Weeks 1–2',
      title: 'Initial 2-Canteen Pilot',
      desc: 'Deploy at Gazebo C1 and North Square with 300 active student testers to validate queue reduction under peak lunch loads.',
      badge: 'Current Stage',
      active: true,
    },
    {
      phase: 'Phase 2 • Weeks 3–4',
      title: 'Full Campus Canteen Rollout',
      desc: 'Onboard all 13 campus dining halls, food courts, and hostel night mess tuck shops with vendor tablet hardware.',
      badge: 'Next Up',
      active: false,
    },
    {
      phase: 'Phase 3 • Fest Scaling',
      title: 'Riviera & Gravitas Mega-Stalls',
      desc: 'Scale high-concurrency order routing across 20+ temporary fest stalls serving 15,000+ university attendees without network crashes.',
      badge: 'Scale Horizon',
      active: false,
    },
  ]

  return (
    <div className="space-y-12">
      <WaitlistModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 mb-3">
          <Calendar className="w-3.5 h-3.5" />
          <span>PILOT ROADMAP &amp; HARDWARE</span>
        </div>
        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          From Gazebo C1 to Campus-Wide Operations
        </h3>
        <p className="text-slate-600 text-sm sm:text-base mt-2">
          Structured phased deployment ensuring operational excellence, vendor buy-in, and zero server downtime.
        </p>
      </div>

      {/* 3-Step Timeline */}
      <div className="grid md:grid-cols-3 gap-6">
        {steps.map(step => (
          <div
            key={step.title}
            className={`p-6 rounded-3xl border text-left flex flex-col justify-between ${
              step.active
                ? 'bg-white border-brand-500 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/30'
                : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">{step.phase}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    step.active
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {step.badge}
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">{step.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Zero vendor setup fee</span>
              {step.active && <span className="text-brand-700 font-bold">Active Pilot</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Device & Canteen Onboarding Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="text-xs font-bold text-brand-700 uppercase tracking-wider block mb-2">Zero Specialty Hardware</span>
            <h4 className="text-xl font-bold text-slate-900 mb-3">
              Runs in Any Modern Web Browser or Tablet
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
              Canteens don't need expensive proprietary POS terminals. Kitchen staff can open the KDS display on any tablet, mobile screen, or counter laptop.
            </p>
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero hardware lock-in: standard browser PWA</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Web Audio chimes alert kitchen staff automatically on new orders</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Real-time WebSocket sync over standard campus Wi-Fi or mobile data</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-4">
            <h5 className="text-sm font-bold text-slate-900">Join the Pilot as a Canteen or Student</h5>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Get direct priority onboarding for your canteen stall or early access as a pilot student user.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Join Campus Early Access</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
