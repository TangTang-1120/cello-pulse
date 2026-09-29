import {
  CELLO_STRINGS,
  POSITION_STRINGS,
  solfegeAt,
  type CelloStringId,
} from '../audio/notes'

export const LANE_STRINGS = POSITION_STRINGS

export function stringMeta(id: CelloStringId) {
  const lane = LANE_STRINGS.find((item) => item.id === id)!
  const open = CELLO_STRINGS.find((item) => item.id === id)!
  return { ...lane, ...open }
}

export function noteLetter(stringId: CelloStringId, semitones: number) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const open = CELLO_STRINGS.find((item) => item.id === stringId)!
  return names[(open.midi + semitones) % 12]
}

export function noteLabel(stringId: CelloStringId, semitones: number) {
  const open = CELLO_STRINGS.find((item) => item.id === stringId)!
  // Fixed-do from C: C=do, D=re, E=mi, F=fa, G=so, A=la, B=xi
  const solfege = solfegeAt(0, (open.midi + semitones) % 12)
  return {
    letter: noteLetter(stringId, semitones),
    solfege,
    midi: open.midi + semitones,
  }
}

export function fingerLabel(finger?: number, position?: number) {
  if (finger === 0 || finger === undefined) return '空弦'
  return `${finger}指 · 第${position ?? 1}把位`
}

/** Bass clef: bottom line = G2 (midi 43). One step = 1 diatonic degree ≈ staff half-space. */
export function midiToStaffSteps(midi: number) {
  // Map chromatic MIDI to diatonic steps from C0 for staff placement
  const pc = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const diatonic = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][pc]
  return octave * 7 + diatonic
}

/** Y offset in staff spaces: 0 = middle line (D3), positive = lower */
export function staffYFromMidi(midi: number, lineGap = 10) {
  const middle = midiToStaffSteps(50) // D3 middle line of bass staff
  const steps = midiToStaffSteps(midi)
  return (middle - steps) * (lineGap / 2)
}

export function playTap(kind: 'perfect' | 'good' | 'miss' | 'count') {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = playTap.ctx ?? (playTap.ctx = new Ctx())
  const t = ctx.currentTime
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.value =
    kind === 'perfect' ? 880 : kind === 'good' ? 660 : kind === 'count' ? 520 : 180
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(kind === 'miss' ? 0.04 : 0.08, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'miss' ? 0.18 : 0.12))
  o.connect(g)
  g.connect(ctx.destination)
  o.start(t)
  o.stop(t + 0.2)
}
playTap.ctx = null as AudioContext | null
