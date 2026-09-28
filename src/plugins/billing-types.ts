export type BillingStatus = {
  unlocked: boolean
  priceLabel: string
  productTitle: string
  platform: string
}

export interface BillingPlugin {
  getStatus(): Promise<BillingStatus>
  purchase(): Promise<BillingStatus>
  restore(): Promise<BillingStatus>
}
