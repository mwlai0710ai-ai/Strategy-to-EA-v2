import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');


var MECH_DESC = {
  'Donchian channel':    'Buy the break of the highest high over N bars, sell the break of the lowest low.',
  'Opening range (ORB)': 'Mark the high and low of the first N bars of the session, then trade the break of that range.',
  'EMA cross':           'Buy when the fast EMA crosses above the slow EMA, sell on the cross back below.',
  'MACD':                'Buy when the MACD line crosses above its signal line, sell on the cross below.',
  'Bollinger reversion': 'Buy a close back inside the lower band, sell a close back inside the upper band.',
  'RSI reversion':       'Buy when RSI crosses back up through the oversold level, sell when it crosses down through the overbought level.',
  'Fair value gap (FVG)':'Find a three-bar imbalance at least N × ATR wide, then trade the retest of the gap.',
  'Liquidity sweep':     'Find a bar that takes out the N-bar extreme and closes back inside, then trade the reversal.'
};

var CAUTION_TABLE = [
  ['Daily loss limit ≥ drawdown halt', 'The daily limit can never be the one that fires first — the drawdown halt always trips earlier.'],
  ['Risk % × max positions > 5%', 'Reports the total simultaneous exposure, e.g. 1% × 3 positions = 3% of the account at risk at once.'],
  ['Risk per trade > 3%', 'Quantifies the five-loss streak cost, e.g. 4% per trade costs 18.5% of the account over five losses.'],
  ['1-minute OHLC modelling on an M1/M5 chart', 'That model builds higher timeframes from M1 bars, so it cannot resolve the bars your stop sits inside.'],
  ['No walk-forward split', 'Nothing out-of-sample validates the result, so an optimised backtest is unfalsifiable.'],
  ['Stop-entry pending order + swing-structure stop', 'After a gap the swing stop can land on the wrong side of the pending entry level.'],
  ['Entry offset > 2 × ATR', 'Most signals will never be filled — the live trade count will fall far short of the backtest.'],
  ['M1 timeframe', 'M1 entries are dominated by spread and latency, so the backtest flatters the live result.'],
  ['Max spread = 0', 'No spread limit is set, so entries can fill at poor prices on a wide-spread symbol.'],
  ['Trail distance > stop distance', 'The trail starts wider than the initial stop, so it can only loosen the stop until price runs past it.'],
  ['Session start = end', 'The window is treated as the full 24 hours.'],
  ['Minimum trades > 300', 'Demanding that many trades usually forces a shorter timeframe or a looser filter, both of which degrade edge quality.'],
  ['Max drawdown ≥ 40%', 'A halt that lets the account lose 40% before stopping; most funded-account rules cap total drawdown at 10%.']
];

const D = join(ROOT, 'public', 'app') + '/';
globalThis.window = globalThis;
for (const f of ['model.js', 'engine.js', 'gen-spec.js', 'gen-mql.js', 'gen-pine.js']) eval(readFileSync(D + f, 'utf8'));
const { SEA, MODEL, ENGINE } = globalThis;

const F = MODEL.FIELD_DEFS;
const keys = MODEL.fieldList();
const base = () => { const s = {}; keys.forEach((k) => (s[k] = F[k].def)); return s; };

const land = { logic: 'logic', doc: 'documented' };

function show(k) {
  const f = F[k];
  if (f.kind === 'select') return f.options.map((o) => (o === f.def ? '**' + o + '**' : o)).join(' · ');
  if (f.kind === 'toggle') return '**' + (f.def ? f.on || 'On' : f.off || 'Off') + '** / ' + (f.def ? f.off || 'Off' : f.on || 'On');
  if (f.kind === 'range') return f.min + ' – ' + f.max + ' (default **' + f.def + '**)';
  return 'free text (default **' + f.def + '**)';
}

function applies(k) {
  const a = F[k].applies;
  if (!a) return 'always in play';
  return 'only when ' + a.why.replace(/^the /, 'the ').replace(/\.$/, '');
}

function where(k) {
  const l = F[k].land || {};
  const bits = [];
  bits.push(l.mql ? 'MQL5 ' + land[l.mql] : 'MQL5 —');
  bits.push(l.pine ? 'Pine ' + land[l.pine] : 'Pine —');
  return bits.join(' · ');
}

const L = [];
const p = (s) => L.push(s);

p('# Strategy → EA v2 — User Manual');
p('');
p('**Turns one trading idea into three artifacts that agree with each other:** a Technical Spec, a');
p('compilable MQL5 Expert Advisor for MetaTrader 5, and a Pine Script v6 `strategy()` for TradingView.');
p('');
p('The framework enforces four guarantees:');
p('');
p('1. **No contradictory options inside an aspect** — a field that a sibling option makes meaningless is');
p('   greyed out and left out of every output.');
p('2. **No contradictory options across aspects** — the market lens restricts which strategy families make');
p('   sense, the family restricts the mechanic, and so on. Ruled-out options stay visible with the reason.');
p('3. **Every setting you select reaches all three outputs** — the coverage panel proves it, field by field.');
p('4. **The rule that fired is always shown** — when the tool adjusts something for you, the Report says');
p('   which rule did it and why.');
p('');
p('---');
p('');
p('## How the constraint engine works');
p('');
p('Two mechanisms, both visible in the UI:');
p('');
p('**Field applicability.** A field is either *in play* or *out of play*. Out-of-play fields are greyed');
p('with the reason, and they are never written into the spec or either script. `Stop distance (points)`');
p('only exists when the stop-loss mode is *Fixed points*.');
p('');
p('**Option availability.** Inside a field, individual options can be ruled out by earlier choices. They');
p('stay on screen, struck through, with the reason. With the **Range** lens selected, *Breakout* and');
p('*Momentum* are ruled out because a range has no expansion to follow.');
p('');
p('When a change makes your current selection illegal, the engine moves it to the nearest legal value and');
p('records the adjustment in the Report — it never silently rewrites your choice.');
p('');
p('---');
p('');
p('## The ten aspects');
p('');
p('| # | Aspect | Question |');
p('|---|---|---|');
for (const a of SEA.ASPECTS) p('| ' + a.id + ' | **' + a.name + '** | ' + a.q + ' |');
p('');

for (const a of SEA.ASPECTS) {
  p('### ' + a.id + ' · ' + a.name);
  p('');
  p('*' + a.q + '*');
  p('');
  p(a.tip);
  p('');
  p('| Setting | Options / range | In play | Lands in |');
  p('|---|---|---|---|');
  for (const k of a.keys) {
    p('| ' + F[k].label + ' | ' + show(k) + ' | ' + applies(k) + ' | ' + where(k) + ' |');
  }
  p('');
}

p('---');
p('');
p('## What the lens does to the family');
p('');
p('The market lens is not a label — it compiles into the regime gate, and it decides which strategy');
p('families are coherent:');
p('');
p('| Lens | Regime gate | Families allowed |');
p('|---|---|---|');
const gate = {
  'Trend': 'ADX ≥ ADX minimum **and** ATR ≥ volatility floor',
  'Range': 'ADX ≤ ADX maximum',
  'Volatility': 'ATR ≥ volatility floor',
  'Session bias': 'the session window itself',
};
for (const l of Object.keys(SEA.FAMILY_BY_LENS)) {
  p('| **' + l + '** | ' + gate[l] + ' | ' + SEA.FAMILY_BY_LENS[l].join(', ') + ' |');
}
p('');
p('Each family offers two mechanics, and each mechanic emits different code:');
p('');
p('| Family | Mechanic | What it trades |');
p('|---|---|---|');
for (const fam of Object.keys(SEA.FAMILY_MECHANICS)) {
  for (const m of SEA.FAMILY_MECHANICS[fam]) p('| ' + fam + ' | ' + m + ' | ' + (MECH_DESC[m] || '') + ' |');
}
p('');
p('---');
p('');
p('## Where each setting lands');
p('');
p('Pine Script v6 is generated as a real `strategy()`, so it is a peer of the EA rather than a drawing');
p('aid. Trailing stops become `trail_points` / `trail_offset`, the kill switches become');
p('`strategy.risk.max_intraday_loss` and `strategy.risk.max_drawdown`, pending orders become');
p('`strategy.entry(limit=…)` / `strategy.entry(stop=…)`, and position size is derived from');
p('`syminfo.pointvalue`.');
p('');
p('Three settings have no Pine equivalent. Rather than drop them silently, they are written into the');
p('Pine script header and marked **documented** in the settings panel:');
p('');
p('| Setting | Why it cannot be code in Pine |');
p('|---|---|');
p('| Magic number | TradingView strategies have no order-tag concept |');
p('| Max spread | Pine has no live spread feed; the value is modelled by `slippage` |');
p('| Aspect 10 validation plan | No script can set a tester\'s modelling mode or run count |');
p('');
p('---');
p('');
p('## Cautions');
p('');
p('A caution is a combination that is legal but usually a mistake. It never blocks you — it states the');
p('consequence and offers a one-click fix where one exists.');
p('');
p('| Fires when | What it says |');
p('|---|---|');
CAUTION_TABLE.forEach(function (r) { p('| ' + r[0] + ' | ' + r[1] + ' |'); });
p('');
p('---');
p('');
p('## Using the generated code');
p('');
p('### MQL5 Expert Advisor');
p('');
p('1. MetaEditor → **File ▸ New ▸ Expert Advisor**, name it, and paste the generated source over the template.');
p('2. Press **F7** to compile.');
p('3. Drag the EA onto an MT5 chart, tick **Allow Algo Trading**, and confirm the symbol and timeframe match');
p('   the header comment.');
p('');
p('The EA reads closed bars only, so a freshly attached EA waits for the next bar before it can act.');
p('');
p('### Pine Script v6');
p('');
p('1. TradingView → **Pine Editor ▸ Open ▸ New strategy**.');
p('2. Paste the generated source and press **Save**, then **Add to chart**.');
p('3. Open the **Strategy Tester** tab to see the backtest.');
p('');
p('---');
p('');
p('## Known limitations');
p('');
p('- The EA and the Pine strategy are reference implementations of the same logic, not byte-equivalent.');
p('- Aspect 10 is a plan, not code. It is written into the spec and both script headers and labelled');
p('  *documented* in the settings panel.');
p('- One symbol, one timeframe, one session per run. Run the tool again for another combination.');
p('- The EA cancels its own pending orders when a new signal arrives instead of expiring them on a timer.');
p('- No walk-forward or Monte-Carlo engine is generated; those run outside the script.');
p('');
p('---');
p('');
p('*Generated by Zo · Strategy → EA v2 workflow · ' + new Date().toISOString().slice(0, 10) + '*');
p('');

writeFileSync(join(ROOT, 'Strategy-to-EA-V2-User-Manual.md'), L.join('\n'));
console.log('wrote Strategy-to-EA-V2-User-Manual.md (' + L.length + ' lines)');
