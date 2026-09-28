import { useEffect, useRef, useState } from 'react'
import {
  CELLO_STRINGS,
  centsOff,
  midiToHz,
  nearestCelloString,
  rms,
  type CelloStringId,
} from '../audio/notes'
import { detectPitchYin } from '../audio/yin'

export type TunerMode = 'auto' | CelloStringId

export type TunerReading = {
  hz: number
  cents: number
  stringId: CelloStringId
  note: string
  inTune: boolean
}

export function useTuner(options?: { minHz?: number; maxHz?: number }) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<TunerMode>('auto')
  const [reading, setReading] = useState<TunerReading | null>(null)
  const [level, setLevel] = useState(0)
  const raf = useRef(0)
  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const modeRef = useRef<TunerMode>('auto')
  const minHz = options?.minHz ?? 55
  const maxHz = options?.maxHz ?? 320

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  async function start() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      streamRef.current = stream
      const ctx = new AudioContext()
      ctxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 8192
      analyser.smoothingTimeConstant = 0
      source.connect(analyser)
      const buffer = new Float32Array(analyser.fftSize)
      setListening(true)

      const loop = () => {
        analyser.getFloatTimeDomainData(buffer)
        const volume = rms(buffer)
        setLevel(volume)
        if (volume > 0.008) {
          const pitch = detectPitchYin(buffer, ctx.sampleRate, { minHz, maxHz })
          if (pitch) {
            const currentMode = modeRef.current
            const string =
              currentMode === 'auto'
                ? nearestCelloString(pitch.frequency)
                : CELLO_STRINGS.find((item) => item.id === currentMode)!
            const target = midiToHz(string.midi)
            const cents = centsOff(pitch.frequency, target)
            setReading({
              hz: pitch.frequency,
              cents,
              stringId: string.id,
              note: string.note,
              inTune: Math.abs(cents) <= 5,
            })
          }
        }
        raf.current = requestAnimationFrame(loop)
      }
      loop()
    } catch {
      setError('无法使用麦克风。请允许权限后再试。')
      setListening(false)
    }
  }

  function stop() {
    cancelAnimationFrame(raf.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    void ctxRef.current?.close()
    ctxRef.current = null
    setListening(false)
    setReading(null)
    setLevel(0)
  }

  useEffect(() => () => stop(), [])

  return { listening, error, mode, setMode, reading, level, start, stop }
}
