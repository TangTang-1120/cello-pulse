export type CelloStringId = 'C' | 'G' | 'D' | 'A'

export const A4_HZ = 440

export const CELLO_STRINGS: {
  id: CelloStringId
  name: string
  note: string
  midi: number
}[] = [
  { id: 'C', name: 'C 弦', note: 'C2', midi: 36 },
  { id: 'G', name: 'G 弦', note: 'G2', midi: 43 },
  { id: 'D', name: 'D 弦', note: 'D3', midi: 50 },
  { id: 'A', name: 'A 弦', note: 'A3', midi: 57 },
]

/** 把位图从左到右：粗→细 / Do Sol Ré La */
export const POSITION_STRINGS: {
  id: CelloStringId
  roman: 'IV' | 'III' | 'II' | 'I'
  pitchClass: number
}[] = [
  { id: 'C', roman: 'IV', pitchClass: 0 },
  { id: 'G', roman: 'III', pitchClass: 7 },
  { id: 'D', roman: 'II', pitchClass: 2 },
  { id: 'A', roman: 'I', pitchClass: 9 },
]

const SOLFEGE = ['Do', 'Do#', 'Ré', 'Mib', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'Sib', 'Si']

export function solfegeAt(pitchClass: number, semitones: number) {
  return SOLFEGE[(pitchClass + semitones) % 12]
}

export function midiToHz(midi: number, a4 = A4_HZ): number {
  return a4 * 2 ** ((midi - 69) / 12)
}

export function hzToMidi(hz: number, a4 = A4_HZ): number {
  return 69 + 12 * Math.log2(hz / a4)
}

export function centsOff(hz: number, targetHz: number): number {
  return 1200 * Math.log2(hz / targetHz)
}

export function semitonesFromOpen(hz: number, openMidi: number, a4 = A4_HZ) {
  return 12 * Math.log2(hz / midiToHz(openMidi, a4))
}

export function nearestFingerPosition(hz: number, a4 = A4_HZ) {
  const hits: {
    stringId: CelloStringId
    semitones: number
    cents: number
    label: string
  }[] = []

  for (const string of POSITION_STRINGS) {
    const open = CELLO_STRINGS.find((item) => item.id === string.id)!
    for (let semitones = 0; semitones <= 12; semitones++) {
      const cents = centsOff(hz, midiToHz(open.midi + semitones, a4))
      hits.push({
        stringId: string.id,
        semitones,
        cents,
        label: solfegeAt(string.pitchClass, semitones),
      })
    }
  }

  let minAbs = Infinity
  for (const hit of hits) {
    minAbs = Math.min(minAbs, Math.abs(hit.cents))
  }

  const samePitch = hits.filter((hit) => Math.abs(hit.cents) <= minAbs + 2)
  samePitch.sort((a, b) => {
    const byFret = a.semitones - b.semitones
    if (byFret !== 0) return byFret
    return Math.abs(a.cents) - Math.abs(b.cents)
  })

  return {
    ...samePitch[0],
    matches: hits.filter((hit) => Math.abs(hit.cents) <= 15),
  }
}

export function nearestCelloString(hz: number, a4 = A4_HZ) {
  let best = CELLO_STRINGS[0]
  let bestAbs = Infinity
  for (const string of CELLO_STRINGS) {
    const abs = Math.abs(centsOff(hz, midiToHz(string.midi, a4)))
    if (abs < bestAbs) {
      bestAbs = abs
      best = string
    }
  }
  return best
}

export function rms(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}
