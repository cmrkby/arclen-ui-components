import {VERTEX, FRAGMENT} from './shaders';
import type {Settings} from './settings';
/** Bounded backing store; CSS dimensions retain their full layout size. */
export function backingSize(width: number, height: number, dpr: number, limit = 4096) {
  const w = Math.max(1, width), h = Math.max(1, height);
  const scale = Math.min(Math.max(1, dpr), 1.5, Math.sqrt(1250000/(w*h)), limit/w, limit/h);
  return {width: Math.max(1, Math.floor(w*scale)), height: Math.max(1, Math.floor(h*scale))};
}
/** Document-scoped lifecycle follows Arclen's Grain Gradient controller architecture. */
export function createRenderer(canvas: HTMLCanvasElement, initial: Settings, initiallyPaused = false) {
  const doc = canvas.ownerDocument, view = doc.defaultView;
  if (!view || !(canvas instanceof view.HTMLCanvasElement)) throw new TypeError('A canvas with an owner window is required.');
  const win = view;
  let softwareRenderer = false;
  let settings = initial, paused = initiallyPaused, disposed = false, available = false, lost = false;
  let gl: WebGLRenderingContext | null = null, program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null;
  let uniforms: Record<string, WebGLUniformLocation | null> = {};
  let phase = 0, last: number | null = null, raf: number | null = null;
  let width = 1, height = 1, limit = 4096, visible = false, dirty = true;
  let intersection: boolean | null = null;
  const media = typeof win.matchMedia === 'function' ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let resizeObserver: ResizeObserver | null = null, intersectionObserver: IntersectionObserver | null = null;
  function visibleNow() {
    const r=canvas.getBoundingClientRect();
    return r.width>0 && r.height>0 && r.bottom>0 && r.right>0 && r.top<win.innerHeight && r.left<win.innerWidth;
  }
  function reason() {
    if(disposed) return 'destroyed'; if(!available) return lost?'context-lost':'fallback';
    if(doc.hidden) return 'hidden'; if(!visible) return 'offscreen'; if(paused) return 'paused';
    if(media?.matches) return 'reduced-motion'; if(settings.speed===0) return 'speed-zero';
    if(softwareRenderer) return 'software-renderer';
    return typeof win.requestAnimationFrame==='function'?'running':'static';
  }
  function stop(){if(raf!==null)win.cancelAnimationFrame?.(raf);raf=null;last=null;}
  function compile(type:number,source:string){
    const s=gl!.createShader(type);if(!s)throw new Error('Shader allocation failed.');
    gl!.shaderSource(s,source);gl!.compileShader(s);
    if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS)){gl!.deleteShader(s);throw new Error('Shader compilation failed.');}return s;
  }
  function initialize(){
    let vs:WebGLShader|null=null,fs:WebGLShader|null=null,p:WebGLProgram|null=null,b:WebGLBuffer|null=null;
    try {
      gl=gl||canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
      if(!gl)return false;
      const rendererInfo=gl.getExtension('WEBGL_debug_renderer_info');
      const rendererName=rendererInfo?String(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)):'';
      softwareRenderer=/SwiftShader|llvmpipe|softpipe|Software Rasterizer|Microsoft Basic Render Driver/i.test(rendererName);
      const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);if(!precision||precision.precision<16)return false;
      vs=compile(gl.VERTEX_SHADER,VERTEX);fs=compile(gl.FRAGMENT_SHADER,FRAGMENT);p=gl.createProgram();if(!p)throw new Error('Program allocation failed.');
      gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('Program link failed.');
      b=gl.createBuffer();if(!b)throw new Error('Buffer allocation failed.');gl.bindBuffer(gl.ARRAY_BUFFER,b);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.useProgram(p);
      const location=gl.getAttribLocation(p,'a_position');if(location<0)throw new Error('Position attribute missing.');
      gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
      uniforms={};for(const name of ['resolution','cssSize','blue','ember','background','strength','spread','softness','grain','phase','variant'])uniforms[name]=gl.getUniformLocation(p,`u_${name}`);
      const max=gl.getParameter(gl.MAX_VIEWPORT_DIMS);limit=Math.min(4096,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),max[0],max[1]);
      if(program)gl.deleteProgram(program);if(buffer)gl.deleteBuffer(buffer);program=p;buffer=b;p=null;b=null;return true;
    } catch {return false;} finally {if(vs)gl!.deleteShader(vs);if(fs)gl!.deleteShader(fs);if(p)gl!.deleteProgram(p);if(b)gl!.deleteBuffer(b);}
  }
  const palette=new Float32Array(9);
  function draw(){
    if(!available||!gl||disposed||lost)return;
    [settings.blueColor,settings.emberColor,settings.backgroundColor].forEach((c,i)=>{for(let k=0;k<3;k++)palette[i*3+k]=parseInt(c.slice(1+k*2,3+k*2),16)/255;});
    gl.useProgram(program);gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform2f(uniforms.cssSize,width,height);
    gl.uniform3fv(uniforms.blue,palette.subarray(0,3));gl.uniform3fv(uniforms.ember,palette.subarray(3,6));gl.uniform3fv(uniforms.background,palette.subarray(6,9));
    gl.uniform2f(uniforms.strength,settings.blueStrength,settings.emberStrength);
    gl.uniform1f(uniforms.spread,settings.spread);gl.uniform1f(uniforms.softness,settings.softness);gl.uniform1f(uniforms.grain,settings.grain);gl.uniform1f(uniforms.phase,phase);gl.uniform1f(uniforms.variant,settings.variant==='perimeter'?0:settings.variant==='sweep'?1:2);
    gl.drawArrays(gl.TRIANGLES,0,3);dirty=false;canvas.style.visibility='visible';canvas.setAttribute('data-folds-ready','true');
  }
  function tick(now:number){
    raf=null;if(reason()!=='running'){last=null;return;}
    if(last!==null)phase+=Math.min(.1,Math.max(0,(now-last)/1000))*settings.speed;
    last=now;draw();if(reason()==='running')raf=win.requestAnimationFrame(tick);
  }
  function reconcile(){
    if(disposed)return;const status=reason();if(status!=='running')stop();
    if(available&&!lost&&!doc.hidden&&visible&&dirty)draw();
    if(status==='running'&&raf===null)raf=win.requestAnimationFrame(tick);canvas.setAttribute('data-folds-status',status);
  }
  function resize(){
    if(disposed)return;const rect=canvas.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    const size=backingSize(width,height,win.devicePixelRatio||1,limit);if(canvas.width!==size.width||canvas.height!==size.height){canvas.width=size.width;canvas.height=size.height;}
    visible=intersection!==false&&visibleNow();dirty=true;reconcile();
  }
  function visibilityChanged(){dirty=true;reconcile();}
  function reducedChanged(){dirty=true;reconcile();}
  function contextLost(event:Event){event.preventDefault();lost=true;available=false;program=null;buffer=null;canvas.style.visibility='hidden';canvas.setAttribute('data-folds-ready','false');stop();reconcile();}
  function contextRestored(){if(disposed)return;lost=false;available=initialize();dirty=true;resize();}
  function update(next:Settings){if(disposed)throw new Error('This instance is destroyed.');settings=next;dirty=true;resize();}
  function pause(){if(!disposed){paused=true;reconcile();}}
  function resume(){if(!disposed){paused=false;reconcile();}}
  function destroy(){
    if(disposed)return;stop();disposed=true;resizeObserver?.disconnect();intersectionObserver?.disconnect();
    doc.removeEventListener('visibilitychange',visibilityChanged);win.removeEventListener('resize',resize);win.removeEventListener('scroll',resize,true);media?.removeEventListener?.('change',reducedChanged);
    canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);
    if(gl&&!lost){if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}
    buffer=null;program=null;available=false;canvas.style.visibility='hidden';canvas.setAttribute('data-folds-ready','false');canvas.setAttribute('data-folds-status','destroyed');
  }
  canvas.style.visibility='hidden';available=initialize();
  doc.addEventListener('visibilitychange',visibilityChanged);win.addEventListener('resize',resize);media?.addEventListener?.('change',reducedChanged);
  canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);
  if(typeof win.ResizeObserver==='function'){resizeObserver=new win.ResizeObserver(resize);resizeObserver.observe(canvas);}
  if(typeof win.IntersectionObserver==='function'){intersectionObserver=new win.IntersectionObserver(entries=>{if(disposed||!entries[0])return;intersection=entries[0].isIntersecting&&entries[0].intersectionRatio>0;visible=intersection&&visibleNow();dirty=true;reconcile();});intersectionObserver.observe(canvas);}
  else win.addEventListener('scroll',resize,{capture:true,passive:true});
  resize();return Object.freeze({update,pause,resume,destroy});
}
