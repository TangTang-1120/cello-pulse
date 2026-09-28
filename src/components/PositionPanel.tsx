import { nearestFingerPosition } from '../audio/notes'
import { useTuner, type TunerReading } from '../hooks/useTuner'
import { Fingerboard } from './Fingerboard'

function pitchHint(cents: number) {
  if (cents > 8) return { label: '偏高', tone: 'high' as const }
  if (cents < -8) return { label: '偏低', tone: 'low' as const }
  return { label: '准确', tone: 'ok' as const }
}

export function PositionPanel({
  canUse = true,
  onRequireUnlock,
  demo,
}: {
  canUse?: boolean
  onRequireUnlock?: () => void
  demo?: {
    listening: boolean
    reading: TunerReading | null
  }
}) {
  const live = useTuner({
    minHz: 58,
    maxHz: 720,
  })
  const listening = demo?.listening ?? live.listening
  const error = demo ? null : live.error
  const reading = demo ? demo.reading : live.reading
  const start = live.start
  const stop = live.stop
  const hit = reading ? nearestFingerPosition(reading.hz) : null
  const hint = hit ? pitchHint(hit.cents) : null

  return (
    <section className="panel panel-in">
      <div className={`pos-readout ${hint ? `tone-${hint.tone}` : ''}`}>
        <p className="note-name">{hit ? hit.label : '—'}</p>
        {hint ? <p className={`pitch-hint ${hint.tone}`}>{hint.label}</p> : null}
        <p className="note-meta">
          {hit
            ? `${hit.stringId}弦 · ${hit.semitones === 0 ? '空弦' : `+${hit.semitones}`} · ${reading!.hz.toFixed(1)} Hz · ${hit.cents > 0 ? '+' : ''}${hit.cents.toFixed(0)}¢`
            : listening
              ? '请拉奏，识别把位'
              : '开始聆听后拉弦'}
        </p>
      </div>

      <Fingerboard hz={reading?.hz} />

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
        {listening ? '停止识别' : '开始识别'}
      </button>
    </section>
  )
}
