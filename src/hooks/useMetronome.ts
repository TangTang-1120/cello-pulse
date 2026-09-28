import { useEffect, useRef, useState } from 'react'
import { MetronomeEngine, type TimeSignature } from '../audio/metronome'

export function useMetronome() {
  const engine = useRef(new MetronomeEngine())
  const [running, setRunning] = useState(false)
  const [bpm, setBpm] = useState(72)
  const [timeSignature, setTimeSignature] = useState<TimeSignature>('4/4')
  const [activeBeat, setActiveBeat] = useState(-1)

  useEffect(() => {
    engine.current.bpm = bpm
  }, [bpm])

  useEffect(() => {
    engine.current.timeSignature = timeSignature
  }, [timeSignature])

  useEffect(() => {
    engine.current.onBeat = (beat) => setActiveBeat(beat)
    return () => engine.current.stop()
  }, [])

  async function toggle() {
    if (engine.current.isRunning) {
      engine.current.stop()
      setRunning(false)
      setActiveBeat(-1)
      return
    }
    await engine.current.start()
    setRunning(true)
  }

  return {
    running,
    bpm,
    setBpm,
    timeSignature,
    setTimeSignature,
    activeBeat,
    toggle,
  }
}
