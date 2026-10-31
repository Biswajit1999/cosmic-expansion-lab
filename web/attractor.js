'use strict';
(() => {
  const M=window.AttractorModel,$=id=>document.getElementById(id);
  const inputs=[...document.querySelectorAll('[data-model]')];
  let frames=[],generation=0,busy=true,playing=false,lastTick=0,clock=3;
  let c=M.config(),view={time:3,yaw:-18,pitch:25,coordinates:'comoving',arrows:'peculiar',probe:30,style:'particles'};
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const number=(x,d=0)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const signed=x=>(x>=0?'+':'−')+number(Math.abs(x));
  function readLink() {
    const q=new URLSearchParams(location.hash.slice(1));
    if(!q.has('v'))return;
    if(q.get('v')!=='1'){ $('share-status').textContent='Unsupported link version; using model 1 defaults.';return; }
    const raw={};for(const key of Object.keys(M.DEFAULTS))if(q.has(key))raw[key]=q.get(key);
    c=M.config(raw);
    for(const [key,lo,hi] of [['time',0,6],['yaw',-180,180],['pitch',-60,60],['probe',0,40]]){
      if(q.has(key)&&Number.isFinite(Number(q.get(key))))view[key]=clamp(Number(q.get(key)),lo,hi);
    }
    view.time=Math.round(view.time/.05)*.05;view.probe=Math.round(view.probe);
    if(['physical','comoving'].includes(q.get('coordinates')))view.coordinates=q.get('coordinates');
    if(['off','peculiar','total'].includes(q.get('arrows')))view.arrows=q.get('arrows');
    if(['particles','golden'].includes(q.get('style')))view.style=q.get('style');
  }
  function syncInputs(){for(const input of inputs)input.value=c[input.id];for(const key of Object.keys(view))$(key).value=view[key];labels();}
  function labels(){
    for(const input of inputs){const key=input.id;if(key==='seed')continue;const v=Number(input.value);
      $(key+'-out').textContent=key==='mass'||key==='external'?number(v,2)+' × 10¹⁶ M☉':key==='h0'?number(v,1)+' km/s/Mpc':key==='omega'?number(v,2):number(v,1)+' Mpc';}
    $('yaw-out').textContent=number(view.yaw)+'°';$('pitch-out').textContent=number(view.pitch)+'°';
    $('probe-out').textContent='Initial x = '+(10+3*view.probe)+' Mpc';
    document.querySelectorAll('[data-preset]').forEach(b=>{
      const active=b.dataset.preset==='expansion'?c.mass===0&&c.external===0:b.dataset.preset==='local'?c.mass>0&&c.external===0:c.mass>0&&c.external>0;
      b.setAttribute('aria-pressed',String(active));
    });
  }
  function current(){return frames[clamp(Math.round(view.time/M.SNAPSHOT_STEP),0,frames.length-1)];}
  function setPlaying(value){playing=value;lastTick=0;clock=view.time;$('play').textContent=value?'Pause evolution':'Play evolution';}
  async function rebuild(){
    const run=++generation;busy=true;setPlaying(false);
    document.querySelectorAll('[data-export],#play,#rewind,#time').forEach(e=>e.disabled=true);
    $('status').textContent='Computing 6 Gyr of trajectories…';$('flow').setAttribute('aria-busy','true');
    const s=M.create(c),next=[M.snapshot(s)];
    for(let i=1;i<=600;i++){
      M.step(s);
      if(i%5===0)next.push(M.snapshot(s));
      if(i%40===0){await new Promise(resolve=>setTimeout(resolve,0));if(run!==generation)return;}
    }
    if(run!==generation)return;frames=next;busy=false;
    document.querySelectorAll('[data-export],#play,#rewind,#time').forEach(e=>e.disabled=false);
    $('flow').setAttribute('aria-busy','false');
    $('status').textContent='Ready · 121 snapshots · 0.01 Gyr integration step · synthetic initial conditions';
    render();
  }
  function canvasSize(canvas){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    const w=Math.max(1,rect.width),h=Math.max(1,rect.height);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w,h};
  }
  function drawScene(s){
    const {ctx:g,w,h}=canvasSize($('flow'));g.clearRect(0,0,w,h);g.fillStyle='#10252d';g.fillRect(0,0,w,h);
    const yaw=view.yaw*Math.PI/180,pitch=view.pitch*Math.PI/180,scale=Math.min(w/440,(h-70)/260);
    const factor=view.coordinates==='physical'?s.a:1;
    const projectRaw=q=>{const x=q[0]-65,y=q[1],z=q[2],rx=Math.cos(yaw)*x-Math.sin(yaw)*y,ry=Math.sin(yaw)*x+Math.cos(yaw)*y;
      return [w*.47+rx*scale,h*.48-(Math.cos(pitch)*ry-Math.sin(pitch)*z)*scale,Math.sin(pitch)*ry+Math.cos(pitch)*z];};
    const project=q=>projectRaw(q.map(v=>v*factor));
    const point=(state,i)=>Array.from(state.p.slice(i*6,i*6+3));
    g.lineWidth=.6;g.strokeStyle='#29434c';
    for(let i=-100;i<=250;i+=50){const a=projectRaw([i,-100,0]),b=projectRaw([i,100,0]);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();}
    for(let i=-100;i<=100;i+=50){const a=projectRaw([-100,i,0]),b=projectRaw([250,i,0]);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();}
    g.font='10px Arial';g.fillStyle='#8faeb4';
    for(const x of [-100,0,100,200]){const p=projectRaw([x,-100,0]);g.fillText(x+'',p[0]-8,p[1]+16);}
    const xl=projectRaw([250,-100,0]);g.fillText('x / Mpc',xl[0]-30,xl[1]+16);
    // Golden paths are actual integrated trajectories, never an invented velocity field.
    const golden=view.style==='golden';
    const end=Math.round(view.time/.05),trailIds=[0,M.PROBE_START+view.probe,...Array.from({length:golden?M.COUNT:24},(_,i)=>golden?i+1:1+i*19)];
    if(golden){
      g.strokeStyle='rgba(224,175,91,.17)';g.lineWidth=.8;
      for(const i of trailIds){g.beginPath();for(let k=0;k<frames.length;k+=2){const frame=frames[k],f=view.coordinates==='physical'?frame.a:1,p=projectRaw(point(frame,i).map(v=>v*f));if(k===0)g.moveTo(p[0],p[1]);else g.lineTo(p[0],p[1]);}g.stroke();}
      g.shadowColor='#e1b465';g.shadowBlur=3;
    }
    for(const i of trailIds){g.beginPath();for(let k=0;k<=end;k+=2){const frame=frames[k],f=view.coordinates==='physical'?frame.a:1,p=projectRaw(point(frame,i).map(v=>v*f));if(k===0)g.moveTo(p[0],p[1]);else g.lineTo(p[0],p[1]);}
      const endpoint=project(point(s,i));g.lineTo(endpoint[0],endpoint[1]);g.strokeStyle=i===0?'#f0ddae':i>=M.PROBE_START?'#e5a36e':golden?'rgba(240,193,112,.65)':'#416b70';g.lineWidth=i>=M.PROBE_START?1.5:.8;g.stroke();}
    g.shadowBlur=0;
    const particles=Array.from({length:M.COUNT},(_,j)=>{const i=j+1;return {i,p:project(point(s,i))};}).sort((a,b)=>a.p[2]-b.p[2]);
    for(const {i,p} of particles){
      const opacity=clamp(.55+p[2]/300,.22,.9);g.fillStyle=golden?`rgba(250,217,156,${opacity})`:`rgba(133,199,190,${opacity})`;g.beginPath();g.arc(p[0],p[1],golden?1.2:1.4+opacity*.8,0,Math.PI*2);g.fill();
      if(view.arrows!=='off'&&i%13===0){let u=Array.from(s.p.slice(i*6+3,i*6+6));if(view.arrows==='total')u=u.map((v,j)=>v+M.hubble(s.a,c)*s.a*s.p[i*6+j]);
        const speed=Math.hypot(...u);if(speed>1e-10){const origin=point(s,i).map(v=>v*factor),length=5*Math.log1p(speed/M.KMS_TO_MPC_GYR/100),q=projectRaw(origin.map((v,j)=>v+u[j]/speed*length));
          const dx=q[0]-p[0],dy=q[1]-p[1],angle=Math.atan2(dy,dx);g.strokeStyle='#6eaaa5';g.lineWidth=.8;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.lineTo(q[0]-3*Math.cos(angle-.5),q[1]-3*Math.sin(angle-.5));g.moveTo(q[0],q[1]);g.lineTo(q[0]-3*Math.cos(angle+.5),q[1]-3*Math.sin(angle+.5));g.stroke();}}
    }
    for(const [index,source] of M.sources(c).entries()){
      const p=project(source.x),radius=source.soft*(view.coordinates==='physical'?1:1/s.a)*scale;
      const color=source.mass>0?(index===0?'#efbc88':'#b6b3d5'):'#829697';
      g.strokeStyle=color;g.lineWidth=1;g.setLineDash(source.mass===0?[3,4]:[]);g.beginPath();g.arc(p[0],p[1],Math.max(4,radius),0,Math.PI*2);g.stroke();g.setLineDash([]);
      g.beginPath();g.arc(p[0],p[1],3,0,Math.PI*2);g.fillStyle=color;g.fill();
      g.font='12px Arial';const label=(index===0?'GREAT ATTRACTOR':'DISTANT STRUCTURE')+(source.mass===0?' · OFF':'');
      const labelX=w<560?(index===0?16:w-g.measureText(label).width-16):clamp(p[0]+10,10,w-g.measureText(label).width-10);
      const labelY=w<560?(index===0?48:69):clamp(p[1]-radius-10,45,h-65);
      if(w<560){g.globalAlpha=.45;g.beginPath();g.moveTo(labelX+20,labelY+5);g.lineTo(p[0],p[1]-radius);g.stroke();g.globalAlpha=1;}
      g.fillText(label,labelX,labelY);
    }
    const observer=project(point(s,0));g.strokeStyle='#f3e6bf';g.lineWidth=1.5;g.beginPath();g.moveTo(observer[0]-5,observer[1]);g.lineTo(observer[0]+5,observer[1]);g.moveTo(observer[0],observer[1]-5);g.lineTo(observer[0],observer[1]+5);g.stroke();g.fillStyle='#f3e6bf';g.font='11px Arial';g.fillText('OBSERVER',observer[0]+10,observer[1]+18);
    const probe=project(point(s,M.PROBE_START+view.probe));g.strokeStyle='#efbc88';g.lineWidth=1.7;g.beginPath();g.arc(probe[0],probe[1],5,0,Math.PI*2);g.stroke();
    g.fillStyle='#c3d6d5';g.font='11px Arial';g.fillText('Great Attractor sandbox · model '+M.VERSION+' · t = '+s.t.toFixed(2)+' Gyr',16,22);
    if(golden){g.font='10px Arial';g.fillStyle='#ecc88f';g.fillText('Golden paths: 0–6 Gyr · bright = elapsed time',16,38);}
    g.font='10px Arial';g.fillStyle='#9db9bd';
    const metadata=`H₀ ${c.h0} · Ωm ${c.omega} · Mlocal ${c.mass} · Mext ${c.external} [10¹⁶ M☉] · b ${c.soft} Mpc · seed ${c.seed}`;
    if(w<560){g.fillText(`H₀ ${c.h0} · Ωm ${c.omega} · Mlocal ${c.mass} · Mext ${c.external} [10¹⁶ M☉]`,16,h-40);g.fillText(`b ${c.soft} Mpc · seed ${c.seed} · ${view.coordinates} coordinates`,16,h-25);}else g.fillText(metadata,16,h-28);
    g.fillStyle='#c3d6d5';g.fillText(w<560?'SYNTHETIC MODEL · not observational data':'SYNTHETIC DATA · prescribed potentials · not an observational reconstruction',16,h-10);
  }
  function drawProfile(s){
    const {ctx:g,w,h}=canvasSize($('profile'));g.clearRect(0,0,w,h);
    const data=Array.from({length:M.PROBES},(_,i)=>({...M.radial(s,M.PROBE_START+i),index:i})).sort((a,b)=>a.distance-b.distance);
    const left=w<450?53:62,right=14,top=22,bottom=42;
    const xmax=Math.ceil(Math.max(...data.map(r=>r.distance))/20)*20;
    const ymin=Math.min(-200,...data.map(r=>Math.min(r.peculiar,r.total)))*1.15,ymax=Math.max(100,...data.map(r=>Math.max(r.total,r.expansion)))*1.08;
    const x=v=>left+v/xmax*(w-left-right),y=v=>h-bottom-(v-ymin)/(ymax-ymin)*(h-top-bottom);
    g.font='10px Arial';g.strokeStyle='#d6dcd2';g.lineWidth=1;g.fillStyle='#53645e';
    for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4,py=y(v);g.beginPath();g.moveTo(left,py);g.lineTo(w-right,py);g.stroke();g.fillText(number(v),3,py+3);}
    for(let i=0;i<=4;i++){const v=xmax*i/4;g.fillText(number(v),x(v)-8,h-bottom+18);}
    g.strokeStyle='#9caeaa';g.setLineDash([2,3]);g.beginPath();g.moveTo(left,y(0));g.lineTo(w-right,y(0));g.stroke();g.setLineDash([]);
    g.fillText('km/s',3,12);g.fillText('Physical distance from observer / Mpc',Math.max(left,(w-210)/2),h-6);
    for(const [key,color,dash] of [['expansion','#778a87',[6,4]],['peculiar','#a44b2f',[2,4]],['total','#206e68',[]]]){
      g.strokeStyle=color;g.lineWidth=2;g.setLineDash(dash);g.beginPath();data.forEach((r,i)=>i?g.lineTo(x(r.distance),y(r[key])):g.moveTo(x(r.distance),y(r[key])));g.stroke();
    }g.setLineDash([]);
    const r=data.find(q=>q.index===view.probe);g.fillStyle='#206e68';g.beginPath();g.arc(x(r.distance),y(r.total),4,0,Math.PI*2);g.fill();
  }
  function shareURL(){const q=new URLSearchParams({v:'1'});for(const [key,value] of Object.entries(c))q.set(key,String(value));for(const [key,value] of Object.entries(view))q.set(key,String(value));return location.href.split('#')[0]+'#'+q;}
  function render(){if(!frames.length)return;const s=current();labels();
    $('time').value=view.time;$('time-out').textContent=s.t.toFixed(2)+' Gyr';$('stage-time').textContent='t = '+s.t.toFixed(2)+' Gyr';
    $('scale').textContent=number(s.a,3);$('hubble').textContent=number(M.hubble(s.a,c)/M.KMS_TO_MPC_GYR,1);
    $('observer-speed').textContent=number(Math.hypot(s.p[3],s.p[4],s.p[5])/M.KMS_TO_MPC_GYR);
    $('coordinate-label').textContent=(view.coordinates==='physical'?'Physical':'Comoving')+' Mpc · arbitrary axes';
    $('trail-note').textContent=view.style==='golden'?'Golden view: faint paths show the complete 0–6 Gyr model trajectories; bright segments show elapsed time. These are synthetic paths, not reconstructed Laniakea streamlines.':'Particle view: a subset of integrated trajectories is shown up to the selected time.';
    $('flow').closest('.stage').classList.toggle('golden',view.style==='golden');
    const r=M.radial(s,M.PROBE_START+view.probe);
    $('probe-distance').textContent=number(r.distance,2)+' Mpc';
    for(const key of ['expansion','peculiar','total'])$('probe-'+key).textContent=signed(r[key])+' km/s';
    $('probe-summary').textContent=r.total<0?'This probe’s separation from the observer is decreasing.':r.peculiar<-.5?'Peculiar motion reduces recession, but this probe’s separation still grows.':'This probe’s separation grows with the background'+(r.peculiar>.5?' and an additional outward peculiar component.':'.');
    $('share-url').value=shareURL();drawScene(s);drawProfile(s);
  }
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
  function metadata(){const s=current();return {schema:'cosmic-expansion-attractor/snapshot-v1',model_version:M.VERSION,
    status:'synthetic test particles in prescribed potentials; not observational data',created_utc:new Date().toISOString(),
    parameters:{...c},parameter_units:{h0:'km/s/Mpc',omega:'dimensionless',mass:'1e16 solar masses',external:'1e16 solar masses',soft:'physical Mpc',distance:'comoving Mpc'},
    integration:{method:'RK4',step_gyr:M.STEP,snapshot_step_gyr:M.SNAPSHOT_STEP,initial_scale_factor:1,initial_peculiar_velocity:'zero',particle_count:522},
    time_gyr:s.t,scale_factor:s.a,view:{...view},sources:M.sources(c),experiment_url:shareURL(),
    source_release:'v3.0.0',interface_release:'3.2.0',source_repository:'https://github.com/Biswajit1999/cosmic-expansion-lab',methods_url:'https://github.com/Biswajit1999/cosmic-expansion-lab/blob/main/docs/SIMULATION.md',
    coordinate_convention:'Arbitrary background axes; absolute comoving coordinates and physical peculiar velocities. Radial columns subtract the moving observer.',
    particles:M.rows(s)};}
  inputs.forEach(input=>{
    input.addEventListener('input',()=>{if(input.id!=='seed')labels();});
    input.addEventListener('change',()=>{c=M.config(Object.fromEntries(inputs.map(e=>[e.id,e.value])));syncInputs();rebuild().catch(fail);});
  });
  document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
    c=M.config({...c,mass:button.dataset.preset==='expansion'?0:5,external:button.dataset.preset==='both'?10:0});syncInputs();rebuild().catch(fail);
  }));
  $('defaults').addEventListener('click',()=>{c=M.config();view={time:3,yaw:-18,pitch:25,coordinates:'comoving',arrows:'peculiar',probe:30,style:'particles'};syncInputs();rebuild().catch(fail);});
  for(const key of ['yaw','pitch','coordinates','arrows','probe','style'])$(key).addEventListener('input',()=>{view[key]=['coordinates','arrows','style'].includes(key)?$(key).value:Number($(key).value);if(!busy)render();});
  $('time').addEventListener('input',()=>{setPlaying(false);view.time=Number($('time').value);render();});
  $('rewind').addEventListener('click',()=>{setPlaying(false);view.time=0;render();});
  $('golden-demo').addEventListener('click',()=>{setPlaying(false);view.style='golden';view.time=6;syncInputs();if(!busy)render();});
  $('play').addEventListener('click',()=>{if(view.time>=6){view.time=0;render();}setPlaying(!playing);});
  $('copy').addEventListener('click',async()=>{setPlaying(false);const url=shareURL();$('share-url').value=url;try{await navigator.clipboard.writeText(url);history.replaceState(null,'',url);$('share-status').textContent='Experiment link copied. Anyone with the link can reproduce this state.';}catch{$('share-url').focus();$('share-url').select();$('share-status').textContent='Select and copy the experiment URL above.';}});
  $('json').addEventListener('click',()=>{setPlaying(false);download(new Blob([JSON.stringify(metadata(),null,2)],{type:'application/json'}),'great-attractor-state.json');$('share-status').textContent='State JSON downloaded with parameters, units and all 522 particles.';});
  $('csv').addEventListener('click',()=>{setPlaying(false);const meta=metadata(),rows=meta.particles,keys=Object.keys(rows[0]);const prefix='# Synthetic test particles; model '+M.VERSION+'\n# experiment_url: '+meta.experiment_url+'\n# time_gyr: '+meta.time_gyr+'; scale_factor: '+meta.scale_factor+'\n';download(new Blob([prefix+keys.join(',')+'\n'+rows.map(r=>keys.map(k=>r[k]).join(',')).join('\n')+'\n'],{type:'text/csv'}),'great-attractor-snapshot.csv');$('share-status').textContent='CSV downloaded. Metadata lines begin with #; pandas readers can use comment="#".';});
  $('png').addEventListener('click',()=>{setPlaying(false);$('flow').toBlob(blob=>{if(blob)download(blob,'great-attractor-simulation.png');},'image/png');$('share-status').textContent='View exported with a synthetic-data label. Include the experiment link when sharing.';});
  function fail(error){busy=true;setPlaying(false);$('status').textContent='The simulation could not be computed. Reload to retry. '+error.message;$('flow').setAttribute('aria-busy','false');}
  window.addEventListener('hashchange',()=>{if(new URLSearchParams(location.hash.slice(1)).has('v')){readLink();syncInputs();rebuild().catch(fail);}});
  new ResizeObserver(()=>{if(!busy)render();}).observe($('flow'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});
  function animate(now){if(playing&&!busy){if(lastTick){clock=Math.min(6,clock+(now-lastTick)/1000*.25);const next=Math.round(clock/.05)*.05;if(next!==view.time){view.time=next;render();}if(clock>=6)setPlaying(false);}lastTick=now;}requestAnimationFrame(animate);}
  readLink();syncInputs();rebuild().catch(fail);requestAnimationFrame(animate);
})();
