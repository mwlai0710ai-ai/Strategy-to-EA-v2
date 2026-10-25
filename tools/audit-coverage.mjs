import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const D = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'app') + '/';
globalThis.window = globalThis;
for (const f of ['model.js','engine.js','gen-spec.js','gen-mql.js','gen-pine.js']) eval(readFileSync(D+f,'utf8'));
const {SEA,MODEL,ENGINE,GEN_SPEC,GEN_MQL,GEN_PINE}=globalThis;

const keys = MODEL.fieldList();
function fresh(){ const s={}; keys.forEach(k=>s[k]=MODEL.FIELD_DEFS[k].def); return s; }
function opts(k){ const f=MODEL.FIELD_DEFS[k]; return (f.kind==='select')?f.options.slice():null; }

const report={coverageGaps:[],inactiveLeak:[],invalid:[]};
let n=0;

function check(state,label){
  const s=structuredClone(state);
  ENGINE.resolve(s); n++;
  const active=keys.filter(k=>s.__active[k]);
  const gens={spec:GEN_SPEC.build(s),mql:GEN_MQL.build(s),pine:GEN_PINE.build(s)};
  for(const g of ['spec','mql','pine'])
    for(const k of active) if(!gens[g].consumed[k] && report.coverageGaps.length<12)
      report.coverageGaps.push(`${label} → ${g} missing ${k}`);

  // invariant: no inactive field's distinctive value leaks into an output
  for(const k of keys){
    if(s.__active[k]) continue;
    const o=opts(k); if(!o) continue;
    if(o.indexOf(s[k])<0) continue;   // value not one of the labels
    for(const g of ['spec','mql','pine']){
      const txt=gens[g].text;
      const needle = k==='lens'? s[k]+' lens' : null;
      const probe = needle || s[k];
      if(k==='sub' && (s.sub==='MACD'||s.sub==='Trend')) continue; // ambiguous words
      if(txt.includes(probe) && report.inactiveLeak.length<12)
        report.inactiveLeak.push(`${label} → ${g} leaks inactive ${k}="${probe}"`);
    }
  }

  // invariant: no contradiction survives resolution
  const bad=[];
  const F=MODEL.FIELD_DEFS;
  if(s.__active.onlyTrend && s.lens==='Range') bad.push('onlyTrend active under Range lens');
  if(s.__active.family && SEA.FAMILY_BY_LENS[s.lens].indexOf(s.family)<0) bad.push('family '+s.family+' under '+s.lens);
  if(SEA.FAMILY_MECHANICS[s.family].indexOf(s.sub)<0) bad.push('sub '+s.sub+' not in '+s.family);
  if(s.__active.rrTarget && s.tpMode!=='Risk multiple (R)') bad.push('rrTarget active with tpMode '+s.tpMode);
  if(!s.__active.rrTarget && s.tpMode==='Risk multiple (R)') bad.push('rrTarget inactive but tpMode is R');
  if(s.__active.slAtr && s.slMode!=='ATR multiple') bad.push('slAtr active');
  if(s.__active.slPoints && s.slMode!=='Fixed points') bad.push('slPoints active');
  if(s.__active.swingLookback && s.slMode!=='Swing structure') bad.push('swingLookback active');
  if(s.__active.tpPoints && s.tpMode!=='Fixed points') bad.push('tpPoints active');
  if(s.__active.entryOffset && s.orderType==='Market') bad.push('entryOffset active on Market');
  if(s.__active.closeOnSessionEnd && !s.sessionGate) bad.push('closeOnSessionEnd active w/o session');
  if(s.__active.sessionStart && !s.sessionGate) bad.push('sessionStart active w/o session');
  if(s.__active.retryMs && Number(s.maxRetries)===0) bad.push('retryMs active with 0 retries');
  if(s.__active.riskPercent && s.riskMode!=='Risk-based %') bad.push('riskPercent active');
  if(s.__active.fixedLots && s.riskMode!=='Fixed lots') bad.push('fixedLots active');
  if(s.__active.trailAtr && s.trail!=='ATR trail') bad.push('trailAtr active');
  if(s.__active.trailPoints && s.trail!=='Points trail') bad.push('trailPoints active');
  if(s.__active.lookback && !(s.sub==='Donchian channel'||s.sub==='Bollinger reversion')) bad.push('lookback active');
  if(s.__active.fastMA && s.sub!=='EMA cross') bad.push('fastMA active');
  if(s.__active.orbBars && s.sub!=='Opening range (ORB)') bad.push('orbBars active');
  if(s.__active.macdFast && s.sub!=='MACD') bad.push('macdFast active');
  if(s.__active.bandMult && s.sub!=='Bollinger reversion') bad.push('bandMult active');
  if(s.__active.rsiPeriod && s.sub!=='RSI reversion') bad.push('rsiPeriod active');
  if(s.__active.fvgMinAtr && s.sub!=='Fair value gap (FVG)') bad.push('fvgMinAtr active');
  if(s.__active.sweepLookback && s.sub!=='Liquidity sweep') bad.push('sweepLookback active');
  if(s.__active.adxMin && s.lens!=='Trend') bad.push('adxMin active');
  if(s.__active.adxMax && s.lens!=='Range') bad.push('adxMax active');
  if(s.__active.atrPct && !(s.lens==='Trend'||s.lens==='Volatility')) bad.push('atrPct active');
  if(s.__active.trendRef && !(s.lens!=='Range' && s.onlyTrend===true)) bad.push('trendRef active');
  if(s.lens==='Session bias' && !s.sessionGate) bad.push('Session-bias lens w/o session');
  if(bad.length && report.invalid.length<12) report.invalid.push(`${label} → ${bad.join('; ')}`);

  // structural sanity of generated code
  for(const g of ['mql','pine']){
    const t=gens[g].text;
    if(/undefined|NaN|\[object Object\]/.test(t) && report.invalid.length<12)
      report.invalid.push(`${label} → ${g} contains undefined/NaN/[object Object]`);
  }
  return gens;
}

// exhaustive sweep over the branching fields
const LENS=['Trend','Range','Volatility','Session bias'];
const FAM=['Breakout','Momentum','Mean Reversion','SMC / ICT'];
const SL=['ATR multiple','Fixed points','Swing structure'];
const TP=['Risk multiple (R)','Fixed points'];
const TR=['Off','ATR trail','Points trail'];
const OT=['Market','Limit','Stop'];
const RM=['Risk-based %','Fixed lots'];
const ST=['Attached with order','Separate modify'];
const SG=[true,false];
let count=0;
for(const lens of LENS) for(const family of FAM) for(const slMode of SL) for(const tpMode of TP)
for(const trail of TR) for(const orderType of OT) for(const riskMode of RM) for(const setSlTp of ST)
for(const sessionGate of SG) for(const onlyTrend of [true,false]){
  const s=fresh();
  Object.assign(s,{lens,family,slMode,tpMode,trail,orderType,riskMode,setSlTp,sessionGate,onlyTrend,
                   sub:SEA.FAMILY_MECHANICS[family][0], maxTradesPerDay:5, maxRetries:2});
  check(s,`${lens}|${family}|${slMode}|${tpMode}|${trail}|${orderType}|${riskMode}|${setSlTp}|sg=${sessionGate}|ot=${onlyTrend}`);
  count++;
}
// every mechanic explicitly, plus maxRetries=0
for(const family of FAM) for(const sub of SEA.FAMILY_MECHANICS[family]) for(const lens of SEA.FAMILY_BY_LENS && LENS){
  const s=fresh(); Object.assign(s,{lens,family,sub,maxRetries:0,sessionGate:false});
  check(s,`mech ${family}/${sub}/${lens} retries=0`); count++;
}
console.log('configurations checked:',count);
console.log('\ncoverage gaps:', report.coverageGaps.length?report.coverageGaps:'NONE');
console.log('\ninactive leaks:', report.inactiveLeak.length?report.inactiveLeak:'NONE');
console.log('\ncontradictions / code defects:', report.invalid.length?report.invalid:'NONE');
