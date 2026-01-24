---
title: "grim-rs"
description: "A Rust-based utility and library for taking screenshots on Wayland compositors"
github: "https://github.com/vremyavnikuda/grim-rs"
link: "https://crates.io/crates/grim-rs"
tags: ["rust", "linux", "wayland"]
featured: true
lang: en
projectType: "project"
category: "projects"
parentProject: "hyprshot-rs"
status: "active"
version: "0.1.4"
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
      - "Struct encapsulation (Box, CaptureResult, Output, CaptureParameters, MultiOutputCaptureResult)"
      - "Added Builder pattern for CaptureParameters"
      - "Fixed critical bug in capture_outputs()"
      - "Improved error handling (replaced unwrap() with proper error propagation)"
      - "Optimized memory usage (removed unnecessary cloning)"
      - "Added comprehensive test coverage"
  - version: "0.1.4"
    releaseStatus: "release"
    items:
      - "Fixed Wayland region capture under fractional scaling"
      - "Handled fractional scaling without performance regressions"
      - "Moved geometry tests to integration suite and removed unwraps in tests"
  - version: "0.1.5"
    releaseStatus: "dev"
---

A Rust-based utility and library for taking screenshots on Wayland compositors. It has no external C dependencies, supports multi-monitor setups, output transformations (rotation and mirroring), region capture, high-quality image scaling (Triangle, CatmullRom, Lanczos3), and saving to PNG/JPEG/PPM formats. Available as a CLI tool (cargo install grim-rs) and as a crate for integrating into your own applications.
