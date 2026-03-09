---
title: "prototype algorithm 8C2: Pre-release note on a new SAT algorithm"
description: "A pre-release overview of prototype algorithm 8C2: primal-dual clause weighting, size/density-aware behavior, and measurable gains on hard random 3-SAT."
pubDate: 2026-03-09
tags: ["sat", "max-sat", "algorithm", "research", "pre-release"]
draft: false
lang: en
---

> **Status:** Working pre-release with stable comparative results  
> **Version:** 0.9 (final version in progress)  
> **Date:** March 2026

---

### SAT (Boolean Satisfiability Problem)

> One of the fundamental NP-complete problems in computer science.

For practical domains such as hardware verification, planning, and cryptanalysis, solver behavior near the phase transition is critical, because classic heuristics usually degrade there.

`Random 3-SAT` instances with `m/n ≈ 4.2-4.5` are notably difficult for `stochastic local search (SLS)`. Under a fixed budget (for example, 180 flips), many modern solvers get trapped in local optima and do not reach 100% satisfied clauses.

`prototype algorithm 8C2` extends the CSAW idea with three key additions: formal primal-dual clause-weight dynamics, size/density-aware behavior across scales, and improved zero-break handling. In our current pre-release experiments, this gives **+0.04-0.19% satisfied clauses** versus probSAT and WalkSAT at a fixed step budget.

For instances around `n=3000` and `m≈12800`, even `0.19%` corresponds to about **24 additional satisfied clauses**, which is meaningful in hard regimes.

## CNF formulation (Conjunctive Normal Form)

$$
F = \{C_1, C_2, \dots, C_m\}
$$

Each clause $C_i$ is a disjunction of literals over $n$ boolean variables.

We optimize over assignments $x \in \{0,1\}^n$ to maximize the number of satisfied clauses:

$$
\max_x \; S(x) = \sum_{i=1}^{m} \mathbf{1}[C_i(x) = \text{true}]
$$

where $\mathbf{1}[\cdot]$ is the indicator function.

**SAT special case:** if $S(x)=m$, all clauses are satisfied.

### Hard-regime metric

With a fixed step budget (e.g. 180 flips), the key metric is:

$$
\text{Success Rate} = \frac{S(x)}{m} \times 100\%
$$

For fair comparison, we fix size `n`, density `α = m/n`, and budget (usually 180 flips).

## Architecture of prototype algorithm 8C2

### High-level flow (without sensitive implementation details)

![Pipeline diagram (English)](/img/prototype-8c2/en/pipeline-en.svg)

| Component | Purpose |
| --- | --- |
| **Adaptive scoring** | Dynamic flip priority via make/break |
| **Clause weighting** | Dynamic conflict-clause weights (dense-gated mode) |
| **Size/density awareness** | Parameter behavior adapted to problem scale |
| **Zero-break prioritization** | Dedicated path for free improvements |

### Make/Break scoring

For each candidate $v$ in the selected UNSAT clause:

$$
p(v) \propto
\bigl(1 + \alpha \cdot \text{make}(v)\bigr)
\cdot
\bigl(\varepsilon + \text{break}(v) + \text{novelty}(v)\bigr)^{-c_b}
$$

![Make/Break scoring diagram (English)](/img/prototype-8c2/en/make-break-scoring-en.svg)

Here, `make(v)` is the number of clauses that become SAT after the flip, while `break(v)` is the number of clauses that become UNSAT. `novelty(v)` penalizes recently flipped variables. `α` (`make_weight`) controls the make reward strength, and `c_b` (`cb`) controls the break penalty curvature. `ε` ensures numerical stability.

**Special case:** candidates with `break(v)=0` are chosen randomly within the zero-break set, preserving free gains while maintaining exploration.

## Primal-Dual clause weight updates

### When dense mode is enabled

Dense-gated primal-dual is enabled when:

$$
\frac{m}{n} \geq \text{dual\_density\_on}
$$

In high-density instances, uniform weighting is usually not enough, so structured weight dynamics help target persistent conflicts.

### Update equations

For a selected clause $C_i$ at step $t$:

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

![Primal-Dual update diagram (English)](/img/prototype-8c2/en/primal-dual-update-en.svg)

$\eta_t$ is a decaying step size, $g_t$ is the conflict signal, and $\lambda$ regularizes weights toward 1.0. Projection $\Pi_{[w_{\min}, w_{\max}]}$ keeps values bounded.

This is effectively a regularized subgradient-style dual update for MAX-SAT weighting.

## Experimental results

### Upper size range (`n=1500-3000`)

Setup: `ratio = 4.267`, `steps = 180`, random 3-SAT.

| n | prototype algorithm 8C2 | probSAT | W-WalkSAT | Δ vs probSAT | Δ vs W-WalkSAT |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1500 | **99.8359** | 99.7422 | 99.6641 | +0.09375 | +0.17188 |
| 2000 | **99.8506** | 99.7451 | 99.6836 | +0.10546 | +0.16698 |
| 2500 | **99.8383** | 99.7984 | 99.6625 | +0.03984 | +0.17578 |
| 3000 | **99.8164** | 99.7695 | 99.6270 | +0.04687 | +0.18944 |

The method leads consistently on all tested sizes.

### Stability across densities

Checked at `ratio ∈ {4.1, 4.2, 4.35, 4.5}`, `n ∈ {500, 1000}`, seeds `{42, 123}`.

| ratio | n | prototype algorithm 8C2 | probSAT | W-WalkSAT |
| --- | --- | ---: | ---: | ---: |
| 4.35 | 1000 | **99.8333** | 99.7586 | 99.7356 |
| 4.50 | 1000 | **99.7111** | 99.7067 | 99.5689 |

### A/B test: primal-dual contribution

| Mode | Success Rate | W/L vs baseline |
| --- | ---: | ---: |
| baseline (`--disable-primal-dual`) | 99.6278 | — |
| **candidate (PD on)** | **99.8000** | 4/0 |

Gain: `+0.17222%`.

## Core make/break scoring fragment

```cpp
// Flip probability for candidate v
const double adjusted_break = eps_ + break_count + penalty;
const double make_factor = 1.0 + make_weight_ * make_count;
const double probability = make_factor * std::pow(adjusted_break, -cb_);
```

## Dual weight update fragment

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

## Open questions and roadmap

### Remaining gaps

- Validate no regressions on sparse regimes.
- Expand statistical sampling to ≥10 seeds per setup.
- Reduce size-specific tuning and move toward robust default behavior.

### Next release steps

- Add seeds `200-210` for `n=2000, 2500, 3000`.
- Report 95% confidence intervals.
- Further formalize primal-dual/subgradient interpretation.
- Evaluate adaptive bucket selection against manual tuning.

## Confirmed vs. hypothesis

**Confirmed:**
- Better success rate than probSAT and W-WalkSAT on tested dense hard settings.
- Positive contribution of primal-dual updates in dense mode.
- Strong impact of zero-break prioritization.

**Hypothesis (ongoing):**
- Advantage persists at larger scales `n > 3000`.
- A universal config can replace size-specific tuning.
- Stronger formal convergence/regret characterization is possible.

## Conclusion

`prototype algorithm 8C2` is an intentional pre-release: already competitive in hard random 3-SAT settings, while theoretical and statistical finalization is still in progress.

## Glossary

| Term | Meaning |
| --- | --- |
| **SAT** | Boolean Satisfiability Problem |
| **CNF** | Conjunctive Normal Form |
| **3-SAT** | SAT variant with 3 literals per clause |
| **Phase transition** | Region around `m/n ≈ 4.2-4.5` with hardest instances |
| **SLS** | Stochastic Local Search |
| **make/break** | Clauses becoming SAT / becoming UNSAT after flip |
| **Primal-Dual** | Methods updating primal and dual signals jointly |

---

## Contact

For questions, experiment suggestions, or collaboration:
**email:** vremyavnikuda@protonmail.com
