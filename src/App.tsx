import { useEffect, useState } from 'react'
import { useEntitlement } from './billing/EntitlementContext'
import { MetronomePanel } from './components/MetronomePanel'
import { Paywall } from './components/Paywall'
import { PositionPanel } from './components/PositionPanel'
import { RhythmPanel } from './components/RhythmPanel'
import { TunerPanel } from './components/TunerPanel'
import type { TunerMode, TunerReading } from './hooks/useTuner'
import { midiToHz, CELLO_STRINGS } from './audio/notes'
import './App.css'

type Tab = 'rhythm' | 'tuner' | 'position' | 'metronome'

declare global {
  interface Window {
    __celloTutorial?: {
      setTab: (tab: Tab) => void
      setCaption: (text: string) => void
      showString: (id: TunerMode, cents?: number) => void
      listen: (on: boolean) => void
      openPaywall: () => void
      setBuildStep: (step: number) => void
    }
  }
}

const params = new URLSearchParams(window.location.search)
const tutorialChrome = params.has('tutorial')
const driveDemo = tutorialChrome || params.has('demo')
const demoHome = params.has('demoHome')
const demoPay = params.has('demoPay')

export default function App() {
  const [tab, setTab] = useState<Tab>('rhythm')
  const [showPaywall, setShowPaywall] = useState(false)
  const [caption, setCaption] = useState('Cello Studio 试用教程')
  const [demoListening, setDemoListening] = useState(false)
  const [demoMode, setDemoMode] = useState<TunerMode>('auto')
  const [demoReading, setDemoReading] = useState<TunerReading | null>(null)
  const [demoLevel, setDemoLevel] = useState(0)
  const { canUseApp, trialActive, unlocked, hoursLeft } = useEntitlement()
  const days = Math.max(0, Math.ceil(hoursLeft / 24))
  const canUse = demoHome || canUseApp

  useEffect(() => {
    if (unlocked && !demoPay) setShowPaywall(false)
  }, [unlocked])

  useEffect(() => {
    if (demoPay) setShowPaywall(true)
  }, [])

  useEffect(() => {
    if (!driveDemo) return
    if (tutorialChrome) document.documentElement.classList.add('tutorial')
    if (params.has('record')) document.documentElement.classList.add('record')
    if (params.has('natural')) document.documentElement.classList.add('natural')
    if (params.has('build')) {
      document.documentElement.classList.add('building')
      document.documentElement.dataset.build = '0'
    }
    window.__celloTutorial = {
      setTab,
      setCaption,
      listen(on) {
        setDemoListening(on)
        if (!on) {
          setDemoReading(null)
          setDemoLevel(0)
        }
      },
      showString(id, cents = 0) {
        setDemoMode(id)
        if (id === 'auto') {
          setDemoReading(null)
          setDemoLevel(0.12)
          return
        }
        const string = CELLO_STRINGS.find((item) => item.id === id)!
        const target = midiToHz(string.midi)
        const hz = target * 2 ** (cents / 1200)
        setDemoReading({
          hz,
          cents,
          stringId: string.id,
          note: string.note,
          inTune: Math.abs(cents) <= 5,
        })
        setDemoLevel(0.55)
      },
      openPaywall() {
        setShowPaywall(true)
      },
      setBuildStep(step) {
        document.documentElement.classList.add('building')
        document.documentElement.dataset.build = String(Math.max(0, Math.min(7, step)))
      },
    }
    return () => {
      delete window.__celloTutorial
      document.documentElement.classList.remove('tutorial')
    }
  }, [])

  function requireUnlock() {
    if (!canUse) setShowPaywall(true)
  }

  return (
    <div className="phone">
      <div className="phone-atmosphere" aria-hidden="true">
        <span className="bloom bloom-core" />
        <span className="bloom bloom-left" />
        <span className="bloom bloom-right" />
        <div className="frost" />
      </div>
      <header className="top">
        <img
          className="brand-mark"
          src={`${import.meta.env.BASE_URL}app-icon.png`}
          alt="Cello Studio"
        />
        <div className="brand-copy">
          <p className="eyebrow">Cello Studio</p>
          <h1>调音 · 节拍 · 跟奏</h1>
        </div>
      </header>

      {unlocked ? (
        <p className="status-chip">已永久解锁</p>
      ) : trialActive ? (
        <p className="status-chip">试用剩余 {days} 天</p>
      ) : (
        <p className="status-chip">试用已结束</p>
      )}

      <nav className="tabs tab-switch tabs-4" aria-label="功能切换">
        <button
          type="button"
          className={tab === 'rhythm' ? 'active' : ''}
          onClick={() => setTab('rhythm')}
        >
          跟奏
        </button>
        <button
          type="button"
          className={tab === 'tuner' ? 'active' : ''}
          onClick={() => setTab('tuner')}
        >
          调音器
        </button>
        <button
          type="button"
          className={tab === 'metronome' ? 'active' : ''}
          onClick={() => setTab('metronome')}
        >
          节拍器
        </button>
        <button
          type="button"
          className={tab === 'position' ? 'active' : ''}
          onClick={() => setTab('position')}
        >
          把位
        </button>
      </nav>

      <div className="stage">
        {tab === 'rhythm' ? (
          <RhythmPanel canUse={canUse} onRequireUnlock={requireUnlock} />
        ) : tab === 'tuner' ? (
          <TunerPanel
            canUse={canUse}
            onRequireUnlock={requireUnlock}
            demo={
              driveDemo
                ? {
                    listening: demoListening,
                    reading: demoReading,
                    level: demoLevel,
                    mode: demoMode,
                    setMode: setDemoMode,
                  }
                : undefined
            }
          />
        ) : tab === 'position' ? (
          <PositionPanel
            canUse={canUse}
            onRequireUnlock={requireUnlock}
            demo={
              driveDemo
                ? {
                    listening: demoListening,
                    reading: demoReading,
                  }
                : undefined
            }
          />
        ) : (
          <MetronomePanel canUse={canUse} onRequireUnlock={requireUnlock} />
        )}
      </div>

      {tutorialChrome && !demoPay ? <p className="tutorial-caption">{caption}</p> : null}

      {showPaywall ? (
        <div className="paywall-layer">
          <Paywall onClose={() => setShowPaywall(false)} />
        </div>
      ) : null}
    </div>
  )
}
