'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../web/attractor-model.js');
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b} within ${tol}`);
function integrate(s,t,dt){for(let i=0;i<Math.round(t/dt);i++)M.step(s,dt);return s;}

test('unit conversion and analytic flat matter+Lambda expansion',()=>{
  near(M.KMS_TO_MPC_GYR,.001022712165045695,1e-15);
  const c=M.config({mass:0,external:0}),s=integrate(M.create(c),6,.01);
  const h=c.h0*M.KMS_TO_MPC_GYR,ol=1-c.omega;
  const analytic=(Math.sqrt(c.omega/ol)*Math.sinh(Math.asinh(Math.sqrt(ol/c.omega))+1.5*h*Math.sqrt(ol)*6))**(2/3);
  near(s.a,analytic,1e-11);
});
test('zero excess mass preserves comoving positions and pure Hubble recession',()=>{
  const s=M.create({mass:0,external:0}),initial=s.p.slice();integrate(s,6,.01);
  assert.deepEqual(s.p,initial);
  const r=M.radial(s,M.PROBE_START);near(r.peculiar,0);near(r.total,r.expansion);
});
test('unforced peculiar momentum a*u is conserved, including displacement',()=>{
  const s=M.create({mass:0,external:0});s.p=new Float64Array([0,0,0,.5,-.2,.1]);
  integrate(s,4,.01);near(s.a*s.p[3],.5,1e-11);near(s.a*s.p[4],-.2,1e-11);
  assert.ok(s.p[0]>0&&s.p[1]<0);
});
test('softened force has the analytic magnitude and finite symmetric center',()=>{
  const c=M.config({external:0,mass:5,soft:12,distance:70}),a=1.3;
  const g=M.acceleration([80,0,0],a,c);
  near(g[0],-M.G*5e16*13/(13**2+12**2)**1.5,1e-12);
  near(M.acceleration([60,0,0],a,c)[0],-g[0]);
  assert.deepEqual(M.acceleration([70,0,0],a,c),[0,0,0]);
});
test('acceleration matches an independent numerical gradient of potential',()=>{
  const c=M.config(),a=1.2,x=[23,-12,4],eps=1e-4;
  const phi=q=>M.sources(c).reduce((v,s)=>v-M.G*s.mass/Math.sqrt(q.reduce((z,p,j)=>z+(p-a*s.x[j])**2,s.soft**2)),0);
  const r=x.map(p=>p*a),g=M.acceleration(x,a,c);
  for(let j=0;j<3;j++){const p=r.slice(),m=r.slice();p[j]+=eps;m[j]-=eps;near(g[j],-(phi(p)-phi(m))/(2*eps),1e-9);}
});
test('RK4 converges against smaller steps in the strongest allowed field',()=>{
  const c={mass:10,external:30,soft:5};
  const make=()=>{const s=M.create(c);s.p=new Float64Array([74,1,0,0,0,0]);return s;};
  const a=integrate(make(),6,.04),b=integrate(make(),6,.02),ref=integrate(make(),6,.005);
  const err=s=>Math.max(...s.p.map((v,i)=>Math.abs(v-ref.p[i])));
  assert.ok(err(a)>8*err(b));assert.ok(err(b)<1e-5);
});
test('seed reproducibility, sanitization, observer subtraction, and export semantics',()=>{
  assert.deepEqual(M.create({seed:7}).p,M.create({seed:7}).p);
  assert.notDeepEqual(M.create({seed:7}).p,M.create({seed:8}).p);
  assert.equal(M.config({mass:Infinity}).mass,5);assert.equal(M.config({soft:-1}).soft,5);
  const s=M.create();s.p[3]=.2;s.p[M.PROBE_START*6+3]=.2;
  near(M.radial(s,M.PROBE_START).peculiar,0);
  assert.equal(M.rows(s).length,522);assert.equal(M.rows(s)[0].kind,'observer');
  assert.throws(()=>M.step(s,0));assert.throws(()=>M.step(s,NaN));
});
