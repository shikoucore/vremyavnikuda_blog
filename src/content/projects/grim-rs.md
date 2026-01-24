---
title: "grim-rs"
description: "Waylandコンポジター用のスクリーンショット撮影ユーティリティとライブラリ（Rust製）"
github: "https://github.com/vremyavnikuda/grim-rs"
link: "https://crates.io/crates/grim-rs"
tags: ["rust", "linux", "wayland"]
featured: true
lang: ja
projectType: "project"
category: "projects"
parentProject: "hyprshot-rs"
status: "active"
version: "0.1.4"
roadmap:
  - version: "0.1.0"
    releaseStatus: "release"
  - version: "0.1.1"
    releaseStatus: "release"
  - version: "0.1.2"
    releaseStatus: "release"
  - version: "0.1.3"
    releaseStatus: "release"
    items:
      - "構造体のカプセル化（Box、CaptureResult、Output、CaptureParameters、MultiOutputCaptureResult）"
      - "Builderパターンの追加（CaptureParameters）"
      - "capture_outputs()の重大なバグ修正"
      - "エラーハンドリングの改善（unwrap()を適切なエラー伝播に置き換え）"
      - "メモリ使用量の最適化（不要なクローンを削除）"
      - "包括的なテストカバレッジの追加"
  - version: "0.1.4"
    releaseStatus: "release"
    items:
      - "Fixed Wayland region capture under fractional scaling"
      - "Handled fractional scaling without performance regressions"
      - "Moved geometry tests to integration suite and removed unwraps in tests"
  - version: "0.1.5"
    releaseStatus: "dev"
---

Waylandコンポジター用のスクリーンショット撮影ユーティリティとライブラリ（Rust製）。外部のC依存関係がなく、マルチモニター設定、出力変換（回転とミラーリング）、領域キャプチャ、高品質な画像スケーリング（Triangle、CatmullRom、Lanczos3）、PNG/JPEG/PPM形式での保存をサポートしています。CLIツール（cargo install grim-rs）として、また独自のアプリケーションに統合するためのクレートとして利用可能です。
