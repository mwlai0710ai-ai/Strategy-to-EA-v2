/* ─────────────────────────────────────────────────────────────
   Pine Script v6 generator — emits a real strategy(), so every
   trading option (sizing, stops, targets, trailing, risk limits)
   is enforced by TradingView rather than only described.
   ───────────────────────────────────────────────────────────── */
(function (root) {
  'use strict';
  var A = root.A;

  var TF = { M1: '1', M5: '5', M15: '15', M30: '30', H1: '60', H4: '240', D1: 'D' };
  function num(v) { return (typeof v === 'number') ? String(v) : String(Number(v) || 0); }
  function s(v) { return "'" + String(v).replace(/'/g, "\\'") + "'"; }

  /* build() installs the live state/consumed maps so that the nested helper
     functions below can mark every setting they branch on. */
  var STATE = null, CONSUMED = null;
  function act(k) { if (!STATE || !STATE.__active[k]) return false; CONSUMED[k] = true; return true; }
  function sel(k, v) { return act(k) && STATE[k] === v; }

  function build(state) {
    var consumed = {}, L = [], used = {};
    function get(k) { consumed[k] = true; return state[k]; }
    function has(k) { if (!act(k)) return false; used[k] = true; return true; }

    STATE = state; CONSUMED = consumed;
    var title = get('symbol') + ' ' + get('timeframe') + ' · ' + get('sub');
    var slippage = act('slippage') ? num(state.slippage) : 0;
    var pyramiding = Math.max(0, Number(get('maxOpenTrades')) - 1);

    L.push('//@version=6');
    L.push('// ══════════════════════════════════════════════════════════════════');
    L.push('//  Strategy → EA v2  ·  TradingView strategy');
    L.push('//  ' + get('symbol') + ' ' + get('timeframe') + '  ·  ' + get('sub') + '  ·  ' + get('lens') + ' lens');
    L.push('//  Generated for the configuration below. Settings marked "not');
    L.push('//  applicable" in the builder are absent by design.');
    L.push('// ══════════════════════════════════════════════════════════════════');
    L.push('');
    L.push('strategy(' + s(title) + ', shorttitle=' + s(get('symbol') + ' ' + state.sub.slice(0, 18)) + ', overlay=true,');
    L.push('     initial_capital=10000,');
    L.push('     default_qty_type=strategy.fixed' + ', default_qty_value=1,');
    L.push('     pyramiding=' + pyramiding + ',');
    L.push('     slippage=' + slippage + ',');
    L.push('     process_orders_on_close=true,');
    L.push('     calc_on_every_tick=false,');
    L.push('     max_labels_count=500,');
    L.push('     max_lines_count=500)');
    L.push('');
    L.push('// ── Risk limits enforced by the TradingView engine ────────────────');
    L.push('strategy.risk.max_intraday_loss(' + num(get('maxDailyLoss')) + ', strategy.percent_of_equity)   // Aspect 8 · daily loss ' + num(get('maxDailyLoss')) + '%');
    L.push('strategy.risk.max_drawdown(' + num(get('maxDrawdown')) + ', strategy.percent_of_equity)        // Aspect 8 · max drawdown ' + num(get('maxDrawdown')) + '%');
    L.push('');
    L.push('// ── Settings with no Pine equivalent (enforced in the MQL5 build) ──');
    L.push('// Magic number    : ' + get('magic'));
    L.push('// Max spread      : ' + (act('maxSpread') ? (Number(state.maxSpread) === 0 ? 'no limit' : num(state.maxSpread) + ' points') : 'n/a'));
    if (has('setSlTp')) L.push('// SL/TP placement : ' + get('setSlTp') + '  (Pine always brackets via strategy.exit)');
    L.push('// Order retries   : ' + (act('maxRetries') ? num(state.maxRetries) + ' attempts, ' + num(get('retryMs')) + ' ms apart' : 'n/a'));
    L.push('// Note: TradingView exposes no live spread, magic number or order-retry');
    L.push('//       control, so those settings live in the spec and the MT5 build.');
    L.push('');
    L.push('// ── Validation plan (Aspect 10) ───────────────────────────────────');
    L.push('// Modelling        : ' + get('testerMode'));
    L.push('// Out-of-sample    : ' + get('walkForward'));
    L.push('// Monte-Carlo runs : ' + get('monteCarlo'));
    L.push('// Minimum trades   : ' + get('minTrades'));
    L.push('');
    L.push('// ── Inputs ────────────────────────────────────────────────────────');
    L.push('sessionStart = input.int(' + num(get('sessionStart')) + ', "Session start hour", minval=0, maxval=23)');
    L.push('sessionEnd   = input.int(' + num(get('sessionEnd')) + ', "Session end hour", minval=0, maxval=23)');
    if (has('adxMin')) L.push('minAdx       = input.float(' + num(get('adxMin')) + ', "ADX floor", minval=0)');
    if (has('adxMax')) L.push('maxAdx       = input.float(' + num(get('adxMax')) + ', "ADX ceiling", minval=0)');
    if (has('atrPct')) L.push('minAtrPct    = input.float(' + num(get('atrPct')) + ', "ATR as % of price (min)", minval=0, step=0.05)');
    if (has('lookback')) L.push('lookback     = input.int(' + num(get('lookback')) + ', "Lookback (bars)", minval=2)');
    if (has('orbBars')) L.push('orbBars      = input.int(' + num(get('orbBars')) + ', "Opening range bars", minval=1)');
    if (has('fastMA')) L.push('fastLen      = input.int(' + num(get('fastMA')) + ', "Fast EMA", minval=2)');
    if (has('slowMA')) L.push('slowLen      = input.int(' + num(get('slowMA')) + ', "Slow EMA", minval=3)');
    if (has('macdFast')) L.push('macdFastLen  = input.int(' + num(get('macdFast')) + ', "MACD fast", minval=2)');
    if (has('macdSlow')) L.push('macdSlowLen  = input.int(' + num(get('macdSlow')) + ', "MACD slow", minval=3)');
    if (has('macdSignal')) L.push('macdSigLen   = input.int(' + num(get('macdSignal')) + ', "MACD signal", minval=2)');
    if (has('bandMult')) L.push('bandMult     = input.float(' + num(get('bandMult')) + ', "Bollinger multiplier", minval=0.5, step=0.1)');
    if (has('rsiPeriod')) L.push('rsiLen       = input.int(' + num(get('rsiPeriod')) + ', "RSI length", minval=2)');
    if (has('rsiLow')) L.push('rsiLow       = input.float(' + num(get('rsiLow')) + ', "RSI oversold level", minval=1, maxval=50)');
    if (has('rsiHigh')) L.push('rsiHigh      = input.float(' + num(get('rsiHigh')) + ', "RSI overbought level", minval=50, maxval=99)');
    if (has('fvgMinAtr')) L.push('fvgMinAtr    = input.float(' + num(get('fvgMinAtr')) + ', "Minimum gap (x ATR)", minval=0.05, step=0.05)');
    if (has('sweepLookback')) L.push('sweepBars    = input.int(' + num(get('sweepLookback')) + ', "Sweep lookback (bars)", minval=3)');
    if (has('onlyTrend')) L.push('useTrend     = input.bool(' + (get('onlyTrend') ? 'true' : 'false') + ', "Only trade with the trend")');
    if (has('trendRef')) L.push('trendRefLen  = input.int(' + num(get('trendRef')) + ', "Trend reference SMA", minval=5)');
    if (has('entryOffset')) L.push('entryOffset  = input.float(' + num(get('entryOffset')) + ', "Entry offset (x ATR)", minval=0.05, step=0.05)');
    if (has('closeOnSessionEnd')) L.push('closeAtEnd   = input.bool(' + (get('closeOnSessionEnd') ? 'true' : 'false') + ', "Flatten at session end")');
    if (has('maxTradesPerDay')) L.push('maxTradesDay = input.int(' + num(get('maxTradesPerDay')) + ', "Max trades per day (0 = off)", minval=0)');
    if (has('slAtr')) L.push('slAtrMult    = input.float(' + num(get('slAtr')) + ', "Stop (x ATR)", minval=0.1, step=0.1)');
    if (has('slPoints')) L.push('slPoints     = input.float(' + num(get('slPoints')) + ', "Stop (points)", minval=1)');
    if (has('swingLookback')) L.push('swingBars    = input.int(' + num(get('swingLookback')) + ', "Swing stop lookback", minval=2)');
    if (has('tpPoints')) L.push('tpPoints     = input.float(' + num(get('tpPoints')) + ', "Target (points)", minval=1)');
    if (has('trailAtr')) L.push('trailAtrMult = input.float(' + num(get('trailAtr')) + ', "Trail (x ATR)", minval=0.1, step=0.1)');
    if (has('trailPoints')) L.push('trailPoints  = input.float(' + num(get('trailPoints')) + ', "Trail (points)", minval=1)');
    if (has('riskPercent')) L.push('riskPct      = input.float(' + num(get('riskPercent')) + ', "Risk per trade (%)", minval=0.01, step=0.1)');
    if (has('fixedLots')) L.push('fixedQty     = input.float(' + num(get('fixedLots')) + ', "Fixed quantity", minval=0.01, step=0.01)');
    if (has('rrTarget')) L.push('rrTarget     = input.float(' + num(get('rrTarget')) + ', "Reward : risk (R)", minval=0.5, step=0.5)');
    L.push('maxOpen      = input.int(' + num(get('maxOpenTrades')) + ', "Max concurrent positions", minval=1)');
    L.push('');
    L.push('// ── Session (wrap-aware) ──────────────────────────────────────────');
    L.push('inSession = sessionStart == sessionEnd ? true : sessionStart < sessionEnd ? (hour >= sessionStart and hour < sessionEnd) : (hour >= sessionStart or hour < sessionEnd)');
    L.push('');
    L.push('// ── Indicators ────────────────────────────────────────────────────');
    L.push('atr        = ta.atr(' + num(get('atrPeriod')) + ')');
    L.push('atrPctNow  = close > 0 ? atr / close * 100 : 0.0');
    if (needsAdx(state)) {
      L.push('[diPlus, diMinus, adxVal] = ta.dmi(14, 14)');
    }
    L.push('');
    L.push('// ── Regime gate (Aspect 2 · ' + get('lens') + ') ──────────────────────────');
    if (state.lens === 'Trend') {
      L.push('regimeOK = adxVal >= minAdx and atrPctNow >= minAtrPct');
    } else if (state.lens === 'Range') {
      L.push('regimeOK = adxVal <= maxAdx');
    } else if (state.lens === 'Volatility') {
      L.push('regimeOK = atrPctNow >= minAtrPct');
    } else {
      L.push('regimeOK = true   // the session window is the regime gate');
    }
    L.push('');
    L.push('// ── Entry mechanic (Aspect 3 · ' + get('family') + ' / ' + get('sub') + ') ─────────');
    mechanicLines(state).forEach(function (l) { L.push(l); });
    L.push('');
    L.push('// ── Filters (Aspect 4 + 5) ────────────────────────────────────────');
    L.push('sessionOK = ' + (act('sessionGate') && get('sessionGate') ? 'inSession' : 'true'));
    if (has('onlyTrend')) {
      L.push('trendSMA  = ta.sma(close, trendRefLen)');
      L.push('trendOK   = not useTrend or ((longSig and close > trendSMA) or (shortSig and close < trendSMA) or (not longSig and not shortSig))');
    } else {
      L.push('trendOK   = true');
    }
    if (has('maxTradesPerDay')) {
      L.push('newDay    = timeframe.change("1D")');
      L.push('var int tradesToday = 0');
      L.push('if newDay');
      L.push('    tradesToday := 0');
    }
    L.push('dayOK     = ' + (act('maxTradesPerDay') ? 'maxTradesDay <= 0 or tradesToday < maxTradesDay' : 'true'));
    L.push('roomOK    = strategy.opentrades < maxOpen');
    L.push('gateOK    = regimeOK and sessionOK and trendOK and dayOK and roomOK');
    L.push('');
    L.push('longSig  := longSig  and gateOK');
    L.push('shortSig := shortSig and gateOK');
    if (get('side') === 'Long only') L.push('shortSig := false');
    if (get('side') === 'Short only') L.push('longSig  := false');
    L.push('');
    L.push('// ── Timing (Aspect 4 · ' + get('confirmation') + ') ───────────────────────────');
    if (get('confirmation') === 'One bar later') {
      L.push('goLong  = longSig  and longSig[1]');
      L.push('goShort = shortSig and shortSig[1]');
    } else {
      L.push('goLong  = longSig');
      L.push('goShort = shortSig');
    }
    L.push('');
    L.push('// ── Levels (Aspect 6 + 7) ─────────────────────────────────────────');
    levelsLines(state).forEach(function (l) { L.push(l); });
    L.push('');
    L.push('// ── Orders ────────────────────────────────────────────────────────');
    L.push('if goLong');
    L.push('    strategy.entry("L", strategy.long, qty=qtyLong' + entryParams(state, 'long') + ', comment="S2EA long")');
    if (act('maxTradesPerDay')) L.push('    tradesToday += 1');
    L.push('if goShort');
    L.push('    strategy.entry("S", strategy.short, qty=qtyShort' + entryParams(state, 'short') + ', comment="S2EA short")');
    if (act('maxTradesPerDay')) L.push('    tradesToday += 1');
    L.push('');
    L.push('// ── Brackets ──────────────────────────────────────────────────────');
    L.push('var int longEntryBar  = na');
    L.push('var int shortEntryBar = na');
    L.push('if strategy.position_size > 0 and strategy.position_size[1] <= 0');
    L.push('    longEntryBar := bar_index');
    L.push('if strategy.position_size < 0 and strategy.position_size[1] >= 0');
    L.push('    shortEntryBar := bar_index');
    var sepGate = act('setSlTp') && get('setSlTp') === 'Separate modify';
    if (sepGate) {
      L.push('longArmed  = not na(longEntryBar)  and bar_index > longEntryBar');
      L.push('shortArmed = not na(shortEntryBar) and bar_index > shortEntryBar');
    } else {
      L.push('longArmed  = true');
      L.push('shortArmed = true');
    }
    L.push('if strategy.position_size > 0 and longArmed');
    L.push('    strategy.exit("XL", from_entry="L", stop=longSL, limit=longTP' + trailParams(state) + ', comment="S2EA exit")');
    L.push('if strategy.position_size < 0 and shortArmed');
    L.push('    strategy.exit("XS", from_entry="S", stop=shortSL, limit=shortTP' + trailParams(state) + ', comment="S2EA exit")');
    if (act('closeOnSessionEnd')) {
      L.push('');
      L.push('// ── Session close-out (Aspect 5) ──────────────────────────────────');
      L.push('if closeAtEnd and not inSession and strategy.position_size != 0');
      L.push('    strategy.close_all(comment="session end")');
    }
    L.push('');
    L.push('// ── Signals ───────────────────────────────────────────────────────');
    L.push('plotshape(goLong  and strategy.position_size == 0, "Long",  shape.triangleup,   location.belowbar, color.new(color.teal, 0), size=size.tiny)');
    L.push('plotshape(goShort and strategy.position_size == 0, "Short", shape.triangledown, location.abovebar, color.new(color.red, 0), size=size.tiny)');
    L.push('');
    if (act('showDashboard') && get('showDashboard')) {
      L.push('// ── Dashboard ─────────────────────────────────────────────────────');
      L.push('if barstate.islast');
      L.push('    var table db = table.new(position.top_right, 2, 6, border_width=1)');
      L.push('    table.cell(db, 0, 0, "Strategy → EA v2", text_color=color.white, text_size=size.small)');
      L.push('    table.cell(db, 1, 0, ' + s(get('sub')) + ', text_color=color.gray, text_size=size.small)');
      L.push('    table.cell(db, 0, 1, "Lens", text_color=color.gray, text_size=size.small)');
      L.push('    table.cell(db, 1, 1, ' + s(get('lens')) + ', text_color=color.white, text_size=size.small)');
      L.push('    table.cell(db, 0, 2, "Open trades", text_color=color.gray, text_size=size.small)');
      L.push('    table.cell(db, 1, 2, str.tostring(strategy.opentrades) + " / " + str.tostring(maxOpen), text_color=color.white, text_size=size.small)');
      L.push('    table.cell(db, 0, 3, "Position", text_color=color.gray, text_size=size.small)');
      L.push('    table.cell(db, 1, 3, str.tostring(strategy.position_size), text_color=color.white, text_size=size.small)');
      L.push('    table.cell(db, 0, 4, "Equity", text_color=color.gray, text_size=size.small)');
      L.push('    table.cell(db, 1, 4, str.tostring(strategy.equity, "#.##"), text_color=color.white, text_size=size.small)');
      L.push('    table.cell(db, 0, 5, "Regime", text_color=color.gray, text_size=size.small)');
      L.push('    table.cell(db, 1, 5, regimeOK ? "active" : "blocked", text_color=color.white, text_size=size.small)');
    }

    return { text: L.join('\n'), consumed: consumed, docOnly: used };
  }

  function needsAdx(state) { return state.lens === 'Trend' || state.lens === 'Range'; }

  function entryParams(state, side) {
    if (!act('orderType') || sel('orderType', 'Market')) return '';
    return ', ' + (sel('orderType', 'Limit') ? 'limit' : 'stop') + '=' + (side === 'long' ? 'entryLong' : 'entryShort');
  }

  function trailParams(state) {
    if (sel('trail', 'Off')) return '';
    var tick = sel('trail', 'ATR trail') ? '(trailAtrMult * atr) / syminfo.mintick' : 'trailPoints';
    return ', trail_points=' + tick + ', trail_offset=' + tick;
  }

  function mechanicLines(state) {
    var atr = 'atr';
    switch (state.sub) {
      case 'Donchian channel': return [
        'donHi = ta.highest(high, lookback)[1]',
        'donLo = ta.lowest(low, lookback)[1]',
        'longSig  = close > donHi',
        'shortSig = close < donLo'
      ];
      case 'Opening range (ORB)': return [
        'var float orHi      = na',
        'var float orLo      = na',
        'var int   orBarsSeen = 0',
        'var bool  orReady    = false',
        'newSess = inSession and not inSession[1]',
        'if newSess',
        '    orHi := high',
        '    orLo := low',
        '    orBarsSeen := 1',
        '    orReady := false',
        'else if inSession',
        '    if orBarsSeen < orbBars',
        '        orHi := math.max(nz(orHi), high)',
        '        orLo := math.min(nz(orLo), low)',
        '        orBarsSeen += 1',
        '    else if not orReady',
        '        orReady := true',
        'longSig  = orReady and close > orHi',
        'shortSig = orReady and close < orLo'
      ];
      case 'EMA cross': return [
        'fastEMA = ta.ema(close, fastLen)',
        'slowEMA = ta.ema(close, slowLen)',
        'longSig  = ta.crossover(fastEMA, slowEMA)',
        'shortSig = ta.crossunder(fastEMA, slowEMA)'
      ];
      case 'MACD': return [
        '[macdLine, macdSignalLine, macdHist] = ta.macd(close, macdFastLen, macdSlowLen, macdSigLen)',
        'longSig  = ta.crossover(macdLine, macdSignalLine)',
        'shortSig = ta.crossunder(macdLine, macdSignalLine)'
      ];
      case 'Bollinger reversion': return [
        'bbBasis = ta.sma(close, lookback)',
        'bbDev   = bandMult * ta.stdev(close, lookback)',
        'bbUpper = bbBasis + bbDev',
        'bbLower = bbBasis - bbDev',
        'longSig  = low <= bbLower and close > bbLower',
        'shortSig = high >= bbUpper and close < bbUpper'
      ];
      case 'RSI reversion': return [
        'rsiVal = ta.rsi(close, rsiLen)',
        'longSig  = rsiVal[1] <= rsiLow  and rsiVal > rsiLow',
        'shortSig = rsiVal[1] >= rsiHigh and rsiVal < rsiHigh'
      ];
      case 'Fair value gap (FVG)': return [
        'gapLow   = high[3]',
        'gapHigh  = low[1]',
        'bullGap  = (gapHigh - gapLow) >= fvgMinAtr * ' + atr,
        'longSig  = bullGap and low <= gapHigh and close >= gapLow',
        'gapTop   = low[3]',
        'gapBot   = high[1]',
        'bearGap  = (gapTop - gapBot) >= fvgMinAtr * ' + atr,
        'shortSig = bearGap and high >= gapBot and close <= gapTop'
      ];
      case 'Liquidity sweep': return [
        'priorLow  = ta.lowest(low, sweepBars)[1]',
        'priorHigh = ta.highest(high, sweepBars)[1]',
        'longSig  = low < priorLow and close > priorLow',
        'shortSig = high > priorHigh and close < priorHigh'
      ];
      default: return ['longSig = false', 'shortSig = false'];
    }
  }

  function levelsLines(state) {
    var L = [];
    var tick = 'syminfo.mintick';
    L.push('slDistLong  = ' + (sel('slMode', 'ATR multiple') ? 'slAtrMult * atr' : sel('slMode', 'Fixed points') ? 'slPoints * ' + tick : 'close - ta.lowest(low, swingBars)[1]'));
    L.push('slDistShort = ' + (sel('slMode', 'ATR multiple') ? 'slAtrMult * atr' : sel('slMode', 'Fixed points') ? 'slPoints * ' + tick : 'ta.highest(high, swingBars)[1] - close'));
    if (act('orderType') && sel('orderType', 'Limit')) {
      L.push('entryLong  = close - entryOffset * atr');
      L.push('entryShort = close + entryOffset * atr');
    } else if (act('orderType') && sel('orderType', 'Stop')) {
      L.push('entryLong  = close + entryOffset * atr');
      L.push('entryShort = close - entryOffset * atr');
    } else {
      L.push('entryLong  = close');
      L.push('entryShort = close');
    }
    L.push('longSL  = entryLong  - slDistLong');
    L.push('shortSL = entryShort + slDistShort');
    L.push('longTP  = ' + (sel('tpMode', 'Fixed points') ? 'entryLong + tpPoints * ' + tick : 'entryLong + rrTarget * slDistLong'));
    L.push('shortTP = ' + (sel('tpMode', 'Fixed points') ? 'entryShort - tpPoints * ' + tick : 'entryShort - rrTarget * slDistShort'));
    L.push('');
    if (sel('riskMode', 'Fixed lots')) {
      L.push('qtyLong  = fixedQty');
      L.push('qtyShort = fixedQty');
    } else {
      L.push('riskMoney     = strategy.equity * riskPct / 100.0');
      L.push('lossPerUnitL  = math.max(slDistLong  / syminfo.mintick * syminfo.pointvalue, 0.0000001)');
      L.push('lossPerUnitS  = math.max(slDistShort / syminfo.mintick * syminfo.pointvalue, 0.0000001)');
      L.push('qtyLong  = riskMoney / lossPerUnitL');
      L.push('qtyShort = riskMoney / lossPerUnitS');
    }
    return L;
  }

  root.GEN_PINE = { build: build, needsAdx: needsAdx };
})(window);
