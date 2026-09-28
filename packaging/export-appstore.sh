#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
if [ -d "$ROOT/ios/App" ]; then
  IOS="$ROOT/ios/App"
else
  IOS="$(cd "$ROOT/.." && pwd)/ios/App"
fi
OUT="$ROOT/IPA"
ARCHIVE="$OUT/CelloStudio.xcarchive"

if ! /usr/bin/xcrun --find xcodebuild >/dev/null 2>&1; then
  echo "未找到 xcodebuild。"
  exit 1
fi

if xcodebuild -version 2>&1 | grep -q "requires Xcode"; then
  echo "当前只有 Command Line Tools，App Store IPA 需要安装完整 Xcode："
  echo "https://apps.apple.com/app/xcode/id497799835"
  echo "安装后打开一次 Xcode，登录 Apple ID，再运行本脚本。"
  exit 1
fi

mkdir -p "$OUT"
xcodebuild -project "$IOS/App.xcodeproj" -scheme App -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE" \
  archive

xcodebuild -exportArchive -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$ROOT/ExportOptions.plist" \
  -exportPath "$OUT"

echo "导出完成：$OUT"
ls -lh "$OUT"
