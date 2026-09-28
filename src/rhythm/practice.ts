import { CELLO_STRINGS, midiToHz, type CelloStringId } from '../audio/notes'
import { LANE_STRINGS } from './music'

/** Professional string colors (common cello pedagogy: thick→thin). */
export const STRING_COLOR: Record<CelloStringId, string> = {
  C: '#c45c26',
  G: '#d4a017',
  D: '#2f6fed',
  A: '#1a9f5c',
}

export function targetHz(stringId: CelloStringId, semitones: number) {
  const open = CELLO_STRINGS.find((item) => item.id === stringId)!
  return midiToHz(open.midi + semitones)
}

export function playReference(stringId: CelloStringId, semitones: number, seconds = 0.9) {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = playReference.ctx ?? (playReference.ctx = new Ctx())
  void ctx.resume()
  const t0 = ctx.currentTime
  const freq = targetHz(stringId, semitones)
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sawtooth'
  o.frequency.value = freq
  // soft lowpass-ish via gain envelope (cello-ish attack)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.04)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds)
  o.connect(g)
  g.connect(ctx.destination)
  o.start(t0)
  o.stop(t0 + seconds + 0.02)
}

playReference.ctx = null as AudioContext | null

export function fingerboardSlot(stringId: CelloStringId, semitones: number) {
  const col = LANE_STRINGS.findIndex((s) => s.id === stringId)
  return { col, row: Math.min(7, Math.max(0, semitones)) }
}
