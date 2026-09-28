import { useEffect, useMemo, useState } from 'react'
import { useEntitlement } from '../billing/EntitlementContext'

type Plan = 'trial' | 'lifetime'

function formatRemain(ms: number) {
  const clamped = Math.max(0, Math.floor(ms / 1000))
  const h = String(Math.floor(clamped / 3600)).padStart(2, '0')
  const m = String(Math.floor((clamped % 3600) / 60)).padStart(2, '0')
  const s = String(clamped % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function Paywall({ onClose }: { onClose?: () => void }) {
  const {
    purchase,
    restore,
    priceLabel,
    busy,
    error,
    trialActive,
    trialEndsAt,
  } = useEntitlement()
  const [plan, setPlan] = useState<Plan>(trialActive ? 'trial' : 'lifetime')
  const [agreed, setAgreed] = useState(false)
  const [faq, setFaq] = useState<'restore' | 'billing' | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const remain = useMemo(() => formatRemain(trialEndsAt - now), [trialEndsAt, now])

  async function confirm() {
    if (!agreed) return
    if (plan === 'trial') {
      onClose?.()
      return
    }
    await purchase()
  }

  const cta =
    plan === 'trial'
      ? trialActive
        ? '0元开通'
        : '试用已结束'
      : `立即买断 ${priceLabel}`
  const ctaDisabled = busy || !agreed || (plan === 'trial' && !trialActive)

  return (
    <section className="member" role="dialog" aria-labelledby="member-title">
      <header className="member-bar">
        {onClose ? (
          <button type="button" className="member-back" onClick={onClose} aria-label="返回">
            ‹
          </button>
        ) : (
          <span className="member-back spacer" />
        )}
        <p className="member-logo">
          <span className="logo-mark" />
          Cello Studio
        </p>
        <span className="member-back spacer" />
      </header>

      <h2 id="member-title" className="member-hero">
        即刻成为 <em>大提琴会员</em>
      </h2>

      <div className="member-scroll">
        <p className="member-kicker">畅用调音与节拍</p>

        <div className="plan-row">
          <button
            type="button"
            className={`plan-card featured ${plan === 'trial' ? 'selected' : ''}`}
            onClick={() => setPlan('trial')}
          >
            <span className="plan-badge">限时特惠</span>
            <span className="plan-name">3天体验卡</span>
            <span className="plan-price">
              <small>¥</small>0
            </span>
            <span className="plan-old">16元</span>
            <span className="plan-timer">限时 {remain}</span>
          </button>

          <button
            type="button"
            className={`plan-card ${plan === 'lifetime' ? 'selected' : ''}`}
            onClick={() => setPlan('lifetime')}
          >
            <span className="plan-tag">一次买断</span>
            <span className="plan-name">永久解锁</span>
            <span className="plan-price dark">
              <small>¥</small>16
            </span>
            <span className="plan-old">59元</span>
            <span className="plan-save">App Store 内购</span>
          </button>
        </div>

        <p className="member-note">
          {plan === 'trial'
            ? '新用户可免费体验 3 天，到期后需一次买断才可继续使用，不会自动续订。'
            : `一次付款 ${priceLabel}，同一 Apple ID 可还原，不含自动续费。`}
        </p>

        <h3>会员特权</h3>
        <div className="perk-row">
          <div>
            <span className="perk-icon">♪</span>
            <strong>精准调音</strong>
            <small>大提琴 C G D A</small>
          </div>
          <div>
            <span className="perk-icon">↓</span>
            <strong>节拍练习</strong>
            <small>拍号与速度</small>
          </div>
          <div>
            <span className="perk-icon">⌘</span>
            <strong>一次买断</strong>
            <small>无需订阅</small>
          </div>
        </div>

        <h3>常见问题</h3>
        <div className="faq-row">
          <button type="button" onClick={() => void restore()}>
            还原购买
          </button>
          <button type="button" onClick={() => setFaq(faq === 'billing' ? null : 'billing')}>
            如何收费
          </button>
        </div>
        {faq === 'billing' ? (
          <p className="faq-body">
            本 App 为免费下载。前 3 天完整体验，之后以 App Store 非消耗型内购一次买断永久使用，不是连续订阅。
          </p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
      </div>

      <footer className="member-foot">
        <label className="agree">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          已阅读并同意《会员服务协议》
        </label>
        <button type="button" className="member-cta" disabled={ctaDisabled} onClick={() => void confirm()}>
          {busy ? '处理中…' : cta}
        </button>
      </footer>
    </section>
  )
}
