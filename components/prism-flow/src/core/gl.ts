import {fragment} from './shader';
import {palettes, type Settings} from './settings';

export function createField(canvas: HTMLCanvasElement) {
  let context: WebGLRenderingContext | null;
  try {
    context = canvas.getContext('webgl', {alpha:false, depth:false, antialias:false, premultipliedAlpha:false});
  } catch {
    return null;
  }
  const gl = context;
  if (!gl) return null;
  const program = gl.createProgram();
  if (!program) return null;
  const shaders: WebGLShader[] = [];
  let buffer: WebGLBuffer | null = null;
  function release() {
    gl!.deleteBuffer(buffer);
    gl!.deleteProgram(program);
    for (const shader of shaders) gl!.deleteShader(shader);
  }
  const vertex = 'attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}';
  for (const [kind,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]] as const) {
    const shader = gl.createShader(kind);
    if (!shader) {release(); return null;}
    shaders.push(shader);
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {release(); return null;}
    gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  buffer = gl.createBuffer();
  if (!gl.getProgramParameter(program,gl.LINK_STATUS) || !buffer) {release(); return null;}
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program,'position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const uniforms = Object.fromEntries('r t now c0 c1 c2 c3 bg uw us uwarp ui ug uecho m'.split(' ').map(key=>[key,gl.getUniformLocation(program,key)]));
  function color(key:string,hex:string) {
    const rgb = parseInt(hex.slice(1),16);
    gl!.uniform3f(uniforms[key],(rgb>>16)/255,((rgb>>8)&255)/255,(rgb&255)/255);
  }
  return {
    configure(s:Settings) {
      palettes[s.palette].forEach((hex,i)=>color('c'+i,hex));
      color('bg',s.background);
      for(const [key,value] of Object.entries({uw:s.width,us:s.spread,uwarp:s.warp,ui:s.intensity,ug:s.grain,uecho:Number(s.echo)})) gl.uniform1f(uniforms[key],value);
    },
    draw(t:number,now:number,x:number,y:number,strength:number) {
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.uniform2f(uniforms.r,canvas.width,canvas.height);
      gl.uniform1f(uniforms.t,t);
      gl.uniform1f(uniforms.now,now);
      gl.uniform3f(uniforms.m,x,y,strength);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    },
    release,
  };
}
