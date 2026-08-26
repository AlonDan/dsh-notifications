/** The 20 notification sound ids (canonical order, shared by Host schema and client). */
export const SOUND_IDS = [
  'soft-ping',
  'blip',
  'tick',
  'pulse',
  'bubble-pop',
  'double-pop',
  'plop',
  'bloop',
  'wobble',
  'chime',
  'bell',
  'crystal',
  'music-box',
  'wind-chime',
  'rise',
  'complete',
  'climb',
  'sparkle',
  'alert',
  'knock',
] as const

/** One of the 20 notification sound ids. */
export type SoundId = (typeof SOUND_IDS)[number]
