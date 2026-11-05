import art0 from '../../assets/cinema-coast-v1.webp';
import art1 from '../../assets/cinema-ridge-v1.webp';
import art2 from '../../assets/cinema-tide-v1.webp';
import manifest from '../../component.json';
import canyon from '../../assets/canyon.svg';
import coast from '../../assets/coast.svg';
import alpine from '../../assets/alpine.svg';

import {createSlideshow, type SlideshowSettings} from './engine';
export type {Controller} from './engine';
export type Settings = Omit<SlideshowSettings, 'showCaptions' | 'showNavigation' | 'variant'>;
const assetURL = (asset: string | {src: string}) => typeof asset === 'string' ? asset : asset.src;
const artworks: Record<string, string> = {canyon: assetURL(canyon), coast: assetURL(coast), alpine: assetURL(alpine),
  'cinema-coast': assetURL(art0),
  'cinema-ridge': assetURL(art1),
  'cinema-tide': assetURL(art2),
};
const api = createSlideshow<Settings>(manifest, artworks, {variant: 'stacked', reelFooter: 'overlay', reelSurface: '#f6f3ed', reelText: '#252b25', showCaptions: false, showNavigation: true});
export const {defaults, resolveSettings, render, mount, safeImage, transitionStates} = api;
