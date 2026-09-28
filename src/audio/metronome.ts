export type TimeSignature = '2/4' | '3/4' | '4/4'

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD = 0.12

export class MetronomeEngine {
  private ctx: AudioContext | null = null
  private timer: number | null = null
  private nextNoteTime = 0
  private beat = 0
  private running = false
  onBeat: ((beat: number, beatsPerBar: number) => void) | null = null
  bpm = 72
  timeSignature: TimeSignature = '4/4'

  get isRunning() {
    return this.running
  }

  private beatsPerBar() {
    return Number(this.timeSignature.split('/')[0])
  }

  async start() {
    if (this.running) return
    this.ctx ??= new AudioContext()
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
    this.running = true
    this.beat = 0
    this.nextNoteTime = this.ctx.currentTime + 0.05
    this.scheduler()
    this.timer = window.setInterval(() => this.scheduler(), LOOKAHEAD_MS)
  }

  stop() {
    this.running = false
    if (this.timer != null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
  }

  private scheduler() {
    if (!this.ctx || !this.running) return
    while (this.nextNoteTime < this.ctx.currentTime + SCHEDULE_AHEAD) {
      this.scheduleClick(this.nextNoteTime, this.beat === 0)
      const delay = Math.max(0, (this.nextNoteTime - this.ctx.currentTime) * 1000)
      const beat = this.beat
      const beats = this.beatsPerBar()
      window.setTimeout(() => this.onBeat?.(beat, beats), delay)
      this.nextNoteTime += 60 / this.bpm
      this.beat = (this.beat + 1) % this.beatsPerBar()
    }
  }

  private scheduleClick(time: number, accent: boolean) {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = accent ? 1320 : 880
    gain.gain.setValueAtTime(accent ? 0.22 : 0.12, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(time)
    osc.stop(time + 0.06)
  }
}
