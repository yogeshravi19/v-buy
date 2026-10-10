import React from 'react'
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        className: 'rounded-[14px] border border-[#E2E8F0] bg-white text-[#0F172A] shadow-[0_10px_25px_-5px_rgba(15,23,42,0.1)] text-xs font-medium p-3.5',
        style: {
          fontFamily: 'inherit',
        },
      }}
    />
  )
}

export const toast = {
  success: (msg, opts) => sonnerToast.success(msg, { duration: 2500, ...opts }),
  error: (msg, opts) => sonnerToast.error(msg, { duration: 3500, ...opts }),
  info: (msg, opts) => sonnerToast(msg, { duration: 2500, ...opts }),
}
