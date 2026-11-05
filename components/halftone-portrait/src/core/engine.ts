import {coverRect,samplePoint,targetFor,easingStep,samplingPitch,type Point,type Pointer} from './math';
import {PointIndex} from './point-index';
import {DEFAULT_PROPS,type HalftoneProps} from './options';
type Options=HalftoneProps&{maxDpr:number;frameIndependent:boolean;sharpSquares:boolean};
const sampledOptions=new Set(['src','spacing','size','variation','threshold','contrast','exposure','alphaGamma','opacity','color','accent','accentAmount','colorMode','fit','scale','focalX','focalY','maxDpr','sharpSquares']);

export class HalftonePortrait {
  host:HTMLElement;options:Options;canvas:HTMLCanvasElement;status:HTMLSpanElement;context:CanvasRenderingContext2D|null;
  smoothPointer={x:0,y:0,strength:0,active:false};points:Point[]=[];pointer:Pointer={x:0,y:0,active:false};frame=0;
  visible=true;destroyed=false;generation=0;lastTime=0;frames=0;width=1;height=1;dpr=1;image:HTMLImageElement|null=null;
  needsFullDraw=true;
  pointIndex=new PointIndex();
  displaced=new Set<Point>();
  maxDotRadius=1;
  scratch:HTMLCanvasElement;
  scratchContext:CanvasRenderingContext2D|null;
  pendingDirty:[number,number,number,number]|null=null;
  pendingRebuild:{timer:ReturnType<typeof setTimeout>;promise:Promise<void>;resolve:()=>void}|null=null;
  media:MediaQueryList|null=null;listeners:(()=>void)[]=[];resizeObserver?:ResizeObserver;intersectionObserver?:IntersectionObserver;
  constructor(host:HTMLElement, options:Partial<Options>={}) {
    this.host=host; this.options={...DEFAULT_PROPS,maxDpr:2,frameIndependent:true,sharpSquares:true,...options};
    this.smoothPointer={x:0,y:0,strength:0,active:false};
    this.points=[]; this.pointer={x:0,y:0,active:false}; this.frame=0;
    this.visible=true; this.destroyed=false; this.generation=0; this.lastTime=0;this.frames=0;
    this.canvas=document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden','true');
    Object.assign(this.canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block'});
    this.status=document.createElement('span'); this.status.className='portrait-status';this.status.setAttribute('role','status');
    this.status.textContent='Loading artwork';
    host.append(this.canvas,this.status);host.setAttribute('role','img');host.tabIndex=0;
    host.setAttribute('aria-label',options.alt||'Interactive halftone portrait. Move pointer or use arrow keys; Escape resets.');
    host.dataset['state']='loading';
    this.context=this.canvas.getContext('2d');
    this.scratch=document.createElement('canvas');this.scratchContext=this.scratch.getContext('2d');
    if(!this.context||!this.scratchContext){this.fail('Canvas is unavailable in this browser.');return;}
    this.media=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;this.listeners=[];
    const listen=(target:EventTarget,type:string,handler:EventListener)=>{target.addEventListener(type,handler);this.listeners.push(()=>target.removeEventListener(type,handler));};
    listen(host,'pointermove',e=>this.move(e as PointerEvent));
    listen(host,'pointerleave',()=>this.reset());
    listen(host,'pointerup',e=>{if((e as PointerEvent).pointerType!=='mouse')this.reset();});
    listen(host,'pointercancel',()=>this.reset());
    listen(host,'keydown',e=>this.key(e as KeyboardEvent));listen(host,'blur',()=>this.reset());
    listen(document,'visibilitychange',()=>{if(document.hidden)this.stop();else this.wake();});
    if(this.media)listen(this.media,'change',()=>{this.reset(true);this.wake();});
    if(typeof ResizeObserver!=='undefined'){this.resizeObserver=new ResizeObserver(()=>this.rebuild());this.resizeObserver.observe(host);}else listen(window,'resize',()=>this.rebuild());
    if(typeof IntersectionObserver!=='undefined'){this.intersectionObserver=new IntersectionObserver(([entry])=>{
      this.visible=entry?.isIntersecting??false;if(this.visible)this.rebuild();else this.stop();
    },{threshold:.01});this.intersectionObserver.observe(host);}
    if(options.src)void this.setImage(options.src,options.alt);
  }
  get reduced(){return this.media?.matches || !this.options.motion;}
  move(event:PointerEvent){
    if(this.reduced||this.host.dataset['original']==='true')return;
    const box=this.host.getBoundingClientRect();
    if(!this.pointer.active&&this.smoothPointer.strength<.01){this.smoothPointer.x=(event.clientX-box.left)*this.width/box.width;this.smoothPointer.y=(event.clientY-box.top)*this.height/box.height;}
    this.pointer={x:(event.clientX-box.left)*this.width/box.width,y:(event.clientY-box.top)*this.height/box.height,active:true};
    this.wake();
  }
  key(event:KeyboardEvent){
    if(event.key==='Escape'){event.preventDefault();this.reset();return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||this.reduced)return;
    event.preventDefault();
    if(!this.pointer.active){this.pointer={x:this.width/2,y:this.height/2,active:true};this.smoothPointer.x=this.pointer.x;this.smoothPointer.y=this.pointer.y;}
    const step=event.shiftKey?40:18;
    this.pointer.x=Math.max(0,Math.min(this.width,this.pointer.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0)));
    this.pointer.y=Math.max(0,Math.min(this.height,this.pointer.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0)));
    this.wake();
  }
  async setImage(src:string,alt?:string){
    this.cancelRebuild();
    const id=++this.generation;this.stop();this.points=[];this.pointIndex.rebuild([],1);this.displaced.clear();this.image=null;
    this.host.dataset['state']='loading';this.status.hidden=false;this.status.textContent='Loading artwork';
    this.context?.clearRect(0,0,this.width||1,this.height||1);
    const image=new (this.host.ownerDocument.defaultView?.Image??Image)();image.crossOrigin='anonymous';image.src=src;
    try{await image.decode();if(this.destroyed||id!==this.generation)return;
      this.image=image;if(alt)this.host.setAttribute('aria-label',alt+' Interactive halftone. Arrow keys move the effect; Escape resets.');
      this.reset(true);this.rebuild();
    }catch{if(!this.destroyed&&id===this.generation)this.fail('Artwork could not load. Check the image path and CORS permissions.');}
  }
  fail(message:string){delete this.host.dataset['rendering'];this.stop();this.host.dataset['state']='error';this.status.textContent=message;this.status.hidden=false;}
  setOptions(options:Partial<Options>){
    const resample=Object.entries(options).some(([key,value])=>sampledOptions.has(key)&&this.options[key as keyof Options]!==value);
    this.options={...this.options,...options};
    if(options.alt!==undefined)this.host.setAttribute('aria-label',options.alt+' Interactive halftone. Arrow keys move the effect; Escape resets.');
    this.reset(true);
    if(resample&&this.image&&this.width*this.height>1_000_000){
      // Acknowledge large image changes before sampling blocks the main thread.
      // Keep the complete previous frame visible and coalesce edits into one job.
      if(!this.pendingRebuild){
        this.stop();this.status.hidden=false;this.status.textContent='Rendering artwork';this.host.dataset['rendering']='true';
        let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});
        const timer=setTimeout(()=>{this.pendingRebuild=null;if(!this.destroyed)this.rebuild();resolve();},64);
        this.pendingRebuild={timer,promise,resolve};
      }
      return this.pendingRebuild.promise;
    }
    if(resample)this.rebuild();
    return this.pendingRebuild?.promise;
  }
  cancelRebuild(){
    if(this.pendingRebuild){clearTimeout(this.pendingRebuild.timer);this.pendingRebuild.resolve();this.pendingRebuild=null;}
    delete this.host.dataset['rendering'];
  }
  rebuild(){
    if(this.destroyed||!this.context||!this.image||!this.visible)return;
    const width=Math.max(1,this.host.clientWidth),height=Math.max(1,this.host.clientHeight);
    if(width!==this.width||height!==this.height)this.pointer.active=false;
    this.width=width;this.height=height;this.dpr=Math.min(this.options.maxDpr,Math.max(1,devicePixelRatio||1));
    this.needsFullDraw=true;
    this.canvas.width=Math.round(width*this.dpr);this.canvas.height=Math.round(height*this.dpr);
    this.scratch.width=this.canvas.width;this.scratch.height=this.canvas.height;
    this.canvas.style.width=width+'px';this.canvas.style.height=height+'px';
    const sample=document.createElement('canvas');sample.width=width;sample.height=height;
    const ctx=sample.getContext('2d',{willReadFrequently:true});if(!ctx)return this.fail('Image sampling is unavailable.');
    const crop=coverRect(width,height,this.image.naturalWidth,this.image.naturalHeight,this.options.fit,this.options.scale,this.options.focalX,this.options.focalY);
    ctx.drawImage(this.image,crop.x,crop.y,crop.width,crop.height);
    let data;try{data=ctx.getImageData(0,0,width,height).data;}catch{this.fail('This image does not allow canvas sampling. Use a same-origin image.');return;}
    this.points=[];this.displaced.clear();this.maxDotRadius=1;const pitch=samplingPitch(this.options.spacing);
    for(let y=0;y<height;y+=pitch)for(let x=0;x<width;x+=pitch){
      const i=(y*width+x)*4,p=samplePoint(data[i]??0,data[i+1]??0,data[i+2]??0,data[i+3]??0,x,y,this.options);
      if(p){this.points.push(p);this.maxDotRadius=Math.max(this.maxDotRadius,p.size);}
    }
    this.pointIndex.rebuild(this.points,pitch);
    delete this.host.dataset['rendering'];
    this.host.dataset['state']='ready';this.host.dataset['points']=String(this.points.length);this.status.hidden=true;
    this.host.dispatchEvent(new CustomEvent('halftone:ready',{detail:{points:this.points.length,width,height}}));this.wake();
  }
  reset(immediate=false){
    this.pointer.active=false;
    if(immediate){
      this.smoothPointer.strength=0;
      let [left,top,right,bottom]=this.pendingDirty??[Infinity,Infinity,-Infinity,-Infinity];
      for(const p of this.displaced){
        if(p.x!==p.homeX||p.y!==p.homeY){
          const margin=Math.max(1,p.size)+2;
          left=Math.min(left,p.x-margin,p.homeX-margin);top=Math.min(top,p.y-margin,p.homeY-margin);
          right=Math.max(right,p.x+margin,p.homeX+margin);bottom=Math.max(bottom,p.y+margin,p.homeY+margin);
          p.x=p.homeX;p.y=p.homeY;
        }
      }
      this.displaced.clear();
      this.pendingDirty=[left,top,right,bottom];
    }
    this.wake();
  }
  wake(){if(!this.frame&&!this.pendingRebuild&&!this.destroyed&&this.visible&&!document.hidden&&this.image){this.lastTime=0;this.frame=requestAnimationFrame(t=>this.draw(t));}}
  stop(){cancelAnimationFrame(this.frame);this.frame=0;this.lastTime=0;}
  draw(time:number){
    this.frame=0;if(this.destroyed||!this.visible||document.hidden||!this.context)return;
    const dt=this.lastTime?time-this.lastTime:1000/60;this.lastTime=time;
    const o=this.options,ctx=this.context,blend=easingStep(o.returnSpeed,dt,o.frameIndependent);
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    let moving=false;
    let pointer:Pointer=this.reduced?{x:0,y:0,active:false}:this.pointer;
    if(o.cursorSmoothing && !this.reduced){
      const s=this.smoothPointer,k=easingStep(o.cursorSmoothing,dt,true),release=easingStep(o.releaseSpeed??.12,dt,true);
      s.x+=(this.pointer.x-s.x)*k;s.y+=(this.pointer.y-s.y)*k;
      s.strength+=((this.pointer.active?1:0)-s.strength)*release;
      s.active=s.strength>.001;pointer=s;
      moving=Math.abs((this.pointer.active?1:0)-s.strength)>.001 || (s.active&&(Math.abs(this.pointer.x-s.x)+Math.abs(this.pointer.y-s.y)>.05));
    }
    this.host.style.setProperty('--halftone-cursor-x',pointer.x+'px');this.host.style.setProperty('--halftone-cursor-y',pointer.y+'px');
    this.host.dataset['cursor']=String(Boolean(o.showCursor&&pointer.active&&!this.reduced));
    let [left,top,right,bottom]=this.pendingDirty??[Infinity,Infinity,-Infinity,-Infinity];
    this.pendingDirty=null;
    if(pointer.active){
      this.pointIndex.forEach(pointer.x-o.radius,pointer.y-o.radius,pointer.x+o.radius,pointer.y+o.radius,p=>this.displaced.add(p));
    }
    for(const p of this.displaced){
      const [tx,ty]=targetFor(p.homeX,p.homeY,pointer,o.radius,o.force,o.cursorMode,o.falloff);
      const dx=(tx-p.x)*blend,dy=(ty-p.y)*blend;
      if(Math.abs(dx)>.01||Math.abs(dy)>.01)moving=true;
      const x=this.reduced?tx:p.x+dx,y=this.reduced?ty:p.y+dy;
      if(x!==p.x||y!==p.y){
        // Include both old and new geometry, plus conservative antialias coverage.
        const margin=Math.max(1,p.size)+2;
        left=Math.min(left,p.x-margin,x-margin);top=Math.min(top,p.y-margin,y-margin);
        right=Math.max(right,p.x+margin,x+margin);bottom=Math.max(bottom,p.y+margin,y+margin);
      }
      p.x=x;p.y=y;
      if(x===p.homeX&&y===p.homeY)this.displaced.delete(p);
    }
    const floorPixel=(value:number)=>Math.floor(value*this.dpr)/this.dpr;
    const ceilPixel=(value:number)=>Math.ceil(value*this.dpr)/this.dpr;
    const full=this.needsFullDraw;
    if(full){left=0;top=0;right=this.width;bottom=this.height;}
    else {left=Math.max(0,floorPixel(left));top=Math.max(0,floorPixel(top));right=Math.min(this.width,ceilPixel(right));bottom=Math.min(this.height,ceilPixel(bottom));}
    if(right>left&&bottom>top&&this.scratchContext){
      // Draw complete shapes on a same-size scratch surface. Copy only the dirty
      // pixels afterward: clipping circle geometry changes its antialias coverage.
      const paint=full?ctx:this.scratchContext;
      paint.setTransform(this.dpr,0,0,this.dpr,0,0);
      paint.clearRect(left,top,right-left,bottom-top);
      let fillColor:string|undefined;
      const dot=(p:Point)=>{
        const margin=Math.max(1,p.size)+2;
        if(!full&&(p.x+margin<left||p.x-margin>right||p.y+margin<top||p.y-margin>bottom))return;
        paint.globalAlpha=p.alpha;
        if(p.color!==fillColor){paint.fillStyle=p.color;fillColor=p.color;}
        if(p.size<=1){const offset=o.sharpSquares?0:-.5;paint.fillRect(p.x+offset,p.y+offset,1,1);}
        else{paint.beginPath();paint.arc(p.x,p.y,p.size,0,Math.PI*2);paint.fill();}
      };
      if(full)this.points.forEach(dot);
      else{
        // Every displaced point stays within force of its home coordinate.
        // Row-major iteration preserves the original translucent overlap order.
        const reach=o.force+this.maxDotRadius+2;
        this.pointIndex.forEach(left-reach,top-reach,right+reach,bottom+reach,dot);
        const x=Math.round(left*this.dpr),y=Math.round(top*this.dpr);
        const width=Math.round(right*this.dpr)-x,height=Math.round(bottom*this.dpr)-y;
        ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
        ctx.clearRect(x,y,width,height);
        ctx.drawImage(this.scratch,x,y,width,height,x,y,width,height);
        ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      }
      paint.globalAlpha=1;
    }
    this.needsFullDraw=false;
    ctx.globalAlpha=1;this.frames++;this.host.dataset['frames']=String(this.frames);
    this.host.dataset['moving']=String(moving);
    // At rest even an active stationary pointer sleeps. Next movement wakes it.
    if(moving&&!this.reduced)this.frame=requestAnimationFrame(t=>this.draw(t));
  }
  destroy(){
    this.destroyed=true;this.generation++;this.cancelRebuild();this.stop();this.listeners?.forEach(remove=>remove());
    this.resizeObserver?.disconnect();this.intersectionObserver?.disconnect();this.canvas.remove();this.status.remove();this.points=[];this.pointIndex.rebuild([],1);this.displaced.clear();this.scratch.width=this.scratch.height=0;this.pendingDirty=null;
  }
}
