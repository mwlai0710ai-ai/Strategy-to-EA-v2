import fs from 'fs';
const APP='/home/workspace/Finance Experiment/strategy-to-ea-v1/public/app';
global.window=global;
for(const f of ['model.js','engine.js','gen-spec.js','gen-mql.js','gen-pine.js'])
  (0,eval)(fs.readFileSync(`${APP}/${f}`,'utf8'));
const {MODEL,ENGINE,GEN_SPEC,GEN_MQL,GEN_PINE}=global;
function st(over){const s={};MODEL.fieldList().forEach(k=>s[k]=MODEL.FIELD_DEFS[k].def);Object.assign(s,over||{});ENGINE.resolve(s);return s;}
const which=process.argv[2]||'spec';
const cfg=JSON.parse(process.argv[3]||'{}');
const s=st(cfg);
const g={spec:GEN_SPEC,mql:GEN_MQL,pine:GEN_PINE}[which].build(s);
console.log(g.text);
console.error('--- active:',MODEL.fieldList().filter(k=>s.__active[k]).length,'consumed:',Object.keys(g.consumed).length);
