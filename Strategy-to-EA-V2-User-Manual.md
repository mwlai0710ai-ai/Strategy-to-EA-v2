# Strategy → EA v2 — User Manual

**Turns one trading idea into three artifacts that agree with each other:** a Technical Spec, a
compilable MQL5 Expert Advisor for MetaTrader 5, and a Pine Script v6 `strategy()` for TradingView.

The framework enforces four guarantees:

1. **No contradictory options inside an aspect** — a field that a sibling option makes meaningless is
   greyed out and left out of every output.
2. **No contradictory options across aspects** — the market lens restricts which strategy families make
   sense, the family restricts the mechanic, and so on. Ruled-out options stay visible with the reason.
3. **Every setting you select reaches all three outputs** — the coverage panel proves it, field by field.
4. **The rule that fired is always shown** — when the tool adjusts something for you, the Report says
   which rule did it and why.

---

## How the constraint engine works

Two mechanisms, both visible in the UI:

**Field applicability.** A field is either *in play* or *out of play*. Out-of-play fields are greyed
with the reason, and they are never written into the spec or either script. `Stop distance (points)`
only exists when the stop-loss mode is *Fixed points*.

**Option availability.** Inside a field, individual options can be ruled out by earlier choices. They
stay on screen, struck through, with the reason. With the **Range** lens selected, *Breakout* and
*Momentum* are ruled out because a range has no expansion to follow.

When a change makes your current selection illegal, the engine moves it to the nearest legal value and
records the adjustment in the Report — it never silently rewrites your choice.

---

## The ten aspects

| # | Aspect | Question |
|---|---|---|
| 1 | **Target Market** | What instrument, timeframe, and session? |
| 2 | **Market Lens** | What environment must the market be in? |
| 3 | **Strategy / Edge** | What is the core idea, and what math powers it? |
| 4 | **Entry Logic** | Exactly when and at what price do we open? |
| 5 | **Filters** | Which setups are rejected? |
| 6 | **Exit Logic** | When do we take profit and cut loss? |
| 7 | **Risk-Reward & Size** | How much per trade, and at what reward ratio? |
| 8 | **Risk Management** | How do we protect the whole account? |
| 9 | **Data & Execution** | How do orders reach the broker reliably? |
| 10 | **Test & Validate** | How do we prove the strategy actually works? |

### 1 · Target Market

*What instrument, timeframe, and session?*

Beginners over-scope. Pick ONE symbol, ONE timeframe, ONE session — lock it down first. The session hours are only emitted when you require a session window.

| Setting | Options / range | In play | Lands in |
|---|---|---|---|
| Instrument / Symbol | free text (default **EURUSD**) | always in play | MQL5 logic · Pine logic |
| Timeframe | M1 · M5 · M15 · M30 · **H1** · H4 · D1 | always in play | MQL5 logic · Pine logic |
| Require session window | **Session only** / 24h allowed | always in play | MQL5 logic · Pine logic |
| Session start (server hour) | 0 – 23 (default **8**) | only when the session window is only used when "Require session window" is on | MQL5 logic · Pine logic |
| Session end (server hour) | 0 – 23 (default **16**) | only when the session window is only used when "Require session window" is on | MQL5 logic · Pine logic |

### 2 · Market Lens

*What environment must the market be in?*

The lens is a gate, not a label — it is compiled into the entry condition. It also restricts which strategy families make sense: you cannot fade a trend or follow a breakout inside a range.

| Setting | Options / range | In play | Lands in |
|---|---|---|---|
| Market regime (lens) | **Trend** · Range · Volatility · Session bias | always in play | MQL5 logic · Pine logic |
| ADX minimum (trend gate) | 10 – 40 (default **25**) | only when the ADX trend gate only applies to the Trend lens | MQL5 logic · Pine logic |
| ADX maximum (range gate) | 5 – 35 (default **20**) | only when the ADX range gate only applies to the Range lens | MQL5 logic · Pine logic |
| Volatility floor (ATR % of price) | 0.02 – 1.5 (default **0.3**) | only when the volatility floor applies to the Trend and Volatility lenses | MQL5 logic · Pine logic |

### 3 · Strategy / Edge

*What is the core idea, and what math powers it?*

Pick ONE family and ONE mechanic. The mechanic selects a real algorithm — every mechanic below emits different code. Parameters are inputs so you can optimise later.

| Setting | Options / range | In play | Lands in |
|---|---|---|---|
| Logic family | **Breakout** · Momentum · Mean Reversion · SMC / ICT | always in play | MQL5 logic · Pine logic |
| Mechanic | **Donchian channel** · Opening range (ORB) | always in play | MQL5 logic · Pine logic |
| Channel / band length | 5 – 100 (default **55**) | only when used by the Donchian channel and Bollinger reversion mechanics | MQL5 logic · Pine logic |
| Fast MA length | 3 – 60 (default **20**) | only when used by the EMA cross mechanic | MQL5 logic · Pine logic |
| Slow MA length | 8 – 200 (default **50**) | only when used by the EMA cross mechanic | MQL5 logic · Pine logic |
| Opening-range bars | 2 – 30 (default **6**) | only when used by the opening-range mechanic | MQL5 logic · Pine logic |
| MACD fast EMA | 3 – 30 (default **12**) | only when used by the MACD mechanic | MQL5 logic · Pine logic |
| MACD slow EMA | 8 – 60 (default **26**) | only when used by the MACD mechanic | MQL5 logic · Pine logic |
| MACD signal EMA | 2 – 20 (default **9**) | only when used by the MACD mechanic | MQL5 logic · Pine logic |
| Bollinger deviation (σ) | 1 – 4 (default **2**) | only when used by the Bollinger reversion mechanic | MQL5 logic · Pine logic |
| RSI period | 2 – 30 (default **14**) | only when used by the RSI reversion mechanic | MQL5 logic · Pine logic |
| RSI oversold level | 5 – 45 (default **30**) | only when used by the RSI reversion mechanic | MQL5 logic · Pine logic |
| RSI overbought level | 55 – 95 (default **70**) | only when used by the RSI reversion mechanic | MQL5 logic · Pine logic |
| Minimum gap size (× ATR) | 0 – 2 (default **0.3**) | only when used by the fair-value-gap mechanic | MQL5 logic · Pine logic |
| Sweep lookback (bars) | 5 – 80 (default **20**) | only when used by the liquidity-sweep mechanic | MQL5 logic · Pine logic |
| ATR period | 5 – 40 (default **14**) | always in play | MQL5 logic · Pine logic |

### 4 · Entry Logic

*Exactly when and at what price do we open?*

Everything here reads CLOSED bars — repainting is the #1 killer of backtests. "One bar later" is the only delay option, and it asks the condition to still hold.

| Setting | Options / range | In play | Lands in |
|---|---|---|---|
| Direction | **Both** · Long only · Short only | always in play | MQL5 logic · Pine logic |
| Confirmation | **Signal bar** · One bar later | always in play | MQL5 logic · Pine logic |
| Order type | **Market** · Limit · Stop | always in play | MQL5 logic · Pine logic |
| Entry offset (× ATR) | 0.1 – 5 (default **1**) | only when pending orders need an offset — a market order fills at the touch | MQL5 logic · Pine logic |
| Slippage tolerance (points) | 0 – 100 (default **10**) | always in play | MQL5 logic · Pine logic |
| Only trade with trend | **Only with trend** / Fade allowed | only when the Range lens already requires a non-trending market, so a trend-alignment filter would cancel every entry | MQL5 logic · Pine logic |
| Trend reference (SMA bars) | 10 – 200 (default **50**) | only when the trend reference is only used by the trend-alignment filter | MQL5 logic · Pine logic |

### 5 · Filters

*Which setups are rejected?*

Filters cut the trades that look good on a chart but bleed in reality. Every filter here is compiled into the entry condition, and the EA logs each rejection.

| Setting | Options / range | In play | Lands in |
|---|---|---|---|
| Max spread (points, 0 = off) | 0 – 100 (default **25**) | always in play | MQL5 logic · Pine documented |
| Max entries per day (0 = off) | 0 – 20 (default **0**) | always in play | MQL5 logic · Pine logic |
| Close positions at session end | **Hold overnight** / Flat at close | only when there is no session boundary to close at when the session window is off | MQL5 logic · Pine logic |

### 6 · Exit Logic

*When do we take profit and cut loss?*

Decide the stop first — it defines the risk. The target is then either a multiple of that risk or a fixed distance, never an independently-tuned number that disagrees with the stop.

| Setting | Options / range | In play | Lands in |
|---|---|---|---|
| Stop-loss mode | **ATR multiple** · Fixed points · Swing structure | always in play | MQL5 logic · Pine logic |
| Stop distance (× ATR) | 0.5 – 5 (default **2**) | only when the stop is currently measured in points or structure, not ATR | MQL5 logic · Pine logic |
| Stop distance (points) | 5 – 500 (default **50**) | only when the stop is currently measured in ATR or structure, not points | MQL5 logic · Pine logic |
| Swing lookback (bars) | 3 – 60 (default **20**) | only when the swing lookback only applies to the Swing structure stop | MQL5 logic · Pine logic |
| Take-profit mode | **Risk multiple (R)** · Fixed points | always in play | MQL5 logic · Pine logic |
| Target distance (points) | 5 – 1000 (default **150**) | only when the target is currently a risk multiple, not a fixed distance | MQL5 logic · Pine logic |
| Trailing stop | Off · **ATR trail** · Points trail | always in play | MQL5 logic · Pine logic |
| Trail distance (× ATR) | 0.5 – 4 (default **1.5**) | only when trailing is off or measured in points | MQL5 logic · Pine logic |
| Trail distance (points) | 5 – 300 (default **40**) | only when trailing is off or measured in ATR | MQL5 logic · Pine logic |

### 7 · Risk-Reward & Size

*How much per trade, and at what reward ratio?*

Lots = (Equity × Risk%) ÷ (Stop distance in points × point value). The R target here is the only place the reward:risk ratio is set.

| Setting | Options / range | In play | Lands in |
|---|---|---|---|
| Position size mode | **Risk-based %** · Fixed lots | always in play | MQL5 logic · Pine logic |
| Risk per trade (%) | 0.1 – 5 (default **1**) | only when position sizing is set to fixed lots | MQL5 logic · Pine logic |
| Fixed lots | 0.01 – 10 (default **0.1**) | only when position sizing is set to risk-based | MQL5 logic · Pine logic |
| Reward : risk target (R) | 1 – 6 (default **3**) | only when the take-profit is a fixed distance, so no R multiple is used | MQL5 logic · Pine logic |

### 8 · Risk Management

*How do we protect the whole account?*

These sit above position sizing and run every tick — a human cannot judge a kill switch in live time. Drawdown is measured peak-to-trough and latches when breached.

| Setting | Options / range | In play | Lands in |
|---|---|---|---|
| Max daily loss (%) | 1 – 20 (default **3**) | always in play | MQL5 logic · Pine logic |
| Max drawdown — halt (%) | 5 – 50 (default **20**) | always in play | MQL5 logic · Pine logic |
| Max concurrent positions | 1 – 5 (default **1**) | always in play | MQL5 logic · Pine logic |

### 9 · Data & Execution

*How do orders reach the broker reliably?*

Over 90% of "EA does not trade" reports are execution or setup problems, not logic. Settings a Pine strategy cannot express are documented in its header rather than silently ignored.

| Setting | Options / range | In play | Lands in |
|---|---|---|---|
| Magic number | free text (default **20240801**) | always in play | MQL5 logic · Pine documented |
| SL/TP placement | **Attached with order** · Separate modify | always in play | MQL5 logic · Pine logic |
| Send retries | 0 – 10 (default **2**) | always in play | MQL5 logic · Pine documented |
| Retry delay (ms) | 100 – 3000 (default **500**) | only when retry delay is meaningless with zero retries | MQL5 logic · Pine documented |
| On-chart dashboard | **No panel** / Show panel | always in play | MQL5 logic · Pine logic |

### 10 · Test & Validate

*How do we prove the strategy actually works?*

Non-negotiables: no repainting, no look-ahead, closed bars only. A strategy with a 70% drawdown fails no matter the profit factor. These settings are written into the spec and both script headers — no script can set the tester for you.

| Setting | Options / range | In play | Lands in |
|---|---|---|---|
| Backtest modelling | **Real ticks** · Every tick · 1-minute OHLC | always in play | MQL5 documented · Pine documented |
| Walk-forward split | **70 / 30** · 80 / 20 · None | always in play | MQL5 documented · Pine documented |
| Monte-Carlo runs | 100 – 2000 (default **500**) | always in play | MQL5 documented · Pine documented |
| Minimum trades to trust | 20 – 500 (default **100**) | always in play | MQL5 documented · Pine documented |

---

## What the lens does to the family

The market lens is not a label — it compiles into the regime gate, and it decides which strategy
families are coherent:

| Lens | Regime gate | Families allowed |
|---|---|---|
| **Trend** | ADX ≥ ADX minimum **and** ATR ≥ volatility floor | Breakout, Momentum, SMC / ICT |
| **Range** | ADX ≤ ADX maximum | Mean Reversion |
| **Volatility** | ATR ≥ volatility floor | Breakout, Momentum |
| **Session bias** | the session window itself | Breakout, Momentum, SMC / ICT |

Each family offers two mechanics, and each mechanic emits different code:

| Family | Mechanic | What it trades |
|---|---|---|
| Breakout | Donchian channel | Buy the break of the highest high over N bars, sell the break of the lowest low. |
| Breakout | Opening range (ORB) | Mark the high and low of the first N bars of the session, then trade the break of that range. |
| Momentum | EMA cross | Buy when the fast EMA crosses above the slow EMA, sell on the cross back below. |
| Momentum | MACD | Buy when the MACD line crosses above its signal line, sell on the cross below. |
| Mean Reversion | Bollinger reversion | Buy a close back inside the lower band, sell a close back inside the upper band. |
| Mean Reversion | RSI reversion | Buy when RSI crosses back up through the oversold level, sell when it crosses down through the overbought level. |
| SMC / ICT | Fair value gap (FVG) | Find a three-bar imbalance at least N × ATR wide, then trade the retest of the gap. |
| SMC / ICT | Liquidity sweep | Find a bar that takes out the N-bar extreme and closes back inside, then trade the reversal. |

---

## Where each setting lands

Pine Script v6 is generated as a real `strategy()`, so it is a peer of the EA rather than a drawing
aid. Trailing stops become `trail_points` / `trail_offset`, the kill switches become
`strategy.risk.max_intraday_loss` and `strategy.risk.max_drawdown`, pending orders become
`strategy.entry(limit=…)` / `strategy.entry(stop=…)`, and position size is derived from
`syminfo.pointvalue`.

Three settings have no Pine equivalent. Rather than drop them silently, they are written into the
Pine script header and marked **documented** in the settings panel:

| Setting | Why it cannot be code in Pine |
|---|---|
| Magic number | TradingView strategies have no order-tag concept |
| Max spread | Pine has no live spread feed; the value is modelled by `slippage` |
| Aspect 10 validation plan | No script can set a tester's modelling mode or run count |

---

## Cautions

A caution is a combination that is legal but usually a mistake. It never blocks you — it states the
consequence and offers a one-click fix where one exists.

| Fires when | What it says |
|---|---|
| Daily loss limit ≥ drawdown halt | The daily limit can never be the one that fires first — the drawdown halt always trips earlier. |
| Risk % × max positions > 5% | Reports the total simultaneous exposure, e.g. 1% × 3 positions = 3% of the account at risk at once. |
| Risk per trade > 3% | Quantifies the five-loss streak cost, e.g. 4% per trade costs 18.5% of the account over five losses. |
| 1-minute OHLC modelling on an M1/M5 chart | That model builds higher timeframes from M1 bars, so it cannot resolve the bars your stop sits inside. |
| No walk-forward split | Nothing out-of-sample validates the result, so an optimised backtest is unfalsifiable. |
| Stop-entry pending order + swing-structure stop | After a gap the swing stop can land on the wrong side of the pending entry level. |
| Entry offset > 2 × ATR | Most signals will never be filled — the live trade count will fall far short of the backtest. |
| M1 timeframe | M1 entries are dominated by spread and latency, so the backtest flatters the live result. |
| Max spread = 0 | No spread limit is set, so entries can fill at poor prices on a wide-spread symbol. |
| Trail distance > stop distance | The trail starts wider than the initial stop, so it can only loosen the stop until price runs past it. |
| Session start = end | The window is treated as the full 24 hours. |
| Minimum trades > 300 | Demanding that many trades usually forces a shorter timeframe or a looser filter, both of which degrade edge quality. |
| Max drawdown ≥ 40% | A halt that lets the account lose 40% before stopping; most funded-account rules cap total drawdown at 10%. |

---

## Using the generated code

### MQL5 Expert Advisor

1. MetaEditor → **File ▸ New ▸ Expert Advisor**, name it, and paste the generated source over the template.
2. Press **F7** to compile.
3. Drag the EA onto an MT5 chart, tick **Allow Algo Trading**, and confirm the symbol and timeframe match
   the header comment.

The EA reads closed bars only, so a freshly attached EA waits for the next bar before it can act.

### Pine Script v6

1. TradingView → **Pine Editor ▸ Open ▸ New strategy**.
2. Paste the generated source and press **Save**, then **Add to chart**.
3. Open the **Strategy Tester** tab to see the backtest.

---

## Known limitations

- The EA and the Pine strategy are reference implementations of the same logic, not byte-equivalent.
- Aspect 10 is a plan, not code. It is written into the spec and both script headers and labelled
  *documented* in the settings panel.
- One symbol, one timeframe, one session per run. Run the tool again for another combination.
- The EA cancels its own pending orders when a new signal arrives instead of expiring them on a timer.
- No walk-forward or Monte-Carlo engine is generated; those run outside the script.

---

*Generated by Zo · Strategy → EA v2 workflow · 2026-10-25*
