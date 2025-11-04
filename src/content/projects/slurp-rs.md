---
title: "slurp-rs"
description: "Waylandコンポジター用のslurpユーティリティの純粋なRust実装"
github: "https://github.com/shikoucore/slurp-rs"
tags: ["rust", "linux", "wayland", "region-selection", "library"]
featured: false
lang: ja
projectType: "project"
category: "projects"
parentProject: "hyprshot-rs"
status: "active"
version: "0.1.0"
roadmap:
  - version: "0.1.0"
    releaseStatus: "dev"
---

slurp-rsは、Waylandコンポジター用の領域選択ユーティリティslurpの純粋なRust実装です。バイナリとライブラリAPIの両方を提供し、マウス、キーボード、またはタッチ入力による対話的な領域選択と、スクリーンショットツールで使用するための互換性のある文字列出力形式をサポートします。プロジェクトはC依存関係ゼロを目指し、HiDPIと カスタマイズ可能なレンダリング（色、境界線、フォント）をサポートします。現在、基本構造、設定解析、ジオメトリが実装されており、Wayland統合、レンダリング、入力処理はまだ開発中です。
