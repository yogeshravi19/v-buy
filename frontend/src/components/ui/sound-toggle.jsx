import React, { useState, useEffect, useCallback } from 'react'
import { Volume2, VolumeX, Eye } from 'lucide-react'
import { Button } from './button'
import { cn } from '../../lib/utils'

let sharedAudioCtx = null

/**
 * Generates a calm, gentle two-note harmonic chime (880Hz -> 1100Hz)
 * using standard Web Audio API synthesis without external files.
 */
export function playGentleChime() {
  try {
    const isMuted = localStorage.getItem('vfoods_sound_muted') === 'true'
    if (isMuted) return

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    if (!sharedAudioCtx || sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx = new AudioContextClass()
    }

    const ctx = sharedAudioCtx
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
      return
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    // First gentle note: A5 (880Hz)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    // Second note: C#6 (1100Hz) after 110ms
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.11)

    // Soft attack & decay
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.46)
  } catch (_) {
    // Silent fallback
  }
}

/**
 * Screen Wake Lock hook for kitchen operations consoles
 */
export function useScreenWakeLock() {
  const [isLocked, setIsLocked] = useState(false)

  const requestLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await navigator.wakeLock.request('screen')
        setIsLocked(true)
        lock.addEventListener('release', () => setIsLocked(false))
      }
    } catch (_) {
      setIsLocked(false)
    }
  }, [])

  useEffect(() => {
    requestLock()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [requestLock])

  return { isLocked, requestLock }
}

export function SoundToggle({ className }) {
  const [muted, setMuted] = useState(() => localStorage.getItem('vfoods_sound_muted') === 'true')
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem('vfoods_audio_unlocked') === 'true')

  const toggleSound = () => {
    const next = !muted
    setMuted(next)
    localStorage.setItem('vfoods_sound_muted', String(next))
    if (!next) {
      playGentleChime()
    }
  }

  const unlockAudio = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) {
        sharedAudioCtx = new AudioContextClass()
        sharedAudioCtx.resume()
      }
      setUnlocked(true)
      localStorage.setItem('vfoods_audio_unlocked', 'true')
      playGentleChime()
    } catch (_) {
      setUnlocked(true)
    }
  }

  if (!unlocked) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={unlockAudio}
        className={cn('text-xs text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100', className)}
      >
        <Volume2 size={14} className="text-blue-600" />
        <span>Turn on order sound</span>
      </Button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleSound}
      title={muted ? 'Unmute order chimes' : 'Mute order chimes'}
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded-[9px] border transition-colors',
        muted ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-blue-50 border-blue-200 text-blue-700',
        className
      )}
    >
      {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
    </button>
  )
}
