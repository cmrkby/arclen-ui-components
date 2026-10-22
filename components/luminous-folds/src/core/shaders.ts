/** Independently authored analytic folds. No images, sampled contours or third-party noise. */
// Seven varying vectors fit WebGL 1's minimum eight-vector allowance.
// Every vertex receives identical phase coefficients, preserving analytic x contours.
const COEFFICIENTS = `varying highp vec4 v_upper;
varying highp vec3 v_ember;
varying highp vec4 v_lower[4];
varying highp vec4 v_bend;`;
export const VERTEX = `precision highp float;
attribute vec2 a_position;
uniform float u_phase;
uniform float u_variant;
${COEFFICIENTS}
void main(){
 float t=u_phase;
 v_upper=vec4(0.);v_ember=vec3(0.);v_bend=vec4(0.);
 for(int i=0;i<4;i++){v_lower[i]=vec4(0.);}
 if(u_variant<.5){
 v_upper=vec4(7.+.65*sin(t*.19),.018+.004*sin(t*.27),.008*sin(t*.39),.72+.10*sin(t*.21));
 v_ember=vec3(t*.28+.32*sin(t*.17),.009*sin(t*.33),.83+.07*sin(t*.26));
 for(int i=0;i<4;i++){
  float f=float(i);
  v_lower[i]=vec4(.26+f*.13+.08*sin(t*(.20+f*.047)+f*.70)+.025*(sin(t*.13+f*1.7)-sin(f*1.7)),
   10.+.85*(sin(t*.17+f*1.3)-sin(f*1.3)),
   .011+.003*(sin(t*.22+f)-sin(f)),
   .40+.18*sin(t*.16+f*1.4));
  v_bend[i]=.007*(sin(t*.37+f*1.9)-sin(f*1.9));
 }
 }else if(u_variant<1.5){
  // One broad traveling deformation carries both diagonal sheets.
  v_upper=vec4(.065*sin(t*.13),t*.18,.075+.01*sin(t*.11),.015*sin(t*.23));
  for(int i=0;i<4;i++){
   float f=float(i);
   v_lower[i]=vec4(.014+.003*sin(t*.16+f*.7),-t*.22+f*.42,.009*sin(t*.19+f*.8),0.);
  }
 }else{
  // Opposing corner groups breathe locally while their waves travel in opposite directions.
  v_upper.x=.018*sin(t*.22);
  v_ember.x=.018*sin(t*.22+2.4);
  for(int i=0;i<4;i++){
   float f=float(i);
   v_lower[i]=vec4(.016+.003*sin(t*.18+f*.6),.009*sin(t*.17+f),.017+.003*sin(t*.16+f*.8),.008*sin(t*.21+f*.7));
  }
 }
 gl_Position=vec4(a_position,0.,1.);
}`;
export const FRAGMENT = `
precision highp float;
${COEFFICIENTS}
float squared(float value){return value*value;}
uniform vec2 u_resolution;
uniform vec2 u_cssSize;
uniform vec3 u_blue;
uniform vec3 u_ember;
uniform vec3 u_background;
uniform vec2 u_strength;
uniform float u_spread;
uniform float u_softness;
uniform float u_grain;
uniform float u_phase;
uniform float u_variant;
// A crease has a thin lit edge, a longer illuminated shoulder and a dark back.
float fold(float distance, float weight) {
  float edge = .0028 + .0038 * u_softness;
  float shoulder = distance < 0. ? .050 + .045 * u_softness : .012 + .014 * u_softness;
  float crest = exp(-abs(distance) / edge);
  float veil = exp(-squared(distance / shoulder));
  float sheet = exp(-abs(distance) / (distance < 0. ? .09 : .018));
  return weight * (.52 * crest + .48 * veil + .16 * sheet);
}
float grainAt(vec2 p) {
  vec2 q = mod(p, 251.);
  float a = mod(q.x * 37. + q.y * 71. + mod(q.x * q.y, 113.), 251.);
  return fract(a * .1031 + mod(q.x * 13. + q.y * 29., 97.) * .11369);
}
// A: the accepted Perimeter equations and independent traveling bends are unchanged.
vec2 perimeter(vec2 uv,float t){
  float x = uv.x;
  // Retain long fabric folds in landscape without crowding the dark interior.
  // Independent, incommensurate rhythms vary shape continuously without loop seams.
  // All variance offsets are zero at phase zero, preserving the approved initial art.
  float wave = v_upper.y * sin(x * v_upper.x - t * .31)
    + .009 * sin(x * 14. + t * .23)
    + v_upper.z*exp(-squared((x-v_upper.w)/.18));
  float upper = .245 - .115*x + wave;
  upper = .0 + (upper / u_spread);
  float upperMask = smoothstep(.25,.72,x);
  float blue = fold(uv.y - upper, 1.06) * upperMask;
  float emberY = upper - .090 + .011*sin(x*9. + v_ember.x + 1.2)
    + v_ember.y*exp(-squared((x-v_ember.z)/.22));
  float ember = fold(uv.y - emberY, 1.10) * smoothstep(.40,.84,x);
  for (int i=0; i<4; i++) {
    float f = float(i);
    vec4 coefficients = v_lower[i];
    float bend = .026*atan((x-coefficients.x)*20.)/1.5708
      + coefficients.z*sin(x*coefficients.y - t*(.24+f*.053) + f*.80);
    bend += v_bend[i]*exp(-squared((x-coefficients.w)/.17));
    float y = .57 + f*.102 + x*.22 + bend;
    y = 1. - (1. - y) / u_spread;
    float fade = 1. - smoothstep(.50 + f*.035, 1.05, x);
    blue += fold(uv.y-y, 1.02 - f*.06) * fade;
  }
  return vec2(blue,ember);
}
// B: two long oblique sheets bracket a diagonal dark corridor. Their broad drift is coherent.
vec2 diagonalSweep(vec2 uv,float t){
 float x=uv.x;
 float upperBend=v_upper.z*sin(x*3.1-v_upper.y)+v_upper.x;
 float lowerBend=v_upper.z*sin(x*3.1-v_upper.y+.35)+v_upper.x;
 float blue=0.;float ember=0.;
 for(int i=0;i<3;i++){
  float f=float(i);vec4 coefficients=v_lower[i];
  float fine=coefficients.x*sin(x*8.+coefficients.y)+coefficients.z;
  float upperOffset=.12+(-.34+f*.078-.12)*u_spread;
  float lowerOffset=.12+(.58+f*.082-.12)*u_spread;
  float upperDistance=(uv.y-(.80*x+upperOffset+upperBend+fine))/.99;
  float lowerDistance=(uv.y-(.80*x+lowerOffset+lowerBend+fine*.65+v_upper.w))/.99;
  if(i==0){ember+=fold(upperDistance,1.04);}else{blue+=fold(upperDistance,1.10-f*.07);}
  blue+=fold(lowerDistance,1.05-f*.07);
 }
 return vec2(blue,ember);
}
// C: nested crests occupy the opposite pair of corners, with opposed angular travel.
vec2 counterflow(vec2 uv,float t){
 vec2 top=uv*vec2(1.,1.08),bottom=(1.-uv)*vec2(1.,1.08);
 float topRadius=length(top),bottomRadius=length(bottom);
 float topAngle=atan(top.y+.00001,top.x+.00001);
 float bottomAngle=atan(bottom.y+.00001,bottom.x+.00001);
 float blue=0.;float ember=0.;
 for(int i=0;i<3;i++){
  float f=float(i);vec4 coefficients=v_lower[i];
  float topWave=coefficients.x*sin(topAngle*(3.+f*.6)-t*.30+f*.65)+coefficients.y;
  float bottomWave=coefficients.z*sin(bottomAngle*(3.8+f*.5)+t*.24+f*.75)+coefficients.w;
  float topCrease=(.18+f*.105+v_upper.x+topWave)/u_spread;
  float bottomCrease=(.19+f*.10+v_ember.x+bottomWave)/u_spread;
  if(i==0){ember+=fold(topRadius-topCrease,1.04);}else{blue+=fold(topRadius-topCrease,1.10-f*.07);}
  blue+=fold(bottomRadius-bottomCrease,1.05-f*.06);
 }
 return vec2(blue,ember);
}
void main() {
  vec2 uv=gl_FragCoord.xy/u_resolution;uv.y=1.-uv.y;
  vec2 lightBands;
  if(u_variant<.5){lightBands=perimeter(uv,u_phase);}
  else if(u_variant<1.5){lightBands=diagonalSweep(uv,u_phase);}
  else{lightBands=counterflow(uv,u_phase);}
  float blue=lightBands.x,ember=lightBands.y;
  vec3 light = u_blue * blue * u_strength.x + u_ember * ember * u_strength.y;
  // Stationary grain follows CSS-pixel density and is strongest in visible light.
  float n = grainAt(floor(uv*u_cssSize*1.45))-.5;
  light *= max(0.,1. + n*u_grain*2.4);
  vec3 color = u_background + light;
  gl_FragColor = vec4(clamp(color,0.,1.),1.);
}`;
