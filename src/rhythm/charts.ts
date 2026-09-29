import type { CelloStringId } from '../audio/notes'

export type ChartNote = {
  timeMs: number
  string: CelloStringId
  semitones: number
  finger?: 0 | 1 | 2 | 3 | 4
  position?: 1 | 2 | 3 | 4
}

export type ChartKind = 'scale' | 'etude' | 'piece'

export type Chart = {
  id: string
  title: string
  subtitle: string
  kind: ChartKind
  baseBpm: number
  notes: ChartNote[]
}

export const KIND_LABEL: Record<ChartKind, string> = {
  scale: '音阶',
  etude: '练习曲',
  piece: '乐曲',
}

type Step = [CelloStringId, number, 0 | 1 | 2 | 3 | 4]

const beat = (bpm: number) => 60000 / bpm

function fromSteps(seq: Step[], bpm = 50, beatUnits?: number[]): ChartNote[] {
  const b = beat(bpm)
  let t = 0
  return seq.map(([string, semitones, finger], i) => {
    const note: ChartNote = {
      timeMs: Math.round(t),
      string,
      semitones,
      finger,
      position: 1,
    }
    t += b * (beatUnits?.[i] ?? 1)
    return note
  })
}

/** —— 音阶（第一把位）—— */

/** C 大调一octave：do re mi fa so la xi do */
function scaleCMajor(): ChartNote[] {
  const up: Step[] = [
    ['C', 0, 0],
    ['C', 2, 1],
    ['C', 4, 3],
    ['C', 5, 4],
    ['G', 0, 0],
    ['G', 2, 1],
    ['G', 4, 3],
    ['G', 5, 4],
  ]
  const down = [...up].reverse().slice(1)
  return fromSteps([...up, ...down])
}

/** G 大调：so la xi do re mi #fa so（从 G 弦） */
function scaleGMajor(): ChartNote[] {
  const up: Step[] = [
    ['G', 0, 0],
    ['G', 2, 1],
    ['G', 4, 3],
    ['G', 5, 4],
    ['D', 0, 0],
    ['D', 2, 1],
    ['D', 4, 3],
    ['D', 5, 4],
  ]
  const down = [...up].reverse().slice(1)
  return fromSteps([...up, ...down])
}

/** D 大调：re mi #fa so la xi #do re */
function scaleDMajor(): ChartNote[] {
  const up: Step[] = [
    ['D', 0, 0],
    ['D', 2, 1],
    ['D', 4, 3],
    ['D', 5, 4],
    ['A', 0, 0],
    ['A', 2, 1],
    ['A', 4, 3],
    ['A', 5, 4],
  ]
  const down = [...up].reverse().slice(1)
  return fromSteps([...up, ...down])
}

/** A 大调片段（A 弦第一把位） */
function scaleAMajor(): ChartNote[] {
  const seq: Step[] = [
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
  ]
  return fromSteps(seq)
}

/** —— 练习曲（原创短练习，非版权曲）—— */

function etudeOpenStrings(): ChartNote[] {
  const seq: Step[] = [
    ['C', 0, 0],
    ['G', 0, 0],
    ['D', 0, 0],
    ['A', 0, 0],
    ['A', 0, 0],
    ['D', 0, 0],
    ['G', 0, 0],
    ['C', 0, 0],
    ['G', 0, 0],
    ['D', 0, 0],
    ['G', 0, 0],
    ['D', 0, 0],
    ['A', 0, 0],
    ['D', 0, 0],
    ['A', 0, 0],
    ['A', 0, 0],
  ]
  return fromSteps(seq)
}

function etudeStringCrossing(): ChartNote[] {
  const seq: Step[] = [
    ['D', 0, 0],
    ['A', 0, 0],
    ['D', 0, 0],
    ['A', 0, 0],
    ['G', 0, 0],
    ['D', 0, 0],
    ['G', 0, 0],
    ['D', 0, 0],
    ['C', 0, 0],
    ['G', 0, 0],
    ['C', 0, 0],
    ['G', 0, 0],
    ['D', 2, 1],
    ['A', 0, 0],
    ['D', 0, 0],
    ['A', 2, 1],
  ]
  return fromSteps(seq)
}

function etudeFirstFinger(): ChartNote[] {
  const seq: Step[] = [
    ['D', 0, 0],
    ['D', 2, 1],
    ['D', 0, 0],
    ['D', 2, 1],
    ['A', 0, 0],
    ['A', 2, 1],
    ['A', 0, 0],
    ['A', 2, 1],
    ['G', 0, 0],
    ['G', 2, 1],
    ['D', 0, 0],
    ['D', 2, 1],
    ['D', 2, 1],
    ['A', 0, 0],
    ['D', 2, 1],
    ['D', 0, 0],
  ]
  return fromSteps(seq)
}

function etudeTetrachord(): ChartNote[] {
  const seq: Step[] = [
    ['D', 0, 0],
    ['D', 2, 1],
    ['D', 4, 3],
    ['D', 5, 4],
    ['D', 4, 3],
    ['D', 2, 1],
    ['D', 0, 0],
    ['A', 0, 0],
    ['A', 0, 0],
    ['A', 2, 1],
    ['A', 4, 3],
    ['A', 5, 4],
    ['A', 4, 3],
    ['A', 2, 1],
    ['A', 0, 0],
    ['D', 5, 4],
  ]
  return fromSteps(seq)
}

/** —— 乐曲（公共领域旋律的第一把位改编，用于识谱）—— */

/** 小星星片段：do do so so la la so */
function pieceTwinkle(): ChartNote[] {
  const seq: Step[] = [
    ['C', 0, 0],
    ['C', 0, 0],
    ['G', 0, 0],
    ['G', 0, 0],
    ['G', 2, 1],
    ['G', 2, 1],
    ['G', 0, 0],
    ['C', 5, 4],
    ['C', 5, 4],
    ['C', 4, 3],
    ['C', 4, 3],
    ['C', 2, 1],
    ['C', 2, 1],
    ['C', 0, 0],
  ]
  const units = [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2]
  return fromSteps(seq, 50, units)
}

/** 欢乐颂片段：mi mi fa so | so fa mi re | do do re mi | mi re re */
function pieceOdeToJoy(): ChartNote[] {
  const seq: Step[] = [
    ['C', 4, 3],
    ['C', 4, 3],
    ['C', 5, 4],
    ['G', 0, 0],
    ['G', 0, 0],
    ['C', 5, 4],
    ['C', 4, 3],
    ['C', 2, 1],
    ['C', 0, 0],
    ['C', 0, 0],
    ['C', 2, 1],
    ['C', 4, 3],
    ['C', 4, 3],
    ['C', 2, 1],
    ['C', 2, 1],
  ]
  return fromSteps(seq)
}

/** 热十字包式：mi re do | mi re do | do do do do | re re re re | mi re do */
function pieceHotCross(): ChartNote[] {
  const seq: Step[] = [
    ['D', 2, 1],
    ['D', 0, 0],
    ['G', 5, 4],
    ['D', 2, 1],
    ['D', 0, 0],
    ['G', 5, 4],
    ['G', 5, 4],
    ['G', 5, 4],
    ['G', 5, 4],
    ['G', 5, 4],
    ['D', 0, 0],
    ['D', 0, 0],
    ['D', 0, 0],
    ['D', 0, 0],
    ['D', 2, 1],
    ['D', 0, 0],
    ['G', 5, 4],
  ]
  const units = [1, 1, 2, 1, 1, 2, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 2]
  return fromSteps(seq, 50, units)
}

/** 玛丽有只小羊羔：mi re do re | mi mi mi | re re re | mi so so */
function pieceMary(): ChartNote[] {
  const seq: Step[] = [
    ['D', 2, 1],
    ['D', 0, 0],
    ['G', 5, 4],
    ['D', 0, 0],
    ['D', 2, 1],
    ['D', 2, 1],
    ['D', 2, 1],
    ['D', 0, 0],
    ['D', 0, 0],
    ['D', 0, 0],
    ['D', 2, 1],
    ['A', 0, 0],
    ['A', 0, 0],
  ]
  const units = [1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2]
  return fromSteps(seq, 50, units)
}

/** 简易长弓音阶歌：do mi so do' so mi do */
function pieceArpeggioSong(): ChartNote[] {
  const seq: Step[] = [
    ['C', 0, 0],
    ['C', 4, 3],
    ['G', 0, 0],
    ['G', 5, 4],
    ['G', 0, 0],
    ['C', 4, 3],
    ['C', 0, 0],
    ['G', 0, 0],
    ['D', 0, 0],
    ['A', 0, 0],
    ['D', 0, 0],
    ['G', 0, 0],
    ['C', 0, 0],
  ]
  return fromSteps(seq)
}

export const CHARTS: Chart[] = [
  // 音阶
  {
    id: 'scale-c',
    title: 'C 大调音阶',
    subtitle: 'do→do · 第一把位 · 识谱入门',
    kind: 'scale',
    baseBpm: 50,
    notes: scaleCMajor(),
  },
  {
    id: 'scale-g',
    title: 'G 大调音阶',
    subtitle: 'so→so · G/D 弦',
    kind: 'scale',
    baseBpm: 50,
    notes: scaleGMajor(),
  },
  {
    id: 'scale-d',
    title: 'D 大调音阶',
    subtitle: 're→re · D/A 弦',
    kind: 'scale',
    baseBpm: 50,
    notes: scaleDMajor(),
  },
  {
    id: 'scale-a',
    title: 'A 大调片段',
    subtitle: 'A 弦第一把位上下行',
    kind: 'scale',
    baseBpm: 48,
    notes: scaleAMajor(),
  },
  // 练习曲
  {
    id: 'etude-open',
    title: '空弦换弦',
    subtitle: '认识四根弦在谱上的位置',
    kind: 'etude',
    baseBpm: 50,
    notes: etudeOpenStrings(),
  },
  {
    id: 'etude-crossing',
    title: '邻弦换弦',
    subtitle: 'D-A / G-D / C-G 换弦',
    kind: 'etude',
    baseBpm: 50,
    notes: etudeStringCrossing(),
  },
  {
    id: 'etude-finger1',
    title: '1 指练习',
    subtitle: '空弦与 1 指交替',
    kind: 'etude',
    baseBpm: 48,
    notes: etudeFirstFinger(),
  },
  {
    id: 'etude-tetra',
    title: '四度音列',
    subtitle: '0-1-3-4 指 · D/A 弦',
    kind: 'etude',
    baseBpm: 48,
    notes: etudeTetrachord(),
  },
  // 乐曲
  {
    id: 'piece-twinkle',
    title: '小星星（片段）',
    subtitle: '公共领域旋律 · 识谱改编',
    kind: 'piece',
    baseBpm: 50,
    notes: pieceTwinkle(),
  },
  {
    id: 'piece-ode',
    title: '欢乐颂（片段）',
    subtitle: '贝多芬主题 · 第一把位',
    kind: 'piece',
    baseBpm: 52,
    notes: pieceOdeToJoy(),
  },
  {
    id: 'piece-hotcross',
    title: '热十字包',
    subtitle: '简易童谣 · 节奏识谱',
    kind: 'piece',
    baseBpm: 50,
    notes: pieceHotCross(),
  },
  {
    id: 'piece-mary',
    title: '玛丽的小羊',
    subtitle: '童谣片段 · D/G/A 弦',
    kind: 'piece',
    baseBpm: 50,
    notes: pieceMary(),
  },
  {
    id: 'piece-arpeggio',
    title: '分解和弦小曲',
    subtitle: 'do-mi-so 与空弦串联',
    kind: 'piece',
    baseBpm: 48,
    notes: pieceArpeggioSong(),
  },
]

export function chartsByKind(kind: ChartKind | 'all') {
  if (kind === 'all') return CHARTS
  return CHARTS.filter((c) => c.kind === kind)
}
