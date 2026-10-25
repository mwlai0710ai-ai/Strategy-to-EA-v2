# Strategy → EA v1 — Parameter Conflict Review

**Reviewed:** `index.html` (the single-file app; identical bytes in `Strategy-to-ea-v1/index.html` and `Finance Experiment/strategy-to-ea-v1/index.html`)
**Cross-checked against:** `Strategy-to-EA-V1-User-Manual.md`
**Date:** 2026-10-19

Method: traced all 41 fields in `FIELD_DEFS` through the three generators (`buildSpec`, `buildMql`, `buildPine`) and the two render paths (`renderDetail`, `renderInputs`) to see which options actually reach generated code.

---

## Summary

Of the 41 parameters across the 10 aspects, **25 reach the generated MQL5 as inputs**. The remaining **16 are selected by the user, printed into the spec, and then silently ignored** by every generator. Several of those dead options are not merely inert — they actively contradict a default or a rule stated in another aspect.

Conflicts fall into four tiers.

---

## Tier 1 — Options that do nothing (selected, printed, never executed)

These appear in the Technical Spec but are never read by `buildMql` or `buildPine`. Each was verified by counting `v.<key>` references: every one below occurs exactly once, inside `buildSpec` only.

| Aspect | Option | What the spec claims | Reality |
|---|---|---|---|
| A2 | `lens` (Trend / Range / Volatility / Session Bias) | "the lens is the go / no-go gate" | Only used in the spec text and one MQL header comment. The actual gate is always `ADX >= adxMin`. Choosing **Range** or **Session Bias** produces byte-identical code to **Trend**. |
| A2 | `atrPct` (volatility filter, % of price) | "Filters dead-flat markets" | Never read by any generator. |
| A4 | `confirmation` (On bar close / One bar later / Immediate) | "Always use On bar close" | Never read. Code always reads bar index 1 (closed bar) regardless. |
| A4 | `orderType` (Market / Limit / Stop) | Spec §6 prints "Order: Limit", §10 prints "Type Limit" | Never read. Code always calls `trade.Buy/Sell` at Ask/Bid — market only. |
| A5 | `minAtr` (volatility floor) | Spec §3 prints "min ATR 25" | Never read by any generator. |
| A5 | `newsBlock` | Spec §3 prints "news blackout" | Never read; no news calendar check exists. |
| A6 | `slMode` (ATR multiple / Fixed points / Swing structure) | Spec §7 prints "SL: Fixed points @ 2 × ATR" | Never read. Code always emits `price ∓ Inp_SLMult * atr`. |
| A6 | `tpMode` (ATR multiple / Fixed points / Next structure) | Spec §7 prints "TP: Next structure @ 3 × ATR" | Never read. Code always emits `price ± Inp_TpMult * atr`. |
| A6 | `trail` (trailing stop) | Spec §7 prints "Trail: on" | Never read. No trailing logic exists in either output. |
| A7 | `rrTarget` (Reward : risk target) | Spec §8 prints "R:R target 3" | Never read. Target is `tpAtr × ATR`. |
| A9 | `setSlTp` (one-shot vs separate) | Spec §10 prints "SL/TP separate" | Never read. SL/TP are always attached with the order. |
| A3 | `sub` (mechanic) | Spec §1/§3/§5 print the mechanic name | Cosmetic only — appears in the spec text, the MQL header comment, and the Pine title. It never branches logic. |
| A10 | `testerMode`, `walkForward`, `monteCarlo`, `minTrades` | Spec §11/§14 print them | Spec-only by design (manual limitation #7), but see Tier 4.3. |

The spec itself over-promises this: **§4 states "All 41 values below become MQL5 `input` variables."** Only 25 do. The 16 missing are the ones above.

---

## Tier 2 — Direct contradictions between two aspects

**2.1 · A7 `rrTarget` contradicts A6 `slAtr` / `tpAtr`.**
Defaults are `slAtr = 2`, `tpAtr = 3`, so the code's real reward:risk is **1.5R**. `rrTarget` defaults to **3R**. Two aspects state different reward ratios for the same trade, and the one the user can see and tune is the one that is ignored.

**2.2 · A2 `atrPct` and A5 `minAtr` are the same filter in two incompatible units.**
Both are described as a volatility floor. `atrPct` is a percentage of price (0.1–1.0%); `minAtr` is an absolute value (0–100, unit unstated — points? price?). Neither is wired in. A user setting both gets one dead filter and one dead filter with a different unit.

**2.3 · A4 `confirmation = "Immediate"` contradicts A10's stated non-negotiable.**
A10's tip says "no repainting zones, no look-ahead — read closed bars only," and A3's tip repeats "compute on CLOSED bars only." But A4 offers **Immediate** as a selectable confirmation mode. The option contradicts the doctrine the framework declares non-negotiable two aspects later.

**2.4 · A4 `orderType = Limit/Stop` contradicts A6 + A9.**
A6 computes SL/TP off the live `Ask`/`Bid` at signal time, and A9 defaults to attaching SL/TP with the order. Both assumptions hold only for market orders. A pending Limit/Stop order would need SL/TP anchored to the pending entry price, not the current market price.

**2.5 · A1 session window vs A5 `sessionGate` produce different behaviour in the two outputs.**
The MQL respects the toggle (`if(Inp_SessionGate)`). The Pine output hardcodes it: `inSession = hour >= sessionStart and hour < sessionEnd`, with no gate. Turning `sessionGate` off changes the MQL but leaves Pine enforcing the session anyway — same settings, two different strategies.

**2.6 · A8 `maxDailyLoss` (3%) makes `maxDrawdown` (20%) unreachable.**
Both are kill switches in the same function. The daily loss guard trips first and stays tripped for the rest of the day, so at defaults the drawdown pause can never fire. Also, the MQL computes drawdown as `1 - equity/balance` — a floating equity-vs-balance figure, not the peak-to-trough account drawdown the label "Max drawdown — pause" promises.

**2.7 · A1 permits an empty session window.**
`sessionStart` and `sessionEnd` are both free 0–23 sliders with no cross-validation. The gate is `h >= start && h < end`, so any `sessionEnd <= sessionStart` (e.g. an overnight 20→5 window) means the EA never trades. Nothing in the UI warns about this.

**2.8 · A3 `family` silently overrides `sub`.**
The detail pane's sub-aspect buttons reset the mechanic correctly. The Input Settings panel does not: changing **Logic family** there re-renders the mechanic dropdown with the new family's list but leaves `state.sub` holding the old family's value. The dropdown then displays the first option while the state — and therefore the spec — reports the stale mechanic. Separately, `sub` never drives logic at all, so all four mechanics inside a family generate identical code, and the **SMC / ICT** family falls through to the breakout `else` branch and trades a Donchian channel.

**2.9 · A3 mechanic taxonomy conflicts with the A3 families.**
"Order Block / FVG retest" is listed under **Mean Reversion**, but order blocks and fair value gaps are the defining mechanics of the **SMC / ICT** family.

---

## Tier 3 — Conflicts inside a single aspect

**3.1 · A3 `fast` (55) is greater than `slow` (20).**
The labels are "Fast / channel length" and "Slow / trend length". For Momentum and Mean Reversion the code computes `EMA(close, fast)` against `EMA(close, slow)` — with the defaults, the "fast" line is the slower one, so the crossover is inverted relative to its own naming. Only the Breakout branch uses `fast` the way the label suggests (as the channel lookback). One parameter, two incompatible meanings across families.

**3.2 · A5 `maxSpread` = 0 is ambiguous.**
The code treats 0 as "no limit" (`Inp_MaxSpread <= 0 || spr <= Inp_MaxSpread`), but the spec prints "Spread gate ≤ 0 pts", which reads as "reject every trade".

**3.3 · A4 `slippage` is a fixed point value across incompatible symbols.**
The hint advertises EURUSD · US30 · XAUUSD. A 10-point slippage means something different on each. Same issue for `maxSpread` and `minAtr`.

**3.4 · A1 `timeframe = M1` conflicts with A10 `testerMode = "1-minute OHLC"`.**
The 1-minute OHLC model builds higher timeframes from M1 bars. On an M1 chart there is nothing left to model, so the combination is degenerate.

**3.5 · A6/A7 ranges disagree about what a valid R:R is.**
`slAtr` max 5, `tpAtr` max 8, `rrTarget` max 6. The implied R:R from the exit sliders can reach 16R while the risk slider caps at 6R.

**3.6 · A5's tip promises logging that does not exist.**
A5 says "log every rejection so you know why a setup did not trade", and spec §13 repeats "Log every filter rejection, kill-switch breach, and order result". The generated MQL contains no `Print` for any rejection — only one init line.

**3.7 · A9 `magic` is a text field.**
Non-numeric input is stripped by `String(v.magic).replace(/[^0-9-]/g,'')` and silently falls back to `20240801`, which can collide with another EA's magic number.

**3.8 · A10 `walkForward = "None"` leaves the rest of the aspect active.**
`monteCarlo` and `minTrades` still render and still print into spec §11/§14, with no indication they are moot.

---

## Tier 4 — Output bugs that the options expose

**4.1 · `showDashboard` produces non-compiling Pine.**
The Pine output declares `indicator(...)` but the dashboard block references `strategy.opentrades` (line 508). `strategy.*` only exists inside a `strategy()` script — TradingView will reject this. The MQL dashboard path is fine.

**4.2 · The manual contradicts the Pine code on direction handling.**
The manual's "Direction Handling" section states the Pine output "does not produce separate long-only/short-only strategy files" and that direction is only controlled by the trend toggle. The actual Pine output has `sideMode = input.string(..., options=["Both","Long only","Short only"])` with working `allowLong` / `allowShort` gates.

**4.3 · Spec §4's "All 41 values become MQL5 input variables" is false.** See Tier 1.

**4.4 · A5 is only half-represented in Pine.**
The Pine output ignores `maxSpread`, `minAtr`, and `newsBlock` entirely, and ignores A4's `orderType` and `slippage`. Of the five A4/A5 execution options, only `side` and `onlyTrend` survive into Pine.

---

## What to fix first

If you only change three things:

1. **Resolve the A6/A7 reward:risk contradiction.** Either make `rrTarget` derive `tpAtr` from `slAtr`, or drop `rrTarget` and rename A7 to "Risk & Size". Right now the most prominent number in Aspect 7 is decoration.
2. **Gate or remove the dead options.** `confirmation`, `orderType`, `slMode`, `tpMode`, `trail`, `setSlTp`, `newsBlock`, `atrPct`, `minAtr`, and `lens` should either be wired into the generators or hidden until implemented. A spec that promises them is worse than one that omits them.
3. **Fix `fast` > `slow`.** Set `fast` default to something below `slow` (e.g. 20 / 55), or split them into two clearly-named fields — `channelLength` for Breakout, `fastLength`/`slowLength` for Momentum and Mean Reversion.

Then: fix the Pine `strategy.opentrades` compile error (4.1), the `sessionGate` divergence (2.5), and the `sub` staleness (2.8).
