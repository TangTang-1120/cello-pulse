import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { TRIAL_DAYS, TRIAL_STARTED_KEY } from './config'
import { Billing, type BillingStatus } from '../plugins/billing'

export type Entitlement = {
  unlocked: boolean
  trialActive: boolean
  trialEndsAt: number
  hoursLeft: number
  priceLabel: string
  productTitle: string
  canUseApp: boolean
  loading: boolean
  busy: boolean
  error: string | null
  purchase: () => Promise<void>
  restore: () => Promise<void>
}

const EntitlementContext = createContext<Entitlement | null>(null)

function readTrialStart(): number {
  const forceExpire = new URLSearchParams(window.location.search).has('expireTrial')
  if (forceExpire) {
    const expired = Date.now() - (TRIAL_DAYS + 1) * 24 * 60 * 60 * 1000
    window.localStorage.setItem(TRIAL_STARTED_KEY, String(expired))
    return expired
  }
  const existing = window.localStorage.getItem(TRIAL_STARTED_KEY)
  if (existing) return Number(existing)
  const now = Date.now()
  window.localStorage.setItem(TRIAL_STARTED_KEY, String(now))
  return now
}

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const trialStartedAt = useMemo(() => readTrialStart(), [])
  const trialEndsAt = trialStartedAt + TRIAL_DAYS * 24 * 60 * 60 * 1000

  const refresh = useCallback(async () => {
    const status = await Billing.getStatus()
    setStore(status)
    return status
  }, [])

  useEffect(() => {
    refresh()
      .catch(() => setError('无法连接至 App Store'))
      .finally(() => setLoading(false))
  }, [refresh])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const purchase = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      const status = await Billing.purchase()
      setStore(status)
      if (!status.unlocked) {
        setError('购买未完成')
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '购买失败'
      if (!/cancel/i.test(message)) {
        setError('购买失败，请稍后再试')
      }
    } finally {
      setBusy(false)
    }
  }, [])

  const restore = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      const status = await Billing.restore()
      setStore(status)
      if (!status.unlocked) {
        setError('没有可还原的购买记录')
      }
    } catch {
      setError('还原失败')
    } finally {
      setBusy(false)
    }
  }, [])

  const unlocked = store?.unlocked === true
  const hoursLeft = Math.max(0, (trialEndsAt - now) / 36e5)
  const trialActive = !unlocked && now < trialEndsAt

  const value: Entitlement = {
    unlocked,
    trialActive,
    trialEndsAt,
    hoursLeft,
    priceLabel: store?.priceLabel ?? '¥16',
    productTitle: store?.productTitle ?? '永久解锁',
    canUseApp: unlocked || trialActive,
    loading,
    busy,
    error,
    purchase,
    restore,
  }

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>
}

export function useEntitlement() {
  const value = useContext(EntitlementContext)
  if (!value) {
    throw new Error('useEntitlement 必须放在 EntitlementProvider 内')
  }
  return value
}
