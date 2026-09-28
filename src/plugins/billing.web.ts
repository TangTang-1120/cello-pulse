import { Capacitor, WebPlugin } from '@capacitor/core'
import { MARKETING_PRICE_CNY, WEB_UNLOCK_KEY } from '../billing/config'
import type { BillingPlugin, BillingStatus } from './billing-types'

export class BillingWeb extends WebPlugin implements BillingPlugin {
  async getStatus(): Promise<BillingStatus> {
    return this.status()
  }

  async purchase(): Promise<BillingStatus> {
    window.localStorage.setItem(WEB_UNLOCK_KEY, '1')
    return this.status()
  }

  async restore(): Promise<BillingStatus> {
    return this.status()
  }

  private status(): BillingStatus {
    return {
      unlocked: window.localStorage.getItem(WEB_UNLOCK_KEY) === '1',
      priceLabel: `¥${MARKETING_PRICE_CNY}`,
      productTitle: '永久解锁',
      platform: Capacitor.getPlatform(),
    }
  }
}
