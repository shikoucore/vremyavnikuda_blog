---
title: "Archiving grim-rs and hyprshot-rs"
description: "Two projects have been moved to archive. Development is complete, but the projects will remain as they are."
pubDate: 2026-04-03
tags: ["grim-rs", "hyprshot-rs", "open-source", "archive", "update"]
draft: false
lang: en
---

After thinking about it for a while, I've decided to move `grim-rs` and `hyprshot-rs` to archive.

This isn't abandonment. Both projects will stay exactly as they are. They work. You can use them. There just won't be any further development.

The main reason is practical. When I started these projects, I was working in Wayland environments daily — it was my primary setup, and testing was effortless. Since then, my work has shifted. Now I mostly work across Windows, macOS, and Ubuntu, and Wayland is no longer part of my everyday workflow.

Switching back to a Wayland session just to test and develop these tools takes time and context that I don't always have. And keeping a fourth dedicated machine running Wayland — that's a bit much, even for me.

With `hyprshot-rs`, I'll be honest — I didn't quite get where I wanted. The slurp-rs integration in v0.1.7 worked, but it came with frame drops and refresh rate issues that I never managed to resolve. The smoothness I was aiming for just wasn't there. At some point you have to accept that you've taken something as far as you can under the current circumstances.

`grim-rs` is a bit different. The architecture was designed from the start to support multiple output formats — JPEG, JPG, BMP — but in the end only PNG made it in. That unfinished work is still on my mind. Of the two, grim-rs is the one I might come back to someday. Just not right now.

Both repositories will remain public.

## Links

- grim-rs: https://github.com/shikoucore/grim-rs
- hyprshot-rs: https://github.com/shikoucore/hyprshot-rs
