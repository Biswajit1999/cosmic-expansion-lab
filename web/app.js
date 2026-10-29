'use strict';
const $ = id => document.getElementById(id);
const C = 299792.458;
const state = {rows:[], plotted:[], results:null, panel:'expansion', page:0, selected:null, playing:false, last:0, frame:0};
const format = (n, digits=2) => Number(n).toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
function canvas(id) {
  const el=$(id), rect=el.getBoundingClientRect(), ratio=Math.min(devicePixelRatio||1,2);
  el.width=Math.max(1,Math.round(rect.width*ratio)); el.height=Math.max(1,Math.round(rect.height*ratio));
  const ctx=el.getContext('2d'); ctx.scale(ratio,ratio); return {el,ctx,w:rect.width,h:rect.height};
}
function age(a, matter=.315) {return matter===1 ? 2/3*977.79222168/67.4*a**1.5 : 2*977.79222168/(3*67.4*Math.sqrt(1-matter))*Math.asinh(Math.sqrt((1-matter)/matter)*a**1.5);}
function scaleFromAge(t, matter=.315) {return matter===1 ? (t*3*67.4/(2*977.79222168))**(2/3) : (Math.sinh(t*3*67.4*Math.sqrt(1-matter)/(2*977.79222168))*Math.sqrt(matter/(1-matter)))**(2/3);}
function mu(z,h0,om,zhel=z) {
  // Independent Simpson integration for the interactive preview; Python uses Gaussian quadrature.
  const n=96, step=z/n; let sum=0;
  for(let i=0;i<=n;i++)sum+=(i===0||i===n?1:i%2?4:2)/Math.sqrt(om*(1+i*step)**3+1-om);
  return 5*Math.log10(C/h0*(1+zhel)*sum*step/3)+25;
}
function stop() {state.playing=false; cancelAnimationFrame(state.frame); $('play').textContent='Play expansion ▶';}
function drawUniverse() {
  const {ctx,w,h}=canvas('universe'); if(!w)return;
  const a=+$('scale').value, matter=$('matter-only').checked?1:.315;
  const obs=+$('observer').value, centers=[[0,0],[1.35,-.7],[-1.1,1.1]], origin=centers[obs];
  $('scale-output').textContent=format(a)+' × today'; $('scale-badge').textContent='a = '+format(a);
  $('age').textContent=format(age(a,matter),1); $('hubble').textContent=format(67.4*Math.sqrt(matter/a**3+1-matter),1);
  ctx.clearRect(0,0,w,h);const unit=Math.min(w,h)*.22, cx=w/2,cy=h/2;
  // The field extends beyond the viewport: its border is not a cosmic edge.
  const spacing=unit*a;
  ctx.strokeStyle='#28404a';ctx.lineWidth=.7;
  for(let i=-20;i<=20;i++){
    const x=cx+(i-origin[0])*spacing,y=cy+(i-origin[1])*spacing;
    ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
  }
  for(let i=0;i<250;i++){
    const gx=((Math.sin(i*127.1+2)*43758.5453)%1)*12,gy=((Math.sin(i*311.7+3)*14378.89)%1)*12;
    const x=cx+(gx-origin[0])*spacing,y=cy+(gy-origin[1])*spacing;
    if(x<0||x>w||y<0||y>h)continue;
    ctx.save();ctx.translate(x,y);ctx.rotate(i*2.4);
    const glow=ctx.createRadialGradient(0,0,0,0,0,9);glow.addColorStop(0,'#9fc1c577');glow.addColorStop(1,'#9fc1c500');
    ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(0,0,10,5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=i%3?'#b4d4cf':'#edbb90';ctx.beginPath();ctx.ellipse(0,0,2.6,1,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  centers.forEach(([x,y],i)=>{
    const px=cx+(x-origin[0])*spacing,py=cy+(y-origin[1])*spacing;
    if(i!==obs){ctx.setLineDash([3,6]);ctx.strokeStyle='#779f9666';ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,py);ctx.stroke();ctx.setLineDash([]);}
    ctx.strokeStyle=i===obs?'#efba8b':'#94c6bd';ctx.beginPath();ctx.arc(px,py,i===obs?17:10,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=i===obs?'#efba8b':'#b6d6cf';ctx.beginPath();ctx.arc(px,py,3,0,Math.PI*2);ctx.fill();
    ctx.font='10px Arial';ctx.fillText(i===obs?'YOU ARE HERE · '+String.fromCharCode(65+i):'GALAXY '+String.fromCharCode(65+i),px+22,py+4);
  });
}
function tick(time){if(!state.playing)return;const dt=Math.min((time-state.last)/1000,.1);state.last=time;const matter=$('matter-only').checked?1:.315;let a=scaleFromAge(age(+$('scale').value,matter)+dt*.8,matter);if(a>=2){a=2;stop();}$('scale').value=a;drawUniverse();if(state.playing)state.frame=requestAnimationFrame(tick);}
$('play').addEventListener('click',()=>{if(state.playing){stop();return;}if(+$('scale').value>=1.99)$('scale').value=.25;state.playing=true;state.last=performance.now();$('play').textContent='Pause expansion Ⅱ';state.frame=requestAnimationFrame(tick);});
$('scale').addEventListener('input',()=>{stop();drawUniverse();});
$('today').addEventListener('click',()=>{stop();$('scale').value=1;drawUniverse();});
['observer','matter-only'].forEach(id=>$(id).addEventListener('change',drawUniverse));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches)stop();});
function switchTab(button){stop();state.panel=button.dataset.panel;document.querySelectorAll('[role=tab]').forEach(tab=>{const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;$(tab.getAttribute('aria-controls')).hidden=!active;});drawActive();}
const tabs=[...document.querySelectorAll('[role=tab]')];tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>switchTab(tab));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();tabs[next].focus();switchTab(tabs[next]);}});});
function drawPlot(){
  if(!state.results)return;const {ctx,w,h}=canvas('hubble-plot');if(!w)return;
  const left=62,right=22,top=23,bottom=55,pw=w-left-right,ph=h-top-bottom;
  const h0=+$('h0').value,om=+$('omega').value,residual=$('residuals').checked;
  $('h0-output').textContent=format(h0,1);$('omega-output').textContent=format(om,3);
  const low=residual?-1.5:32,high=residual?1.5:47.5;
  const x=z=>left+(Math.log10(z)+2)/Math.log10(250)*pw, y=m=>top+(high-m)/(high-low)*ph;
  ctx.font='10px Arial';ctx.fillStyle='#a4bfc4';ctx.strokeStyle='#2a424b';ctx.lineWidth=.6;
  [.01,.03,.1,.3,1,2].forEach(z=>{ctx.beginPath();ctx.moveTo(x(z),top);ctx.lineTo(x(z),top+ph);ctx.stroke();ctx.fillText(String(z),x(z)-9,h-29);});
  (residual?[-1.5,-1,-.5,0,.5,1,1.5]:[32,35,38,41,44,47]).forEach(m=>{ctx.beginPath();ctx.moveTo(left,y(m));ctx.lineTo(w-right,y(m));ctx.stroke();ctx.fillText(String(m),left-30,y(m)+4);});
  ctx.fillText('Flow-corrected redshift zHD (log scale)',Math.max(left,w/2-90),h-7);
  ctx.save();ctx.translate(15,h/2);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.fillText(residual?'μ observed − μ model (mag)':'Distance modulus μ (mag)',0,0);ctx.restore();
  ctx.save();ctx.beginPath();ctx.rect(left,top,pw,ph);ctx.clip();
  state.points=[];state.plotted.forEach(row=>{const value=residual?row.mu-mu(row.z,h0,om,row.zhel):row.mu;const px=x(row.z),py=y(value);ctx.fillStyle='#9ad1c170';ctx.beginPath();ctx.arc(px,py,1.7,0,Math.PI*2);ctx.fill();state.points.push({x:px,y:py,row});});
  ctx.strokeStyle='#eeb280';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=220;i++){const z=.01*250**(i/220),val=residual?0:mu(z,h0,om);if(i===0)ctx.moveTo(x(z),y(val));else ctx.lineTo(x(z),y(val));}ctx.stroke();
  if(state.selected){const p=state.points.find(p=>p.row.index===state.selected.index);if(p){ctx.strokeStyle='#fff4d9';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.stroke();}}
  ctx.restore();$('plot-count').textContent=state.plotted.length.toLocaleString()+' LIGHT CURVES';
}
function selectSN(index){const row=state.rows.find(r=>r.index===+index);if(!row)return;state.selected=row;$('sn-select').value=row.index;$('plot-detail').textContent=`${row.cid} · zHD ${row.z.toFixed(4)} · μ ${row.mu.toFixed(2)} mag`;drawPlot();}
$('hubble-plot').addEventListener('click',e=>{const rect=e.currentTarget.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;let best=null,distance=25;for(const point of state.points||[]){const d=Math.hypot(point.x-x,point.y-y);if(d<distance){best=point;distance=d;}}if(best)selectSN(best.row.index);});
['h0','omega','residuals'].forEach(id=>$(id).addEventListener('input',drawPlot));
$('sn-select').addEventListener('change',e=>selectSN(e.target.value));
function restoreFit(){if(!state.results)return;$('h0').value=state.results.full.h0;$('omega').value=state.results.full.omega_m;drawPlot();}
$('best-fit').addEventListener('click',restoreFit);
function calibrator(){const row=state.rows.find(r=>r.index===+$('calibrator').value);if(!row)return;$('ceph-mu').textContent=format(row.cepheid_mu,3)+' mag';$('ceph-distance').textContent=format(10**((row.cepheid_mu-25)/5))+' Mpc';$('ceph-mb').textContent=format(row.mb,3)+' mag';$('ceph-absolute').textContent=format(row.mb-row.cepheid_mu,3)+' mag';}
$('calibrator').addEventListener('change',calibrator);
function drawWave(){const z=+$('redshift-z').value,rest=+$('line').value;$('z-output').textContent=z.toFixed(4);$('observed-wave').textContent=format(rest*(1+z))+' nm';$('cz').textContent=format(C*z,0)+' km/s';$('doppler').textContent=format(C*((1+z)**2-1)/((1+z)**2+1),0)+' km/s';const{ctx,w,h}=canvas('wave');if(!w)return;[[h*.3,1,'#92cbc6','REST FRAME'],[h*.75,1+z,'#efb087','OBSERVED FRAME']].forEach(([center,stretch,color,label])=>{ctx.fillStyle=color;ctx.font='10px Arial';ctx.fillText(label,28,center-38);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();for(let x=28;x<w-28;x++){const y=center+Math.sin((x-28)/(12*stretch))*22;if(x===28)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();});}
function redshiftFromSN(){const row=state.rows.find(r=>r.index===+$('redshift-sn').value);if(!row)return;$('redshift-z').value=row.zhel;$('z-origin').textContent=`Catalog zHEL = ${row.zhel.toFixed(5)} for ${row.cid}; the line below is illustrative.`;drawWave();}
$('redshift-sn').addEventListener('change',redshiftFromSN);$('line').addEventListener('change',drawWave);$('redshift-z').addEventListener('input',()=>{$('redshift-sn').value='';$('z-origin').textContent='Custom redshift scenario; not a selected measurement.';drawWave();});
function table(){const query=$('search').value.trim().toLowerCase(),sample=$('sample').value;const rows=state.rows.filter(r=>r.cid.toLowerCase().includes(query)&&(sample==='all'||sample==='calibrators'&&r.calibrator||sample==='flow'&&r.hubble_flow));const pages=Math.max(1,Math.ceil(rows.length/8));state.page=Math.min(state.page,pages-1);$('table-count').textContent=rows.length.toLocaleString()+' matching measurements';$('table-body').replaceChildren();for(const row of rows.slice(state.page*8,state.page*8+8)){const tr=document.createElement('tr');[row.cid,row.survey,row.z.toFixed(5),row.mb.toFixed(3),row.mu.toFixed(3),row.calibrator?'Cepheid calibrator':row.hubble_flow?'SH0ES Hubble flow':'Wider sample'].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});$('table-body').append(tr);}if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='No matching supernovae. Try a different name or sample.';tr.append(td);$('table-body').append(tr);}$('page').textContent=`${state.page+1} / ${pages}`;$('previous').disabled=state.page===0;$('next').disabled=state.page>=pages-1;}
['search','sample'].forEach(id=>$(id).addEventListener('input',()=>{state.page=0;table();}));$('previous').addEventListener('click',()=>{state.page--;table();});$('next').addEventListener('click',()=>{state.page++;table();});
function options(id,rows){const fragment=document.createDocumentFragment();for(const row of rows){const option=document.createElement('option');option.value=row.index;option.textContent=`${row.cid} / survey ${row.survey} / row ${row.index+1}`;fragment.append(option);}$(id).replaceChildren(fragment);}
function drawActive(){if(state.panel==='expansion')drawUniverse();if(state.panel==='evidence')drawPlot();if(state.panel==='redshift')drawWave();}
let resizeFrame;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(drawActive);});
async function init(){drawUniverse();try{const responses=await Promise.all(['data/results.json','data/supernovae.json'].map(path=>fetch(path)));for(const response of responses)if(!response.ok)throw new Error('HTTP '+response.status);[state.results,state.rows]=await Promise.all(responses.map(r=>r.json()));const f=state.results.full,l=state.results.local;state.plotted=state.rows.filter(r=>!r.calibrator&&r.z>.01);$('count').textContent=state.rows.length.toLocaleString();$('fit-value').textContent=format(f.h0)+' ± '+format(f.h0_error);$('fit-meta').textContent=`Ωₘ = ${format(f.omega_m,3)} ± ${format(f.omega_m_error,3)} · χ² / dof = ${format(f.chi2,1)} / ${f.dof}`;$('local-value').textContent=format(l.h0)+' ± '+format(l.h0_error);options('sn-select',state.plotted);options('calibrator',state.rows.filter(r=>r.calibrator));options('redshift-sn',state.rows);const custom=document.createElement('option');custom.value='';custom.textContent='Custom redshift';$('redshift-sn').prepend(custom);$('redshift-sn').value=state.plotted[Math.floor(state.plotted.length/2)].index;calibrator();redshiftFromSN();restoreFit();selectSN(state.plotted[0].index);const comparisons=[{label:'Our wider SN + Cepheid fit',h0:f.h0,error:f.h0_error},{label:'Our local ladder fit',h0:l.h0,error:l.h0_error},...state.results.references];for(const ref of comparisons){const row=document.createElement('div'),label=document.createElement(ref.url?'a':'span'),value=document.createElement('div'),b=document.createElement('b'),small=document.createElement('small');label.textContent=ref.label;if(ref.url){label.href=ref.url;label.target='_blank';label.rel='noreferrer';label.style.fontSize='11px';}b.textContent=format(ref.h0)+' ± '+format(ref.error);small.textContent='km s⁻¹ Mpc⁻¹';value.append(b,small);row.append(label,value);$('comparison-values').append(row);}table();$('load-status').textContent='';drawActive();}catch(error){$('load-status').textContent='The scientific dataset could not load. Serve the web folder over HTTP and reload. The illustrative expansion model still works.';console.error(error);}}
init();
