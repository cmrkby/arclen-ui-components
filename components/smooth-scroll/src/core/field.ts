import type {Settings} from './index';
import {colorKeys} from './palettes';
/** A static, full-height colour field. Scrolling moves the artwork itself. */
export function createField(canvas: HTMLCanvasElement | null) {
  if (!canvas) return null;
  let gl:WebGLRenderingContext|null;
  try { gl=canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false }); } catch { return null; }
  if (!gl) return null;
  const shader = (type: number, source: string) => {
    const result = gl.createShader(type);
    if (!result) return null;
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) { gl.deleteShader(result); return null; }
    return result;
  };
  const vertex = shader(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}');
  const fragment = shader(gl.FRAGMENT_SHADER, `
    precision highp float;
    uniform vec2 size;
    uniform vec2 resolution;
    uniform vec4 background;
    uniform vec4 navy;
    uniform vec4 midnight;
    uniform vec4 indigo;
    uniform vec4 cobalt;
    uniform vec4 blue;
    uniform vec4 accent;
    uniform vec4 lavender;
    uniform vec4 violet;
    uniform vec4 magenta;
    uniform vec4 rose;
    uniform vec4 coral;
    uniform float grainStrength;
    uniform float grainSize;
    float noise(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
    vec4 palette(float t){
      vec4 c=background;
      c=mix(c,navy,smoothstep(0.,1.,t));
      c=mix(c,midnight,clamp(t-1. ,0.,1.));
      c=mix(c,indigo,clamp(t-2. ,0.,1.));
      c=mix(c,cobalt,clamp(t-3. ,0.,1.));
      c=mix(c,blue,clamp(t-4. ,0.,1.));
      c=mix(c,accent,clamp(t-5. ,0.,1.));
      c=mix(c,lavender,clamp(t-6. ,0.,1.));
      c=mix(c,violet,clamp(t-7. ,0.,1.));
      c=mix(c,magenta,clamp(t-8. ,0.,1.));
      c=mix(c,rose,clamp(t-9. ,0.,1.));
      c=mix(c,coral,clamp(t-10. ,0.,1.));
      return c;
    }
    void main(){
      vec2 point=gl_FragCoord.xy/resolution*size;
      float x=(point.x-size.x*.5)/max(720.,size.x*.5);
      float y=(size.y-point.y-2400.)/2400.;
      float f0=((((((0.2089969*y+0.0578805)*y-0.2639373)*y+0.0504748)*y+0.4286397)*y-0.0416858)*y-0.0040046);
      float f1=((((((-0.2639312*y-0.2499148)*y+0.7185254)*y+0.5510092)*y-0.4035225)*y-0.4479546)*y+0.4233021);
      float f2=((((((0.0000000*y+0.0790344)*y+0.2869957)*y-0.2558269)*y-0.1296740)*y+0.3158375)*y+0.0865277);
      float f3=((((((0.0000000*y+0.0000000)*y-0.2386353)*y-0.0885684)*y+0.3352973)*y+0.0587401)*y-0.0208729);
      float field=((f3*x+f2)*x+f1)*x+f0;
      vec2 pixel=vec2(point.x,size.y-point.y)/grainSize;
      float fine=noise(floor(pixel))-.5;
      // Fine diagonal structure softens into a stippled field down the page.
      float structure=1.-smoothstep(2400.,3500.,size.y-point.y);
      float weave=.17*sin(6.2831853*dot(pixel,vec2(.0455,.0840)))
        +.12*sin(6.2831853*dot(pixel,vec2(.069,-.451)))
        +.09*sin(6.2831853*dot(pixel,vec2(.4375,-.0078)))
        +.08*sin(6.2831853*dot(pixel,vec2(.328,-.336)));
      float grain=(fine+weave*structure)*grainStrength;
      vec4 color=palette(clamp(field+grain*.105,0.,1.)*11.);
      color.rgb+=grain*min(background.rgb/max(background.a,.0001),vec3(.09))*.65*(1.-smoothstep(.0,.1,field))*color.a;
      gl_FragColor=vec4(clamp(color.rgb,vec3(0.),vec3(color.a)),color.a);
    }
  `);
  if (!vertex || !fragment) { if (vertex) gl.deleteShader(vertex); if (fragment) gl.deleteShader(fragment); return null; }
  const program=gl.createProgram();
  if (!program) { gl.deleteShader(vertex); gl.deleteShader(fragment); return null; }
  gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  gl.deleteShader(vertex);gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
  const buffer=gl.createBuffer();
  if (!buffer) { gl.deleteProgram(program); return null; }
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const location=gl.getAttribLocation(program,'p');
  const size=gl.getUniformLocation(program,'size'),resolution=gl.getUniformLocation(program,'resolution');
  const colorLocations=colorKeys.map(key=>gl.getUniformLocation(program,key));
  const grainLocation=gl.getUniformLocation(program,'grainStrength'),grainSizeLocation=gl.getUniformLocation(program,'grainSize');
  const maximum=gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;
  let previous='',destroyed=false;
  const rgba=(hex:string)=>{
    if(hex==='transparent')return [0,0,0,0];
    const alpha=hex.length===9?parseInt(hex.slice(7,9),16)/255:1;
    return [...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255*alpha),alpha];
  };
  const draw=(width:number,settings:Settings)=>{
    if(destroyed||gl.isContextLost())return;
    const w=Math.max(1,Math.round(width)),key=`${w}:${colorKeys.map(key=>settings[key]).join(':')}:${settings.grain}:${settings.grainSize}`;
    if(previous===key)return;previous=key;
    const scale=Math.min(1,maximum/w,maximum/4800);
    canvas.width=Math.round(w*scale);canvas.height=Math.round(4800*scale);
    gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
    gl.uniform2f(size,w,4800);gl.uniform2f(resolution,canvas.width,canvas.height);colorKeys.forEach((key,i)=>gl.uniform4fv(colorLocations[i],rgba(settings[key])));
    gl.uniform1f(grainLocation,settings.grain);gl.uniform1f(grainSizeLocation,settings.grainSize);
    gl.drawArrays(gl.TRIANGLES,0,6);canvas.dataset.ready='true';
  };
  // Keep the CSS artwork visible if the browser reclaims this static context.
  const lost=()=>{canvas.dataset.ready='false';previous='';};
  canvas.addEventListener('webglcontextlost',lost);
  return {draw,destroy(){if(destroyed)return;destroyed=true;canvas.dataset.ready='false';canvas.removeEventListener('webglcontextlost',lost);gl.deleteBuffer(buffer);gl.deleteProgram(program);}};
}
