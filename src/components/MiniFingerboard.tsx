import { LANE_STRINGS } from '../rhythm/music'
import { STRING_COLOR } from '../rhythm/practice'
import type { CelloStringId } from '../audio/notes'

const ROWS = [0, 1, 2, 3, 4, 5, 6, 7]

/** Compact fingerboard map synced to target note (Purely Cello / CelloEasy style). */
export function MiniFingerboard({
  stringId,
  semitones,
}: {
  stringId?: CelloStringId
  semitones?: number
}) {
  return (
    <div className="mini-board" aria-label="指板提示">
      <div className="mini-romans">
        {LANE_STRINGS.map((s) => (
          <span key={s.id} style={{ color: STRING_COLOR[s.id] }}>
            {s.roman}
          </span>
        ))}
      </div>
      <div className="mini-grid">
        {ROWS.map((row) => (
          <div key={row} className="mini-row">
            {LANE_STRINGS.map((s) => {
              const on = stringId === s.id && semitones === row
              const open = row === 0
              return (
                <span
                  key={s.id}
                  className={`mini-cell ${open ? 'open' : ''} ${on ? 'lit' : ''}`}
                  style={
                    on
                      ? {
                          background: STRING_COLOR[s.id],
                          borderColor: STRING_COLOR[s.id],
                          color: '#0b0b0b',
                        }
                      : undefined
                  }
                >
                  {on ? (row === 0 ? '0' : String(row)) : ''}
                </span>
              )
            })}
          </div>
        ))}
      </div>
      <p className="mini-caption">粗→细 · 上为低把位 · 与谱面同步</p>
    </div>
  )
}
