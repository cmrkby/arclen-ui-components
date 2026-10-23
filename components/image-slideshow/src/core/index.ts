import art0 from '../../assets/forest-lounge-v1.webp';
import art1 from '../../assets/forest-stair-v1.webp';
import art2 from '../../assets/forest-retreat-v1.webp';
import manifest from '../../component.json';
import canyon from '../../assets/canyon.svg';
import coast from '../../assets/coast.svg';
import alpine from '../../assets/alpine.svg';

import {createSlideshow, type SlideshowSettings} from './engine';
export type {Controller} from './engine';
export type Settings = Omit<SlideshowSettings, 'reelFooter' | 'reelSurface' | 'reelText' | 'variant'>;
const assetURL = (asset: string | {src: string}) => typeof asset === 'string' ? asset : asset.src;
const artworks: Record<string, string> = {canyon: assetURL(canyon), coast: assetURL(coast), alpine: assetURL(alpine),
  'forest-lounge': assetURL(art0),
  'forest-stair': assetURL(art1),
  'forest-retreat': assetURL(art2),
};
const api = createSlideshow<Settings>(manifest, artworks, {variant: 'framed', reelFooter: 'overlay', reelSurface: '#f6f3ed', reelText: '#252b25', showCaptions: false, showNavigation: true});
export const {defaults, resolveSettings, render, mount, safeImage, transitionStates} = api;
