---
title: "hyprshot-rs v0.1.7 and slurp-rs v0.2.0 - Selector Integration and Public API"
description: "A dual release update: hyprshot-rs v0.1.7 switches default selection to slurp-rs API, and slurp-rs v0.2.0 introduces a public Rust API."
pubDate: 2026-02-21
tags: ["hyprshot-rs", "slurp-rs", "wayland", "rust", "release"]
draft: false
lang: en
---

> Note: `slurp-rs` v0.2.0 was released on **February 21, 2026**.

This is a combined update for two related projects: `hyprshot-rs` and `slurp-rs`.

## TL;DR

- `hyprshot-rs` is now at **v0.1.7** with cleaner selector internals.
- `slurp-rs` is now at **v0.2.0** and is active again.
- `slurp-rs` now works as both a CLI and a reusable library.

## hyprshot-rs v0.1.7

Main changes in this release:

- Default selection flow now uses the `slurp-rs` API.
- Region cancel guidance is now powered by typed selector errors.
- Capture path now uses explicit `Geometry -> grim_rs::Box` conversion.
- Region selection no longer requires an external `slurp` binary at runtime.

In short: less external dependency surface, cleaner capture path, and more predictable selection behavior.

## slurp-rs revived: v0.1.0 -> v0.2.0

`slurp-rs` is active again.

### v0.1.0 foundation

The `0.1.0` line established broad compatibility with classic `slurp` behavior:

- CLI/options/help parity.
- Wayland bootstrap and output lifecycle setup.
- Input state machine for pointer/keyboard/touch.
- SHM + Cairo rendering pipeline.
- Cursor-shape protocol support with fallback path.

### v0.2.0 update

`0.2.0` adds the main missing piece for integration:

- Public Rust API: `select_region`, `select_output`, `select_from_boxes`, `select`.
- Typed models: `Rect`, `Selection`, `ChoiceBox`, `SelectOptions`.
- Typed errors via `SlurpError`, including explicit cancellation handling.
- Existing CLI behavior remains preserved.

## Links

- hyprshot-rs repository: https://github.com/shikoucore/hyprshot-rs
- slurp-rs repository: https://github.com/vremyavnikuda/slurp-rs
