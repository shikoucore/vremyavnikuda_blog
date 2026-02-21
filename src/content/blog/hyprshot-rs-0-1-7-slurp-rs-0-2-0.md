---
title: "hyprshot-rs v0.1.7 と slurp-rs v0.2.0 - Selector統合と公開API"
description: "2つの関連リリース: hyprshot-rs v0.1.7 は既定選択を slurp-rs API に移行し、slurp-rs v0.2.0 は公開Rust APIを追加。"
pubDate: 2026-02-21
tags: ["hyprshot-rs", "slurp-rs", "wayland", "rust", "release"]
draft: false
lang: ja
---

> 注: `slurp-rs` v0.2.0 のリリース日は **2026年2月21日** です。

これは `hyprshot-rs` と `slurp-rs` という、関連する2つのプロジェクトの同時アップデートです。

## ざっくりまとめ

- `hyprshot-rs` は **v0.1.7** になり、selector 内部実装がより整理されました。
- `slurp-rs` は **v0.2.0** で再始動。
- `slurp-rs` は CLI だけでなくライブラリとしても使えるようになりました。

## hyprshot-rs v0.1.7

このリリースの主な変更点:

- 既定の選択フローは `slurp-rs` API を使用するようになりました。
- 領域選択キャンセル時のガイダンスは、型付き selector error ベースになりました。
- キャプチャ経路は、明示的な `Geometry -> grim_rs::Box` 変換を使用するようになりました。
- 領域選択は実行時に外部 `slurp` バイナリを必要としなくなりました。

要するに、外部依存面が減り、キャプチャ経路が整理され、選択処理の挙動がより予測可能になりました。

## slurp-rs 再始動: v0.1.0 -> v0.2.0

`slurp-rs` は再びアクティブです。

### v0.1.0 の基盤

`0.1.0` 系では、従来 `slurp` の挙動に対する広い互換性を確立しました:

- CLI / オプション / help の互換性。
- Wayland 初期化と出力ライフサイクル管理。
- pointer / keyboard / touch の入力状態機械。
- SHM + Cairo の描画パイプライン。
- cursor-shape プロトコル対応とフォールバック経路。

### v0.2.0 の更新

`0.2.0` では、統合に向けた主要な不足ピースを追加:

- 公開Rust API: `select_region`, `select_output`, `select_from_boxes`, `select`。
- 型付きモデル: `Rect`, `Selection`, `ChoiceBox`, `SelectOptions`。
- `SlurpError` による型付きエラー（キャンセル処理を明示）。
- 既存CLIの挙動は維持。

## リンク

- hyprshot-rs repository: https://github.com/shikoucore/hyprshot-rs
- slurp-rs repository: https://github.com/vremyavnikuda/slurp-rs
