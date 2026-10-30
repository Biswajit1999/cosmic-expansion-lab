/* Cosmic Expansion Lab: prescribed-potential test-particle model, version 1.0.0. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AttractorModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '1.0.0';
  const KMS_TO_MPC_GYR = 31557600e9 / 3.0856775814913673e19;
  // G = 4.30091727003628e-9 Mpc (km/s)^2 / solar mass.
  const G = 4.30091727003628e-9 * KMS_TO_MPC_GYR ** 2;
  const DEFAULTS = Object.freeze({h0: 70, omega: .3, mass: 5, soft: 12,
    external: 10, distance: 70, seed: 2026});
  const LIMITS = {h0: [55,85], omega: [.2,.4], mass: [0,10], soft: [5,25],
    external: [0,30], distance: [40,100], seed: [1,2147483647]};
  const STEP = .01, SNAPSHOT_STEP = .05, END = 6;
  const COUNT = 480, PROBES = 41, PROBE_START = COUNT + 1;

  function config(input = {}) {
    const c = {};
    for (const key of Object.keys(DEFAULTS)) {
      const value = Number(input[key] ?? DEFAULTS[key]);
      c[key] = Number.isFinite(value) ? Math.min(LIMITS[key][1], Math.max(LIMITS[key][0], value)) : DEFAULTS[key];
    }
    c.seed = Math.round(c.seed);
    return c;
  }
  function hubble(a, c) {
    return c.h0 * KMS_TO_MPC_GYR * Math.sqrt(c.omega / a ** 3 + 1 - c.omega);
  }
  function sources(c) {
    return [{name:'Great Attractor analogue', x:[c.distance,0,0], mass:c.mass * 1e16, soft:c.soft},
      {name:'External structure analogue', x:[180,60,25], mass:c.external * 1e16, soft:25}];
  }
  function acceleration(x, a, c) {
    const out = [0,0,0];
    for (const s of sources(c)) {
      const d = x.map((q,j) => a * (q-s.x[j]));
      const factor = -G * s.mass / (d.reduce((sum,q) => sum+q*q, s.soft*s.soft) ** 1.5);
      for (let j=0;j<3;j++) out[j] += factor*d[j];
    }
    return out;
  }
  function random(seed) {
    let n = seed >>> 0;
    return () => { n = (Math.imul(1664525,n)+1013904223) >>> 0; return n / 4294967296; };
  }
  function create(input = {}) {
    const c=config(input), rng=random(c.seed);
    const p=new Float64Array((1+COUNT+PROBES)*6);
    // Index zero is a freely moving Local Group analogue, initially at the origin.
    for (let i=1;i<=COUNT;i++) {
      p[i*6] = -100+310*rng(); p[i*6+1] = -85+170*rng(); p[i*6+2] = -85+170*rng();
    }
    for (let i=0;i<PROBES;i++) p[(PROBE_START+i)*6] = 10+3*i;
    return {a:1, t:0, p, c}; // All initial peculiar velocities are zero.
  }
  function derivative(p, a, c, out) {
    const h=hubble(a,c), src=sources(c);
    for (let i=0;i<p.length;i+=6) {
      let gx=0,gy=0,gz=0;
      for (const s of src) {
        const dx=a*(p[i]-s.x[0]),dy=a*(p[i+1]-s.x[1]),dz=a*(p[i+2]-s.x[2]);
        const q=-G*s.mass/(dx*dx+dy*dy+dz*dz+s.soft*s.soft)**1.5;
        gx+=q*dx; gy+=q*dy; gz+=q*dz;
      }
      out[i]=p[i+3]/a;out[i+1]=p[i+4]/a;out[i+2]=p[i+5]/a;
      out[i+3]=gx-h*p[i+3];out[i+4]=gy-h*p[i+4];out[i+5]=gz-h*p[i+5];
    }
  }
  function step(s, dt=STEP) {
    if (!Number.isFinite(dt) || dt<=0 || dt>.1) throw new Error('Timestep must be in (0, 0.1] Gyr');
    const {p,a,c}=s,n=p.length;
    const k1=new Float64Array(n),k2=new Float64Array(n),k3=new Float64Array(n),k4=new Float64Array(n),tmp=new Float64Array(n);
    const f=q=>q*hubble(q,c);
    const a1=f(a),a2=f(a+dt*a1/2),a3=f(a+dt*a2/2),a4=f(a+dt*a3);
    derivative(p,a,c,k1);
    for(let i=0;i<n;i++) tmp[i]=p[i]+dt*k1[i]/2;
    derivative(tmp,a+dt*a1/2,c,k2);
    for(let i=0;i<n;i++) tmp[i]=p[i]+dt*k2[i]/2;
    derivative(tmp,a+dt*a2/2,c,k3);
    for(let i=0;i<n;i++) tmp[i]=p[i]+dt*k3[i];
    derivative(tmp,a+dt*a3,c,k4);
    for(let i=0;i<n;i++) p[i]+=dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6;
    s.a+=dt*(a1+2*a2+2*a3+a4)/6;s.t+=dt;
    return s;
  }
  function snapshot(s) { return {a:s.a,t:s.t,p:s.p.slice(),c:{...s.c}}; }
  function radial(s, index) {
    const i=index*6,p=s.p,r=[0,1,2].map(j=>s.a*(p[i+j]-p[j]));
    const d=Math.hypot(...r),du=[0,1,2].map(j=>(p[i+3+j]-p[3+j])/KMS_TO_MPC_GYR);
    const peculiar=d>1e-12?r.reduce((sum,q,j)=>sum+q*du[j],0)/d:0;
    const expansion=hubble(s.a,s.c)*d/KMS_TO_MPC_GYR;
    return {distance:d,peculiar,expansion,total:expansion+peculiar};
  }
  function rows(s) {
    const output=[];
    for(let i=0;i<s.p.length/6;i++) {
      const r=radial(s,i);
      output.push({id:i,kind:i===0?'observer':i>=PROBE_START?'axis_probe':'synthetic_tracer',
        x_comoving_mpc:s.p[i*6],y_comoving_mpc:s.p[i*6+1],z_comoving_mpc:s.p[i*6+2],
        ux_kms:s.p[i*6+3]/KMS_TO_MPC_GYR,uy_kms:s.p[i*6+4]/KMS_TO_MPC_GYR,uz_kms:s.p[i*6+5]/KMS_TO_MPC_GYR,
        distance_from_observer_mpc:r.distance,radial_expansion_kms:r.expansion,
        radial_peculiar_relative_observer_kms:r.peculiar,radial_total_relative_observer_kms:r.total});
    }
    return output;
  }
  return {VERSION,KMS_TO_MPC_GYR,G,DEFAULTS,LIMITS,STEP,SNAPSHOT_STEP,END,COUNT,PROBES,PROBE_START,
    config,hubble,sources,acceleration,create,step,snapshot,radial,rows};
});
