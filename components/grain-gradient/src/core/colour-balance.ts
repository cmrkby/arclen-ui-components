/** Original normalized palette math shared by the shader source and static fallback. */
export const BALANCE_GLSL = `
vec3 balancedPalette(vec3 core,vec3 glow,vec3 edge,vec3 rim,vec3 t) {
  vec4 base=vec4((1.0-t.x)*(1.0-t.y)*(1.0-t.z),t.x*(1.0-t.y)*(1.0-t.z),t.y*(1.0-t.z),t.z);
  vec4 weights=base*u_strengths;
  float total=dot(weights,vec4(1.0));
  if(total>0.0)return (core*weights.x+glow*weights.y+edge*weights.z+rim*weights.w)/total;
  // A disabled pure stop borrows the nearest enabled role instead of black.
  float position=dot(base,vec4(0.0,1.0,2.0,3.0)),best=10.0;
  vec3 color=vec3(0.0);
  if(u_strengths.x>0.0){best=abs(position);color=core;}
  if(u_strengths.y>0.0&&abs(position-1.0)<best){best=abs(position-1.0);color=glow;}
  if(u_strengths.z>0.0&&abs(position-2.0)<best){best=abs(position-2.0);color=edge;}
  if(u_strengths.w>0.0&&abs(position-3.0)<best){color=rim;}
  return color;
}
`;
export function rampWeights(t: readonly number[]): number[] {
  return [(1-t[0])*(1-t[1])*(1-t[2]),t[0]*(1-t[1])*(1-t[2]),t[1]*(1-t[2]),t[2]];
}
export function balancedColor(colors: readonly string[], strengths: readonly number[], base: readonly number[]): string {
  const weights=base.map((weight,i)=>weight*strengths[i]),total=weights.reduce((a,b)=>a+b,0);
  if (total===0) {
    const position=base.reduce((value,weight,i)=>value+weight*i,0);
    const enabled=strengths.flatMap((strength,i)=>strength>0?[i]:[]).sort((a,b)=>Math.abs(a-position)-Math.abs(b-position));
    return enabled.length?colors[enabled[0]]:'#000000';
  }
  const channels=[0,1,2].map(c=>Math.round(colors.reduce((value,color,i)=>value+parseInt(color.slice(1+c*2,3+c*2),16)*weights[i],0)/total));
  return '#'+channels.map(value=>value.toString(16).padStart(2,'0')).join('').toUpperCase();
}
