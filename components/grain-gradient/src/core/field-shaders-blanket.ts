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
void main() {
  if(dot(u_strengths,vec4(1.0))==0.0){gl_FragColor=vec4(0.0,0.0,0.0,1.0);return;}
  vec2 uv=gl_FragCoord.xy/u_resolution;
  vec2 p=vec2(uv.x,1.0-uv.y);
  // One diffuse field travels along the perimeter. Its bright centre stays
  // outside the host, so the composition grows in from an edge, not a blob.
  float clock=u_phase+(u_seed==12.0?0.0:u_seed*.731);
  float angle=.65+clock*.105;
  vec2 direction=vec2(cos(angle),sin(angle));
  vec2 centre=vec2(.5)+direction*(.61/max(abs(direction.x),abs(direction.y)));
  float breath=1.0+.055*sin(clock*.071);
  vec2 axes=vec2(.69,.73)*(u_size/.69)*breath;
  vec2 local=(p-centre)/axes;
  // A gentle low-frequency bend varies the tail without a distinct contour.
  local.x+=.045*sin(p.y*3.1+clock*.061);
  local.y+=.035*sin(p.x*2.8-clock*.047);
  float distanceSquared=dot(local,local);
  float density=exp(-distanceSquared*mix(3.9,1.75,u_softness));
  // Full-strength palette stops crossfade across the soft field independently
  // of its dim envelope. Broad overlaps retain a continuous feathered edge.
  float radius=sqrt(distanceSquared);
  // Match the original field’s upper-lobe palette calibration.
  vec3 core=u_colors[0]*vec3(1.065,1.0,1.0);
  vec3 glow=u_colors[1]*vec3(1.065,1.0,1.0);
  vec3 edge=u_colors[2];
  vec3 rim=u_colors[3]*vec3(.75,.86,.58);
  vec3 color=mix(core,glow,smoothstep(.08,.48,radius));
  color=mix(color,edge,smoothstep(.26,.50,radius));
  color=mix(color,rim,smoothstep(.44,.74,radius));
  if(!all(equal(u_strengths,vec4(u_strengths.x))))color=balancedPalette(core,glow,edge,rim,vec3(smoothstep(.08,.48,radius),smoothstep(.26,.50,radius),smoothstep(.44,.74,radius)));
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
  // Opacity follows palette/grain grading, so dim tails keep their hue.
  color*=density;
  gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);
}
`;
