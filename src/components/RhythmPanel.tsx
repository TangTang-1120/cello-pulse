import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CHARTS, type Chart, type ChartNote } from '../rhythm/charts'
import {
  LANE_STRINGS,
  fingerLabel,
  noteLabel,
  playTap,
  stringMeta,
} from '../rhythm/music'
import type { CelloStringId } from '../audio/notes'
import { StaffSnippet } from './StaffSnippet'

const LEAD_MS = 2800
const PERFECT_MS = 140
const GOOD_MS = 360
const LANE_H = 360
const HIT_Y = LANE_H - 72

type Verdict = 'perfect' | 'good' | 'miss'
type Phase = 'idle' | 'countdown' | 'playing' | 'paused' | 'done'
type RuntimeNote = ChartNote & { id: number; time: number; verdict: Verdict | null }

const VERDICT_ZH: Record<Verdict, string> = {
  perfect: 'Perfect',
  good: 'Good',
  miss: 'Miss',
}

export function RhythmPanel({
  canUse = true,
  onRequireUnlock,
}: {
  canUse?: boolean
  onRequireUnlock?: () => void
}) {
  const [chart, setChart] = useState<Chart>(CHARTS[0]!)
  const [bpm, setBpm] = useState(CHARTS[0]!.baseBpm)
  const [phase, setPhase] = useState<Phase>('idle')
  const [count, setCount] = useState(3)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [best, setBest] = useState(0)
  const [stats, setStats] = useState({ perfect: 0, good: 0, miss: 0 })
  const [flash, setFlash] = useState<Record<CelloStringId, number>>({
    C: 0,
    G: 0,
    D: 0,
    A: 0,
  })
  const [popup, setPopup] = useState<{ verdict: Verdict; key: number } | null>(null)
  const [, setTick] = useState(0)

  const notesRef = useRef<RuntimeNote[]>([])
  const elapsedRef = useRef(0)
  const startRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('idle')
  phaseRef.current = phase

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
    setScore(0)
    setCombo(0)
    setBest(0)
    setStats({ perfect: 0, good: 0, miss: 0 })
    setPopup(null)
  }, [runtime])

  useEffect(() => {
    reset()
    setPhase('idle')
  }, [reset])

  const totalMs = notesRef.current.length
    ? notesRef.current[notesRef.current.length - 1]!.time
    : 0

  const register = useCallback((verdict: Verdict, string: CelloStringId) => {
    setStats((s) => ({ ...s, [verdict]: s[verdict] + 1 }))
    setPopup({ verdict, key: performance.now() })
    setFlash((f) => ({ ...f, [string]: performance.now() }))
    playTap(verdict)
    if (verdict === 'miss') {
      setCombo(0)
    } else {
      setCombo((c) => {
        const next = c + 1
        setBest((b) => Math.max(b, next))
        return next
      })
      setScore((s) => s + (verdict === 'perfect' ? 100 : 60))
    }
  }, [])

  const judgeLane = useCallback(
    (string: CelloStringId) => {
      if (phaseRef.current !== 'playing') return
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
    [register],
  )

  useEffect(() => {
    if (phase !== 'playing') return
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
  }, [phase, register, totalMs])

  const startCountdown = useCallback(() => {
    if (!canUse) {
      onRequireUnlock?.()
      return
    }
    reset()
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
  }, [canUse, onRequireUnlock, reset])

  const t = elapsedRef.current
  const visible = notesRef.current.filter(
    (n) => n.time > t - 400 && n.time < t + LEAD_MS + 200,
  )
  const upcoming = notesRef.current.find((n) => !n.verdict && n.time >= t - 60)
  const approaching = upcoming ? upcoming.time - t < 900 : false
  const progress = totalMs ? Math.min(100, Math.max(0, (t / totalMs) * 100)) : 0
  const now = performance.now()
  const tip = upcoming
    ? noteLabel(upcoming.string, upcoming.semitones)
    : null

  return (
    <section className="panel panel-in rhythm-panel">
      <div className="rhythm-head">
        <div>
          <p className="rhythm-kicker">节奏大师 · 识谱跟奏</p>
          <h2 className="rhythm-title">{chart.title}</h2>
          <p className="note-meta">{chart.subtitle}</p>
        </div>
        <div className="rhythm-score">
          <strong>{score}</strong>
          <span>分数</span>
        </div>
      </div>

      <StaffSnippet
        stringId={upcoming?.string}
        semitones={upcoming?.semitones}
        pulse={approaching && phase === 'playing'}
      />

      <div className={`finger-tip ${approaching && phase === 'playing' ? 'hot' : ''}`}>
        {upcoming && tip ? (
          <>
            <div className="finger-roman">
              <strong>{stringMeta(upcoming.string).roman}</strong>
              <span>{stringMeta(upcoming.string).name}</span>
            </div>
            <div className="finger-copy">
              <p className="note-name">{tip.solfege}</p>
              <p className="note-meta">
                {tip.letter} · {fingerLabel(upcoming.finger, upcoming.position)}
              </p>
            </div>
            <div className="finger-semi">
              <span>半音</span>
              <strong>+{upcoming.semitones}</strong>
            </div>
          </>
        ) : (
          <p className="note-meta tip-idle">指位提示 · 看谱后点对应弦轨</p>
        )}
      </div>

      <div className="rhythm-stage" style={{ height: LANE_H }}>
        <div className="rhythm-lanes" aria-hidden="true">
          {LANE_STRINGS.map((s) => (
            <div key={s.id} className={`rhythm-lane lane-${s.id.toLowerCase()}`} />
          ))}
        </div>
        <div className="hit-line" style={{ top: HIT_Y }} />
        <div className="hit-zone" style={{ top: HIT_Y - 16 }} />

        {visible.map((n) => {
          const y = HIT_Y - ((n.time - t) / LEAD_MS) * HIT_Y
          const laneIdx = LANE_STRINGS.findIndex((s) => s.id === n.string)
          const hit = n.verdict && n.verdict !== 'miss'
          const label = noteLabel(n.string, n.semitones)
          return (
            <div
              key={n.id}
              className={`note-block ${n.verdict ?? ''} ${hit ? 'pop' : ''}`}
              style={{
                top: y - 28,
                left: `${laneIdx * 25}%`,
              }}
            >
              <strong>{label.solfege}</strong>
              <span>
                {label.letter} · +{n.semitones}
              </span>
              <em>{fingerLabel(n.finger, n.position)}</em>
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
                onPointerDown={() => judgeLane(s.id)}
              >
                <strong>{s.roman}</strong>
                <span>{s.id}弦</span>
              </button>
            )
          })}
        </div>

        {combo > 1 && phase === 'playing' ? (
          <div key={combo} className="combo-pop">
            <strong>{combo}</strong>
            <span>COMBO</span>
          </div>
        ) : null}

        {popup ? (
          <div
            key={popup.key}
            className={`verdict-pop ${popup.verdict}`}
            style={{ top: HIT_Y - 52 }}
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
              {phase === 'done' ? '练习完成' : phase === 'paused' ? '已暂停' : chart.title}
            </p>
            {phase === 'done' ? (
              <p className="note-meta">
                Perfect {stats.perfect} · Good {stats.good} · Miss {stats.miss} · 最高连击{' '}
                {best}
              </p>
            ) : (
              <p className="note-meta">看五线谱与指位，音块落到发光线时点对应弦</p>
            )}
            <button type="button" className="primary" onClick={() => (phase === 'paused' ? setPhase('playing') : startCountdown())}>
              {phase === 'paused' ? '继续' : phase === 'done' ? '再来一次' : '开始'}
            </button>
          </div>
        ) : null}
      </div>

      <div className="rhythm-progress">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="rhythm-controls">
        <button
          type="button"
          className={`primary ${phase === 'playing' ? 'danger' : ''}`}
          onClick={() =>
            phase === 'playing'
              ? setPhase('paused')
              : phase === 'paused'
                ? setPhase('playing')
                : startCountdown()
          }
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
      </div>

      <div className="chart-list">
        <p className="chart-label">练习曲目</p>
        {CHARTS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chart-item ${chart.id === c.id ? 'active' : ''}`}
            onClick={() => {
              setChart(c)
              setBpm(c.baseBpm)
            }}
          >
            <span>
              <strong>{c.title}</strong>
              <em>{c.subtitle}</em>
            </span>
            <small>
              {c.notes.length} 音 · {c.baseBpm}
            </small>
          </button>
        ))}
      </div>

      <label className="bpm-row">
        <span>速度</span>
        <strong>{bpm} BPM</strong>
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
    </section>
  )
}
