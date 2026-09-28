import { useMetronome } from '../hooks/useMetronome'
import type { TimeSignature } from '../audio/metronome'

const SIGNATURES: TimeSignature[] = ['2/4', '3/4', '4/4']

export function MetronomePanel({
  canUse = true,
  onRequireUnlock,
}: {
  canUse?: boolean
  onRequireUnlock?: () => void
}) {
  const {
    running,
    bpm,
    setBpm,
    timeSignature,
    setTimeSignature,
    activeBeat,
    toggle,
  } = useMetronome()
  const beats = Number(timeSignature.split('/')[0])

  return (
    <section className="panel panel-in">
      <div className={`pulse ${running && activeBeat === 0 ? 'accent' : running ? 'on' : ''}`}>
        <p className="bpm-value">{bpm}</p>
        <p className="bpm-label">BPM</p>
      </div>

      <div className="beats" aria-hidden="true">
        {Array.from({ length: beats }, (_, index) => (
          <span
            key={index}
            className={activeBeat === index ? (index === 0 ? 'downbeat' : 'beat') : ''}
          />
        ))}
      </div>

      <label className="slider">
        <span>速度</span>
        <input
          type="range"
          min={40}
          max={208}
          value={bpm}
          onChange={(event) => setBpm(Number(event.target.value))}
        />
      </label>

      <div className="tempo-row">
        <button type="button" className="ghost" onClick={() => setBpm((v) => Math.max(40, v - 1))}>
          −1
        </button>
        <button type="button" className="ghost" onClick={() => setBpm((v) => Math.min(208, v + 1))}>
          +1
        </button>
      </div>

      <div className="string-grid signatures">
        {SIGNATURES.map((sig) => (
          <button
            key={sig}
            type="button"
            className={timeSignature === sig ? 'active' : ''}
            onClick={() => setTimeSignature(sig)}
          >
            {sig}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`primary ${running ? 'danger' : ''}`}
        onClick={() => {
          if (!running && !canUse) {
            onRequireUnlock?.()
            return
          }
          void toggle()
        }}
      >
        {running ? '停止' : '开始节拍'}
      </button>
    </section>
  )
}
