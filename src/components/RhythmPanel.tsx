import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { centsOff } from '../audio/notes'
import type { CelloStringId } from '../audio/notes'
import { useTuner } from '../hooks/useTuner'
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
import { playReference, targetHz, STRING_COLOR } from '../rhythm/practice'
import { MiniFingerboard } from './MiniFingerboard'
import { StaffSnippet } from './StaffSnippet'

const LEAD_MS = 2800
const PERFECT_MS = 140
const GOOD_MS = 360
const LANE_H = 320
const HIT_Y = LANE_H - 72
/** Beginner intonation window (Cello Scales Tutor uses 5–20¢; we start wider). */
const IN_TUNE_CENTS = 28
const HOLD_MS = 180

type Mode = 'listen' | 'rhythm'
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
  const [mode, setMode] = useState<Mode>('listen')
  const [kind, setKind] = useState<ChartKind | 'all'>('scale')
  const [chart, setChart] = useState<Chart>(CHARTS[0]!)
  const [bpm, setBpm] = useState(CHARTS[0]!.baseBpm)
  const visibleCharts = useMemo(() => chartsByKind(kind), [kind])
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
  const [listenIdx, setListenIdx] = useState(0)
  const [pitchHint, setPitchHint] = useState<'flat' | 'sharp' | 'ok' | 'wait'>('wait')
  const [centsLive, setCentsLive] = useState<number | null>(null)
  const [, setTick] = useState(0)

  const notesRef = useRef<RuntimeNote[]>([])
  const elapsedRef = useRef(0)
  const startRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('idle')
  const holdRef = useRef(0)
  const listenIdxRef = useRef(0)
  phaseRef.current = phase
  listenIdxRef.current = listenIdx

  const tuner = useTuner({ minHz: 55, maxHz: 520 })

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
    holdRef.current = 0
    setListenIdx(0)
    setScore(0)
    setCombo(0)
    setBest(0)
    setStats({ perfect: 0, good: 0, miss: 0 })
    setPopup(null)
    setPitchHint('wait')
    setCentsLive(null)
  }, [runtime])

  useEffect(() => {
    reset()
    setPhase('idle')
  }, [reset, mode])

  useEffect(() => {
    return () => {
      tuner.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalMs = notesRef.current.length
    ? notesRef.current[notesRef.current.length - 1]!.time
    : 0

  const register = useCallback((verdict: Verdict, string: CelloStringId) => {
    setStats((s) => ({ ...s, [verdict]: s[verdict] + 1 }))
    setPopup({ verdict, key: performance.now() })
    setFlash((f) => ({ ...f, [string]: performance.now() }))
    playTap(verdict === 'miss' ? 'miss' : verdict === 'perfect' ? 'perfect' : 'good')
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

  const advanceListen = useCallback(
    (verdict: Verdict) => {
      const idx = listenIdxRef.current
      const note = notesRef.current[idx]
      if (!note || note.verdict) return
      note.verdict = verdict
      register(verdict, note.string)
      const next = idx + 1
      if (next >= notesRef.current.length) {
        setPhase('done')
        setListenIdx(next)
        return
      }
      setListenIdx(next)
      holdRef.current = 0
      setPitchHint('wait')
      setCentsLive(null)
      const n = notesRef.current[next]!
      playReference(n.string, n.semitones, 0.35)
    },
    [register],
  )

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

  // Rhythm falling-note loop
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

  // Listen mode: continuous pitch check with hold time
  useEffect(() => {
    if (phase !== 'playing' || mode !== 'listen') return
    let raf = 0
    let last = performance.now()
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now()
      const dt = now - last
      last = now
      const note = notesRef.current[listenIdxRef.current]
      if (!note || note.verdict) return
      const hz = tuner.reading?.hz
      const level = tuner.level ?? 0
      if (!hz || level < 0.01) {
        setPitchHint('wait')
        setCentsLive(null)
        holdRef.current = 0
        return
      }
      const cents = centsOff(hz, targetHz(note.string, note.semitones))
      setCentsLive(cents)
      if (Math.abs(cents) <= IN_TUNE_CENTS) {
        setPitchHint('ok')
        holdRef.current += dt
        if (holdRef.current >= HOLD_MS) {
          const verdict: Verdict = Math.abs(cents) <= 12 ? 'perfect' : 'good'
          advanceListen(verdict)
        }
      } else {
        holdRef.current = 0
        setPitchHint(cents < 0 ? 'flat' : 'sharp')
      }
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [phase, mode, advanceListen, tuner.reading, tuner.level])


  const startCountdown = useCallback(async () => {
    if (!canUse) {
      onRequireUnlock?.()
      return
    }
    reset()
    if (mode === 'listen' && !tuner.listening) {
      await tuner.start()
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
        const first = notesRef.current[0]
        if (mode === 'listen' && first) playReference(first.string, first.semitones, 0.45)
      } else {
        setCount(c)
        playTap('count')
      }
    }, 700)
  }, [canUse, onRequireUnlock, reset, mode, tuner])

  const current =
    mode === 'listen'
      ? notesRef.current[listenIdx]
      : notesRef.current.find((n) => !n.verdict && n.time >= elapsedRef.current - 60)

  const t = elapsedRef.current
  const visible =
    mode === 'rhythm'
      ? notesRef.current.filter((n) => n.time > t - 400 && n.time < t + LEAD_MS + 200)
      : []
  const approaching =
    mode === 'rhythm' && current ? current.time - t < 900 : phase === 'playing'
  const progress =
    mode === 'listen'
      ? notesRef.current.length
        ? Math.min(100, (listenIdx / notesRef.current.length) * 100)
        : 0
      : totalMs
        ? Math.min(100, Math.max(0, (t / totalMs) * 100))
        : 0
  const now = performance.now()
  const tip = current ? noteLabel(current.string, current.semitones) : null
  const doneCount = notesRef.current.filter((n) => n.verdict).length

  return (
    <section className={`panel panel-in rhythm-panel pro-practice ${mode === 'rhythm' ? 'rhythm-simple' : ''}`}>
      <div className="mode-switch" role="tablist" aria-label="练习模式">
        <button
          type="button"
          className={mode === 'listen' ? 'active' : ''}
          onClick={() => {
            setMode('listen')
            setPhase('idle')
          }}
        >
          听音识谱
        </button>
        <button
          type="button"
          className={mode === 'rhythm' ? 'active' : ''}
          onClick={() => {
            setMode('rhythm')
            tuner.stop()
            setPhase('idle')
          }}
        >
          节奏跟奏
        </button>
      </div>

      {mode === 'listen' ? (
        <>
          <div className="rhythm-head">
            <div>
              <p className="rhythm-kicker">
                {KIND_LABEL[chart.kind]} · 谱面 × 指板 × 音准
              </p>
              <h2 className="rhythm-title">{chart.title}</h2>
              <p className="note-meta">{chart.subtitle}</p>
            </div>
            <div className="rhythm-score">
              <strong>{score}</strong>
              <span>
                {doneCount}/{chart.notes.length}
              </span>
            </div>
          </div>

          <div className="kind-switch" role="tablist" aria-label="曲库分类">
            {([
              ['scale', '音阶'],
              ['etude', '练习曲'],
              ['piece', '乐曲'],
              ['all', '全部'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={kind === id ? 'active' : ''}
                onClick={() => {
                  setKind(id)
                  const list = chartsByKind(id)
                  const next = list.find((c) => c.id === chart.id) ?? list[0]
                  if (next) {
                    setChart(next)
                    setBpm(next.baseBpm)
                    setPhase('idle')
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <StaffSnippet
            stringId={current?.string}
            semitones={current?.semitones}
            finger={current?.finger}
            pulse={approaching && phase === 'playing'}
          />

          <div className="pro-row">
            <MiniFingerboard stringId={current?.string} semitones={current?.semitones} />
            <div className={`finger-tip stack ${approaching && phase === 'playing' ? 'hot' : ''}`}>
              {current && tip ? (
                <>
                  <div className="finger-roman" style={{ color: STRING_COLOR[current.string] }}>
                    <strong>{stringMeta(current.string).roman}</strong>
                    <span>{stringMeta(current.string).name}</span>
                  </div>
                  <div className="finger-copy">
                    <p className="note-name">{tip.solfege}</p>
                    <p className="note-meta">
                      {fingerLabel(current.finger, current.position)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ghost ref-btn"
                    onClick={() => playReference(current.string, current.semitones)}
                  >
                    听标准音
                  </button>
                </>
              ) : (
                <p className="note-meta tip-idle">选择曲目后开始 · 看谱找指位再拉奏</p>
              )}
            </div>
          </div>

          <div className={`intonation ${pitchHint}`}>
            <div className="intonation-bar">
              <span
                className="intonation-needle"
                style={{
                  left: `${centsLive == null ? 50 : Math.min(92, Math.max(8, 50 + centsLive))}%`,
                }}
              />
              <i className="center-mark" />
            </div>
            <p className="note-meta">
              {phase !== 'playing'
                ? '麦克风听音判定 · 对准后自动进入下一音'
                : pitchHint === 'ok'
                  ? `准确 ${centsLive != null ? `${centsLive > 0 ? '+' : ''}${centsLive.toFixed(0)}¢` : ''}`
                  : pitchHint === 'flat'
                    ? '偏低 · 再抬高一点'
                    : pitchHint === 'sharp'
                      ? '偏高 · 再压低一点'
                      : '请拉奏目标音…'}
            </p>
            {tuner.error ? <p className="error">{tuner.error}</p> : null}
          </div>

          {phase === 'idle' || phase === 'countdown' || phase === 'done' || phase === 'paused' ? (
            <div className="listen-status">
              {phase === 'countdown' ? (
                <div className="count-ring">{count}</div>
              ) : (
                <>
                  <p className="overlay-title">
                    {phase === 'done' ? '本课完成' : phase === 'paused' ? '已暂停' : '听音识谱练习'}
                  </p>
                  <p className="note-meta">
                    {phase === 'done'
                      ? `准 ${stats.perfect} · 可 ${stats.good} · 连击 ${best}`
                      : '看低音谱号 → 指板高亮 → 拉准自动下一音'}
                  </p>
                </>
              )}
            </div>
          ) : null}

          {phase === 'playing' && combo > 1 ? (
            <p className="note-meta" style={{ textAlign: 'center' }}>
              连续准确 {combo}
            </p>
          ) : null}

          {phase === 'playing' && popup ? (
            <p key={popup.key} className={`listen-flash ${popup.verdict}`}>
              {VERDICT_ZH[popup.verdict]}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="rhythm-simple-bar">
            <select
              className="chart-select"
              value={chart.id}
              aria-label="练习曲目"
              onChange={(e) => {
                const next = CHARTS.find((c) => c.id === e.target.value)
                if (!next) return
                setChart(next)
                setBpm(next.baseBpm)
                setPhase('idle')
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
              <span style={{ color: STRING_COLOR[current.string] }}>{stringMeta(current.string).roman}</span>
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
                  onClick={() => (phase === 'paused' ? setPhase('playing') : void startCountdown())}
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
                void startCountdown()
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
        </>
      )}

      {mode === 'listen' ? (
        <>
          <div className="rhythm-progress">
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="rhythm-controls">
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
                void startCountdown()
              }}
            >
              {phase === 'playing' ? '暂停' : phase === 'paused' ? '继续' : '开始练习'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                reset()
                setPhase('idle')
                tuner.stop()
              }}
            >
              重来
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
                onClick={() => {
                  setChart(c)
                  setBpm(c.baseBpm)
                  setPhase('idle')
                }}
              >
                <span>
                  <strong>{c.title}</strong>
                  <em>{c.subtitle}</em>
                </span>
                <small>
                  {KIND_LABEL[c.kind]} · {c.notes.length} 音
                </small>
              </button>
            ))}
          </div>
          <p className="note-meta listen-hint">
            看谱找指位 · 拉准自动下一音 · 适合音阶 / 练习曲 / 乐曲识谱
          </p>
        </>
      ) : (
        <div className="rhythm-progress thin">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
    </section>
  )
}
