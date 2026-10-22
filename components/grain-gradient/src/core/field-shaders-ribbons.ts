import {BALANCE_GLSL} from './colour-balance';
export const VERTEX = `attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;
export const FRAGMENT = `precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_cssSize;
uniform vec3 u_colors[4];
uniform vec4 u_strengths;
uniform float u_grain;
uniform float u_grainScale;
uniform float u_size;
uniform float u_softness;
uniform float u_phase;
uniform float u_seed;
uniform vec4 u_lower;
uniform vec4 u_upper;
uniform vec2 u_powers;
uniform vec2 u_colorDepth;
uniform vec2 u_shoulderDepth;
uniform float u_bridge;
uniform vec3 u_boundaryLower[41];
uniform vec3 u_boundaryUpper[41];
// Original closed angular envelope. Positive periodic B-spline weights retain
// nested levels and prevent a missing horizontal contour becoming a row strip.
vec3 contourLevels(vec2 q,float upper) {
  float turn=(atan(q.y,q.x+0.0000001)+3.141592653589793)/6.283185307179586;
  float t=mod(turn*40.0,40.0);
  vec3 levels=vec3(0.0);
  for(int i=0;i<40;i++) {
    float d=abs(t-float(i));
    d=min(d,40.0-d);
    float weight=d<1.0?2.0/3.0-d*d+.5*d*d*d:(d<2.0?pow(2.0-d,3.0)/6.0:0.0);
    levels+=mix(u_boundaryLower[i],u_boundaryUpper[i],upper)*weight;
  }
  levels.x=max(.04,levels.x);
  levels.y=max(levels.x+.012,levels.y);
  levels.z=max(levels.y+.025,levels.z);
  return levels;
}
float calibratedRadius(float r,vec3 levels) {
  if(r<levels.x)return .919*r/max(.04,levels.x);
  if(r<levels.y)return mix(.919,1.0128,(r-levels.x)/max(.012,levels.y-levels.x));
  return 1.0128+(r-levels.y)*(.0922/max(.025,levels.z-levels.y));
}
${BALANCE_GLSL}
// Original finite modular mixer, adapted from our own v2 mixer.
float noiseCell(vec2 cell,float salt) {
  float x=mod(cell.x+salt*13.0,251.0),y=mod(cell.y+salt*29.0,241.0);
  float a=mod(x*37.0+y*19.0+u_seed+salt*41.0,251.0);
  a=mod(a*(a+17.0)+x*7.0+y*23.0,251.0);
  float b=mod(y*53.0+x*11.0+u_seed*3.0+salt*17.0,241.0);
  b=mod(b*(b+31.0)+y*13.0+x*47.0,241.0);
  return fract(a/251.0+b/241.0)-.5;
}
vec3 ramp(float r,float upper,float gamma) {
  float originalR=r;
  r += (pow(max(r,.00001),gamma)-r)*(1.0-smoothstep(.72,.94,r));
  vec3 core=u_colors[0]*vec3(1.065,mix(.946,1.0,upper),mix(1.5,1.0,upper));
  vec3 glow=u_colors[1]*vec3(1.065,1.0,1.0);
  vec3 edge=u_colors[2];
  vec3 rim=u_colors[3]*vec3(.75,.86,.58);
  vec3 color=mix(core,glow,smoothstep(.30,.75,r));
  color=mix(color,edge,smoothstep(.73,.90,r));
  color=mix(color,rim,smoothstep(.88,1.0,r));
  bool normalStrengths=all(equal(u_strengths,vec4(u_strengths.x)));
  if(!normalStrengths)color=balancedPalette(core,glow,edge,rim,vec3(smoothstep(.30,.75,r),smoothstep(.73,.90,r),smoothstep(.88,1.0,r)));
  float shoulder=mix(u_shoulderDepth.x,u_shoulderDepth.y,upper);
  if(!normalStrengths)shoulder*=min(2.0,u_strengths.x/max(.000001,dot(u_strengths,vec4(.25))));
  color+=shoulder*vec3(0.0,1.0,-.5)*smoothstep(.55,.8,r)*(1.0-smoothstep(.9,1.03,r))*max(u_colors[0].r,max(u_colors[0].g,u_colors[0].b));
  float width=mix(.04,.1025,u_softness);
  return color*exp(-pow(max(0.0,(originalR-1.0)/width),1.5));
}
vec3 mass(vec2 p,vec4 shape,float power,float upper,float gamma) {
  vec2 axes=max(vec2(.05),shape.zw*(u_size/.69));
  vec2 local=(p-shape.xy)/axes;
  vec2 q=abs(local);
  float r=pow(pow(q.x,power)+pow(q.y,power),1.0/power);
  // Angle follows the full cap and side of this lobe, including unseen sectors.
  r=calibratedRadius(r,contourLevels(local,upper));
  vec2 cell=floor((gl_FragCoord.xy/u_resolution)*u_cssSize*2.0/u_grainScale);
  float jitter=2.0*(noiseCell(cell,6.0)+noiseCell(cell,7.0)+noiseCell(cell,8.0));
  r+=(u_grain/.24)*.025*jitter*smoothstep(.66,.95,r);
  return ramp(r,upper,gamma);
}
void main() {
  if(dot(u_strengths,vec4(1.0))==0.0){gl_FragColor=vec4(0.0,0.0,0.0,1.0);return;}
  vec2 uv=gl_FragCoord.xy/u_resolution;
  vec2 p=vec2(uv.x,1.0-uv.y);
  // Original traveling-ribbon composition: widthwise transport, not corner breathing.
  float clock=u_phase+(u_seed==12.0?0.0:u_seed*.731);
  float portrait=clamp((.95-u_cssSize.x/u_cssSize.y)/.45,0.0,1.0);
  vec2 field=mix(p,vec2(p.y,1.0-p.x),portrait);
  float travel=clock*.24;
  vec2 first=field,second=field;
  first.y-=.125*sin(field.x*5.2-travel)+.032*sin(field.x*10.4-travel*.65);
  second.y-=.105*sin(field.x*5.2+travel+2.1)+.026*sin(field.x*9.3+travel*.8);
  vec3 lower=mass(first,u_lower,u_powers.x,0.0,u_colorDepth.x);
  vec3 upper=mass(second,u_upper,u_powers.y,1.0,u_colorDepth.y);
  float overlap=pow(max(0.0,lower.r*upper.r),.25);
  vec3 color=lower+upper+u_bridge*overlap*vec3(1.0,.28,.33);
  if(!all(equal(u_strengths,vec4(u_strengths.x)))) {
    vec3 combined=lower+upper;
    color=combined+u_bridge*overlap*combined/max(.000001,max(combined.r,max(combined.g,combined.b)));
  }
  // Static subpixel grain; all channels follow the same luminance factor.
  vec2 cell=floor(p*u_cssSize*2.0/u_grainScale);
  float z=2.0*(noiseCell(cell,0.0)+noiseCell(cell,1.0)+noiseCell(cell,2.0));
  float shade=1.0+(u_grain/.24)*(.07+.07*z-.10*max(-z,0.0)*max(-z,0.0));
  float blue=2.0*(noiseCell(cell,3.0)+noiseCell(cell,4.0)+noiseCell(cell,5.0));
  float warm=clamp((color.g*255.0-100.0)/70.0,0.0,1.0);
  color.r*=max(.03,shade);
  color.g*=max(.03,1.02+mix(.9,1.18,warm)*(shade-1.02));
  color.g+=(u_grain/.24)*(14.0/255.0)*(1.0-warm)*(blue+.25*(blue*blue-1.0))*smoothstep(.01,.5,color.r);
  color.b*=max(.03,shade);
  color.b+=(u_grain/.24)*(-4.5*z-2.0*blue)/255.0*smoothstep(.01,.5,color.r);
  gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);
}
`;
