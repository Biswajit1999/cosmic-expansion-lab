/* Research UI is isolated from the original four laboratory tabs. */
(()=>{
  'use strict';
  const get=id=>document.getElementById(id);
  let report=null;
  const fmt=(value,digits=2)=>Number(value).toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  function integrate(fn,z){const n=256,h=z/n;let sum=0;for(let i=0;i<=n;i++)sum+=(i===0||i===n?1:i%2?4:2)*fn(i*h);return sum*h/3;}
  function distances(){
    const z=+get('distance-z').value,model=get('distance-model').value;
    const h0=model==='sn'&&report?report.baseline.h0:67.4;
    const om=model==='matter'?1:model==='sn'&&report?report.baseline.omega_m:.315;
    const e=x=>Math.sqrt(om*(1+x)**3+1-om);
    const dc=299792.458/h0*integrate(x=>1/e(x),z);
    const lookback=977.79222168/h0*integrate(x=>1/((1+x)*e(x)),z);
    get('distance-z-output').textContent=fmt(z,3);
    get('distance-comoving').textContent=fmt(dc/1000,3)+' Gpc';
    get('distance-luminosity').textContent=fmt(dc*(1+z)/1000,3)+' Gpc';
    get('distance-angular').textContent=fmt(dc/(1+z)/1000,3)+' Gpc';
    get('distance-lookback').textContent=fmt(lookback)+' Gyr';
    get('distance-summary').textContent=`At emission, a = ${fmt(1/(1+z),3)} and H(z) = ${fmt(h0*e(z),1)} km s⁻¹ Mpc⁻¹. 1 Gpc = 1,000 Mpc.`;
  }
  get('distance-z').addEventListener('input',distances);
  get('distance-model').addEventListener('change',distances);
  get('distance-reset').addEventListener('click',()=>{get('distance-z').value=1;distances();});
  const rTabs=[...document.querySelectorAll('[data-research]')];
  function selectTab(tab){rTabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;get(t.getAttribute('aria-controls')).hidden=!active;});}
  rTabs.forEach((tab,i)=>{tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(i+1)%rTabs.length;if(event.key==='ArrowLeft')next=(i+rTabs.length-1)%rTabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=rTabs.length-1;if(next!==undefined){event.preventDefault();rTabs[next].focus();selectTab(rTabs[next]);}});});
  document.querySelectorAll('[data-open-tab]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();get('tab-'+link.dataset.openTab).click();get('laboratory').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}));
  get('find-1994d').addEventListener('click',()=>{get('search').value='1994D';get('sample').value='all';get('search').dispatchEvent(new Event('input',{bubbles:true}));});
  function nearest(values,value){return values.reduce((best,item,i)=>Math.abs(item-value)<Math.abs(values[best]-value)?i:best,0);}
  function profile(){if(!report)return;const grid=report.profile,j=nearest(grid.h0,+get('profile-h0').value),i=nearest(grid.omega_m,+get('profile-omega').value),delta=grid.delta_chi2[i][j];get('profile-h0-output').textContent=fmt(grid.h0[j],2);get('profile-omega-output').textContent=fmt(grid.omega_m[i],3);get('profile-delta').textContent='Δχ² = '+fmt(delta);get('profile-region').textContent=delta<=2.30?'Inside the approximate joint 68.3% contour':delta<=6.18?'Between the joint 68.3% and 95.4% contours':'Outside the approximate joint 95.4% contour';}
  ['profile-h0','profile-omega'].forEach(id=>{get(id).disabled=true;get(id).addEventListener('input',profile);});
  get('distance-model').querySelector('[value=sn]').disabled=true;
  function addMetric(label,value){const row=document.createElement('div'),name=document.createElement('span'),number=document.createElement('b');name.textContent=label;number.textContent=value;row.append(name,number);get('w-results').append(row);}
  async function load(){distances();try{const response=await fetch('data/research.json');if(!response.ok)throw Error('Research data HTTP '+response.status);report=await response.json();get('distance-model').querySelector('[value=sn]').disabled=false;for(const item of report.sensitivity){const tr=document.createElement('tr');[item.zmin.toFixed(3),item.rows.toLocaleString(),fmt(item.h0)+' ± '+fmt(item.h0_error)].forEach(text=>{const td=document.createElement('td');td.textContent=text;tr.append(td);});get('robustness-body').append(tr);}const w=report.wcdm;addMetric('Constant w (local Gaussian 1σ)',fmt(w.w,3)+' ± '+fmt(w.w_error,3));addMetric('H₀ (km s⁻¹ Mpc⁻¹)',fmt(w.h0)+' ± '+fmt(w.h0_error));addMetric('Ωₘ',fmt(w.omega_m,3)+' ± '+fmt(w.omega_m_error,3));addMetric('ΔAIC = AIC(wCDM) − AIC(ΛCDM)',(w.delta_aic_vs_lcdm>0?'+':'')+fmt(w.delta_aic_vs_lcdm));get('sn-only-result').textContent=`Without calibrators: Ωₘ = ${fmt(report.sn_only.omega_m,3)} ± ${fmt(report.sn_only.omega_m_error,3)}; H₀ remains unconstrained.`;get('profile-h0').value=report.baseline.h0;get('profile-omega').value=report.baseline.omega_m;['profile-h0','profile-omega'].forEach(id=>get(id).disabled=false);profile();distances();get('research-status').textContent='';}catch(error){get('research-status').textContent='Research results could not load. The explanatory figures remain available; reload to retry.';console.error(error);}}
  load();
})();
