import manifest from '../../component.json';
import canyon from '../../assets/canyon.svg';
import coast from '../../assets/coast.svg';
import alpine from '../../assets/alpine.svg';
import composer from '../../assets/warm-composer-v1.webp';
import research from '../../assets/warm-research-v1.webp';
import orb from '../../assets/warm-orb-v1.webp';

import {createSlideshow, type SlideshowSettings} from './engine';
export type {Controller} from './engine';
export type Settings = Omit<SlideshowSettings, 'reelFooter' | 'reelSurface' | 'reelText' | 'showCaptions' | 'variant'>;
const assetURL = (asset: string | {src: string}) => typeof asset === 'string' ? asset : asset.src;
const artworks: Record<string, string> = {
  canyon: assetURL(canyon), coast: assetURL(coast), alpine: assetURL(alpine),
  'soft-horizons': assetURL(composer), 'research-workspace': assetURL(research), 'glass-in-bloom': assetURL(orb),
  'protected-core': assetURL(composer), 'precision-keys': assetURL(composer), 'product-camera': assetURL(composer),
  'secure-connection': assetURL(research), 'tactile-dial': assetURL(research), 'product-audio': assetURL(research),
  'layered-shield': assetURL(orb), 'amber-signal': assetURL(orb), 'product-light': assetURL(orb),
};
const api = createSlideshow<Settings>(manifest, artworks, {variant: 'editorial', reelFooter: 'overlay', reelSurface: '#f6f3ed', reelText: '#252b25', showCaptions: false, showNavigation: true});
export const {defaults, resolveSettings, render, mount, safeImage, transitionStates} = api;
