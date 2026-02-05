---
title: "hyprshot-rs v0.1.6 - Stability and Predictability First"
description: "v0.1.6 focuses on predictable Wayland behavior, a reworked freeze flow, and stronger reliability across compositors."
pubDate: 2026-02-02
tags: ["hyprshot-rs", "wayland", "hyprland", "sway", "release"]
draft: false
lang: en
---

> Note: v0.1.6 was released on **February 1, 2026**.

This release is all about stability and predictability. The goal was to make the basic screenshot modes feel reliable on Wayland compositors, with behavior that is clear and consistent.

## TL;DR

- `region` / `output` now rely on pure Wayland.
- Freeze is native and no longer depends on `hyprpicker`.
- Fewer external failure points, smoother UX.

## What improved

### Wayland-first behavior

- `region` / `output` are Wayland-only.
- `-m output` / `-m NAME` resolves outputs via Wayland enumeration (no `hyprctl` validation).
- Window/active cropping no longer relies on compositor-specific tools.

### New freeze

- Replaced `hyprpicker` with a native Wayland layer-shell overlay.
- Overlay is input-transparent.
- If required protocols are missing, freeze disables cleanly without breaking capture.
- Better handling of fractional scaling and logical output sizes.
- Capture runs per-output to reduce peak RAM on multi-monitor setups.

### Reliability and UX

- Notification/clipboard errors no longer break successful captures (except `--clipboard-only`).
- Hung external utilities won't stall the app.
- Rapid snapshots are less likely to overwrite files.
- `delay_ms` now respects millisecond precision.
- `--notif-timeout` always honors the provided value (including 5000).
- PNG is the only supported format to avoid confusion.
- Less unnecessary I/O and fewer `hyprctl` calls.

### Build and embedded slurp

- Embedded `slurp` updates are atomic with locking and integrity checks.
- Embedding failures no longer break builds.

## Compatibility note

This update is a **starting point for cross-compositor compatibility on Wayland**, but it is **not cross-platform**.

## Links

- Repository: https://github.com/shikoucore/hyprshot-rs
- Release v0.1.6: https://github.com/shikoucore/hyprshot-rs/releases/tag/v0.1.6
- CHANGELOG: https://github.com/shikoucore/hyprshot-rs/blob/master/CHANGELOG.md
- Discussions: https://github.com/orgs/shikoucore/discussions
