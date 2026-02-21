---
title: "hyprshot-rs"
description: "A Rust utility for taking screenshots in Hyprland using your mouse"
github: "https://github.com/shikoucore/hyprshot-rs"
link: "https://crates.io/crates/hyprshot-rs"
tags: ["rust", "linux", "hyprland", "wayland", "screenshot"]
featured: true
lang: en
projectType: "project"
category: "projects"
parentProject: "Shikou Core"
status: "active"
version: "0.1.7"
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
      - "Stabilized embedded slurp and improved CI"
      - "Fixed CLI modes and config notes"
      - "Bumped pkgver to 0.1.4"
      - "Added slurp as a git submodule"
      - "Embedded slurp binary and added AUR support"
  - version: "0.1.5"
    releaseStatus: "release"
    items:
      - "CLI output names: allow OUTPUT_NAME in -m and correct help flag for --notif-timeout"
  - version: "0.1.6"
    releaseStatus: "release"
    items:
      - "Changed: Freeze implementation: Replaced hyprpicker-based freeze with native Wayland layer-shell overlay."
      - "Changed: Output-by-name (Wayland): -m output -m NAME now resolves outputs via Wayland enumeration (no hyprctl validation in CLI)."
      - "Changed: Freeze memory usage: Capture is performed per-output to reduce peak RAM on multi-monitor setups."
      - "Fixed: Freeze portability: Added geometry-based output matching fallback when output names are unavailable."
      - "Fixed: Freeze robustness: Gracefully disables freeze if required Wayland protocols are missing (with clear user message)."
      - "Fixed: Freeze input handling: Overlay is input-transparent to avoid blocking selection."
      - "Fixed: Freeze scaling: Better handling of fractional scaling and logical output sizes."
      - "Fixed: Region guidance: Clearer prompt when region selection is cancelled or not drawn."
      - "Fixed: More reliable saves: Clipboard/notification errors no longer break successful captures (except --clipboard-only)."
      - "Fixed: Hanging commands: Added safeguards so external tools don't freeze the app."
      - "Fixed: Cross-compositor trim: Window crops now rely on Wayland outputs instead of compositor-specific tools."
      - "Fixed: Hyprctl calls: Reduced repeated monitor queries during a single run."
      - "Fixed: Delay accuracy: delay_ms now respects milliseconds instead of rounding to seconds."
      - "Fixed: Notification timeout: --notif-timeout always respects the value you pass (including 5000)."
      - "Fixed: Filename collisions: Reduced the chance of overwriting when taking multiple screenshots quickly."
      - "Fixed: Format clarity: PNG is the only supported format, avoiding confusing options."
      - "Fixed: Clipboard performance: Faster clipboard copy without extra disk reads."
      - "Fixed: Startup I/O: Reduced unnecessary disk writes during normal runs."
      - "Fixed: Window selection: More accurate window lists on multi-workspace setups."
      - "Fixed: Build reliability: Slurp embedding failures no longer break builds."
      - "Fixed: Embedded slurp safety: Atomic updates with locking and integrity checks."
      - "Fixed: Geometry handling: More consistent capture processing across modes."
  - version: "0.1.7"
    releaseStatus: "release"
    items:
      - "Selector backend: Default selection flow now uses slurp-rs API."
      - "Selection errors: Region cancel guidance now uses typed selector errors."
      - "Geometry conversion: Capture path now uses explicit Geometry -> grim_rs::Box conversion."
      - "Runtime requirements: Selection no longer depends on an external slurp binary."
      - "Reference: slurp-rs repository moved to https://github.com/vremyavnikuda/slurp-rs"
---

A Rust utility for taking screenshots in Hyprland using your mouse. It supports capturing the entire monitor (output), the active monitor, selected regions, selected windows, and the active window. Screenshots can be saved to a chosen directory or copied to the clipboard (PNG format). It includes a TOML-based config (~/.config/hyprshot-rs/config.toml) for paths, hotkeys, notifications, and more. Available as a CLI tool and as a crate for integration.

As of v0.1.7, the default selector backend is powered by slurp-rs API integration, so selection no longer requires an external `slurp` binary.
