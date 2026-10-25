/* ─────────────────────────────────────────────────────────────
   Technical Spec generator — the human-readable contract.
   Reads every active field; the coverage check asserts it.
   ───────────────────────────────────────────────────────────── */
(function (root) {
  'use strict';
  var A = root.A;

  function f(v) { return (typeof v === 'number') ? String(v) : String(v); }
  function pct(v) { return f(v) + '%'; }

  function build(state) {
    var consumed = {}, L = [];
    function get(k) { consumed[k] = true; return state[k]; }
    function act(k) { return !!state.__active[k]; }
    function line(s) { L.push(s); }
    function rule(c) { L.push('  ' + c); }
    function blank() { L.push(''); }
    function block(title, rows) {
      blank();
      line(title);
      line('-'.repeat(Math.max(8, title.length)));
      rows.forEach(function (r) { line('  ' + r); });
    }

    line('===================================');
    line('  TECHNICAL SPEC  ·  Strategy → EA v2');
    line('===================================');
    line('Generated ' + new Date().toISOString().slice(0, 10) + '  ·  ' + get('timeframe') + '  ·  ' + get('symbol'));
    line('');
    line('Every setting below is one you selected. Settings that are not');
    line('applicable to your other choices are absent — they are never');
    line('silently ignored, and they never appear in the generated code.');

    /* §1 Overview */
    var overview = [
      'Scope: ' + get('symbol') + ' ' + get('timeframe') + ', session ' + get('sessionStart') + ':00–' + get('sessionEnd') + ':00 server time' + (get('sessionStart') === get('sessionEnd') ? ' (full 24 hours)' : ''),
      'Edge: ' + get('sub') + ' (' + get('family') + ') under a ' + get('lens') + ' market lens',
      'Direction: ' + get('side'),
      'Order type: ' + get('orderType'),
      'Confirmation: ' + get('confirmation')
    ];
    if (act('entryOffset')) overview.push('Entry offset: ' + f(get('entryOffset')) + ' × ATR from the touch price');
    if (act('slippage')) overview.push('Slippage tolerance: ' + f(get('slippage')) + ' points');
    if (act('onlyTrend')) overview.push('Trend alignment: ' + (get('onlyTrend') ? 'required (' + f(get('trendRef')) + '-bar SMA)' : 'not required'));
    block('§1 · Overview', overview);

    /* §2 Market regime */
    var regime = ['Lens: ' + get('lens')];
    if (act('adxMin')) regime.push('ADX floor: ' + f(get('adxMin')) + ' (trade only when ADX ≥ ' + f(get('adxMin')) + ')');
    if (act('adxMax')) regime.push('ADX ceiling: ' + f(get('adxMax')) + ' (trade only when ADX ≤ ' + f(get('adxMax')) + ')');
    if (act('atrPct')) regime.push('Volatility floor: ATR ≥ ' + f(get('atrPct')) + '% of price');
    if (get('lens') === 'Session bias') regime.push('No indicator gate — the session window alone defines the regime.');
    block('§2 · Market regime gate', regime);

    /* §3 Entry mechanic */
    var mech = ['Family: ' + get('family'), 'Mechanic: ' + get('sub')];
    ['lookback', 'orbBars', 'fastMA', 'slowMA', 'macdFast', 'macdSlow', 'macdSignal', 'bandMult', 'rsiPeriod', 'rsiLow', 'rsiHigh', 'fvgMinAtr', 'sweepLookback', 'atrPeriod'].forEach(function (k) {
      if (act(k)) mech.push(root.MODEL.label(k) + ': ' + f(get(k)));
    });
    mech.push('Signal timing: evaluated on closed bars only; the order is ' + (get('confirmation') === 'One bar later' ? 'placed one bar after the condition first holds and still holds' : 'placed as the signal bar closes'));
    block('§3 · Entry mechanic', mech);

    /* §4 Entry execution */
    var ex = [];
    ex.push('Direction: ' + get('side'));
    if (act('orderType')) ex.push('Order type: ' + get('orderType') + (act('entryOffset') ? ' at ' + f(get('entryOffset')) + ' × ATR from the touch price' : ''));
    ex.push('Confirmation: ' + get('confirmation'));
    if (act('onlyTrend')) ex.push('Trend filter: ' + (get('onlyTrend') ? 'ON — longs need close > SMA(' + f(get('trendRef')) + '), shorts need close < SMA(' + f(get('trendRef')) + ')' : 'OFF'));
    if (act('slippage')) ex.push('Max deviation: ' + f(get('slippage')) + ' points (MQL5) / slippage model (Pine)');
    block('§4 · Entry execution', ex);

    /* §5 Filters */
    var fl = [];
    if (act('sessionGate')) fl.push('Session filter: ' + (get('sessionGate') ? 'ON — entries only between ' + f(get('sessionStart')) + ':00 and ' + f(get('sessionEnd')) + ':00' : 'OFF — entries around the clock'));
    if (act('closeOnSessionEnd')) fl.push('Session close-out: ' + (get('closeOnSessionEnd') ? 'ON — flatten when the window closes' : 'OFF'));
    if (act('maxSpread')) fl.push('Max spread: ' + (Number(get('maxSpread')) === 0 ? 'no limit' : f(get('maxSpread')) + ' points'));
    if (act('maxTradesPerDay')) fl.push('Max trades per day: ' + (Number(get('maxTradesPerDay')) === 0 ? 'no limit' : f(get('maxTradesPerDay'))));
    block('§5 · Filters', fl);

    /* §6 Exit logic */
    var xl = ['Stop method: ' + get('slMode')];
    if (act('slAtr')) xl.push('Stop distance: ' + f(get('slAtr')) + ' × ATR(' + f(get('atrPeriod')) + ')');
    if (act('slPoints')) xl.push('Stop distance: ' + f(get('slPoints')) + ' points');
    if (act('swingLookback')) xl.push('Stop distance: beyond the ' + f(get('swingLookback')) + '-bar swing extreme');
    xl.push('Target method: ' + get('tpMode'));
    if (act('tpPoints')) xl.push('Target distance: ' + f(get('tpPoints')) + ' points');
    if (act('rrTarget')) xl.push('Reward : risk = 1 : ' + f(get('rrTarget')) + ' (target = ' + f(get('rrTarget')) + ' × stop distance)');
    xl.push('Trailing stop: ' + get('trail'));
    if (act('trailAtr')) xl.push('Trail distance: ' + f(get('trailAtr')) + ' × ATR(' + f(get('atrPeriod')) + ')');
    if (act('trailPoints')) xl.push('Trail distance: ' + f(get('trailPoints')) + ' points');
    if (get('trail') === 'Off') xl.push('No trailing: the position runs to the stop or the target.');
    block('§6 · Exit logic', xl);

    /* §7 Risk & size */
    var rk = ['Sizing: ' + get('riskMode')];
    if (act('riskPercent')) rk.push('Risk per trade: ' + pct(get('riskPercent')) + ' of account equity');
    if (act('fixedLots')) rk.push('Fixed size: ' + f(get('fixedLots')) + ' lots');
    rk.push('Expected value: R:R 1:' + f(act('rrTarget') ? get('rrTarget') : 'n/a (fixed-point target)') + (act('riskPercent') ? ' risking ' + pct(get('riskPercent')) + ' per trade' : ''));
    block('§7 · Risk & position size', rk);

    /* §8 Risk management */
    var rm = [
      'Daily loss limit: ' + pct(get('maxDailyLoss')) + ' — trading halts for the rest of the day',
      'Max drawdown: ' + pct(get('maxDrawdown')) + ' peak-to-trough on equity — trading halts',
      'Max concurrent positions: ' + f(get('maxOpenTrades'))
    ];
    block('§8 · Account guardrails', rm);

    /* §9 Data & execution */
    var dq = ['Magic number: ' + get('magic')];
    if (act('setSlTp')) dq.push('SL/TP placement: ' + get('setSlTp') + (get('setSlTp') === 'Separate modify' ? ' — the stop and target are attached right after the fill, for ECN/raw-spread accounts' : ' — attached in the order request'));
    if (act('maxRetries')) dq.push('Order retries: ' + f(get('maxRetries')) + ' extra attempt(s)');
    if (act('retryMs')) dq.push('Retry spacing: ' + f(get('retryMs')) + ' ms');
    dq.push('Dashboard: ' + (act('showDashboard') && get('showDashboard') ? 'drawn on the chart' : 'off (no chart objects)'));
    block('§9 · Data & execution', dq);

    /* §10 Validation plan */
    var vp = [
      'Backtest modelling: ' + get('testerMode'),
      'Out-of-sample split: ' + get('walkForward'),
      'Monte-Carlo runs: ' + f(get('monteCarlo')),
      'Minimum trades before trusting the result: ' + f(get('minTrades'))
    ];
    block('§10 · Validation plan', vp);

    /* §11 Pseudocode */
    var ps = [];
    ps.push('on each closed bar:');
    ps.push('    if day changed        -> reset daily counters');
    ps.push('    if equity < peak * (1 - ' + f(get('maxDrawdown')) / 100 + ') -> HALT');
    ps.push('    if daily loss > ' + pct(get('maxDailyLoss')) + ' -> stop for today');
    ps.push('    atr = ATR(' + f(get('atrPeriod')) + ')');
    if (get('lens') === 'Trend') ps.push('    regime = adx >= ' + f(get('adxMin')) + ' and atr/price*100 >= ' + f(get('atrPct')));
    else if (get('lens') === 'Range') ps.push('    regime = adx <= ' + f(get('adxMax')));
    else if (get('lens') === 'Volatility') ps.push('    regime = atr/price*100 >= ' + f(get('atrPct')));
    else ps.push('    regime = true');
    ps.push('    signal = ' + get('sub').toLowerCase() + '(closed bars)');
    if (act('onlyTrend')) ps.push('    trend  = ' + (get('onlyTrend') ? 'close vs SMA(' + f(get('trendRef')) + ')' : 'ignored'));
    if (act('sessionGate')) ps.push('    session = hour in [' + f(get('sessionStart')) + ', ' + f(get('sessionEnd')) + ')' + (get('sessionStart') === get('sessionEnd') ? ' -> always true' : ''));
    if (act('maxTradesPerDay')) {
      var cap = Number(get('maxTradesPerDay'));
      ps.push(cap > 0 ? '    dayCap = tradesToday < ' + f(cap) : '    dayCap = true              // no daily cap set');
    } else {
      ps.push('    dayCap = true');
    }
    ps.push('    if regime and session and trend and dayCap and open < ' + f(get('maxOpenTrades')) + ':');
    ps.push('        entry  = ' + (get('orderType') === 'Market' ? 'market price' : get('orderType').toLowerCase() + ' at ' + f(get('entryOffset')) + '*atr'));
    ps.push('        stop   = ' + (get('slMode') === 'ATR multiple' ? 'entry -/+ ' + f(get('slAtr')) + '*atr' : get('slMode') === 'Fixed points' ? 'entry -/+ ' + f(get('slPoints')) + ' points' : 'swing extreme (' + f(get('swingLookback')) + ' bars)'));
    ps.push('        target = ' + (get('tpMode') === 'Fixed points' ? 'entry +/- ' + f(get('tpPoints')) + ' points' : 'entry +/- ' + f(get('rrTarget')) + '*stopDistance'));
    ps.push('        size   = ' + (get('riskMode') === 'Fixed lots' ? f(get('fixedLots')) + ' lots' : 'equity * ' + f(get('riskPercent')) + '% / stopDistance'));
    if (get('trail') !== 'Off') ps.push('        while open: trail the stop at ' + (get('trail') === 'ATR trail' ? f(get('trailAtr')) + '*atr' : f(get('trailPoints')) + ' points'));
    if (act('closeOnSessionEnd') && get('closeOnSessionEnd')) ps.push('    if session closed -> flatten');
    block('§11 · Execution pseudocode', ps);

    /* §12 Outputs */
    var out = [
      'MQL5 Expert Advisor  — compiles on any MT5 build 3000+, uses CTrade and closed-bar data',
      'Pine Script v6       — a real strategy() so sizing, brackets and risk limits are enforced by TradingView',
      'Technical Spec       — this document'
    ];
    block('§12 · Deliverables', out);

    /* §13 Assumptions */
    var as = [
      'All indicator reads use closed bars (index 1 and older); the forming bar is never used.',
      'ATR period is 14 and ADX period is 14 on the selected timeframe.',
      'ATR-as-%-of-price is the volatility measure, so the filter is comparable across symbols.',
      'Point = SYMBOL_POINT (MQL5) / syminfo.mintick (Pine); 1 lot = 1 contract.',
      'Fills are modelled at the touch price for market orders; pending orders fill at their level.'
    ];
    if (act('maxSpread')) as.push('Spread is read live on MQL5 only; Pine has no spread feed, so the limit is documented there and enforced in the MT5 build.');
    if (act('setSlTp')) as.push('The one-shot / separate choice changes only how the stop reaches the broker, never its level.');
    block('§13 · Assumptions', as);

    /* §14 Acceptance criteria */
    var ac = [
      'The EA attaches without a compile error on a fresh MT5 chart.',
      'The number of trades in the Strategy Tester is at least ' + f(get('minTrades')) + '.',
      'The tester is run with "' + get('testerMode') + '" modelling.',
      'Results are reported in-sample and out-of-sample using the ' + f(get('walkForward')) + ' split.',
      get('walkForward') === 'None' ? 'No out-of-sample split is configured — treat every result as unvalidated.' : 'Out-of-sample performance must not collapse relative to in-sample.',
      'A ' + f(get('monteCarlo')) + '-run Monte-Carlo reshuffle keeps the drawdown inside ' + pct(get('maxDrawdown')) + '.',
      'No trade is opened outside the session, above the spread limit, or beyond the daily or drawdown guardrails.'
    ];
    block('§14 · Acceptance criteria', ac);

    /* §15 What this spec does NOT include */
    block('§15 · Out of scope', [
      'No news or economic-calendar filter — neither MT5 nor TradingView can supply one without an external feed.',
      'No walk-forward or Monte-Carlo engine — those run outside the generated code, using the settings in §10.',
      'No broker-side order expiry on pending orders; a new signal replaces the pending order instead.'
    ]);

    /* §16 Change log */
    block('§16 · Change log', [
      'v1 · initial spec',
      'v2 · dependency engine (in-aspect and cross-aspect conflicts), every option wired into all three outputs, validation plan added'
    ]);

    return { text: L.join('\n'), consumed: consumed };
  }

  root.GEN_SPEC = { build: build };
})(window);
