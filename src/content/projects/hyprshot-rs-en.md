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
parentProject: "projects"
status: "active"
version: "0.1.4"
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
    releaseStatus: "dev"
---

A Rust utility for taking screenshots in Hyprland using your mouse. It supports capturing the entire monitor (output), the active monitor, selected regions, selected windows, and the active window. Screenshots can be saved to a chosen directory or copied to the clipboard (PNG format). It includes a TOML-based config (~/.config/hyprshot-rs/config.toml) for paths, hotkeys, notifications, and more. Available as a CLI tool and as a crate for integration.
