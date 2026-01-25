---
title: "rust-fmt"
description: "VS Code extension for formatting Rust code via rustfmt"
github: "https://github.com/shikoucore/rust-fmt"
link: "https://marketplace.visualstudio.com/items?itemName=vremyavnikuda.rust-fmt"
tags: ["rust", "typescript", "vscode", "formatter", "developer-tools"]
featured: true
lang: en
projectType: "project"
category: "projects"
parentProject: "projects"
status: "active"
version: "0.1.1"
roadmap:
  - version: "0.1.0"
    releaseStatus: "release"
  - version: "0.1.1"
    releaseStatus: "release"
    items:
      - "Workspace formatting command `rust-fmt.formatWorkspace` and `Shift+Alt+F`/`Shift+Option+F` binding for Rust files"
      - "Status bar indicator (\"rust-fmt: active\") with quick access to workspace formatting"
      - "Cancellation support and protection against parallel formatting runs per file"
      - "File size guard (skip formatting files larger than 2 MB)"
      - "Auto-detect `Cargo.toml` to set crate root and `--edition`"
      - "Auto-detect `rustfmt.toml` / `.rustfmt.toml` and pass `--config-path`"
      - "Auto-detect `rust-toolchain(.toml)` and set `RUSTUP_TOOLCHAIN` when running rustfmt"
---

VS Code extension for formatting Rust code via rustfmt. Simple and fast extension: runs `rustfmt --emit stdout`, automatically detects your `rustfmt.toml` (if present), and works on Linux/Windows/macOS. Supports format-on-save, manual execution from the command palette, and custom parameters such as binary path and additional arguments.
