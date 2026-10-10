import React from 'react'
import { Drawer } from 'vaul'
import { cn } from '../../lib/utils'

export function Sheet({ open, onOpenChange, children, trigger, title, description, className }) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 transition-opacity" />
        <Drawer.Content
          className={cn(
            'bg-white fixed bottom-0 left-0 right-0 z-50 mt-24 flex flex-col rounded-t-[24px] border-t border-[#E2E8F0] max-h-[90vh] shadow-[0_-8px_30px_rgba(15,23,42,0.12)] focus:outline-none',
            className
          )}
        >
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-300 my-3" />
          {(title || description) && (
            <div className="px-5 pb-2 text-center border-b border-[#F1F5F9]">
              {title && <Drawer.Title className="text-base font-bold text-[#0F172A]">{title}</Drawer.Title>}
              {description && <Drawer.Description className="text-xs text-[#64748B] mt-0.5">{description}</Drawer.Description>}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
