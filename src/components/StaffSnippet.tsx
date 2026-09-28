import { noteLabel, staffYFromMidi } from '../rhythm/music'

/** Compact bass-clef staff for the upcoming note (识五线谱). */
export function StaffSnippet({
  stringId,
  semitones,
  pulse = false,
}: {
  stringId?: 'C' | 'G' | 'D' | 'A'
  semitones?: number
  pulse?: boolean
}) {
  const gap = 11
  const midY = 48
  const width = 220
  const height = 96
  const hasNote = stringId != null && semitones != null
  const label = hasNote ? noteLabel(stringId, semitones) : null
  const noteY = hasNote ? midY + staffYFromMidi(label!.midi, gap) : midY
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
    <div className={`staff-card ${pulse ? 'pulse' : ''}`}>
      <div className="staff-meta">
        <span className="staff-kicker">低音谱号</span>
        <strong>{label ? `${label.letter} · ${label.solfege}` : '准备识谱'}</strong>
      </div>
      <svg className="staff-svg" viewBox={`0 0 ${width} ${height}`} aria-label="大提琴低音谱号五线谱">
        {[ -2, -1, 0, 1, 2 ].map((i) => (
          <line
            key={i}
            x1={36}
            x2={width - 8}
            y1={midY + i * gap}
            y2={midY + i * gap}
            className="staff-line"
          />
        ))}
        {/* F clef simplified */}
        <text x={8} y={midY + 10} className="bass-clef">
          𝄢
        </text>
        {ledger.map((y) => (
          <line key={y} x1={148} x2={188} y1={y} y2={y} className="staff-line ledger" />
        ))}
        {hasNote ? (
          <g transform={`translate(168 ${noteY})`}>
            <ellipse className="note-head" cx={0} cy={0} rx={9} ry={7} transform="rotate(-18)" />
            <line className="note-stem" x1={8} y1={0} x2={8} y2={-28} />
          </g>
        ) : null}
      </svg>
    </div>
  )
}
