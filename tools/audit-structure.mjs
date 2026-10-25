import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const D = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'app') + '/';
globalThis.window = globalThis;
for (const f of ['model.js','engine.js','gen-spec.js','gen-mql.js','gen-pine.js']) eval(readFileSync(D+f,'utf8'));
const {SEA,MODEL,ENGINE,GEN_MQL,GEN_PINE,GEN_SPEC}=globalThis;
const keys=MODEL.fieldList();
const fresh=()=>{const s={};keys.forEach(k=>s[k]=MODEL.FIELD_DEFS[k].def);return s;};

function stripMql(t){ return t.replace(/\/\/[^\n]*/g,'').replace(/"(?:[^"\\]|\\.)*"/g,'""').replace(/'(?:[^'\\]|\\.)*'/g,"''"); }
function stripPine(t){ return t.split('\n').filter(l=>!/^\s*\/\//.test(l)).join('\n').replace(/"(?:[^"\\]|\\.)*"/g,'""').replace(/'(?:[^'\\]|\\.)*'/g,"''"); }

function mqlCheck(text){
  const c=stripMql(text);
  const bal=(c.match(/\{/g)||[]).length-(c.match(/\}/g)||[]).length;
  const paren=(c.match(/\(/g)||[]).length-(c.match(/\)/g)||[]).length;
  const decl=new Set([...text.matchAll(/^\s*input\s+\S+\s+(\w+)\s*=/gm)].map(m=>m[1]));
  const used=[...new Set([...c.matchAll(/\b(Inp_\w+)\b/g)].map(m=>m[1]))];
  const defs=new Set([...text.matchAll(/^#define\s+(\w+)/gm)].map(m=>m[1]));
  const cfg=[...new Set([...c.matchAll(/\b(CFG_\w+)\b/g)].map(m=>m[1]))];
  return {bal,paren,
    undeclared:used.filter(u=>!decl.has(u)),
    undefMacro:cfg.filter(u=>!defs.has(u)),
    unusedInputs:[...decl].filter(d=>!used.includes(d))};
}
function pineCheck(text){
  const c=stripPine(text);
  // every lowercase identifier assigned by input. must be declared before first use
  const inputs=[...c.matchAll(/^(\w+)\s*=\s*input\./gm)].map(m=>m[1]);
  const lines=c.split('\n');
  const firstUse={};
  lines.forEach((l,i)=>{ for(const v of inputs){ const re=new RegExp('\\b'+v+'\\b'); if(re.test(l)&&firstUse[v]===undefined&&!/=\s*input\./.test(l)) firstUse[v]=i; } });
  const declaredAt={};
  lines.forEach((l,i)=>{ const m=l.match(/^(\w+)\s*=\s*input\./); if(m) declaredAt[m[1]]=i; });
  const useBefore=[];
  for(const v of inputs) if(firstUse[v]!==undefined && firstUse[v]<declaredAt[v]) useBefore.push(v);
  const unused=inputs.filter(v=>{const re=new RegExp('\\b'+v+'\\b','g');return (c.match(re)||[]).length<2;});
  // bracket balance
  const bal=(c.match(/\(/g)||[]).length-(c.match(/\)/g)||[]).length;
  return {useBefore,unused,bal};
}

let probs=[],pineProbs=[],n=0;
for(const lens of ['Trend','Range','Volatility','Session bias'])
for(const family of SEA.FAMILY_BY_LENS[lens])
for(const sub of SEA.FAMILY_MECHANICS[family])
for(const slMode of ['ATR multiple','Fixed points','Swing structure'])
for(const tpMode of ['Risk multiple (R)','Fixed points'])
for(const trail of ['Off','ATR trail','Points trail'])
for(const orderType of ['Market','Limit','Stop'])
for(const riskMode of ['Risk-based %','Fixed lots'])
for(const setSlTp of ['Attached with order','Separate modify'])
for(const sessionGate of [true,false]){
  const s=fresh(); Object.assign(s,{lens,family,sub,slMode,tpMode,trail,orderType,riskMode,setSlTp,sessionGate,maxTradesPerDay:5,onlyTrend:true,maxRetries:2,showDashboard:true,confirmation:'One bar later'});
  ENGINE.resolve(s); n++;
  const m=mqlCheck(GEN_MQL.build(s).text);
  const label=`${lens}/${family}/${sub}/${slMode}/${tpMode}/${trail}/${orderType}/${riskMode}/${setSlTp}/sg=${sessionGate}`;
  if(m.bal!==0) probs.push(`${label}: brace imbalance ${m.bal}`);
  if(m.paren!==0) probs.push(`${label}: paren imbalance ${m.paren}`);
  if(m.undeclared.length) probs.push(`${label}: undeclared input ${m.undeclared}`);
  if(m.undefMacro.length) probs.push(`${label}: undefined #define ${m.undefMacro}`);
  if(m.unusedInputs.length) probs.push(`${label}: declared but never used ${m.unusedInputs}`);
  const p=pineCheck(GEN_PINE.build(s).text);
  if(p.bal!==0) pineProbs.push(`${label}: paren imbalance ${p.bal}`);
  if(p.useBefore.length) pineProbs.push(`${label}: used before declaration ${p.useBefore}`);
  if(p.unused.length) pineProbs.push(`${label}: declared but unused ${p.unused}`);
}
const uniq=a=>[...new Set(a)];
console.log('scenarios:',n);
console.log('\nMQL problems:', uniq(probs).length?uniq(probs).slice(0,12):'NONE');
console.log('\nPine problems:', uniq(pineProbs).length?uniq(pineProbs).slice(0,12):'NONE');
