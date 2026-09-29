import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CelloStringId } from '../audio/notes'
import {
  CHARTS,
  KIND_LABEL,
  chartsByKind,
  type Chart,
  type ChartKind,
  type ChartNote,
} from '../rhythm/charts'
import { LANE_STRINGS, fingerLabel, noteLabel, playTap } from '../rhythm/music'
import { playReference, STRING_COLOR } from '../rhythm/practice'

const LEAD_MS = 2800
const PERFECT_MS = 140
const GOOD_MS = 360
const LANE_H = 320
const HIT_Y = LANE_H - 72

type Mode = 'rhythm' | 'quiz'
type Verdict = 'perfect' | 'good' | 'miss'
type Phase = 'idle' | 'countdown' | 'playing' | 'paused' | 'done'
type RuntimeNote = ChartNote & { id: number; time: number; verdict: Verdict | null }

const VERDICT_ZH: Record<Verdict, string> = {
  perfect: '准',
  good: '可',
  miss: '过',
}

/** 小白话弦名（不用罗马数字） */
const STRING_EASY: Record<CelloStringId, { name: string; tip: string }> = {
  C: { name: 'C弦', tip: '最粗' },
  G: { name: 'G弦', tip: '偏粗' },
  D: { name: 'D弦', tip: '偏细' },
  A: { name: 'A弦', tip: '最细' },
}

export function RhythmPanel({
  canUse = true,
  onRequireUnlock,
}: {
  canUse?: boolean
  onRequireUnlock?: () => void
}) {
  const [mode, setMode] = useState<Mode>('rhythm')
  const [kind, setKind] = useState<ChartKind | 'all'>('scale')
  const [chart, setChart] = useState<Chart>(CHARTS[0]!)
  const [bpm, setBpm] = useState(CHARTS[0]!.baseBpm)

  const [phase, setPhase] = useState<Phase>('idle')
  const [count, setCount] = useState(3)
  const [score, setScore] = useState(0)
  const [stats, setStats] = useState({ perfect: 0, good: 0, miss: 0 })
  const [flash, setFlash] = useState<Record<CelloStringId, number>>({
    C: 0,
    G: 0,
    D: 0,
    A: 0,
  })
  const [popup, setPopup] = useState<{ verdict: Verdict; key: number } | null>(null)
  const [quizIdx, setQuizIdx] = useState(0)
  const [quizFeedback, setQuizFeedback] = useState<'ok' | 'no' | null>(null)
  const [showHint, setShowHint] = useState(true)
  const [, setTick] = useState(0)

  const notesRef = useRef<RuntimeNote[]>([])
  const elapsedRef = useRef(0)
  const startRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('idle')
  const quizIdxRef = useRef(0)
  phaseRef.current = phase
  quizIdxRef.current = quizIdx

  const scale = chart.baseBpm / bpm
  const runtime = useMemo<RuntimeNote[]>(
    () =>
      chart.notes.map((n, i) => ({
        ...n,
        id: i,
        time: Math.round(n.timeMs * scale),
        verdict: null,
      })),
    [chart, scale],
  )

  const reset = useCallback(() => {
    notesRef.current = runtime.map((n) => ({ ...n }))
    elapsedRef.current = 0
    setQuizIdx(0)
    setScore(0)
    setStats({ perfect: 0, good: 0, miss: 0 })
    setPopup(null)
    setQuizFeedback(null)
  }, [runtime])

  useEffect(() => {
    reset()
    setPhase('idle')
  }, [reset, mode])

  const totalMs = notesRef.current.length
    ? notesRef.current[notesRef.current.length - 1]!.time
    : 0

  const register = useCallback((verdict: Verdict, string: CelloStringId) => {
    setStats((s) => ({ ...s, [verdict]: s[verdict] + 1 }))
    setPopup({ verdict, key: performance.now() })
    setFlash((f) => ({ ...f, [string]: performance.now() }))
    playTap(verdict === 'miss' ? 'miss' : verdict === 'perfect' ? 'perfect' : 'good')
    if (verdict !== 'miss') {
      setScore((s) => s + (verdict === 'perfect' ? 100 : 60))
    }
  }, [])

  const judgeLane = useCallback(
    (string: CelloStringId) => {
      if (phaseRef.current !== 'playing' || mode !== 'rhythm') return
      const t = elapsedRef.current
      const candidates = notesRef.current.filter(
        (n) => n.string === string && !n.verdict && Math.abs(n.time - t) <= GOOD_MS,
      )
      if (!candidates.length) {
        setFlash((f) => ({ ...f, [string]: performance.now() }))
        return
      }
      candidates.sort((a, b) => Math.abs(a.time - t) - Math.abs(b.time - t))
      const target = candidates[0]!
      const diff = Math.abs(target.time - t)
      const verdict: Verdict = diff <= PERFECT_MS ? 'perfect' : 'good'
      target.verdict = verdict
      register(verdict, string)
    },
    [mode, register],
  )

  useEffect(() => {
    if (phase !== 'playing' || mode !== 'rhythm') return
    startRef.current = performance.now() - elapsedRef.current
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      const t = performance.now() - startRef.current
      elapsedRef.current = t
      for (const n of notesRef.current) {
        if (!n.verdict && n.time < t - GOOD_MS) {
          n.verdict = 'miss'
          register('miss', n.string)
        }
      }
      if (t > totalMs + 1200) {
        setPhase('done')
        return
      }
      setTick((v) => v + 1)
    }
    loop()
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [phase, mode, register, totalMs])

  const answerQuiz = useCallback(
    (string: CelloStringId) => {
      if (phaseRef.current !== 'playing' || mode !== 'quiz') return
      const idx = quizIdxRef.current
      const note = notesRef.current[idx]
      if (!note || note.verdict) return

      setFlash((f) => ({ ...f, [string]: performance.now() }))
      if (string !== note.string) {
        setQuizFeedback('no')
        playTap('miss')
        setStats((s) => ({ ...s, miss: s.miss + 1 }))
        window.setTimeout(() => setQuizFeedback(null), 500)
        return
      }

      note.verdict = 'perfect'
      setQuizFeedback('ok')
      register('perfect', string)
      playReference(note.string, note.semitones, 0.4)
      window.setTimeout(() => {
        setQuizFeedback(null)
        const next = idx + 1
        if (next >= notesRef.current.length) {
          setQuizIdx(next)
          setPhase('done')
          return
        }
        setQuizIdx(next)
      }, 420)
    },
    [mode, register],
  )

  const startCountdown = useCallback(() => {
    if (!canUse) {
      onRequireUnlock?.()
      return
    }
    reset()
    if (mode === 'quiz') {
      setPhase('playing')
      const first = notesRef.current[0]
      if (first) playReference(first.string, first.semitones, 0.35)
      return
    }
    setPhase('countdown')
    setCount(3)
    let c = 3
    playTap('count')
    const id = window.setInterval(() => {
      c -= 1
      if (c <= 0) {
        window.clearInterval(id)
        setPhase('playing')
      } else {
        setCount(c)
        playTap('count')
      }
    }, 700)
  }, [canUse, onRequireUnlock, reset, mode])

  const selectChart = (c: Chart) => {
    setChart(c)
    setBpm(c.baseBpm)
    setPhase('idle')
  }

  const t = elapsedRef.current
  const visible =
    mode === 'rhythm'
      ? notesRef.current.filter((n) => n.time > t - 400 && n.time < t + LEAD_MS + 200)
      : []
  const current =
    mode === 'quiz'
      ? notesRef.current[quizIdx]
      : notesRef.current.find((n) => !n.verdict && n.time >= t - 60)
  const tip = current ? noteLabel(current.string, current.semitones) : null
  const progress =
    mode === 'quiz'
      ? notesRef.current.length
        ? Math.min(100, (quizIdx / notesRef.current.length) * 100)
        : 0
      : totalMs
        ? Math.min(100, Math.max(0, (t / totalMs) * 100))
        : 0
  const now = performance.now()
  const doneCount = notesRef.current.filter((n) => n.verdict).length

  return (
    <section
      className={`panel panel-in rhythm-panel ${mode === 'rhythm' ? 'rhythm-simple' : 'quiz-easy'}`}
    >
      <div className="mode-switch" role="tablist" aria-label="练习模式">
        <button
          type="button"
          className={mode === 'rhythm' ? 'active' : ''}
          onClick={() => {
            setMode('rhythm')
            setPhase('idle')
          }}
        >
          节奏跟奏
        </button>
        <button
          type="button"
          className={mode === 'quiz' ? 'active' : ''}
          onClick={() => {
            setMode('quiz')
            setPhase('idle')
          }}
        >
          点弦识谱
        </button>
      </div>

      {mode === 'rhythm' ? (
        <>
          <div className="rhythm-simple-bar">
            <select
              className="chart-select"
              value={chart.id}
              aria-label="练习曲目"
              onChange={(e) => {
                const next = CHARTS.find((c) => c.id === e.target.value)
                if (next) selectChart(next)
              }}
            >
              {(['scale', 'etude', 'piece'] as const).map((k) => (
                <optgroup key={k} label={KIND_LABEL[k]}>
                  {chartsByKind(k).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <strong className="rhythm-score-inline">{score}</strong>
          </div>

          {current && tip ? (
            <p className="rhythm-next-tip">
              <span style={{ color: STRING_COLOR[current.string] }}>
                {STRING_EASY[current.string].name}
              </span>
              {tip.solfege} · {fingerLabel(current.finger, current.position)}
            </p>
          ) : (
            <p className="rhythm-next-tip muted">音块落到亮线时，点下面的弦</p>
          )}

          <div className="rhythm-stage simple" style={{ height: LANE_H }}>
            <div className="rhythm-lanes" aria-hidden="true">
              {LANE_STRINGS.map((s) => (
                <div key={s.id} className={`rhythm-lane lane-${s.id.toLowerCase()}`} />
              ))}
            </div>
            <div className="hit-line" style={{ top: HIT_Y }} />
            {visible.map((n) => {
              const y = HIT_Y - ((n.time - t) / LEAD_MS) * HIT_Y
              const laneIdx = LANE_STRINGS.findIndex((s) => s.id === n.string)
              const hit = n.verdict && n.verdict !== 'miss'
              const label = noteLabel(n.string, n.semitones)
              return (
                <div
                  key={n.id}
                  className={`note-block compact ${n.verdict ?? ''} ${hit ? 'pop' : ''}`}
                  style={{ top: y - 22, left: `${laneIdx * 25}%` }}
                >
                  <strong style={{ color: STRING_COLOR[n.string] }}>{label.solfege}</strong>
                </div>
              )
            })}
            <div className="lane-pads">
              {LANE_STRINGS.map((s) => {
                const lit = now - flash[s.id] < 220
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`lane-pad ${lit ? 'lit' : ''}`}
                    style={{ borderTopColor: STRING_COLOR[s.id] }}
                    onPointerDown={() => judgeLane(s.id)}
                  >
                    <strong style={{ color: STRING_COLOR[s.id] }}>{STRING_EASY[s.id].name}</strong>
                  </button>
                )
              })}
            </div>
            {popup ? (
              <div
                key={popup.key}
                className={`verdict-pop ${popup.verdict}`}
                style={{ top: HIT_Y - 48 }}
              >
                {VERDICT_ZH[popup.verdict]}
              </div>
            ) : null}
            {phase === 'countdown' ? (
              <div className="rhythm-overlay">
                <div className="count-ring">{count}</div>
              </div>
            ) : null}
            {phase === 'idle' || phase === 'paused' || phase === 'done' ? (
              <div className="rhythm-overlay">
                <p className="overlay-title">
                  {phase === 'done' ? '完成' : phase === 'paused' ? '暂停' : '准备'}
                </p>
                {phase === 'done' ? (
                  <p className="note-meta">
                    准 {stats.perfect} · 可 {stats.good} · 过 {stats.miss}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="primary"
                  onClick={() => (phase === 'paused' ? setPhase('playing') : startCountdown())}
                >
                  {phase === 'paused' ? '继续' : phase === 'done' ? '再来' : '开始'}
                </button>
              </div>
            ) : null}
          </div>

          <div className="rhythm-simple-controls">
            <button
              type="button"
              className={`primary ${phase === 'playing' ? 'danger' : ''}`}
              onClick={() => {
                if (phase === 'playing') {
                  setPhase('paused')
                  return
                }
                if (phase === 'paused') {
                  setPhase('playing')
                  return
                }
                startCountdown()
              }}
            >
              {phase === 'playing' ? '暂停' : phase === 'paused' ? '继续' : '开始'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                reset()
                setPhase('idle')
              }}
            >
              重来
            </button>
            <label className="bpm-compact">
              <span>{bpm}</span>
              <input
                type="range"
                min={40}
                max={120}
                step={2}
                value={bpm}
                onChange={(e) => {
                  setBpm(Number(e.target.value))
                  setPhase('idle')
                }}
              />
            </label>
          </div>
          <div className="rhythm-progress thin">
            <span style={{ width: `${progress}%` }} />
          </div>
        </>
      ) : (
        <>
          <select
            className="chart-select"
            value={chart.id}
            aria-label="选一组练习"
            onChange={(e) => {
              const next = CHARTS.find((c) => c.id === e.target.value)
              if (next) {
                setKind(next.kind)
                selectChart(next)
              }
            }}
          >
            {(['scale', 'etude', 'piece'] as const).map((k) => (
              <optgroup key={k} label={KIND_LABEL[k]}>
                {chartsByKind(k).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <div className={`quiz-card ${quizFeedback ?? ''}`}>
            {phase === 'idle' ? (
              <>
                <p className="quiz-big">点弦识谱</p>
                <p className="quiz-sub">听到唱名后，点它是哪一根弦</p>
                <p className="quiz-sub soft">不用麦克风 · 从粗到细：C → G → D → A</p>
              </>
            ) : phase === 'done' ? (
              <>
                <p className="quiz-big">练完啦</p>
                <p className="quiz-sub">
                  答对 {stats.perfect} 题
                  {stats.miss ? ` · 点错 ${stats.miss} 次` : ''}
                </p>
              </>
            ) : current && tip ? (
              <>
                <p className="quiz-label">现在这个音是</p>
                <p className="quiz-big solfege">{tip.solfege}</p>
                <p className="quiz-sub">
                  {showHint
                    ? `提示：点「${STRING_EASY[current.string].name}」（${STRING_EASY[current.string].tip}）`
                    : '请点下面正确的那一根弦'}
                </p>
                <button
                  type="button"
                  className="ghost quiz-hear"
                  onClick={() => playReference(current.string, current.semitones)}
                >
                  听一听这个音
                </button>
              </>
            ) : null}

            {quizFeedback === 'ok' ? <p className="quiz-toast ok">对了 ✓</p> : null}
            {quizFeedback === 'no' ? <p className="quiz-toast no">不对，再选一次</p> : null}
          </div>

          <div className="quiz-pads easy">
            {LANE_STRINGS.map((s) => {
              const lit = now - flash[s.id] < 220
              const hintHere = showHint && phase === 'playing' && current?.string === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`quiz-pad ${lit ? 'lit' : ''} ${hintHere ? 'hint' : ''}`}
                  style={{ borderColor: STRING_COLOR[s.id] }}
                  disabled={phase !== 'playing'}
                  onClick={() => answerQuiz(s.id)}
                >
                  <strong style={{ color: STRING_COLOR[s.id] }}>{STRING_EASY[s.id].name}</strong>
                  <span>{STRING_EASY[s.id].tip}</span>
                </button>
              )
            })}
          </div>

          <p className="quiz-progress-text">
            {phase === 'playing' || phase === 'done'
              ? `第 ${Math.max(1, Math.min(doneCount + (phase === 'playing' ? 1 : 0), chart.notes.length))} / ${chart.notes.length} 题`
              : `共 ${chart.notes.length} 题`}
            {kind !== 'all' ? ` · ${KIND_LABEL[chart.kind]}` : ''}
          </p>

          <div className="rhythm-progress">
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="rhythm-controls">
            <button
              type="button"
              className={`primary ${phase === 'playing' ? 'danger' : ''}`}
              onClick={() => {
                if (phase === 'playing') {
                  setPhase('idle')
                  reset()
                  return
                }
                startCountdown()
              }}
            >
              {phase === 'playing' ? '结束' : phase === 'done' ? '再练一次' : '开始'}
            </button>
            <button type="button" className="ghost" onClick={() => setShowHint((v) => !v)}>
              {showHint ? '关掉提示' : '打开提示'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
