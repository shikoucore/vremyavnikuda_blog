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
version: "0.1.5"
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
    releaseStatus: "release"
    items:
      - "Safe buffer sizing: Added checked buffer size calculations with a global pixel limit to prevent overflow and OOM during capture, scaling, and compositing"
      - "Lower peak memory during PNG/JPEG encoding: Removed redundant full-frame copies when encoding from RGBA buffers, reducing peak allocations on large images"
      - "Profiling guide: Added a step-by-step profiling manual (doc/profiling_manual.md) with a reproducible workflow"
      - "Dependency cleanup: Removed unused anyhow and moved env_logger to dev-dependencies"
      - "Dependency update: Bumped log to v0.4.29"
      - "Dependency update: Bumped chrono to v0.4.43"
      - "Dependency update: Bumped tempfile to v3.24.0"
      - "Dependency update: Bumped memmap2 to v0.9.9"
      - "Dependency pin: Kept image on v0.25.8 after testing showed regressions with newer versions"
      - "Dependency update: Bumped jpeg-encoder to v0.7.0"
      - "Dependency update: Bumped thiserror to v2.0.18"
      - "MSRV: Minimum supported Rust version is now 1.68"
      - "Integration test cleanup: Moved lib.rs tests into the tests/ suite and aligned assertions with public getters"
---

A Rust-based utility and library for taking screenshots on Wayland compositors. It has no external C dependencies, supports multi-monitor setups, output transformations (rotation and mirroring), region capture, high-quality image scaling (Triangle, CatmullRom, Lanczos3), and saving to PNG/JPEG/PPM formats. Available as a CLI tool (cargo install grim-rs) and as a crate for integrating into your own applications.
