import {geometryAt as originalGeometryAt} from './field-geometry';
import type {Variant} from './settings';
function ribbonsGeometryAt(seconds: number,seed: number,aspect=1.6) {
    const t=seconds+(seed===12?0:seed*.731);
    const portrait=Math.max(0,Math.min(1,(.95-aspect)/.45));
    return [.5,.285+.024*Math.sin(t*.12),1.12,.135+.014*portrait+.009*Math.sin(t*.18),1.9,
      .5,.715+.023*Math.sin(t*.10+1.7),1.10,.13+.012*portrait+.008*Math.cos(t*.15),1.8];
  }
/** Ribbons retain their own mass geometry. Blanket geometry is a shader boundary. */
export function geometryFor(variant: Variant, seconds: number, seed: number, aspect: number) {
  return variant === 'ribbons' ? ribbonsGeometryAt(seconds, seed, aspect) : originalGeometryAt(seconds, seed, aspect);
}
