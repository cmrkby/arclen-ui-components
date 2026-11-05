import { GRAIN_REFINED_WIDE, GRAIN_REFINED_PORTRAIT, GRAIN_MOTION, GRAIN_PORTRAIT_MOTION } from './field-data';
export function sampleGeometry(seconds: number, seed: number, knots: number[][]) {
    const t = ((seconds + (seed === 12 ? 0 : seed * .731)) % 83.8 + 83.8) % 83.8;
    let i = 0; while (i < knots.length - 2 && knots[i + 1][0] <= t) i++;
    const a = knots[i], b = knots[i+1];
    const previous = knots[knots.length-2];
    const before = i === 0 ? [previous[0]-83.8,...previous.slice(1)] : knots[i-1];
    const next = knots[1];
    const after = i+2 >= knots.length ? [next[0]+83.8,...next.slice(1)] : knots[i+2];
    const dt=b[0]-a[0], u=(t-a[0])/dt, u2=u*u,u3=u2*u;
    return a.slice(1).map((v,j)=>{
      const k=j+1;
      const m0=(b[k]-before[k])/(b[0]-before[0]);
      const m1=(after[k]-a[k])/(after[0]-a[0]);
      return (2*u3-3*u2+1)*v+(u3-2*u2+u)*dt*m0+(-2*u3+3*u2)*b[k]+(u3-u2)*dt*m1;
    });
  }
export function geometryAt(seconds: number,seed: number,aspect=1.6) {
    const main=sampleGeometry(seconds,seed,GRAIN_MOTION);
    const portrait=sampleGeometry(seconds,seed,GRAIN_PORTRAIT_MOTION);
    const mix=Math.max(0,Math.min(1,(1.6-aspect)/1.22));
    return main.map((v,i)=>v+(portrait[i]-v)*mix);
  }
export function sampleColor(seconds: number,seed: number,knots: number[][]) {
    const t=((seconds+(seed===12?0:seed*.731))%83.8+83.8)%83.8;
    let i=0;while(i<knots.length-2&&knots[i+1][0]<=t)i++;
    const a=knots[i],b=knots[i+1];
    let f=(t-a[0])/(b[0]-a[0]);f=f*f*(3-2*f);
    return a.slice(1).map((v,j)=>v+(b[j+1]-v)*f);
  }
export function colorDepthAt(seconds: number,seed: number,aspect=1.6) {
    const main=sampleColor(seconds,seed,GRAIN_REFINED_WIDE);
    const portrait=sampleColor(seconds,seed,GRAIN_REFINED_PORTRAIT);
    const mix=Math.max(0,Math.min(1,(1.6-aspect)/1.22));
    return main.map((v,i)=>v+(portrait[i]-v)*mix);
  }
