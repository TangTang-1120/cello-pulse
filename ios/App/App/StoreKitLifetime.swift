import StoreKit

enum BillingError: LocalizedError {
  case productMissing
  case pending
  case unverified

  var errorDescription: String? {
    switch self {
    case .productMissing:
      return "App Store 商品尚未设定"
    case .pending:
      return "购买审核中"
    case .unverified:
      return "购买凭证无效"
    }
  }
}

final class StoreKitLifetime {
  static let productId = "com.cellostudio.lifetime"
  static let shared = StoreKitLifetime()

  func status() async -> [String: String] {
    let product = try? await Product.products(for: [Self.productId]).first
    return [
      "unlocked": (await isUnlocked()) ? "true" : "false",
      "priceLabel": product?.displayPrice ?? "¥16",
      "productTitle": product?.displayName ?? "永久解锁",
      "platform": "ios",
    ]
  }

  func purchase() async throws -> [String: String] {
    let products = try await Product.products(for: [Self.productId])
    guard let product = products.first else { throw BillingError.productMissing }
    let result = try await product.purchase()
    switch result {
    case .success(let verification):
      let transaction = try checkVerified(verification)
      await transaction.finish()
      return await status()
    case .userCancelled:
      throw PurchaseCancelledError()
    case .pending:
      throw BillingError.pending
    @unknown default:
      throw BillingError.pending
    }
  }

  func restore() async throws -> [String: String] {
    try await AppStore.sync()
    return await status()
  }

  private func isUnlocked() async -> Bool {
    for await entitlement in Transaction.currentEntitlements {
      if case .verified(let transaction) = entitlement,
         transaction.productID == Self.productId,
         transaction.revocationDate == nil {
        return true
      }
    }
    return false
  }

  private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
    switch result {
    case .unverified:
      throw BillingError.unverified
    case .verified(let value):
      return value
    }
  }
}

struct PurchaseCancelledError: LocalizedError {
  var errorDescription: String? { "cancel" }
}
