---
title: "hyprshot-rs v0.1.6 - 安定性と予測可能性を最優先に"
description: "v0.1.6 では Wayland 上での挙動をより予測可能にし、freeze を再設計し、信頼性と UX を強化しました。"
pubDate: 2026-02-02
tags: ["hyprshot-rs", "wayland", "hyprland", "sway", "release"]
draft: false
lang: ja
---

> 注: v0.1.6 のリリース日は **2026年2月1日** です。

このリリースは「安定性」と「予測可能性」を最優先にしました。Wayland コンポジタ上で基本的なスクリーンショット動作が迷わず確実に動き、挙動が説明できる状態を目指しています。

## ざっくりまとめ

- `region` / `output` の基本モードは純粋な Wayland で動作。
- freeze はネイティブ実装になり、`hyprpicker` 依存を解消。
- 外部の失敗点が減り、UX が改善。

## 主な改善点

### Wayland-first の動作

- `region` / `output` は Wayland のみで完結。
- `-m output` / `-m NAME` は Wayland 列挙で出力を解決（`hyprctl` に依存しない）。
- ウィンドウ/アクティブウィンドウの切り出しはコンポジタ依存を排除。

### 新しい freeze

- `hyprpicker` 依存を廃止し、Wayland layer-shell overlay に変更。
- overlay は入力をブロックしない。
- 必要プロトコルが無い場合は安全に無効化（捕捉は継続）。
- 分数スケーリングと論理サイズの扱いを改善。
- マルチモニタでは出力ごとにキャプチャし、ピーク RAM を削減。

### 信頼性と UX

- 通知/クリップボードの失敗で結果が壊れない（`--clipboard-only` を除く）。
- 外部ツールのハングでアプリが止まらない。
- 連続撮影でもファイルを上書きしにくい。
- `delay_ms` はミリ秒精度を正しく反映。
- `--notif-timeout` は指定値を必ず尊重（5000 なども有効）。
- 形式は PNG のみに固定し、誤解を防止。
- 不要な I/O と `hyprctl` 呼び出しを削減。

### ビルドと内蔵 slurp

- 内蔵 `slurp` はアトミック更新＋ロック＋整合性チェック。
- 埋め込み失敗がビルドを壊さないよう修正。

## 互換性について

Wayland 上での **クロスコンポジタ互換性** に向けた第一歩ですが、**クロスプラットフォーム**ではありません。

## リンク

- リポジトリ: https://github.com/shikoucore/hyprshot-rs
- リリース v0.1.6: https://github.com/shikoucore/hyprshot-rs/releases/tag/v0.1.6
- CHANGELOG: https://github.com/shikoucore/hyprshot-rs/blob/master/CHANGELOG.md
- Discussions: https://github.com/orgs/shikoucore/discussions
