import type { CelloStringId } from '../audio/notes'

export type ChartNote = {
  timeMs: number
  string: CelloStringId
  semitones: number
  finger?: 0 | 1 | 2 | 3 | 4
  position?: 1 | 2 | 3 | 4
}

export type Chart = {
  id: string
  title: string
  subtitle: string
  baseBpm: number
  notes: ChartNote[]
}

const beat = (bpm: number) => 60000 / bpm

function arpeggio(): ChartNote[] {
  const b = beat(72)
  const order: CelloStringId[] = ['C', 'G', 'D', 'A', 'D', 'G', 'C', 'G', 'D', 'A', 'A', 'D']
  return order.map((string, i) => ({
    timeMs: Math.round(i * b),
    string,
    semitones: 0,
    finger: 0 as const,
  }))
}

function firstPosition(): ChartNote[] {
  const b = beat(80)
  const seq: Array<[CelloStringId, number, 0 | 1 | 2 | 3 | 4]> = [
    ['D', 0, 0],
    ['D', 2, 1],
    ['D', 4, 3],
    ['D', 5, 4],
    ['A', 0, 0],
    ['A', 2, 1],
    ['A', 4, 3],
    ['A', 5, 4],
    ['A', 4, 3],
    ['A', 2, 1],
    ['A', 0, 0],
    ['D', 5, 4],
    ['D', 4, 3],
    ['D', 2, 1],
    ['D', 0, 0],
    ['G', 0, 0],
  ]
  return seq.map(([string, semitones, finger], i) => ({
    timeMs: Math.round(i * b),
    string,
    semitones,
    finger,
    position: 1 as const,
  }))
}

function openRhythm(): ChartNote[] {
  const b = beat(88)
  const pattern: Array<[number, CelloStringId]> = [
    [0, 'G'],
    [1, 'G'],
    [1.5, 'D'],
    [2, 'G'],
    [3, 'D'],
    [4, 'C'],
    [4.5, 'C'],
    [5, 'G'],
    [6, 'D'],
    [6.5, 'A'],
    [7, 'A'],
    [8, 'C'],
    [9, 'G'],
    [9.5, 'D'],
    [10, 'A'],
    [11, 'A'],
  ]
  return pattern.map(([bt, string]) => ({
    timeMs: Math.round(bt * b),
    string,
    semitones: 0,
    finger: 0 as const,
  }))
}

/** 识谱练习：看低音谱号五线谱，点对应弦 */
function staffReading(): ChartNote[] {
  const b = beat(70)
  const seq: Array<[CelloStringId, number, 0 | 1 | 2 | 3 | 4]> = [
    ['C', 0, 0],
    ['G', 0, 0],
    ['D', 0, 0],
    ['A', 0, 0],
    ['D', 2, 1],
    ['D', 4, 3],
    ['A', 0, 0],
    ['A', 2, 1],
    ['G', 2, 1],
    ['G', 4, 3],
    ['C', 0, 0],
    ['G', 0, 0],
    ['D', 0, 0],
    ['A', 0, 0],
    ['D', 5, 4],
    ['A', 0, 0],
  ]
  return seq.map(([string, semitones, finger], i) => ({
    timeMs: Math.round(i * b),
    string,
    semitones,
    finger,
    position: 1 as const,
  }))
}

export const CHARTS: Chart[] = [
  {
    id: 'staff-reading',
    title: '识五线谱',
    subtitle: '看低音谱号 · 点对应琴弦',
    baseBpm: 70,
    notes: staffReading(),
  },
  {
    id: 'arpeggio',
    title: '空弦琶音',
    subtitle: 'C - G - D - A 四空弦运弓',
    baseBpm: 72,
    notes: arpeggio(),
  },
  {
    id: 'first-position',
    title: '第一把位音阶',
    subtitle: 'D弦上行 · 跨弦到 A弦',
    baseBpm: 80,
    notes: firstPosition(),
  },
  {
    id: 'open-rhythm',
    title: '空弦节奏练习',
    subtitle: '四分 + 八分混合节奏',
    baseBpm: 88,
    notes: openRhythm(),
  },
]
