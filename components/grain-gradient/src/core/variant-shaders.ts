import {FRAGMENT as original} from './field-shaders';
import {FRAGMENT as ribbons} from './field-shaders-ribbons';
import {FRAGMENT as blanket} from './field-shaders-blanket';
import type {Variant} from './settings';
const fragments = {original, ribbons, blanket};
export function fragmentFor(variant: Variant): string { return fragments[variant]; }
