---
title: "slurp-rs"
description: "Waylandの領域選択ユーティリティ。安定運用中でhyprshot-rsへの直接統合を予定"
github: "https://github.com/shikoucore/slurp-rs"
tags: ["rust", "linux", "wayland", "region-selection", "library"]
featured: false
lang: ja
projectType: "project"
category: "projects"
parentProject: "hyprshot-rs"
status: "archived"
version: "0.1.0"
roadmap:
  - version: "0.1.0"
    releaseStatus: "close"
    items:
      - "Rust再実装は過剰設計だと結論"
      - "slurpは安定・実運用され、致命的なバグなし"
      - "WaylandのC前提APIはC++/Rustのイディオムと不一致"
      - "書き直しはROIがマイナスで性能向上もほぼなし"
      - "slurpをhyprshot-rsに直接統合する方針"
      - "hyprshot-rsのcrateにslurpソースを同梱（vendor/slurp）"
---

十分な検討の結果、ここでのRust再実装は過剰設計だと結論づけました。slurpはWayland上の領域選択という目的に対して、すでに完結した自給自足のソリューションで、安定しており、実運用され、致命的なバグもありません。Wayland自体はCで書かれ、C向けに設計されています。そのAPIはC++やRustのイディオムとは相性が悪く、結果として書き直してもROIはマイナスで、性能向上もほぼ期待できません。

おそらくslurpはhyprshot-rsに直接統合し、ユーザーが別途slurpをインストールする必要をなくします。hyprshot-rsのクレートでは、vendor/slurpのgit subtreeとしてslurpのソースを同梱しました。
