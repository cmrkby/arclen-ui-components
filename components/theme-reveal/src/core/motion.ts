export type Theme = 'light' | 'dark';
export interface MotionSettings { duration:number; easing:'gentle'|'smooth'|'linear'|'curtain'; revealStyle:'circle'|'curtain'|'fade'; revealOrigin:'trigger'|'center'|'custom'; originX:number; originY:number; edgeSoftness:number }
export const motionKeys=['duration','easing','revealStyle','revealOrigin','originX','originY','edgeSoftness'] as const;
/** Soft Circle accepts a trigger element or viewport coordinates. */
export type Origin = Element | {x:number;y:number};
export const easings = {gentle:'cubic-bezier(.22,1,.36,1)',smooth:'cubic-bezier(.4,0,.2,1)',linear:'linear',curtain:'cubic-bezier(0.45,0,0.15,1)'};
export function originPoint(s:MotionSettings,w:number,h:number,origin?:Origin,offset={x:0,y:0}) {
  if(s.revealOrigin==='custom')return{x:w*s.originX/100,y:h*s.originY/100};
  if(s.revealOrigin==='trigger'&&origin){
    const p='getBoundingClientRect'in origin?origin.getBoundingClientRect():null;
    const x=p?p.left+p.width/2:(origin as {x:number}).x,y=p?p.top+p.height/2:(origin as {y:number}).y;
    if(!Number.isFinite(x)||!Number.isFinite(y))throw new TypeError('Origin must contain finite viewport coordinates');
    return{x:Math.max(0,Math.min(w,x-offset.x)),y:Math.max(0,Math.min(h,y-offset.y))};
  }
  return{x:w/2,y:h/2};
}
/** Curtain moves the outgoing cover; Soft Circle feathers the incoming dark surface. */
export function revealFrames(s:MotionSettings,w=1,h=1,p={x:w/2,y:h/2}):Keyframe[] {
  if(s.revealStyle==='curtain')return[{transform:'translateY(0%)'},{transform:'translateY(-100%)'}];
  if(s.revealStyle==='fade')return[{opacity:0},{opacity:1}];
  const radius=Math.max(Math.hypot(p.x,p.y),Math.hypot(w-p.x,p.y),Math.hypot(p.x,h-p.y),Math.hypot(w-p.x,h-p.y))/(1-s.edgeSoftness)+2;
  const mask=`radial-gradient(circle closest-side,#000 ${100*(1-s.edgeSoftness)}%,transparent 100%)`;
  return [{maskImage:mask,maskRepeat:'no-repeat',maskSize:'0px 0px',maskPosition:`${p.x}px ${p.y}px`},{maskImage:mask,maskRepeat:'no-repeat',maskSize:`${radius*2}px ${radius*2}px`,maskPosition:`${p.x-radius}px ${p.y-radius}px`}];
}
