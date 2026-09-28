Cello Studio · App Store 上传包

含已同步的 Capacitor iOS 工程（调音器 / 节拍器 / 把位 / StoreKit 一次买断）。
若本机只有 Command Line Tools、没有完整 Xcode，无法在这里直接导出 IPA，请先安装 Xcode 再归档。

用法
1. 安装 Xcode：https://apps.apple.com/app/xcode/id497799835
2. 打开一次 Xcode，登录付费 Apple Developer 账号
3. 打开 ios/App/App.xcodeproj，Bundle ID：com.cellostudio.app
4. Signing & Capabilities 勾选 Automatically manage signing，选你的 Team
5. 勾选 In-App Purchase（内购商品 com.cellostudio.lifetime）
6. Product → Archive → Distribute App → App Store Connect

或在本目录运行：
  chmod +x export-appstore.sh && ./export-appstore.sh

导出的 IPA 用 Transporter 上传。
