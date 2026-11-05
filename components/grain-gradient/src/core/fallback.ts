import {balancedColor, rampWeights} from './colour-balance';
import type {Settings} from './settings';
type FallbackSettings = Pick<Settings, 'variant' | 'size' | 'coreColor' | 'glowColor' | 'edgeColor' | 'rimColor' | 'coreStrength' | 'glowStrength' | 'edgeStrength' | 'rimStrength'>;
/** Reduced-detail configured CSS artwork; no WebGL or image request required. */
export function fallbackImage(settings: FallbackSettings, pixels?: number) {
  const strengths=[settings.coreStrength,settings.glowStrength,settings.edgeStrength,settings.rimStrength];
  if(strengths.every(value=>value===0))return 'none';
  if(settings.variant==='blanket'||strengths.some(value=>value!==strengths[0]))return balancedFallback(settings,strengths,pixels);
  if (settings.variant === 'original') {
    const radius = (factor: number) => pixels === undefined ? `calc(${settings.size * factor} * min(100cqw, 100cqh))` : `${settings.size * pixels * factor}px`;
    const stops = `${settings.coreColor} 0, ${settings.glowColor} ${radius(.43)}, ${settings.edgeColor} ${radius(.70)}, ${settings.rimColor} ${radius(.85)}, transparent ${radius(1.07)}`;
    return `radial-gradient(circle at -3% 103%, ${stops}), radial-gradient(circle at 103% -3%, ${stops})`;
  }
  if (settings.variant === 'ribbons') {
    const sx=110*(settings.size/.69),sy=14*(settings.size/.69);
    const stops=`${settings.coreColor} 0%, ${settings.glowColor} 44%, ${settings.edgeColor} 70%, ${settings.rimColor} 86%, transparent 100%`;
    return `radial-gradient(ellipse ${sx}% ${sy}% at 50% 29%, ${stops}), radial-gradient(ellipse ${sx}% ${sy}% at 50% 72%, ${stops})`;
  }
  throw new TypeError('Invalid Grain structure.');
}

/** Sampled normalized colors keep the CSS fallback useful without WebGL. */
function balancedFallback(settings: FallbackSettings, strengths: number[], pixels?: number) {
  const colors=[settings.coreColor,settings.glowColor,settings.edgeColor,settings.rimColor];
  if(settings.variant==='blanket') {
    // Same role calibration as the live soft field; CSS is reduced-detail artwork.
    const factors=[[1.065,1,1],[1.065,1,1],[1,1,1],[.75,.86,.58]];
    for(let i=0;i<colors.length;i++)colors[i]='#'+factors[i].map((factor,c)=>Math.min(255,Math.round(parseInt(colors[i].slice(1+c*2,3+c*2),16)*factor)).toString(16).padStart(2,'0')).join('');
  }
  const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  const blanket=settings.variant==='blanket',end=blanket?1.6:1.07;
  const stops=Array.from({length:33},(_,i)=>{
    const r=end*i/32;
    const t=blanket?[smooth(.08,.48,r),smooth(.26,.50,r),smooth(.44,.74,r)]:[smooth(0,.43,r),smooth(.43,.70,r),smooth(.70,.85,r)];
    const alpha=blanket?Math.exp(-r*r*2.696):1-smooth(.85,1.07,r);
    const color=balancedColor(colors,strengths,rampWeights(t))+Math.round(alpha*255).toString(16).padStart(2,'0');
    const position=settings.variant==='original'?(pixels===undefined?`calc(${settings.size*r} * min(100cqw, 100cqh))`:`${settings.size*pixels*r}px`):`${i/32*100}%`;
    return `${color} ${position}`;
  }).join(', ');
  if(settings.variant==='original')return `radial-gradient(circle at -3% 103%, ${stops}), radial-gradient(circle at 103% -3%, ${stops})`;
  if(settings.variant==='ribbons')return `radial-gradient(ellipse ${110*settings.size/.69}% ${14*settings.size/.69}% at 50% 29%, ${stops}), radial-gradient(ellipse ${110*settings.size/.69}% ${14*settings.size/.69}% at 50% 72%, ${stops})`;
  return `radial-gradient(ellipse ${100*settings.size/.69}% ${100*settings.size/.69}% at 111% 96%, ${stops})`;
}
