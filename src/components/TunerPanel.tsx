import { CELLO_STRINGS } from '../audio/notes'
import { useTuner, type TunerMode, type TunerReading } from '../hooks/useTuner'

function needleAngle(cents: number | undefined) {
  const clamped = Math.max(-50, Math.min(50, cents ?? 0))
  return (clamped / 50) * 48
}

function pitchHint(cents: number) {
  if (cents > 5) {
    return { label: '偏高', advice: '请调低', tone: 'high' as const }
  }
  if (cents < -5) {
    return { label: '偏低', advice: '请调高', tone: 'low' as const }
  }
  return { label: '准确', advice: '保持', tone: 'ok' as const }
}

export function TunerPanel({
  canUse = true,
  onRequireUnlock,
  demo,
}: {
  canUse?: boolean
  onRequireUnlock?: () => void
  demo?: {
    listening: boolean
    reading: TunerReading | null
    level: number
    mode: TunerMode
    setMode: (mode: TunerMode) => void
  }
}) {
  const live = useTuner()
  const listening = demo?.listening ?? live.listening
  const error = demo ? null : live.error
  const mode = demo?.mode ?? live.mode
  const setMode = demo?.setMode ?? live.setMode
  const reading = demo ? demo.reading : live.reading
  const level = demo?.level ?? live.level
  const start = live.start
  const stop = live.stop
  const cents = reading?.cents ?? 0
  const inTune = reading?.inTune ?? false
  const hint = reading ? pitchHint(cents) : null

  return (
    <section className="panel panel-in">
      <div
        className={`gauge ${listening ? 'listening' : ''} ${inTune ? 'in-tune-glow' : ''} ${hint ? `hint-${hint.tone}` : ''}`}
      >
        <svg viewBox="0 0 320 180" className="gauge-svg" aria-hidden="true">
          <path
            d="M28 160 A132 132 0 0 1 292 160"
            fill="none"
            stroke="rgba(0, 0, 0, 0.5)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M118 48 A132 132 0 0 1 202 48"
            fill="none"
            stroke="#39ff14"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <g
            className="needle"
            style={{ transform: `rotate(${needleAngle(reading?.cents)}deg)` }}
          >
            <line x1="160" y1="160" x2="160" y2="42" />
            <circle cx="160" cy="160" r="7" />
          </g>
        </svg>
        <div className={`note-readout ${inTune ? 'in-tune' : ''} ${hint ? `tone-${hint.tone}` : ''}`}>
          <p className="note-name">{reading?.note ?? '—'}</p>
          {hint ? (
            <p className={`pitch-hint ${hint.tone}`}>
              {hint.label}
              <small>{hint.advice}</small>
            </p>
          ) : null}
          <p className="note-meta">
            {reading
              ? `${reading.hz.toFixed(1)} Hz · ${cents > 0 ? '+' : ''}${cents.toFixed(0)} cents`
              : listening
                ? '请拉奏或拨弦'
                : '尚未聆听'}
          </p>
        </div>
        <div className="level-bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, level * 900)}%` }} />
        </div>
      </div>

      <div className="string-grid" role="tablist" aria-label="大提琴弦">
        <button
          type="button"
          className={mode === 'auto' ? 'active' : ''}
          onClick={() => setMode('auto')}
        >
          自动
        </button>
        {CELLO_STRINGS.map((string) => (
          <button
            key={string.id}
            type="button"
            className={mode === string.id ? 'active' : ''}
            onClick={() => setMode(string.id)}
          >
            {string.id}
            <small>{string.note}</small>
          </button>
        ))}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <button
        type="button"
        className={`primary ${listening ? 'danger' : ''}`}
        onClick={() => {
          if (listening) {
            stop()
            return
          }
          if (!canUse) {
            onRequireUnlock?.()
            return
          }
          void start()
        }}
      >
        {listening ? '停止聆听' : '开始调音'}
      </button>
    </section>
  )
}
