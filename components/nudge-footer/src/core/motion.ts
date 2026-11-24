export type SpringSettings = {radius:number; travel:number; tilt:number; spring:number; damping:number; motion:boolean; falloff:number; response:(key:string)=>number};
export function stickerMotion(art: HTMLElement, read:()=>SpringSettings, initiallyPaused:boolean) {
  const win=art.ownerDocument.defaultView!, doc=art.ownerDocument;
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const fine=win.matchMedia('(hover: hover) and (pointer: fine)');
  const events=new AbortController(), opts={signal:events.signal};
  const pieces=Array.from(art.querySelectorAll<HTMLElement>('.nf-piece')).map(el=>({
    el, img:el.querySelector('img')!, position:[0,0,0], speed:[0,0,0], target:[0,0,0]
  }));
  let frame=0, previous=0, visible=true, paused=initiallyPaused;
  function reset(){
    win.cancelAnimationFrame(frame);frame=0;previous=0;
    for(const p of pieces){p.position.fill(0);p.speed.fill(0);p.target.fill(0);p.img.style.removeProperty('transform');}
  }
  function tick(time:number){
    const dt=previous?Math.max(1/240,Math.min(1/30,(time-previous)/1000)):1/60;
    previous=time;frame=0;const s=read();let moving=false;
    for(const p of pieces){
      let error=0;
      for(let i=0;i<3;i++){
        p.speed[i]=(p.speed[i]+(p.target[i]-p.position[i])*s.spring*dt)*Math.exp(-s.damping*dt);
        p.position[i]+=p.speed[i]*dt;error+=Math.abs(p.speed[i])+Math.abs(p.target[i]-p.position[i]);
      }
      if(error<=.08){p.position=[...p.target];p.speed.fill(0);}else moving=true;
      const [x,y,angle]=p.position;
      p.img.style.transform='translate('+x.toFixed(3)+'px,'+y.toFixed(3)+'px) rotate(calc(var(--angle) + '+angle.toFixed(3)+'deg))';
    }
    if(moving)frame=win.requestAnimationFrame(tick);else previous=0;
  }
  function animate(){if(!frame)frame=win.requestAnimationFrame(tick);}
  function leave(){if(pieces.some(p=>p.target.some(Boolean))){for(const p of pieces)p.target.fill(0);animate();}}
  art.addEventListener('pointermove',event=>{
    const s=read();
    if(paused || !visible || doc.hidden || !s.motion || !fine.matches || reduced.matches || event.pointerType==='touch')return;
    const scale=Math.min(1.5,Math.max(.4,art.clientWidth/1200));
    pieces.forEach((p,index)=>{
      const r=p.el.getBoundingClientRect();if(!r.width)return;
      const dx=r.left+r.width/2-event.clientX,dy=r.top+r.height/2-event.clientY,d=Math.hypot(dx,dy);
      const direction=d<.1?index*2.4:Math.atan2(dy,dx);
      const max=s.travel*scale, force=max*Math.pow(Math.max(0,1-d/(s.radius*scale)),s.falloff)*s.response(p.el.dataset.piece!);
      const x=Math.cos(direction)*force,y=Math.sin(direction)*force;
      p.target=[x,y,Math.max(-1,Math.min(1,(x-.25*y)/max))*s.tilt];
    });
    animate();
  },opts);
  art.addEventListener('pointerleave',leave,opts);art.addEventListener('pointercancel',leave,opts);
  for(const query of [reduced,fine])query.addEventListener('change',reset,opts);
  doc.addEventListener('visibilitychange',reset,opts);win.addEventListener('blur',reset,opts);
  const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(!visible)reset();});
  io.observe(art);
  return {reset,pause(){paused=true;reset();},resume(){paused=false;},destroy(){reset();io.disconnect();events.abort();}};
}
