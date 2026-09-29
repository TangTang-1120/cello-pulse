import { noteLabel, staffYFromMidi, stringMeta } from '../rhythm/music'
import { STRING_COLOR } from '../rhythm/practice'
import type { CelloStringId } from '../audio/notes'

/** Pedagogue-style bass clef staff (tonestro / Purely Cello inspired). */
export function StaffSnippet({
  stringId,
  semitones,
  finger,
  pulse = false,
  showFingering = true,
}: {
  stringId?: CelloStringId
  semitones?: number
  finger?: 0 | 1 | 2 | 3 | 4
  pulse?: boolean
  showFingering?: boolean
}) {
  const gap = 12
  const midY = 52
  const width = 280
  const height = 112
  const hasNote = stringId != null && semitones != null
  const label = hasNote ? noteLabel(stringId, semitones) : null
  const noteY = hasNote ? midY + staffYFromMidi(label!.midi, gap) : midY
  const color = hasNote ? STRING_COLOR[stringId] : 'var(--accent)'
  const ledger: number[] = []
  if (hasNote) {
    const topLine = midY - 2 * gap
    const bottomLine = midY + 2 * gap
    if (noteY < topLine - 1) {
      for (let y = topLine - gap; y >= noteY - 1; y -= gap) ledger.push(y)
    }
    if (noteY > bottomLine + 1) {
      for (let y = bottomLine + gap; y <= noteY + 1; y += gap) ledger.push(y)
    }
  }

  return (
    <div className={`staff-card pro ${pulse ? 'pulse' : ''}`}>
      <div className="staff-meta">
        <span className="staff-kicker">Bass clef · 低音谱号</span>
        <strong>
          {label
            ? `${label.solfege}${stringId ? ` · ${stringMeta(stringId).roman}` : ''}`
            : '看谱 · 找指位 · 拉准'}
        </strong>
      </div>
      <svg className="staff-svg" viewBox={`0 0 ${width} ${height}`} aria-label="大提琴低音谱号">
        {[-2, -1, 0, 1, 2].map((i) => (
          <line
            key={i}
            x1={52}
            x2={width - 12}
            y1={midY + i * gap}
            y2={midY + i * gap}
            className="staff-line"
          />
        ))}
        {/* Drawn F-clef */}
        <g className="bass-clef-drawn" fill="currentColor" stroke="currentColor">
          <path
            d="M28 22c10 0 18 8 18 18 0 16-14 28-26 40l-3 3c7-2 18-5 24-14 9-12 9-28 0-37-6-6-14-7-20-5v66c0 9-7 16-16 16s-16-7-16-16 7-16 16-16c5 0 9 2 12 6"
            fill="none"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="52" cy={midY - gap} r="2.8" stroke="none" />
          <circle cx="52" cy={midY + gap} r="2.8" stroke="none" />
        </g>
        {ledger.map((y) => (
          <line key={y} x1={168} x2={212} y1={y} y2={y} className="staff-line ledger" />
        ))}
        {hasNote ? (
          <g transform={`translate(190 ${noteY})`}>
            <ellipse
              cx={0}
              cy={0}
              rx={10}
              ry={7.5}
              transform="rotate(-20)"
              fill={color}
            />
            <line x1={9} y1={0} x2={9} y2={noteY > midY ? 30 : -30} stroke={color} strokeWidth="2.2" />
            {showFingering ? (
              <text
                x={0}
                y={noteY > midY ? 44 : -38}
                textAnchor="middle"
                className="fingering-num"
                fill={color}
              >
                {finger === 0 || finger == null ? '0' : String(finger)}
              </text>
            ) : null}
          </g>
        ) : null}
      </svg>
    </div>
  )
}
