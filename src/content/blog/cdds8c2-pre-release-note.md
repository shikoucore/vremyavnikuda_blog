---
title: "prototype algorithm 8C2: 新しいSATアルゴリズムのプレリリースノート"
description: "prototype algorithm 8C2 のプレリリース概要: primal-dual 句重み更新、size/density-aware 動作、hard random 3-SAT での改善結果。"
pubDate: 2026-03-09
tags: ["sat", "max-sat", "algorithm", "research", "pre-release"]
draft: false
lang: ja
---

> **ステータス:** 比較実験で安定した結果を示すワーキング pre-release  
> **バージョン:** 0.9（最終版は開発中）  
> **日付:** 2026年3月

---

### SAT（Boolean Satisfiability Problem）

> SAT は計算機科学における代表的な NP 完全問題の一つです。

回路検証、計画問題、暗号解析などの実応用では、相転移付近でソルバ性能が急激に落ちるため、この領域での挙動が重要になります。

`m/n ≈ 4.2-4.5` の `Random 3-SAT` は、`stochastic local search (SLS)` にとって特に難しい領域です。ステップ予算（例: 180 flips）を固定すると、多くの手法は局所最適にとどまり、全句 SAT には到達しません。

`prototype algorithm 8C2` は CSAW の発想を拡張し、3つの要素を追加しています。具体的には、primal-dual に基づく句重みダイナミクス、問題サイズ/密度に応じた size/density-aware 動作、そして zero-break 候補の改善処理です。現時点の pre-release 実験では、固定予算下で probSAT および WalkSAT と比較して **+0.04-0.19%** の改善を確認しています。

`n=3000`、`m≈12800` では `0.19%` の差が **約24句** の追加 SAT に相当し、高難度設定では実質的な差になります。

## CNF 形式（Conjunctive Normal Form）

$$
F = \{C_1, C_2, \dots, C_m\}
$$

ここで各 $C_i$ は、$n$ 個のブール変数上のリテラルの論理和です。

目的は、割り当て $x \in \{0,1\}^n$ の中で満たされる句数を最大化することです。

$$
\max_x \; S(x) = \sum_{i=1}^{m} \mathbf{1}[C_i(x) = \text{true}]
$$

$\mathbf{1}[\cdot]$ は指示関数です。

**SAT の特別ケース:** $S(x)=m$ なら全句を満たします。

### Hardレジームの評価指標

ステップ予算固定時（例: 180 flips）の主要指標は次です。

$$
\text{Success Rate} = \frac{S(x)}{m} \times 100\%
$$

比較実験では、サイズ `n`、密度 `α=m/n`、ステップ予算を固定します。

## prototype algorithm 8C2 のアーキテクチャ

### 全体フロー（機微な実装詳細は省略）

![Pipeline diagram (Japanese)](/img/prototype-8c2/ja/pipeline-ja.svg)

| 要素 | 役割 |
| --- | --- |
| **Adaptive scoring** | make/break による動的フリップ優先度 |
| **Clause weighting** | dense-gated 時の動的句重み更新 |
| **Size/density awareness** | サイズ・密度に応じた挙動調整 |
| **Zero-break prioritization** | 無償改善候補の専用分岐 |

### Make/Break scoring

選択した UNSAT 句内の候補 $v$ ごとに次を計算します。

$$
p(v) \propto
\bigl(1 + \alpha \cdot \text{make}(v)\bigr)
\cdot
\bigl(\varepsilon + \text{break}(v) + \text{novelty}(v)\bigr)^{-c_b}
$$

![Make/Break scoring diagram (Japanese)](/img/prototype-8c2/ja/make-break-scoring-ja.svg)

`make(v)` はフリップ後に SAT になる句数、`break(v)` は UNSAT へ落ちる句数です。`novelty(v)` は直近で使った変数への抑制です。`α`（`make_weight`）は make 報酬の強さ、`c_b`（`cb`）は break 罰則の形を調整します。`ε` は数値安定化のための小定数です。

**特別ケース:** `break(v)=0` の候補は zero-break 集合からランダムに選び、無償改善を取りこぼさないようにします。

## Primal-Dual 句重み更新

### dense モードの有効化条件

$$
\frac{m}{n} \geq \text{dual\_density\_on}
$$

高密度設定では一様重みだけでは不十分なため、重みダイナミクスで持続的競合へ焦点を当てます。

### 更新式

$$
\eta_t = \frac{\eta}{\sqrt{t+1}}
$$

$$
g_t = \mathbf{1}[C_i \text{ remains UNSAT after flip}]
$$

$$
w_i^{t+1} = \Pi_{[w_{\min}, w_{\max}]}
\left(
w_i^t + \eta_t \bigl(g_t - \lambda (w_i^t - 1)\bigr)
\right)
$$

![Primal-Dual update diagram (Japanese)](/img/prototype-8c2/ja/primal-dual-update-ja.svg)

$\eta_t$ は減衰ステップ幅、$g_t$ は競合シグナル、$\lambda$ は重みを 1.0 付近へ戻す正則化です。$\Pi_{[w_{\min}, w_{\max}]}$ は重みの範囲制約です。

これは実質的に、MAX-SAT の重み更新に対する正則化付き subgradient 風の dual update と解釈できます。

## 実験結果

### 上位サイズ帯（`n=1500-3000`）

設定: `ratio = 4.267`、`steps = 180`、random 3-SAT。

| n | prototype algorithm 8C2 | probSAT | W-WalkSAT | Δ vs probSAT | Δ vs W-WalkSAT |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1500 | **99.8359** | 99.7422 | 99.6641 | +0.09375 | +0.17188 |
| 2000 | **99.8506** | 99.7451 | 99.6836 | +0.10546 | +0.16698 |
| 2500 | **99.8383** | 99.7984 | 99.6625 | +0.03984 | +0.17578 |
| 3000 | **99.8164** | 99.7695 | 99.6270 | +0.04687 | +0.18944 |

テストした全サイズで先行しています。

### 密度別の安定性

`ratio ∈ {4.1, 4.2, 4.35, 4.5}`、`n ∈ {500, 1000}`、seeds `{42, 123}`。

| ratio | n | prototype algorithm 8C2 | probSAT | W-WalkSAT |
| --- | --- | ---: | ---: | ---: |
| 4.35 | 1000 | **99.8333** | 99.7586 | 99.7356 |
| 4.50 | 1000 | **99.7111** | 99.7067 | 99.5689 |

### A/B: primal-dual 有効化の効果

| モード | Success Rate | W/L vs baseline |
| --- | ---: | ---: |
| baseline (`--disable-primal-dual`) | 99.6278 | — |
| **candidate (PD on)** | **99.8000** | 4/0 |

改善量: `+0.17222%`。

## make/break scoring の実装断片

```cpp
// Flip probability for candidate v
const double adjusted_break = eps_ + break_count + penalty;
const double make_factor = 1.0 + make_weight_ * make_count;
const double probability = make_factor * std::pow(adjusted_break, -cb_);
```

## dual weight update の実装断片

```cpp
// Decaying step size
double eta_t = dual_eta_ / std::sqrt(static_cast<double>(step) + 1.0);

// Conflict signal
double grad = unsat_mask[chosen_clause] ? 1.0 : 0.0;

// Regularized gradient
double regularized_grad = grad - dual_reg_ * (old_weight - 1.0);

// Bounded update
double new_weight = std::clamp(
    old_weight + eta_t * regularized_grad,
    dual_weight_floor_,
    dual_weight_cap_
);
```

## 未解決課題とロードマップ

### 残課題

- sparse 領域における回帰有無の検証
- 各設定で seed を 10 以上に拡張した統計評価
- サイズ依存チューニングの削減と、より堅牢なデフォルト挙動への移行

### 次リリースまでの作業

- `n=2000/2500/3000` に対する seeds `200-210` の追加
- 95% 信頼区間の提示
- primal-dual と subgradient の解釈整理
- adaptive bucket 選択と手動チューニングの比較

## 確定事項と仮説

**確定:**
- dense hard 設定で probSAT / W-WalkSAT より高い success rate
- dense モードで primal-dual の正の寄与
- zero-break prioritization の有効性

**仮説（継続検証）:**
- `n > 3000` でも優位性が維持される
- サイズ依存を弱めた共通設定が可能
- 収束/後悔境界の理論保証を強化できる

## まとめ

`prototype algorithm 8C2` は意図的な pre-release です。高難度 random 3-SAT 設定での競争力はすでに確認できており、理論面と統計面の最終化を進めています。

## 用語集

| 用語 | 説明 |
| --- | --- |
| **SAT** | Boolean Satisfiability Problem |
| **CNF** | Conjunctive Normal Form |
| **3-SAT** | 各句が3リテラルの SAT 変種 |
| **Phase transition** | `m/n ≈ 4.2-4.5` の難領域 |
| **SLS** | Stochastic Local Search |
| **make/break** | フリップ後に SAT になる句 / UNSAT になる句 |
| **Primal-Dual** | primal と dual を同時更新する最適化的枠組み |

---

## 連絡先

質問、実験提案、コラボレーションは以下まで:
**email:** vremyavnikuda@protonmail.com
