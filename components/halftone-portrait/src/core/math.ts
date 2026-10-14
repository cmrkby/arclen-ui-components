import type {HalftoneProps} from './options';
export interface Point{homeX:number;homeY:number;x:number;y:number;size:number;alpha:number;color:string}
export interface Pointer{x:number;y:number;active:boolean;strength?:number}
export function coverRect(w:number,h:number,iw:number,ih:number,fit='cover',zoom=1,focalX=.5,focalY=.5) {
  const scale = (fit === 'contain' ? Math.min(w/iw,h/ih) : Math.max(w/iw,h/ih))*zoom;
  return {x:(w-iw*scale)*focalX,y:(h-ih*scale)*focalY,width:iw*scale,height:ih*scale};
}
const fract = (value:number) => value-Math.floor(value);
export function samplePoint(r:number,g:number,b:number,a:number,x:number,y:number,o:HalftoneProps):Point|null {
  if(a/255 < .08) return null;
  // Photo pixels already carry their brightness in RGB. Applying luminance
  // again to opacity would crush shadows and flatten coloured backgrounds.
  if(o.colorMode==='photo') {
    const tone=(value:number)=>Math.round(Math.max(0,Math.min(1,(value/255*(o.exposure??1)-.5)*o.contrast+.5))**(o.alphaGamma??1)*255);
    const rgb=[r,g,b].map(tone);
    if(Math.max(...rgb)/255<o.threshold)return null;
    const noise=fract(Math.sin(x*12.9898+y*78.233)*43758.5453);
    return {homeX:x,homeY:y,x,y,size:o.size*Math.max(.2,1+(noise-.5)*2*o.variation),
      alpha:a/255*o.opacity,color:`rgb(${rgb.join(',')})`};
  }
  const luminance = Math.max(0,Math.min(1,((r+g+b)/765*(o.exposure??1)-.5)*o.contrast+.5));
  if(luminance < o.threshold) return null;
  const q = (luminance-o.threshold)/Math.max(.001,1-o.threshold);
  const noise=fract(Math.sin(x*12.9898+y*78.233)*43758.5453);
  const variation=1+(noise-.5)*2*o.variation;
  return {homeX:x,homeY:y,x,y,size:o.size*q**.72*Math.max(.2,variation),
    alpha:q**(o.alphaGamma??1)*o.opacity,color:o.colorMode==='original'?`rgb(${r},${g},${b})`:fract(Math.sin(x*4.112+y*9.331)*9182.381)<o.accentAmount?o.accent:o.color};
}
export function targetFor(x:number,y:number,p:Pointer,radius:number,force:number,mode='repel',falloff=2):[number,number] {
  if(!p.active || radius<=0) return [x,y];
  const dx=x-p.x,dy=y-p.y,d2=dx*dx+dy*dy;
  if(d2>=radius*radius || d2<=.001) return [x,y];
  const distance=Math.sqrt(d2),push=force*(1-distance/radius)**falloff*(p.strength??1);
  if(mode==='attract')return [x-dx/distance*Math.min(push,distance*.85),y-dy/distance*Math.min(push,distance*.85)];
  if(mode==='swirl')return [x-dy/distance*push,y+dx/distance*push];
  return [x+dx/distance*push,y+dy/distance*push];
}
export function easingStep(speed:number,dt:number,independent:boolean) {
  return independent ? 1-(1-speed)**(Math.min(dt,50)/(1000/60)) : speed;
}

/** Dot spacing is authored in CSS pixels, independent of host size and display density. */
export function samplingPitch(spacing:number):number {return Math.max(2,Math.round(spacing));}
