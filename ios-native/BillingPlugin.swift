import Capacitor
import Foundation

@objc(BillingPlugin)
public class BillingPlugin: CAPPlugin, CAPBridgedPlugin {
  public let identifier = "BillingPlugin"
  public let jsName = "Billing"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
  ]

  @objc func getStatus(_ call: CAPPluginCall) {
    Task {
      let payload = await StoreKitLifetime.shared.status()
      call.resolve(self.jsPayload(payload))
    }
  }

  @objc func purchase(_ call: CAPPluginCall) {
    Task {
      do {
        let payload = try await StoreKitLifetime.shared.purchase()
        call.resolve(self.jsPayload(payload))
      } catch {
        call.reject(error.localizedDescription)
      }
    }
  }

  @objc func restore(_ call: CAPPluginCall) {
    Task {
      do {
        let payload = try await StoreKitLifetime.shared.restore()
        call.resolve(self.jsPayload(payload))
      } catch {
        call.reject(error.localizedDescription)
      }
    }
  }

  private func jsPayload(_ payload: [String: String]) -> [String: Any] {
    [
      "unlocked": payload["unlocked"] == "true",
      "priceLabel": payload["priceLabel"] ?? "¥16",
      "productTitle": payload["productTitle"] ?? "永久解锁",
      "platform": payload["platform"] ?? "ios",
    ]
  }
}
