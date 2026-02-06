---
title: "grim-rs v0.1.5 - Safer Buffers, Lower Peak Memory"
description: "v0.1.5 hardens buffer sizing, reduces peak allocations during PNG/JPEG encoding, and updates dependencies and MSRV."
pubDate: 2026-02-06
tags: ["grim-rs", "wayland", "linux", "rust", "release"]
draft: false
lang: en
---

> Note: v0.1.5 was released on **February 6, 2026**.

In this version, we improved the security of working with buffers during capture and scaling, reduced peak allocations during PNG/JPEG encoding by eliminating unnecessary copies, updated dependencies and the minimum supported version of Rust, tidied up the tests, and added a clear profiling manual with a reproducible measurement process.

## TL;DR

- Safer buffer size checks with a global pixel limit.
- Lower peak memory during PNG/JPEG encoding.
- Updated dependencies and MSRV (now Rust 1.68), cleaner tests, and a new profiling manual.

## Highlights

### Safer buffer sizing

Capture, scaling, and compositing now use checked size calculations with a global pixel cap to prevent overflows and OOM scenarios.

### Lower peak encoding memory

PNG/JPEG encoding no longer performs redundant full-frame copies when encoding from RGBA buffers, reducing peak allocations on large images.

### Maintenance and docs

Dependencies were refreshed, the MSRV was updated to Rust 1.68, tests were moved into the `tests/` suite with assertions aligned to public getters, and a step-by-step profiling guide was added at `doc/profiling_manual.md`.

## Links

- Repository: https://github.com/shikoucore/grim-rs
- CHANGELOG: https://github.com/shikoucore/grim-rs/blob/master/CHANGELOG.md
