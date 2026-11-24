import {opticalKeys, type Settings} from './settings';

const vertex = 'attribute vec2 corner;void main(){gl_Position=vec4(corner,0.,1.);}';
const fragment = `
precision highp float;
uniform sampler2D frame;
uniform vec2 lens,stage,origin,media,bufferSize;
uniform float refraction,edgeRefraction,frost,magnify,dispersion,bevelDepth,bevelWidth,edgeHighlight,edgeDarkening,tintOpacity,glassOpacity,borderRadius,specularStrength;
float distanceToEdge(vec2 p,float r){
  vec2 q=abs(p)-lens*.5+r;
  return length(max(q,0.))+min(max(q.x,q.y),0.)-r;
}
vec3 sampleFrame(vec2 p){
  float cover=max(stage.x/media.x,stage.y/media.y);
  vec2 uv=(p-stage*.5)/(media*cover)+.5;
  return texture2D(frame,clamp(uv,vec2(.001),vec2(.999))).rgb;
}
void main(){
  vec2 uv=vec2(gl_FragCoord.x/bufferSize.x,1.-gl_FragCoord.y/bufferSize.y);
  vec2 p=(uv-.5)*lens;
  float side=min(lens.x,lens.y),r=min(borderRadius,side*.5);
  float d=distanceToEdge(p,r);
  vec2 n=vec2(distanceToEdge(p+vec2(.5,0.),r)-distanceToEdge(p-vec2(.5,0.),r),distanceToEdge(p+vec2(0.,.5),r)-distanceToEdge(p-vec2(0.,.5),r));
  n/=max(.001,length(n));
  float e=1.-smoothstep(0.,max(1.,side*bevelWidth),-d);
  float edge=pow(e,8.);
  vec2 center=origin+lens*.5;
  vec2 tap=center+p*(1./magnify+refraction)+n*side*(edgeRefraction*pow(e,3.)+.22*bevelDepth*edge);
  vec2 fringe=n*(.018*side*edge*dispersion);
  vec3 color=vec3(sampleFrame(tap+fringe).r,sampleFrame(tap).g,sampleFrame(tap-fringe).b);
  if(frost>0.){
    vec3 blurred=vec3(0.);
    for(int i=0;i<8;i++){
      float a=float(i)*.785398;
      blurred+=sampleFrame(tap+frost*vec2(cos(a),sin(a)));
    }
    color=mix(color,blurred*.125,min(frost/30.,.9));
  }
  color=mix(color,vec3(1.),tintOpacity);
  float spec=.014/(dot(uv-vec2(.18,.14),uv-vec2(.18,.14))+.08)+.009/(dot(uv-vec2(.82,.84),uv-vec2(.82,.84))+.08);
  color+=edge*(bevelDepth*(edgeHighlight*max(-n.y,0.)-.55*edgeDarkening*max(n.y,0.))+spec*specularStrength);
  gl_FragColor=vec4(color,max(glassOpacity,.22*edge));
}`;
export function createLens(canvas: HTMLCanvasElement) {
  let context: WebGLRenderingContext | null;
  try { context=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,depth:false,antialias:false}); }
  catch { return null; }
  if (!context) return null;
  const gl=context, program=gl.createProgram();
  if (!program) return null;
  const buffer=gl.createBuffer(), texture=gl.createTexture(), shaders: WebGLShader[]=[];
  function destroy() {
    gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
    for(const shader of shaders) gl.deleteShader(shader);
  }
  if(!buffer || !texture){destroy();return null;}
  for(const [kind,code] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]] as const){
    const shader=gl.createShader(kind);
    if(!shader){destroy();return null;}
    shaders.push(shader); gl.shaderSource(shader,code); gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){destroy();return null;}
    gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){destroy();return null;}
  gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const attr=gl.getAttribLocation(program,'corner'); gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  gl.bindTexture(gl.TEXTURE_2D,texture);
  for(const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,param,gl.LINEAR);
  for(const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,param,gl.CLAMP_TO_EDGE);
  const u=Object.fromEntries([...opticalKeys,'lens','stage','origin','media','bufferSize'].map(k=>[k,gl.getUniformLocation(program,k)]));
  return {
    configure(s:Settings){ for(const k of opticalKeys) gl.uniform1f(u[k],s[k]); },
    resize(stage:DOMRect,lens:DOMRect,scale:number){
      const w=Math.max(1,Math.round(lens.width*scale)),h=Math.max(1,Math.round(lens.height*scale));
      if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
      gl.viewport(0,0,w,h);gl.uniform2f(u.bufferSize,w,h);gl.uniform2f(u.stage,stage.width,stage.height);
      gl.uniform2f(u.lens,lens.width,lens.height);gl.uniform2f(u.origin,lens.left-stage.left,lens.top-stage.top);
    },
    draw(source:HTMLImageElement|HTMLVideoElement|HTMLCanvasElement,w:number,h:number){
      gl.uniform2f(u.media,w,h);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,source);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }, destroy,
  };
}
