import {
  nearestFingerPosition,
  POSITION_STRINGS,
  solfegeAt,
} from '../audio/notes'

const STEPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

export function Fingerboard({ hz }: { hz?: number }) {
  const hit = hz ? nearestFingerPosition(hz) : null
  const litKeys = new Set(
    (hit?.matches ?? []).map((item) => `${item.stringId}-${item.semitones}`),
  )

  return (
    <div className="pos-chart" aria-label="大提琴把位与音位图">
      <h2 className="pos-title">大提琴把位与音位图</h2>
      <div className="pos-board">
        <div className="pos-band pos1" />
        <div className="pos-band pos2" />
        <div className="pos-band pos3" />
        <div className="pos-band pos4" />
        <p className="pos-side pos-left1">第1把位</p>
        <p className="pos-side pos-left3">第3把位</p>
        <p className="pos-side pos-right2">第2把位</p>
        <p className="pos-side pos-right4">第4把位</p>

        <div className="pos-romans">
          {POSITION_STRINGS.map((string) => (
            <span key={string.roman}>{string.roman}</span>
          ))}
        </div>

        {STEPS.map((step) => (
          <div key={step} className="pos-row">
            {POSITION_STRINGS.map((string) => {
              const key = `${string.id}-${step}`
              const on = hit?.stringId === string.id && hit.semitones === step
              const near = !on && litKeys.has(key)
              const solid = step === 0 || step === 12
              return (
                <span
                  key={string.id}
                  className={`pos-note ${solid ? 'solid' : ''} ${on ? 'lit' : ''} ${near ? 'near' : ''}`}
                >
                  {solfegeAt(string.pitchClass, step)}
                </span>
              )
            })}
          </div>
        ))}
      </div>
      <p className="pos-caption">空弦从左到右粗→细 · 上为低音 · 拉到的音会高亮</p>
    </div>
  )
}
