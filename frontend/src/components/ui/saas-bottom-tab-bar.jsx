import React, { useState } from 'react'
import { Menu, X, LogOut, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { lightHaptic } from '../../lib/haptics'

export function SaasBottomTabBar({
  primaryTabs = [],
  moreTabs = [],
  activeTab,
  onSelectTab,
  currentUser,
  onSignOut,
  roleLabel = 'Staff'
}) {
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = moreTabs.some(t => t.id === activeTab)

  return (
    <>
      <nav
        className="saas-bottom-tab-bar fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A] border-t border-[#1E293B] flex items-stretch justify-around md:hidden"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          height: 'calc(58px + env(safe-area-inset-bottom, 0px))',
        }}
        aria-label="Mobile Bottom Navigation"
      >
        {primaryTabs.slice(0, 4).map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 transition-colors relative ${
                isActive ? 'text-[#38BDF8]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
              onClick={() => {
                lightHaptic()
                onSelectTab(tab.id)
              }}
              aria-label={tab.label}
            >
              <div className="relative">
                {Icon && <Icon size={18} strokeWidth={isActive ? 2.2 : 1.75} />}
                {tab.badge != null && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#DC2626] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}

        {/* 5th Tab: More Button */}
        <button
          type="button"
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 transition-colors relative ${
            isMoreActive || moreOpen ? 'text-[#38BDF8]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
          onClick={() => {
            lightHaptic()
            setMoreOpen(true)
          }}
          aria-label="More Navigation Options"
        >
          <div className="relative">
            <Menu size={18} strokeWidth={isMoreActive ? 2.2 : 1.75} />
            {moreTabs.some(t => t.badge != null && t.badge > 0) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#38BDF8]" />
            )}
          </div>
          <span className={`text-[10px] leading-tight ${isMoreActive ? 'font-bold' : 'font-medium'}`}>
            More
          </span>
        </button>
      </nav>

      {/* More Navigation Drawer / Sheet */}
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-[#0F172A] text-white border-[#1E293B]">
          <DialogHeader className="p-4 pb-3 border-b border-[#1E293B] flex-row items-center justify-between">
            <div className="space-y-0.5">
              <DialogTitle className="text-base font-bold text-white">More Navigation</DialogTitle>
              <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                <span>{currentUser?.full_name || 'User'}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[#1E293B] text-[#93C5FD]">
                  {roleLabel}
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Links list */}
          <div className="p-2 max-h-[60vh] overflow-y-auto divide-y divide-[#1E293B]/60">
            {moreTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                    isActive ? 'bg-[#1E293B] text-[#38BDF8] font-bold' : 'text-[#CBD5E1] hover:bg-[#1E293B]/50'
                  }`}
                  onClick={() => {
                    lightHaptic()
                    onSelectTab(tab.id)
                    setMoreOpen(false)
                  }}
                >
                  <div className="flex items-center gap-3">
                    {Icon && <Icon size={18} className={isActive ? 'text-[#38BDF8]' : 'text-[#94A3B8]'} />}
                    <span className="text-sm">{tab.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {tab.badge != null && (
                      <span className="bg-[#1E293B] border border-[#334155] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        {tab.badge}
                      </span>
                    )}
                    <ChevronRight size={15} className="text-[#64748B]" />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer with sign out */}
          {onSignOut && (
            <div className="p-3 border-t border-[#1E293B] bg-[#0B192C]">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#DC2626]/20 hover:bg-[#DC2626]/30 text-[#FCA5A5] font-semibold text-xs transition-colors"
                onClick={() => {
                  setMoreOpen(false)
                  onSignOut()
                }}
              >
                <LogOut size={15} />
                <span>Sign Out of {roleLabel}</span>
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
