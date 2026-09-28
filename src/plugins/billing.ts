import { Capacitor, registerPlugin } from '@capacitor/core'
import type { BillingPlugin } from './billing-types'
import { BillingWeb } from './billing.web'

const NativeBilling = registerPlugin<BillingPlugin>('Billing')

function createBilling(): BillingPlugin {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios' || platform === 'android') {
    return NativeBilling
  }
  return new BillingWeb()
}

export const Billing = createBilling()

export type { BillingPlugin, BillingStatus } from './billing-types'
