---
title: "slurp-rs"
description: "Pure Rust reimplementation of slurp for region selection in Wayland compositors"
github: "https://github.com/shikoucore/slurp-rs"
tags: ["rust", "linux", "wayland", "region-selection", "library"]
featured: false
lang: en
projectType: "project"
category: "projects"
parentProject: "hyprshot-rs"
status: "active"
version: "0.1.0"
roadmap:
  - version: "0.1.0"
    releaseStatus: "dev"
---

slurp-rs is a pure Rust reimplementation of the slurp utility for region selection in Wayland compositors, providing both a binary and library API for interactive region selection via mouse, keyboard, or touch input, with compatible string output format for use with screenshot tools. The project focuses on zero-C-dependencies, supports HiDPI and customizable rendering (colors, borders, fonts) — currently basic structure, config parsing, and geometry are implemented, while Wayland integration, rendering, and input handling are still in development.
