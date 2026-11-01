(() => {
  'use strict';
  const $=id=>document.getElementById(id), fmt=n=>n.toLocaleString('en-US');
  let desi,cf4,summary,mode='desi',selected=[],page=0,cells=new Map(),ready=false;
  const distance=mu=>10**((mu-25)/5);
  function angle(l,b){const r=Math.PI/180;return Math.acos(Math.max(-1,Math.min(1,Math.sin(b*r)*Math.sin(-7*r)+Math.cos(b*r)*Math.cos(-7*r)*Math.cos((l-325)*r))))/r;}
  function write(id,value){$(id).textContent=value;}
  function url(){const u=new URL(location.href);u.search='';u.hash='catalog-map';const params={catalog:mode,zmin:$('z-min').value,zmax:$('z-max').value,dmin:$('distance-min').value,dmax:$('distance-max').value,method:$('distance-method').value,norma:$('norma-only').checked?'1':'0',pgc:$('pgc-search').value};for(const [k,v] of Object.entries(params))if(v!=='')u.searchParams.set(k,v);return u.href;}
  function readURL(){const q=new URLSearchParams(location.search);mode=q.get('catalog')==='cf4'?'cf4':'desi';for(const [key,id] of [['zmin','z-min'],['zmax','z-max'],['method','distance-method']]){const value=q.get(key);if([...$(id).options].some(o=>o.value===value))$(id).value=value;}for(const [key,id] of [['dmin','distance-min'],['dmax','distance-max']]){if(q.has(key)&&Number.isFinite(Number(q.get(key))))$(id).value=Math.max(0,Math.min(2000,Number(q.get(key))));}$('norma-only').checked=q.get('norma')==='1';$('pgc-search').value=(q.get('pgc')||'').slice(0,30);}
  function render(){
    if(!ready)return;
    $('desi-controls').hidden=mode!=='desi';$('cf4-controls').hidden=mode!=='cf4';$('cf4-table-section').hidden=mode!=='cf4';
    $('desi-mode').setAttribute('aria-pressed',String(mode==='desi'));$('cf4-mode').setAttribute('aria-pressed',String(mode==='cf4'));
    let valid=true;
    if(mode==='desi'){
      const lo=Number($('z-min').value),hi=Number($('z-max').value);valid=lo<hi;
      selected=valid?desi.rows.filter(r=>r[2]>=Math.round(lo/0.05)&&r[2]<Math.round(hi/0.05)):[];
      write('selection-title','Selected primary galaxy spectra');write('selection-count',fmt(selected.reduce((n,r)=>n+r[3],0)));
      write('selection-detail',`${fmt(selected.length)} occupied sky/redshift bins; ${lo.toFixed(2)} ≤ z < ${hi.toFixed(2)} (base selection also requires z > 0).`);
    }else{
      const lowText=$('distance-min').value,highText=$('distance-max').value,lo=Number(lowText),hi=Number(highText),method=$('distance-method').value,needle=$('pgc-search').value.trim();
      valid=lowText!==''&&highText!==''&&Number.isFinite(lo)&&Number.isFinite(hi)&&lo>=0&&hi>lo&&hi<=2000;
      selected=valid?cf4.rows.filter(r=>{const d=distance(r[8]);return d>=lo&&d<=hi&&(method==='all'||(r[10]&(1<<Number(method))))&&(!$('norma-only').checked||angle(r[5],r[6])<=20)&&(!needle||String(r[0]).includes(needle));}):[];
      write('selection-title','Selected CF4 galaxy-distance records');write('selection-count',fmt(selected.length));
      write('selection-detail',`${lo}–${hi} Mpc; ${method==='all'?'all methods':cf4.methods[Number(method)]}. ${$('norma-only').checked?'Within the 20° reference cone.':'Full catalog footprint.'}`);
      renderTable();
    }
    cells=new Map();
    for(const r of selected){const x=mode==='desi'?r[0]:Math.min(71,Math.floor(r[5]/5)),y=mode==='desi'?r[1]:Math.min(35,Math.floor((r[6]+90)/5)),key=x+','+y;cells.set(key,(cells.get(key)||0)+(mode==='desi'?r[3]:1));}
    write('catalog-status',valid?'Ready · measured catalog inventory · no velocity field fitted':'Choose a valid increasing range.');
    $('catalog-export').disabled=!valid||!selected.length;
    write('map-description',`${fmt(cells.size)} occupied sky cells. Colour uses log(1 + count), rescaled within this selection. The cross marks the reference Norma direction; blank cells mean no selected entries.`);
    $('catalog-url').value=url();draw();
  }
  function draw(){
    const canvas=$('sky-counts'),rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
    g.fillStyle='#10252d';g.fillRect(0,0,w,h);const left=44,top=30,pw=w-left-20,ph=h-top-48;
    const x=l=>left+(360-l)/360*pw,y=b=>top+(90-b)/180*ph;
    const max=Math.max(1,...cells.values());
    for(const [key,n] of cells){const [a,b]=key.split(',').map(Number),f=Math.log1p(n)/Math.log1p(max);g.fillStyle=`hsl(${178-f*138} 55% ${25+f*40}%)`;g.fillRect(x((a+1)*5),y((b+1)*5-90),pw/72+.2,ph/36+.2);}
    g.strokeStyle='#779b9a';g.lineWidth=.5;g.fillStyle='#c3d6d5';g.font='10px Arial';g.textAlign='center';
    for(const l of [0,90,180,270,360]){g.beginPath();g.moveTo(x(l),top);g.lineTo(x(l),top+ph);g.stroke();g.fillText(l+'°',x(l),top+ph+17);}
    g.textAlign='right';for(const b of [-90,-45,0,45,90]){g.beginPath();g.moveTo(left,y(b));g.lineTo(left+pw,y(b));g.stroke();g.fillText(b+'°',left-6,y(b)+4);}
    g.setLineDash([4,4]);g.strokeStyle='#dec19a';for(const b of [-10,10]){g.beginPath();g.moveTo(left,y(b));g.lineTo(left+pw,y(b));g.stroke();}g.setLineDash([]);
    const nx=x(325),ny=y(-7);g.strokeStyle='#fff';g.lineWidth=1.5;g.beginPath();g.moveTo(nx-5,ny);g.lineTo(nx+5,ny);g.moveTo(nx,ny-5);g.lineTo(nx,ny+5);g.stroke();
    g.textAlign='left';g.fillStyle='#fff';g.fillText('Norma ref.',nx+7,ny-8);g.fillStyle='#c3d6d5';g.fillText('Galactic latitude b',left,16);g.textAlign='center';g.fillText('Galactic longitude l · count per 5° × 5° cell',left+pw/2,h-8);
  }
  function renderTable(){
    const pages=Math.max(1,Math.ceil(selected.length/25));page=Math.min(page,pages-1);
    const rows=selected.slice(page*25,page*25+25).map(r=>{const tr=document.createElement('tr');const d=distance(r[8]),low=distance(r[8]-r[9]),high=distance(r[8]+r[9]);const values=[String(r[0]),`${r[3].toFixed(4)} / ${r[4].toFixed(4)}`,fmt(r[7]),`${r[8].toFixed(3)} ± ${r[9].toFixed(3)}`,`${d.toFixed(2)} [${low.toFixed(2)}, ${high.toFixed(2)}]`,cf4.methods.filter((_,i)=>r[10]&(1<<i)).join(', ')];for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}return tr;});
    $('cf4-table').replaceChildren(...rows);write('table-page',`Page ${page+1} / ${pages} · ${fmt(selected.length)} records`);$('table-prev').disabled=page===0;$('table-next').disabled=page===pages-1;
  }
  $('desi-mode').addEventListener('click',()=>{mode='desi';page=0;render();});$('cf4-mode').addEventListener('click',()=>{mode='cf4';page=0;render();});
  for(const id of ['z-min','z-max','distance-min','distance-max','distance-method','norma-only','pgc-search'])$(id).addEventListener('input',()=>{page=0;render();});
  $('norma-preset').addEventListener('click',()=>{mode='cf4';$('distance-min').value=40;$('distance-max').value=100;$('distance-method').value='all';$('norma-only').checked=true;$('pgc-search').value='';page=0;render();});
  $('table-prev').addEventListener('click',()=>{page=Math.max(0,page-1);renderTable();});$('table-next').addEventListener('click',()=>{page++;renderTable();});
  $('catalog-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(url());write('export-status','Selection link copied.');}catch{$('catalog-url').focus();$('catalog-url').select();write('export-status','Select and copy the selection URL.');}});
  $('catalog-export').addEventListener('click',()=>{const cols=mode==='desi'?['longitude_bin','latitude_bin','redshift_bin','count']:cf4.columns;const content=cols.join(',')+'\n'+selected.map(r=>r.join(',')).join('\n')+'\n';const blobURL=URL.createObjectURL(new Blob([content],{type:'text/csv'}));const a=document.createElement('a');a.href=blobURL;a.download=mode==='desi'?'desi-selected-bins.csv':'cf4-selected-records.csv';a.click();setTimeout(()=>URL.revokeObjectURL(blobURL),2000);write('export-status','Selected data exported. Retain the inventory provenance and data acknowledgments when sharing.');});
  async function load(name){const r=await fetch('data/catalogs/'+name+'.json');if(!r.ok)throw new Error(name+' request failed ('+r.status+')');return r.json();}
  document.querySelectorAll('button,select,input:not([readonly])').forEach(e=>e.disabled=true);
  Promise.all([load('desi-bins'),load('cf4'),load('summary')]).then(values=>{[desi,cf4,summary]=values;if(cf4.rows.length!==summary.cf4_records||desi.rows.reduce((n,r)=>n+r[3],0)!==summary.desi_selected_spectra)throw new Error('Catalog counts disagree with provenance.');cf4.methods.forEach((name,i)=>{const o=document.createElement('option');o.value=i;o.textContent=name;$('distance-method').append(o);});document.querySelectorAll('button,select,input').forEach(e=>e.disabled=false);readURL();ready=true;render();}).catch(error=>write('catalog-status','Catalogs could not load: '+error.message+' Use the CSV links below or reload to retry.'));
  new ResizeObserver(()=>{if(ready)draw();}).observe($('sky-counts'));
})();
