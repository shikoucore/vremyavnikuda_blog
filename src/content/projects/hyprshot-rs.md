---
title: "hyprshot-rs"
description: "マウスを使用してHyprlandでスクリーンショットを撮影するRustユーティリティ"
github: "https://github.com/shikoucore/hyprshot-rs"
link: "https://crates.io/crates/hyprshot-rs"
tags: ["rust", "linux", "hyprland", "wayland", "screenshot"]
featured: true
lang: ja
projectType: "project"
category: "projects"
parentProject: "projects"
status: "active"
version: "0.1.4"
roadmap:
  - version: "0.1.0"
    releaseStatus: "release"
  - version: "0.1.1"
    releaseStatus: "release"
  - version: "0.1.3"
    releaseStatus: "release"
  - version: "0.1.4"
    releaseStatus: "release"
    items:
      - "組み込みslurpの安定化とCIの改善"
      - "CLIモードと設定ノートの修正"
      - "pkgverを0.1.4に更新"
      - "slurpをgit submoduleとして追加"
      - "slurpバイナリを同梱し、AUR対応を追加"
  - version: "0.1.5"
    releaseStatus: "dev"
---

マウスを使用してHyprlandでスクリーンショットを撮影するRustユーティリティ。モニター全体（出力）、アクティブなモニター、選択した領域、選択したウィンドウ、アクティブなウィンドウのキャプチャをサポートしています。スクリーンショットは選択したディレクトリに保存するか、クリップボードにコピー（PNG形式）できます。パス、ホットキー、通知などを設定するためのTOMLベースの設定ファイル（~/.config/hyprshot-rs/config.toml）が含まれています。CLIツールとして、また統合用のクレートとして利用可能です。
