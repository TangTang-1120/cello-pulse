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
import {
  LANE_STRINGS,
  fingerLabel,
  noteLabel,
  playTap,
  stringMeta,
} from '../rhythm/music'
import { playReference, STRING_COLOR } from '../rhythm/practice'
import { MiniFingerboard } from './MiniFingerboard'
import { StaffSnippet } from './StaffSnippet'

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
  const visibleCharts = useMemo(() => chartsByKind(kind), [kind])

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
        window.setTimeout(() => setQuizFeedback(null), 450)
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
      }, 380)
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
      className={`panel panel-in rhythm-panel pro-practice ${mode === 'rhythm' ? 'rhythm-simple' : 'quiz-mode'}`}
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
                {stringMeta(current.string).roman}
              </span>
              {tip.solfege} · {fingerLabel(current.finger, current.position)}
            </p>
          ) : (
            <p className="rhythm-next-tip muted">落到亮线时点对应弦</p>
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
                    <strong style={{ color: STRING_COLOR[s.id] }}>{s.roman}</strong>
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
          <div className="rhythm-head">
            <div>
              <p className="rhythm-kicker">小白识谱 · 看谱点弦 · 不用麦克风</p>
              <h2 className="rhythm-title">{chart.title}</h2>
              <p className="note-meta">{chart.subtitle}</p>
            </div>
            <div className="rhythm-score">
              <strong>
                {Math.min(doneCount, chart.notes.length)}/{chart.notes.length}
              </strong>
              <span>进度</span>
            </div>
          </div>

          <div className="kind-switch" role="tablist" aria-label="曲库分类">
            {(
              [
                ['scale', '音阶'],
                ['etude', '练习曲'],
                ['piece', '乐曲'],
                ['all', '全部'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={kind === id ? 'active' : ''}
                onClick={() => {
                  setKind(id)
                  const list = chartsByKind(id)
                  const next = list.find((c) => c.id === chart.id) ?? list[0]
                  if (next) selectChart(next)
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <StaffSnippet
            stringId={current?.string}
            semitones={current?.semitones}
            finger={showHint ? current?.finger : undefined}
            pulse={phase === 'playing' && !!current}
            showFingering={showHint}
          />

          <div className="pro-row">
            {showHint ? (
              <MiniFingerboard stringId={current?.string} semitones={current?.semitones} />
            ) : (
              <div className="mini-board hint-off">
                <p className="note-meta tip-idle">提示已关闭 · 先想再点弦</p>
              </div>
            )}
            <div className={`finger-tip stack ${quizFeedback === 'ok' ? 'hot' : ''} ${quizFeedback === 'no' ? 'wrong' : ''}`}>
              {current && tip ? (
                <>
                  <p className="note-name quiz-solfege">{tip.solfege}</p>
                  <p className="note-meta">
                    {showHint
                      ? `${stringMeta(current.string).roman} · ${fingerLabel(current.finger, current.position)}`
                      : '这是哪一根弦？'}
                  </p>
                  <button
                    type="button"
                    className="ghost ref-btn"
                    onClick={() => current && playReference(current.string, current.semitones)}
                  >
                    听标准音
                  </button>
                </>
              ) : (
                <p className="note-meta tip-idle">选曲目后点开始</p>
              )}
            </div>
          </div>

          <div className="quiz-pads">
            {LANE_STRINGS.map((s) => {
              const lit = now - flash[s.id] < 220
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`quiz-pad ${lit ? 'lit' : ''}`}
                  style={{ borderColor: STRING_COLOR[s.id], color: STRING_COLOR[s.id] }}
                  disabled={phase !== 'playing'}
                  onClick={() => answerQuiz(s.id)}
                >
                  <strong>{s.roman}</strong>
                  <span>{s.id}弦</span>
                </button>
              )
            })}
          </div>

          {quizFeedback === 'ok' ? <p className="listen-flash perfect">对了</p> : null}
          {quizFeedback === 'no' ? <p className="listen-flash miss">再想想</p> : null}

          {phase === 'done' ? (
            <div className="listen-status">
              <p className="overlay-title">本课完成</p>
              <p className="note-meta">
                答对 {stats.perfect} · 点错 {stats.miss}
              </p>
            </div>
          ) : null}

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
              {phase === 'playing' ? '结束' : phase === 'done' ? '再练一次' : '开始识谱'}
            </button>
            <button
              type="button"
              className={`ghost ${showHint ? '' : 'dim'}`}
              onClick={() => setShowHint((v) => !v)}
            >
              {showHint ? '隐藏提示' : '显示提示'}
            </button>
          </div>

          <div className="chart-list">
            <p className="chart-label">
              {kind === 'all' ? '全部曲目' : KIND_LABEL[kind]}（{visibleCharts.length}）
            </p>
            {visibleCharts.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chart-item ${chart.id === c.id ? 'active' : ''}`}
                onClick={() => selectChart(c)}
              >
                <span>
                  <strong>{c.title}</strong>
                  <em>{c.subtitle}</em>
                </span>
                <small>
                  {c.notes.length} 音
                </small>
              </button>
            ))}
          </div>
          <p className="note-meta listen-hint">
            看唱名和谱 → 点 IV / III / II / I 弦 · 适合零基础认弦识谱
          </p>
        </>
      )}
    </section>
  )
}
