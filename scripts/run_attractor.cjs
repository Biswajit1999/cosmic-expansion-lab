/* Reproduce a browser-exported state without a browser. */
'use strict';
const fs=require('node:fs');
const M=require('../web/attractor-model.js');
const [inputPath,outputPath]=process.argv.slice(2);
if(!inputPath||!outputPath){console.error('Usage: node scripts/run_attractor.cjs downloaded-state.json reproduced.json');process.exit(1);}
const input=JSON.parse(fs.readFileSync(inputPath,'utf8'));
if(input.model_version!==M.VERSION||input.schema!=='cosmic-expansion-attractor/snapshot-v1')throw new Error('Unsupported model/schema; use the version that produced this state.');
if(!Number.isFinite(input.time_gyr)||input.time_gyr<0||input.time_gyr>M.END+1e-9)throw new Error('Time must be in [0,6] Gyr.');
const c=M.config(input.parameters);
for(const key of Object.keys(c))if(c[key]!==input.parameters[key])throw new Error('Invalid parameter '+key);
const steps=Math.round(input.time_gyr/M.STEP);
if(Math.abs(steps*M.STEP-input.time_gyr)>1e-8)throw new Error('Time is not an integration-step boundary.');
const s=M.create(c);for(let i=0;i<steps;i++)M.step(s);
fs.writeFileSync(outputPath,JSON.stringify({...input,reproduced_with:'scripts/run_attractor.cjs',time_gyr:s.t,scale_factor:s.a,particles:M.rows(s)},null,2)+'\n',{flag:'wx'});
console.log(`Reproduced ${s.p.length/6} particles at ${s.t.toFixed(2)} Gyr using model ${M.VERSION}.`);
