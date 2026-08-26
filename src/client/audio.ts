/**
 * Web Audio engine for the 20 notification sounds.
 * Canonical spec: mockup/index.html (approved by Alon) — note() and PLAYERS
 * are copied verbatim from it, only typed.
 */
import type { SoundId } from '../sound-ids'

interface Vibrato {
  rate: number
  depth: number
}

interface NoteOptions {
  freq: number
  dur: number
  at?: number
  glideTo?: number
  type?: OscillatorType
  gain?: number
  attack?: number
  vibrato?: Vibrato
}

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let currentVolume = 80

/** Perceptual-ish volume curve, copied from the approved mockup. */
function volumeToGain(v: number): number {
  return Math.pow(v / 100, 1.5) * 0.9
}

/** Lazily create the AudioContext; resume it when suspended (autoplay policy). */
export function ensureAudio(): void {
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    audioCtx = new Ctor()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = volumeToGain(currentVolume)
    masterGain.connect(audioCtx.destination)
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume()
}

/** Update the master gain; takes effect for the next note even before first play. */
export function setVolume(volume: number): void {
  currentVolume = volume
  if (masterGain) masterGain.gain.value = volumeToGain(volume)
}

/** One oscillator note: exponential decay envelope, optional pitch glide and vibrato. */
function note(opts: NoteOptions): void {
  const ctx = audioCtx
  const master = masterGain
  if (!ctx || !master) return
  const t0 = ctx.currentTime + (opts.at ?? 0)
  const dur = opts.dur
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(opts.freq, t0)
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t0 + dur)
  const peak = typeof opts.gain === 'number' ? opts.gain : 0.3
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack ?? 0.008))
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain)
  gain.connect(master)
  if (opts.vibrato) {
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = opts.vibrato.rate
    lfoGain.gain.value = opts.vibrato.depth
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)
    lfo.start(t0)
    lfo.stop(t0 + dur + 0.05)
  }
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

const PLAYERS = {
  'soft-ping': () => {
    note({ freq: 880, dur: 0.4, gain: 0.3 })
  },
  'blip': () => {
    note({ freq: 520, glideTo: 390, dur: 0.09, type: 'triangle', gain: 0.4 })
  },
  'tick': () => {
    note({ freq: 1900, dur: 0.035, gain: 0.12 })
  },
  'pulse': () => {
    note({ freq: 660, dur: 0.08, gain: 0.3 })
    note({ freq: 660, at: 0.12, dur: 0.09, gain: 0.3 })
  },
  'bubble-pop': () => {
    note({ freq: 420, glideTo: 1050, dur: 0.07, gain: 0.5 })
    note({ freq: 1600, at: 0.06, dur: 0.03, gain: 0.18 })
  },
  'double-pop': () => {
    note({ freq: 420, glideTo: 1050, dur: 0.07, gain: 0.5 })
    note({ freq: 1600, at: 0.06, dur: 0.03, gain: 0.18 })
    note({ freq: 420, at: 0.11, glideTo: 1050, dur: 0.07, gain: 0.5 })
    note({ freq: 1600, at: 0.17, dur: 0.03, gain: 0.18 })
  },
  'plop': () => {
    note({ freq: 430, glideTo: 160, dur: 0.12, gain: 0.5 })
  },
  'bloop': () => {
    note({ freq: 290, glideTo: 540, dur: 0.16, type: 'triangle', gain: 0.45 })
  },
  'wobble': () => {
    note({ freq: 440, dur: 0.3, gain: 0.32, vibrato: { rate: 14, depth: 38 } })
  },
  'chime': () => {
    note({ freq: 659.25, dur: 0.5, gain: 0.3 })
    note({ freq: 880, at: 0.12, dur: 0.6, gain: 0.32 })
  },
  'bell': () => {
    note({ freq: 784, dur: 0.8, gain: 0.28 })
    note({ freq: 1568, dur: 0.5, gain: 0.1 })
    note({ freq: 2352, dur: 0.3, gain: 0.05 })
  },
  'crystal': () => {
    note({ freq: 1568, dur: 0.35, gain: 0.24 })
    note({ freq: 3136, dur: 0.2, gain: 0.06 })
  },
  'music-box': () => {
    note({ freq: 1046.5, dur: 0.3, gain: 0.26 })
    note({ freq: 1318.5, at: 0.13, dur: 0.3, gain: 0.26 })
    note({ freq: 1568, at: 0.26, dur: 0.4, gain: 0.26 })
  },
  'wind-chime': () => {
    note({ freq: 1318.5, dur: 0.4, gain: 0.16 })
    note({ freq: 1760, at: 0.09, dur: 0.4, gain: 0.16 })
    note({ freq: 2093, at: 0.18, dur: 0.4, gain: 0.16 })
    note({ freq: 2637, at: 0.27, dur: 0.45, gain: 0.16 })
  },
  'rise': () => {
    note({ freq: 300, glideTo: 1200, dur: 0.25, gain: 0.3 })
  },
  'complete': () => {
    note({ freq: 523.25, dur: 0.35, gain: 0.3 })
    note({ freq: 659.25, at: 0.09, dur: 0.35, gain: 0.3 })
    note({ freq: 784, at: 0.18, dur: 0.45, gain: 0.3 })
  },
  'climb': () => {
    note({ freq: 523.25, dur: 0.25, gain: 0.26 })
    note({ freq: 587.33, at: 0.07, dur: 0.25, gain: 0.26 })
    note({ freq: 659.25, at: 0.14, dur: 0.25, gain: 0.26 })
    note({ freq: 784, at: 0.21, dur: 0.3, gain: 0.26 })
  },
  'sparkle': () => {
    note({ freq: 1568, dur: 0.2, gain: 0.14 })
    note({ freq: 2093, at: 0.06, dur: 0.2, gain: 0.14 })
    note({ freq: 2637, at: 0.12, dur: 0.25, gain: 0.14 })
  },
  'alert': () => {
    note({ freq: 880, dur: 0.12, type: 'square', gain: 0.1 })
    note({ freq: 659.25, at: 0.16, dur: 0.18, type: 'square', gain: 0.1 })
  },
  'knock': () => {
    note({ freq: 150, glideTo: 90, dur: 0.08, gain: 0.6 })
    note({ freq: 150, at: 0.18, glideTo: 90, dur: 0.09, gain: 0.6 })
  },
} satisfies Record<SoundId, () => void>

/** Play one of the 20 notification sounds by id; unknown ids are ignored. */
export function playSound(id: string): void {
  ensureAudio()
  const player = PLAYERS[id as SoundId]
  if (player) player()
}
