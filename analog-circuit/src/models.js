/* Pure SI-unit educational models. Peak-amplitude phasor convention. */
(function(root){
  'use strict';
  const positive=(...xs)=>{if(xs.some(x=>!Number.isFinite(x)||x<=0))throw new RangeError('Parameter must be finite and positive');};
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
  const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
  const div=(a,b)=>{const d=b[0]**2+b[1]**2;if(!d)return [0,0];return [(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d];};
  const abs=a=>Math.hypot(...a),arg=a=>Math.atan2(a[1],a[0]);
  function firstOrder(t,x0,xf,tau){positive(tau);return xf+(x0-xf)*Math.exp(-Math.max(0,t)/tau);}
  function secondOrder(t,alpha,w0,x0,dx0,xf=0){
    positive(w0); if(!Number.isFinite(alpha)||alpha<0)throw new RangeError('Damping must be nonnegative');
    t=Math.max(0,t);const y=x0-xf;
    if(Math.abs(alpha-w0)<1e-7*w0)return xf+(y+(dx0+alpha*y)*t)*Math.exp(-alpha*t);
    if(alpha<w0){const wd=Math.sqrt(w0*w0-alpha*alpha);return xf+Math.exp(-alpha*t)*(y*Math.cos(wd*t)+(dx0+alpha*y)/wd*Math.sin(wd*t));}
    const q=Math.sqrt(alpha*alpha-w0*w0),s1=-w0*w0/(alpha+q),s2=-alpha-q;
    const a=(dx0-s2*y)/(s1-s2);return xf+a*Math.exp(s1*t)+(y-a)*Math.exp(s2*t);
  }
  function resonance(R,L,C,parallel=false){positive(R,L,C);const w0=1/Math.sqrt(L*C),Q=parallel?R*Math.sqrt(C/L):Math.sqrt(L/C)/R;
    const bandwidth=w0/Q,d=Math.sqrt(w0*w0+bandwidth*bandwidth/4);
    return {w0,Q,bandwidth,w1:d-bandwidth/2,w2:d+bandwidth/2,alpha:bandwidth/2};}
  function filter(type,x,Q=.70710678){positive(Q);const denominator=[1-x*x,x/Q];
    if(type==='low')return div([1,0],[1,x]);if(type==='high')return div([0,x],[1,x]);
    if(type==='band')return div([0,x/Q],denominator);if(type==='notch')return div([1-x*x,0],denominator);
    return div([1,0],denominator);
  }
  function loadPower(v,r,rl){positive(r);return v*v*Math.max(0,rl)/(r+Math.max(0,rl))**2;}
  function opAmp(vi,r1,rf,vref,rail){positive(r1,rf,rail);const gain=-rf/r1,ideal=vref+gain*(vi-vref);return {gain,ideal,output:Math.max(-rail,Math.min(rail,ideal))};}
  const dac=(bits,vref)=>-vref*bits.reduce((s,v,i)=>s+(v?1:0)/2**(i+1),0);
  function bode(w,gain,zeros=[],poles=[],origin=0){
    let z=[gain,0];for(const f of zeros)if(f>0)z=mul(z,[1,w/f]);for(const f of poles)if(f>0)z=div(z,[1,w/f]);
    for(let i=0;i<Math.abs(origin);i++)z=origin>0?mul(z,[0,w]):div(z,[0,w]);return z;
  }
  function sanitizeState(raw,chapters,exercises,sections){
    raw=raw&&typeof raw==='object'?raw:{};
    const clean=(k,allowed)=>Array.isArray(raw[k])?[...new Set(raw[k].filter(x=>typeof x==='string'&&allowed.includes(x)))]:[];
    return {mastered:clean('mastered',chapters),wrong:clean('wrong',exercises),bookmarks:clean('bookmarks',sections),font:Number.isFinite(raw.font)?Math.min(19,Math.max(15,raw.font)):17};
  }
  const api={positive,add,mul,div,abs,arg,firstOrder,secondOrder,resonance,filter,loadPower,opAmp,dac,bode,sanitizeState};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CircuitMath=api;
})(typeof window!=='undefined'?window:globalThis);
