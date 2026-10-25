/* ============================================================================
   Strategy → EA v2 · model.js
   The framework definition. Every field declares:
     applies(s)   — is this field applicable given the rest of the state?
     land         — where the value lands: {mql:'logic'|'doc', pine:'logic'|'doc'}
   The constraint engine (engine.js) enforces these; the generators (gen-*.js)
   only ever read ACTIVE fields, and mark each one they read. A field that is
   active but unread by any generator is reported as a coverage failure.
   ========================================================================== */
(function () {
  'use strict';

  var TF_MQL = { M1: 'PERIOD_M1', M5: 'PERIOD_M5', M15: 'PERIOD_M15', M30: 'PERIOD_M30', H1: 'PERIOD_H1', H4: 'PERIOD_H4', D1: 'PERIOD_D1' };

  /* ---- Aspect 3: families, mechanics, and the lens → family matrix -------- */

  var FAMILY_MECHANICS = {
    'Breakout': ['Donchian channel', 'Opening range (ORB)'],
    'Momentum': ['EMA cross', 'MACD'],
    'Mean Reversion': ['Bollinger reversion', 'RSI reversion'],
    'SMC / ICT': ['Fair value gap (FVG)', 'Liquidity sweep']
  };

  var FAMILY_DESC = {
    'Breakout': 'Trade a fresh move past a defined barrier — an N-bar channel extreme, or the first bars of the session.',
    'Momentum': 'Follow directional speed — a moving-average cross, or a MACD momentum swing.',
    'Mean Reversion': 'Fade an extreme and expect a return toward fair value — Bollinger bands, or an oversold/overbought RSI.',
    'SMC / ICT': 'Trade an imbalance or a liquidity sweep — a fair value gap retest, or a stop-run that reverses.'
  };

  var FAMILY_TAG = { 'Breakout': '3A', 'Momentum': '3B', 'Mean Reversion': '3C', 'SMC / ICT': '3D' };

  /* The lens decides which regimes are coherent. A trend lens cannot host a
     mean-reversion family (there is nothing to revert to), and a range lens
     cannot host a breakout/momentum family (there is no expansion to follow). */
  var FAMILY_BY_LENS = {
    'Trend': ['Breakout', 'Momentum', 'SMC / ICT'],
    'Range': ['Mean Reversion'],
    'Volatility': ['Breakout', 'Momentum'],
    'Session bias': ['Breakout', 'Momentum', 'SMC / ICT']
  };

  var LENS_REASON = {
    'Trend': 'the lens requires a trend gate',
    'Range': 'the lens requires a non-trending gate',
    'Volatility': 'the lens requires a volatility gate',
    'Session bias': 'the lens requires a session window'
  };

  /* ---- Field definitions -------------------------------------------------- */

  function A(cond, why) { return { f: cond, why: why || 'not applicable for the current selection' }; }

  var F = {};
  function def(key, o) { o.key = key; F[key] = o; }

  /* A1 · Target Market */
  def('symbol', { label: 'Instrument / Symbol', kind: 'text', def: 'EURUSD', hint: 'EURUSD · XAUUSD · US30 — the ticker your broker uses', land: { mql: 'logic', pine: 'logic' } });
  def('timeframe', { label: 'Timeframe', kind: 'select', options: ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'], def: 'H1', land: { mql: 'logic', pine: 'logic' } });
  def('sessionStart', { label: 'Session start (server hour)', kind: 'range', min: 0, max: 23, step: 1, def: 8, hint: 'Inclusive. Uses MT5 / TradingView server time.', applies: A(function (s) { return s.sessionGate === true; }, 'the session window is only used when "Require session window" is on'), land: { mql: 'logic', pine: 'logic' } });
  def('sessionEnd', { label: 'Session end (server hour)', kind: 'range', min: 0, max: 23, step: 1, def: 16, hint: 'Exclusive. If end ≤ start the window wraps past midnight; start = end means 24 hours.', applies: A(function (s) { return s.sessionGate === true; }, 'the session window is only used when "Require session window" is on'), land: { mql: 'logic', pine: 'logic' } });

  /* A2 · Market Lens */
  def('lens', {
    label: 'Market regime (lens)', kind: 'select', def: 'Trend',
    options: ['Trend', 'Range', 'Volatility', 'Session bias'],
    optAvail: function (o, s) {
      if (o === 'Session bias' && s.sessionGate !== true) return 'needs a session window — turn on "Require session window" first';
      return true;
    },
    hint: 'The lens is the gate every entry must pass. It also decides which strategy families are coherent.',
    land: { mql: 'logic', pine: 'logic' }
  });
  def('adxMin', { label: 'ADX minimum (trend gate)', kind: 'range', min: 10, max: 40, step: 1, def: 25, applies: A(function (s) { return s.lens === 'Trend'; }, 'the ADX trend gate only applies to the Trend lens'), land: { mql: 'logic', pine: 'logic' } });
  def('adxMax', { label: 'ADX maximum (range gate)', kind: 'range', min: 5, max: 35, step: 1, def: 20, applies: A(function (s) { return s.lens === 'Range'; }, 'the ADX range gate only applies to the Range lens'), land: { mql: 'logic', pine: 'logic' } });
  def('atrPct', { label: 'Volatility floor (ATR % of price)', kind: 'range', min: 0.02, max: 1.5, step: 0.01, def: 0.3, applies: A(function (s) { return s.lens === 'Trend' || s.lens === 'Volatility'; }, 'the volatility floor applies to the Trend and Volatility lenses'), land: { mql: 'logic', pine: 'logic' } });

  /* A3 · Strategy / Edge */
  def('family', {
    label: 'Logic family', kind: 'select', def: 'Breakout',
    options: ['Breakout', 'Momentum', 'Mean Reversion', 'SMC / ICT'],
    optAvail: function (o, s) {
      if (FAMILY_BY_LENS[s.lens].indexOf(o) < 0) return 'contradicts the ' + s.lens + ' lens — ' + LENS_REASON[s.lens];
      return true;
    },
    hint: 'Only families that fit the selected lens can be chosen.',
    land: { mql: 'logic', pine: 'logic' }
  });
  def('sub', {
    label: 'Mechanic', kind: 'select', def: 'Donchian channel',
    options: FAMILY_MECHANICS['Breakout'],
    optionSource: function (s) { return FAMILY_MECHANICS[s.family] || FAMILY_MECHANICS['Breakout']; },
    optAvail: function (o, s) { return FAMILY_MECHANICS[s.family].indexOf(o) >= 0 ? true : 'belongs to a different family'; },
    hint: 'The mechanic is the actual algorithm emitted in the code — it is not cosmetic.',
    land: { mql: 'logic', pine: 'logic' }
  });
  def('lookback', { label: 'Channel / band length', kind: 'range', min: 5, max: 100, step: 1, def: 55, applies: A(function (s) { return s.sub === 'Donchian channel' || s.sub === 'Bollinger reversion'; }, 'used by the Donchian channel and Bollinger reversion mechanics'), land: { mql: 'logic', pine: 'logic' } });
  def('fastMA', { label: 'Fast MA length', kind: 'range', min: 3, max: 60, step: 1, def: 20, applies: A(function (s) { return s.sub === 'EMA cross'; }, 'used by the EMA cross mechanic'), land: { mql: 'logic', pine: 'logic' } });
  def('slowMA', { label: 'Slow MA length', kind: 'range', min: 8, max: 200, step: 1, def: 50, applies: A(function (s) { return s.sub === 'EMA cross'; }, 'used by the EMA cross mechanic'), land: { mql: 'logic', pine: 'logic' } });
  def('orbBars', { label: 'Opening-range bars', kind: 'range', min: 2, max: 30, step: 1, def: 6, applies: A(function (s) { return s.sub === 'Opening range (ORB)'; }, 'used by the opening-range mechanic'), land: { mql: 'logic', pine: 'logic' } });
  def('macdFast', { label: 'MACD fast EMA', kind: 'range', min: 3, max: 30, step: 1, def: 12, applies: A(function (s) { return s.sub === 'MACD'; }, 'used by the MACD mechanic'), land: { mql: 'logic', pine: 'logic' } });
  def('macdSlow', { label: 'MACD slow EMA', kind: 'range', min: 8, max: 60, step: 1, def: 26, applies: A(function (s) { return s.sub === 'MACD'; }, 'used by the MACD mechanic'), land: { mql: 'logic', pine: 'logic' } });
  def('macdSignal', { label: 'MACD signal EMA', kind: 'range', min: 2, max: 20, step: 1, def: 9, applies: A(function (s) { return s.sub === 'MACD'; }, 'used by the MACD mechanic'), land: { mql: 'logic', pine: 'logic' } });
  def('bandMult', { label: 'Bollinger deviation (σ)', kind: 'range', min: 1, max: 4, step: 0.1, def: 2, applies: A(function (s) { return s.sub === 'Bollinger reversion'; }, 'used by the Bollinger reversion mechanic'), land: { mql: 'logic', pine: 'logic' } });
  def('rsiPeriod', { label: 'RSI period', kind: 'range', min: 2, max: 30, step: 1, def: 14, applies: A(function (s) { return s.sub === 'RSI reversion'; }, 'used by the RSI reversion mechanic'), land: { mql: 'logic', pine: 'logic' } });
  def('rsiLow', { label: 'RSI oversold level', kind: 'range', min: 5, max: 45, step: 1, def: 30, applies: A(function (s) { return s.sub === 'RSI reversion'; }, 'used by the RSI reversion mechanic'), land: { mql: 'logic', pine: 'logic' } });
  def('rsiHigh', { label: 'RSI overbought level', kind: 'range', min: 55, max: 95, step: 1, def: 70, applies: A(function (s) { return s.sub === 'RSI reversion'; }, 'used by the RSI reversion mechanic'), land: { mql: 'logic', pine: 'logic' } });
  def('fvgMinAtr', { label: 'Minimum gap size (× ATR)', kind: 'range', min: 0, max: 2, step: 0.1, def: 0.3, applies: A(function (s) { return s.sub === 'Fair value gap (FVG)'; }, 'used by the fair-value-gap mechanic'), land: { mql: 'logic', pine: 'logic' } });
  def('sweepLookback', { label: 'Sweep lookback (bars)', kind: 'range', min: 5, max: 80, step: 1, def: 20, applies: A(function (s) { return s.sub === 'Liquidity sweep'; }, 'used by the liquidity-sweep mechanic'), land: { mql: 'logic', pine: 'logic' } });
  def('atrPeriod', { label: 'ATR period', kind: 'range', min: 5, max: 40, step: 1, def: 14, hint: 'Used for every ATR-based distance and for the volatility gate.', land: { mql: 'logic', pine: 'logic' } });

  /* A4 · Entry Logic */
  def('side', { label: 'Direction', kind: 'select', options: ['Both', 'Long only', 'Short only'], def: 'Both', land: { mql: 'logic', pine: 'logic' } });
  def('confirmation', {
    label: 'Confirmation', kind: 'select', def: 'Signal bar',
    options: ['Signal bar', 'One bar later'],
    hint: 'Both read closed bars only. "One bar later" requires the condition to still hold on the following bar — it costs one bar of delay and removes one-bar whipsaws.',
    land: { mql: 'logic', pine: 'logic' }
  });
  def('orderType', { label: 'Order type', kind: 'select', options: ['Market', 'Limit', 'Stop'], def: 'Market', hint: 'Limit / Stop place a pending order offset from price by "Entry offset" and measure SL/TP from that entry level.', land: { mql: 'logic', pine: 'logic' } });
  def('entryOffset', { label: 'Entry offset (× ATR)', kind: 'range', min: 0.1, max: 5, step: 0.1, def: 1, applies: A(function (s) { return s.orderType !== 'Market'; }, 'pending orders need an offset — a market order fills at the touch'), land: { mql: 'logic', pine: 'logic' } });
  def('slippage', { label: 'Slippage tolerance (points)', kind: 'range', min: 0, max: 100, step: 1, def: 10, hint: 'MQL5: max deviation on the order request. Pine: the strategy() slippage model. A point is symbol-specific — 1 pipette on EURUSD, 1 index point on US30 — so tune it per symbol.', land: { mql: 'logic', pine: 'logic' } });
  def('onlyTrend', {
    label: 'Only trade with trend', kind: 'toggle', def: true, on: 'Only with trend', off: 'Fade allowed',
    applies: A(function (s) { return s.lens !== 'Range'; }, 'the Range lens already requires a non-trending market, so a trend-alignment filter would cancel every entry'),
    land: { mql: 'logic', pine: 'logic' }
  });  def('trendRef', { label: 'Trend reference (SMA bars)', kind: 'range', min: 10, max: 200, step: 1, def: 50, applies: A(function (s) { return s.lens !== 'Range' && s.onlyTrend === true; }, 'the trend reference is only used by the trend-alignment filter'), hint: 'Longs only above this SMA, shorts only below it.', land: { mql: 'logic', pine: 'logic' } });

  /* A5 · Filters */
  def('sessionGate', { label: 'Require session window', kind: 'toggle', def: true, on: 'Session only', off: '24h allowed', land: { mql: 'logic', pine: 'logic' } });
  def('closeOnSessionEnd', { label: 'Close positions at session end', kind: 'toggle', def: false, on: 'Flat at close', off: 'Hold overnight', applies: A(function (s) { return s.sessionGate === true; }, 'there is no session boundary to close at when the session window is off'), land: { mql: 'logic', pine: 'logic' } });
  def('maxSpread', { label: 'Max spread (points, 0 = off)', kind: 'range', min: 0, max: 100, step: 1, def: 25, hint: 'MQL5 reads the live spread every tick. Pine cannot see spread — the value is documented in the script header and modelled by slippage. Points are symbol-specific; 0 disables the check.', land: { mql: 'logic', pine: 'doc' } });
  def('maxTradesPerDay', { label: 'Max entries per day (0 = off)', kind: 'range', min: 0, max: 20, step: 1, def: 0, land: { mql: 'logic', pine: 'logic' } });

  /* A6 · Exit Logic */
  def('slMode', { label: 'Stop-loss mode', kind: 'select', options: ['ATR multiple', 'Fixed points', 'Swing structure'], def: 'ATR multiple', hint: 'Swing structure places the stop beyond the extreme of the last N bars.', land: { mql: 'logic', pine: 'logic' } });
  def('slAtr', { label: 'Stop distance (× ATR)', kind: 'range', min: 0.5, max: 5, step: 0.25, def: 2, applies: A(function (s) { return s.slMode === 'ATR multiple'; }, 'the stop is currently measured in points or structure, not ATR'), land: { mql: 'logic', pine: 'logic' } });
  def('slPoints', { label: 'Stop distance (points)', kind: 'range', min: 5, max: 500, step: 5, def: 50, applies: A(function (s) { return s.slMode === 'Fixed points'; }, 'the stop is currently measured in ATR or structure, not points'), land: { mql: 'logic', pine: 'logic' } });
  def('swingLookback', { label: 'Swing lookback (bars)', kind: 'range', min: 3, max: 60, step: 1, def: 20, applies: A(function (s) { return s.slMode === 'Swing structure'; }, 'the swing lookback only applies to the Swing structure stop'), land: { mql: 'logic', pine: 'logic' } });
  def('tpMode', {
    label: 'Take-profit mode', kind: 'select', def: 'Risk multiple (R)',
    options: ['Risk multiple (R)', 'Fixed points'],
    hint: 'A reward:risk multiple always stays consistent with the stop. ATR-based targets are expressed as a risk multiple of an ATR stop, so the two can never disagree.',
    land: { mql: 'logic', pine: 'logic' }
  });
  def('tpPoints', { label: 'Target distance (points)', kind: 'range', min: 5, max: 1000, step: 5, def: 150, applies: A(function (s) { return s.tpMode === 'Fixed points'; }, 'the target is currently a risk multiple, not a fixed distance'), land: { mql: 'logic', pine: 'logic' } });
  def('trail', { label: 'Trailing stop', kind: 'select', options: ['Off', 'ATR trail', 'Points trail'], def: 'ATR trail', hint: 'The stop is only advanced, never loosened.', land: { mql: 'logic', pine: 'logic' } });
  def('trailAtr', { label: 'Trail distance (× ATR)', kind: 'range', min: 0.5, max: 4, step: 0.25, def: 1.5, applies: A(function (s) { return s.trail === 'ATR trail'; }, 'trailing is off or measured in points'), land: { mql: 'logic', pine: 'logic' } });
  def('trailPoints', { label: 'Trail distance (points)', kind: 'range', min: 5, max: 300, step: 5, def: 40, applies: A(function (s) { return s.trail === 'Points trail'; }, 'trailing is off or measured in ATR'), land: { mql: 'logic', pine: 'logic' } });

  /* A7 · Risk-Reward & Size */
  def('riskMode', { label: 'Position size mode', kind: 'select', options: ['Risk-based %', 'Fixed lots'], def: 'Risk-based %', land: { mql: 'logic', pine: 'logic' } });
  def('riskPercent', { label: 'Risk per trade (%)', kind: 'range', min: 0.1, max: 5, step: 0.1, def: 1, applies: A(function (s) { return s.riskMode === 'Risk-based %'; }, 'position sizing is set to fixed lots'), land: { mql: 'logic', pine: 'logic' } });
  def('fixedLots', { label: 'Fixed lots', kind: 'range', min: 0.01, max: 10, step: 0.01, def: 0.1, applies: A(function (s) { return s.riskMode === 'Fixed lots'; }, 'position sizing is set to risk-based'), land: { mql: 'logic', pine: 'logic' } });
  def('rrTarget', { label: 'Reward : risk target (R)', kind: 'range', min: 1, max: 6, step: 0.5, def: 3, applies: A(function (s) { return s.tpMode === 'Risk multiple (R)'; }, 'the take-profit is a fixed distance, so no R multiple is used'), hint: 'This is the single source of the reward:risk ratio — the exit logic reads it, so the spec and the code can never disagree.', land: { mql: 'logic', pine: 'logic' } });

  /* A8 · Risk Management */
  def('maxDailyLoss', { label: 'Max daily loss (%)', kind: 'range', min: 1, max: 20, step: 0.5, def: 3, hint: 'Measured from the equity at the start of the server day.', land: { mql: 'logic', pine: 'logic' } });
  def('maxDrawdown', { label: 'Max drawdown — halt (%)', kind: 'range', min: 5, max: 50, step: 1, def: 20, hint: 'Peak-to-trough on closed equity. Latches: once breached the strategy stops opening trades.', land: { mql: 'logic', pine: 'logic' } });
  def('maxOpenTrades', { label: 'Max concurrent positions', kind: 'range', min: 1, max: 5, step: 1, def: 1, land: { mql: 'logic', pine: 'logic' } });

  /* A9 · Data & Execution */
  def('magic', { label: 'Magic number', kind: 'number', min: 1, max: 2147483646, step: 1, def: 20240801, hint: 'MQL5 only — a Pine strategy has no broker-side identity. Documented in the Pine header.', land: { mql: 'logic', pine: 'doc' } });
  def('setSlTp', { label: 'SL/TP placement', kind: 'select', options: ['Attached with order', 'Separate modify'], def: 'Attached with order', hint: 'Attached = one-shot (some ECN brokers reject this). Separate = send the entry, then modify. In Pine this maps to exiting on the entry bar vs the next bar.', land: { mql: 'logic', pine: 'logic' } });
  def('maxRetries', { label: 'Send retries', kind: 'range', min: 0, max: 10, step: 1, def: 2, hint: 'MQL5 only — Pine orders are simulated locally.', land: { mql: 'logic', pine: 'doc' } });
  def('retryMs', { label: 'Retry delay (ms)', kind: 'range', min: 100, max: 3000, step: 100, def: 500, applies: A(function (s) { return s.maxRetries > 0; }, 'retry delay is meaningless with zero retries'), land: { mql: 'logic', pine: 'doc' } });
  def('showDashboard', { label: 'On-chart dashboard', kind: 'toggle', def: false, on: 'Show panel', off: 'No panel', land: { mql: 'logic', pine: 'logic' } });

  /* A10 · Test & Validate */
  def('testerMode', { label: 'Backtest modelling', kind: 'select', options: ['Real ticks', 'Every tick', '1-minute OHLC'], def: 'Real ticks', hint: 'No script can set the tester — this is emitted into the spec and both script headers as the validation plan.', land: { mql: 'doc', pine: 'doc' } });
  def('walkForward', { label: 'Walk-forward split', kind: 'select', options: ['70 / 30', '80 / 20', 'None'], def: '70 / 30', land: { mql: 'doc', pine: 'doc' } });
  def('monteCarlo', { label: 'Monte-Carlo runs', kind: 'range', min: 100, max: 2000, step: 100, def: 500, land: { mql: 'doc', pine: 'doc' } });
  def('minTrades', { label: 'Minimum trades to trust', kind: 'range', min: 20, max: 500, step: 10, def: 100, land: { mql: 'doc', pine: 'doc' } });

  /* ---- Aspects ------------------------------------------------------------ */

  var ASPECTS = [
    { id: 1, name: 'Target Market', icon: '🎯', color: '#6ea8ff', q: 'What instrument, timeframe, and session?', tip: 'Beginners over-scope. Pick ONE symbol, ONE timeframe, ONE session — lock it down first. The session hours are only emitted when you require a session window.', keys: ['symbol', 'timeframe', 'sessionGate', 'sessionStart', 'sessionEnd'] },
    { id: 2, name: 'Market Lens', icon: '🔭', color: '#2ed573', q: 'What environment must the market be in?', tip: 'The lens is a gate, not a label — it is compiled into the entry condition. It also restricts which strategy families make sense: you cannot fade a trend or follow a breakout inside a range.', keys: ['lens', 'adxMin', 'adxMax', 'atrPct'] },
    { id: 3, name: 'Strategy / Edge', icon: '⚡', color: '#f6c177', q: 'What is the core idea, and what math powers it?', tip: 'Pick ONE family and ONE mechanic. The mechanic selects a real algorithm — every mechanic below emits different code. Parameters are inputs so you can optimise later.', keys: ['family', 'sub', 'lookback', 'fastMA', 'slowMA', 'orbBars', 'macdFast', 'macdSlow', 'macdSignal', 'bandMult', 'rsiPeriod', 'rsiLow', 'rsiHigh', 'fvgMinAtr', 'sweepLookback', 'atrPeriod'] },
    { id: 4, name: 'Entry Logic', icon: '👉', color: '#b48cff', q: 'Exactly when and at what price do we open?', tip: 'Everything here reads CLOSED bars — repainting is the #1 killer of backtests. "One bar later" is the only delay option, and it asks the condition to still hold.', keys: ['side', 'confirmation', 'orderType', 'entryOffset', 'slippage', 'onlyTrend', 'trendRef'] },
    { id: 5, name: 'Filters', icon: '🛡️', color: '#4ec9c9', q: 'Which setups are rejected?', tip: 'Filters cut the trades that look good on a chart but bleed in reality. Every filter here is compiled into the entry condition, and the EA logs each rejection.', keys: ['maxSpread', 'maxTradesPerDay', 'closeOnSessionEnd'] },
    { id: 6, name: 'Exit Logic', icon: '🚪', color: '#ff9f6a', q: 'When do we take profit and cut loss?', tip: 'Decide the stop first — it defines the risk. The target is then either a multiple of that risk or a fixed distance, never an independently-tuned number that disagrees with the stop.', keys: ['slMode', 'slAtr', 'slPoints', 'swingLookback', 'tpMode', 'tpPoints', 'trail', 'trailAtr', 'trailPoints'] },
    { id: 7, name: 'Risk-Reward & Size', icon: '⚖️', color: '#ff5b6a', q: 'How much per trade, and at what reward ratio?', tip: 'Lots = (Equity × Risk%) ÷ (Stop distance in points × point value). The R target here is the only place the reward:risk ratio is set.', keys: ['riskMode', 'riskPercent', 'fixedLots', 'rrTarget'] },
    { id: 8, name: 'Risk Management', icon: '🧯', color: '#f78fb3', q: 'How do we protect the whole account?', tip: 'These sit above position sizing and run every tick — a human cannot judge a kill switch in live time. Drawdown is measured peak-to-trough and latches when breached.', keys: ['maxDailyLoss', 'maxDrawdown', 'maxOpenTrades'] },
    { id: 9, name: 'Data & Execution', icon: '🔌', color: '#7fd1e8', q: 'How do orders reach the broker reliably?', tip: 'Over 90% of "EA does not trade" reports are execution or setup problems, not logic. Settings a Pine strategy cannot express are documented in its header rather than silently ignored.', keys: ['magic', 'setSlTp', 'maxRetries', 'retryMs', 'showDashboard'] },
    { id: 10, name: 'Test & Validate', icon: '🧪', color: '#a3e635', q: 'How do we prove the strategy actually works?', tip: 'Non-negotiables: no repainting, no look-ahead, closed bars only. A strategy with a 70% drawdown fails no matter the profit factor. These settings are written into the spec and both script headers — no script can set the tester for you.', keys: ['testerMode', 'walkForward', 'monteCarlo', 'minTrades'] }
  ];

  /* ---- Cross-aspect cautions (allowed, but flagged) ----------------------- */

  var CAUTIONS = [
    function (s, on) {
      if (on('maxDailyLoss') && on('maxDrawdown') && s.maxDailyLoss >= s.maxDrawdown)
        return { text: 'Daily loss limit (' + s.maxDailyLoss + '%) is at or above the drawdown halt (' + s.maxDrawdown + '%), so the daily limit can never be the one that fires first.', fix: { key: 'maxDrawdown', to: s.maxDailyLoss + 5 } };
    },
    function (s, on) {
      if (on('riskPercent') && on('maxOpenTrades') && s.riskPercent * s.maxOpenTrades > 5)
        return { text: 'Up to ' + round(s.riskPercent * s.maxOpenTrades, 2) + '% of the account can be exposed at once (' + s.riskPercent + '% × ' + s.maxOpenTrades + ' positions).', fix: null };
    },
    function (s, on) {
      if (on('riskPercent') && s.riskPercent > 3)
        return { text: 'Risking ' + s.riskPercent + '% per trade means a five-loss streak costs ' + round(100 * (1 - Math.pow(1 - s.riskPercent / 100, 5)), 1) + '% of the account.', fix: null };
    },
    function (s) {
      if (s.testerMode === '1-minute OHLC' && (s.timeframe === 'M1' || s.timeframe === 'M5'))
        return { text: '1-minute OHLC modelling is too coarse for ' + s.timeframe + ' entries and intrabar stops — it cannot resolve the bars your stop sits inside.', fix: { key: 'testerMode', to: 'Real ticks' } };
    },
    function (s) {
      if (s.walkForward === 'None')
        return { text: 'No walk-forward split: nothing out-of-sample validates the result, so an optimised backtest is unfalsifiable.', fix: { key: 'walkForward', to: '70 / 30' } };
    },
    function (s) {
      if (s.slMode === 'Swing structure' && s.orderType === 'Stop')
        return { text: 'A stop-entry pending order plus a swing-structure stop can place the stop on the wrong side of the entry level after a gap.', fix: null };
    },
    function (s, on) {
      if (on('entryOffset') && s.entryOffset > 2)
        return { text: 'An entry offset of ' + s.entryOffset + ' × ATR is far enough that many signals will never be filled — the strategy will trade far less often than the backtest suggests.', fix: { key: 'entryOffset', to: 1 } };
    },
    function (s) {
      if (s.timeframe === 'M1')
        return { text: 'M1 entries are dominated by spread and latency; the backtest will flatter the live result.', fix: { key: 'timeframe', to: 'M5' } };
    },
    function (s, on) {
      if (on('maxSpread') && s.maxSpread === 0)
        return { text: 'No spread limit is set — on a wide-spread symbol entries will fill at poor prices.', fix: { key: 'maxSpread', to: 25 } };
    },
    function (s, on) {
      if (on('trailAtr') && on('slAtr') && s.trailAtr > s.slAtr)
        return { text: 'The trailing distance (' + s.trailAtr + ' × ATR) is wider than the initial stop (' + s.slAtr + ' × ATR), so the trail will only ever loosen the stop at first — it cannot advance until price runs further than the stop itself.', fix: { key: 'trailAtr', to: Math.max(0.5, round(s.slAtr / 2, 2)) } };
    },
    function (s) {
      if (s.sessionEnd === s.sessionStart)
        return { text: 'Session start = end, so the window is treated as the full 24 hours.', fix: null };
    },
    function (s, on) {
      if (on('minTrades') && s.minTrades > 300)
        return { text: 'Demanding ' + s.minTrades + ' trades usually forces a shorter timeframe or a looser filter — both degrade edge quality. Fewer, better trades is the usual answer.', fix: { key: 'minTrades', to: 100 } };
    },
    function (s) {
      if (s.maxDrawdown >= 40)
        return { text: 'A ' + s.maxDrawdown + '% drawdown halt means you would let the account halve before stopping. Most funded-account rules cap total drawdown at 10%.', fix: { key: 'maxDrawdown', to: 20 } };
    }
  ];

  /* ---- helpers ------------------------------------------------------------ */

  function round(n, d) { var m = Math.pow(10, d); return Math.round(n * m) / m; }

  window.SEA = window.SEA || {};
  window.SEA.TF_MQL = TF_MQL;
  window.SEA.FAMILY_MECHANICS = FAMILY_MECHANICS;
  window.SEA.FAMILY_DESC = FAMILY_DESC;
  window.SEA.FAMILY_TAG = FAMILY_TAG;
  window.SEA.FAMILY_BY_LENS = FAMILY_BY_LENS;
  window.SEA.FIELDS = F;
  window.SEA.ASPECTS = ASPECTS;
  window.SEA.CAUTIONS = CAUTIONS;
  window.SEA.round = round;
  window.SEA.KEYS = Object.keys(F);

  /* ---- view adapter ------------------------------------------------------- */
  /* The UI and the generators speak this shape. `appliesReason` flattens the
     A() descriptor so the renderer can show WHY a field is out of play. */

  Object.keys(F).forEach(function (k) {
    F[k].appliesReason = F[k].applies ? F[k].applies.why : '';
  });

  window.MODEL = {
    FIELD_DEFS: F,
    ASPECTS: ASPECTS,
    CAUTIONS: CAUTIONS,
    MECHANICS: FAMILY_MECHANICS,
    FAMILY_BY_LENS: FAMILY_BY_LENS,
    fieldList: function () { return Object.keys(F); },
    label: function (k) { return (F[k] && F[k].label) || k; }
  };
})();
