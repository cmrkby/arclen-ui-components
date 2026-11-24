// Fragment adapted from PrismFlow, MIT © 2026 Md Eftakher. See assets/PrismFlow-MIT.txt.
export const fragment = `precision highp float;
uniform vec2 r;uniform float t;uniform float now;uniform vec3 c0;uniform vec3 c1;uniform vec3 c2;uniform vec3 c3;uniform vec3 bg;
uniform float uw;uniform float us;uniform float uwarp;uniform float ui;uniform float ug;uniform float uecho;uniform vec3 m;
float square(float x){return x*x;}
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
// Four colours across the band, edge to edge.
vec3 pal(float k){k=clamp(k,0.,1.)*3.;return k<1.?mix(c0,c1,k):k<2.?mix(c1,c2,k-1.):mix(c2,c3,k-2.);}
// The centre line of a band, and the light around it.
vec3 band(vec2 p,float seed,float amp,float tilt,float lift){
  // A slow, smooth warp: low frequency sines, so the band sweeps rather than wobbles.
  vec2 q=p;
  q+=uwarp*.35*vec2(sin(p.y*1.1+t*.23+seed),sin(p.x*.9-t*.19+seed*1.7));
  q+=uwarp*.08*vec2(sin(p.y*2.1-t*.31+seed*2.),sin(p.x*1.7+t*.27));
  float ph=q.x*.95+t*.32+seed;
  float y=lift+tilt*q.x+amp*sin(ph)+amp*.28*sin(q.x*1.7-t*.21+seed*3.);
  float slope=tilt+amp*.95*cos(ph)+amp*.28*1.7*cos(q.x*1.7-t*.21+seed*3.);
  // The pointer pulls the line toward it.
  float pull=m.z*exp(-square((q.x-m.x)/.6));
  y=mix(y,m.y,pull*.5);
  float d=(q.y-y)/sqrt(1.+slope*slope);
  float w=.052*uw;
  vec3 col=vec3(0.);
  // A spectral fan: each colour is its own soft band, offset across the line.
  for(int i=0;i<7;i++){
    float k=float(i)/6.;
    float o=(k-.5)*.2*us*(.6+.4*uw);
    float g=exp(-square((d-o)/(w*(1.+abs(k-.5)*1.4))));
    col+=pal(k)*g*.5;
  }
  col+=vec3(1.,.98,.95)*exp(-square(d/(w*.6)))*.85;
  col+=pal(.5+.35*sign(d))*exp(-square(d/(w*5.)))*.1;
  return col;
}
void main(){
  vec2 uv=gl_FragCoord.xy/r;float a=r.x/r.y;
  vec2 p=vec2((uv.x-.5)*a,uv.y-.5)*2.;
  vec3 col=band(p,0.,.55,-.32,-.05);
  // A fainter echo, off toward a corner.
  if(uecho>.5)col+=band(p,2.6,.35,.4,-1.15)*.38;
  col*=ui;
  col=1.-exp(-col*1.25);
  vec3 o=bg+col*(1.-bg*.6);
  o+=(hash(gl_FragCoord.xy+fract(now*7.3)*vec2(91.,37.))-.5)*.06*ug;
  float v=1.-smoothstep(.35,1.6,length(vec2((uv.x-.5)*a,uv.y-.5)));
  o=mix(bg,o,.55+.45*v);
  gl_FragColor=vec4(o,1.);
}
`;
