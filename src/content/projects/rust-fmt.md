---
title: "rust-fmt"
description: "rustfmtを使用したRustコードのフォーマットを行うVS Code拡張機能"
github: "https://github.com/shikoucore/rust-fmt"
link: "https://marketplace.visualstudio.com/items?itemName=vremyavnikuda.rust-fmt"
tags: ["rust", "typescript", "vscode", "formatter", "developer-tools"]
featured: true
lang: ja
projectType: "project"
category: "projects"
parentProject: "projects"
status: "active"
version: "0.1.2"
roadmap:
  - version: "0.1.0"
    releaseStatus: "release"
  - version: "0.1.1"
    releaseStatus: "release"
    items:
      - "ワークスペースフォーマットのコマンド `rust-fmt.formatWorkspace` と、Rustファイル向けの `Shift+Alt+F`/`Shift+Option+F` キーバインド"
      - "ステータスバー表示（\"rust-fmt: active\"）とワークスペースフォーマットへのクイックアクセス"
      - "キャンセル対応と、ファイル単位での並列フォーマット実行の防止"
      - "ファイルサイズのガード（2 MBを超えるファイルはフォーマットをスキップ）"
      - "`Cargo.toml` を自動検出して crate ルートと `--edition` を設定"
      - "`rustfmt.toml` / `.rustfmt.toml` を自動検出して `--config-path` を渡す"
      - "`rust-toolchain(.toml)` を自動検出し、rustfmt 実行時に `RUSTUP_TOOLCHAIN` を設定"
  - version: "0.1.2"
    releaseStatus: "release"
    items:
      - "高速化のためのワークスペースコンテキストキャッシュを追加"
---

rustfmtを使用したRustコードのフォーマットを行うVS Code拡張機能。シンプルで高速な拡張機能：`rustfmt --emit stdout`を実行し、`rustfmt.toml`（存在する場合）を自動検出し、Linux/Windows/macOSで動作します。保存時の自動フォーマット、コマンドパレットからの手動実行、バイナリパスや追加引数などのカスタムパラメータをサポートしています。
