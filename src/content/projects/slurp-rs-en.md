---
title: "slurp-rs"
description: "Wayland region selection utility; stable and planned for direct integration into hyprshot-rs"
github: "https://github.com/shikoucore/slurp-rs"
tags: ["rust", "linux", "wayland", "region-selection", "library"]
featured: false
lang: en
projectType: "project"
category: "projects"
parentProject: "hyprshot-rs"
status: "archived"
version: "0.1.0"
roadmap:
  - version: "0.1.0"
    releaseStatus: "close"
    items:
      - "Concluded a Rust rewrite is over-engineering for this scope"
      - "Confirmed slurp is stable, actively used, and has no critical bugs"
      - "Noted Wayland's C-first API mismatches C++/Rust idioms"
      - "Rewrite would have negative ROI and negligible performance gains"
      - "Plan to integrate slurp directly into hyprshot-rs"
      - "Vendored slurp sources into the hyprshot-rs crate tarball (vendor/slurp)"
---

After extensive analysis, I concluded that a Rust rewrite here is over-engineering. slurp is already a complete, self-contained solution for its specific task on Wayland; it is stable, actively used, and has no critical bugs. Wayland itself is written in C and designed around C, and its API relies on patterns that are foreign to C++ and Rust idioms. As a result, a rewrite would bring negative ROI and virtually no performance gains.

Most likely, slurp will be integrated directly into hyprshot-rs to eliminate the need for users to install slurp separately. The hyprshot-rs crate now vendors slurp sources in its package tarball (via a git subtree under `vendor/slurp`) to support this direction.
