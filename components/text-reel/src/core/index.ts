import {DEFAULT_TEXT_REEL_OPTIONS,resolveTextReelOptions} from './options';
import {materializeTextReelMarkup,mountTextReel} from './create-text-reel';
import type {TextReelOptions,ResolvedTextReelOptions} from './types';
export type Settings=ResolvedTextReelOptions;
export const defaults=DEFAULT_TEXT_REEL_OPTIONS;
export function resolveSettings(input:unknown={}):Settings {return resolveTextReelOptions(input&&typeof input==='object'&&!Array.isArray(input)?input as TextReelOptions:{});}
export function render(input:unknown={}):string{return materializeTextReelMarkup(resolveSettings(input));}
export function mount(host:HTMLElement,input:unknown={}){
 host.classList.add('aui-text-reel');host.innerHTML=render(input);
 const controller=mountTextReel(host.firstElementChild as HTMLElement,resolveSettings(input));
 return {update(next:unknown){controller.setOptions(resolveSettings(next));},pause:controller.pause,resume:controller.resume,replay:controller.replay,destroy:controller.destroy};
}
