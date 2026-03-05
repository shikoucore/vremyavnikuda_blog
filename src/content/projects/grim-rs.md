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
version: "0.1.6"
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
      - "分数スケーリング下でのWayland領域キャプチャを修正"
      - "パフォーマンス劣化なしで分数スケーリングに対応"
      - "ジオメトリテストを統合テストスイートに移動し、テスト内のunwrap()を削除"
  - version: "0.1.5"
    releaseStatus: "release"
    items:
      - "安全なバッファサイズ計算: キャプチャ、スケーリング、合成時のオーバーフローとOOMを防ぐため、グローバルなピクセル上限付きのチェック付きサイズ計算を追加"
      - "PNG/JPEGエンコード時のピークメモリ削減: RGBAバッファからのエンコードで冗長なフルフレームコピーを削除し、大きな画像でのピーク割り当てを削減"
      - "プロファイリングガイド: 再現可能なワークフロー付きの手順書（doc/profiling_manual.md）を追加"
      - "依存関係の整理: 未使用のanyhowを削除し、env_loggerをdev-dependenciesへ移動"
      - "依存関係の更新: logをv0.4.29へ更新"
      - "依存関係の更新: chronoをv0.4.43へ更新"
      - "依存関係の更新: tempfileをv3.24.0へ更新"
      - "依存関係の更新: memmap2をv0.9.9へ更新"
      - "依存関係の固定: 新しいバージョンでの回帰が確認されたためimageをv0.25.8に据え置き"
      - "依存関係の更新: jpeg-encoderをv0.7.0へ更新"
      - "依存関係の更新: thiserrorをv2.0.18へ更新"
      - "MSRV: 最小サポートRustバージョンを1.68に更新"
      - "統合テストの整理: lib.rsのテストをtests/スイートへ移動し、公開ゲッターに合わせてアサーションを調整"
  - version: "0.1.6"
    releaseStatus: "release"
    items:
      - "修正: wl_shm::Argb8888 での色チャンネル不一致を修正。screencopy が Argb8888 を返す環境（例: AMD/Hyprland）で発生していたスクリーンショットの赤/青チャンネル入れ替わりを、BGRAメモリレイアウトから crate 内部の RGBA へ変換することで解消"
      - "変更: shm フォーマット変換を統一。wl_shm -> RGBA のバイト変換を単一の内部ヘルパーに集約し、単一出力・複数出力の両キャプチャ経路で再利用"
      - "変更: フォーマット処理の整合性を改善。単一出力と複数出力のキャプチャ経路で、既定フォーマットのフォールバック挙動を一致させた"
---

Waylandコンポジター用のスクリーンショット撮影ユーティリティとライブラリ（Rust製）。外部のC依存関係がなく、マルチモニター設定、出力変換（回転とミラーリング）、領域キャプチャ、高品質な画像スケーリング（Triangle、CatmullRom、Lanczos3）、PNG/JPEG/PPM形式での保存をサポートしています。CLIツール（cargo install grim-rs）として、また独自のアプリケーションに統合するためのクレートとして利用可能です。
