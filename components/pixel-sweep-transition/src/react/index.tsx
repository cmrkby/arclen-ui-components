"use client";
import {useEffect,useRef,type CSSProperties,type ReactNode} from 'react';
import {createPageTransition,mount,render,resolveSettings,type Settings,type PageTransitionController} from '../core';
import manifest from '../../component.json';
import '../styles.css';
export {createPixelSweepTransition,createPageTransition,presetSettings,applicableSettings} from '../core';
export type {NavigationOptions,PageTransitionController,TransitionResult,Settings} from '../core';
export type PixelSweepTransitionProps=Partial<Settings>&{children?:ReactNode;routeKey?:string|number;className?:string;style?:CSSProperties;paused?:boolean};
export function PixelSweepTransition({children,routeKey,className,style,paused=false,...input}:PixelSweepTransitionProps){
 const host=useRef<HTMLDivElement>(null),controller=useRef<PageTransitionController|null>(null),settings=resolveSettings(input),latest=useRef(settings),last=useRef(settings),firstRoute=useRef(routeKey),initial=useRef(render(settings)),isCustom=children!==undefined;latest.current=settings;
 const settingsKey=JSON.stringify(manifest.settings.map(s=>settings[s.key as keyof Settings]));
 useEffect(()=>{if(!host.current)return;const api=isCustom?createPageTransition(host.current,latest.current):mount(host.current,{...latest.current,autoplay:false});controller.current=api;if(paused)api.pause();else if(latest.current.autoplay)void api.replay();return()=>{api.destroy();controller.current=null;};},[isCustom]); // settings update below preserves owned content
 useEffect(()=>{if(JSON.stringify(last.current)!==JSON.stringify(latest.current)){controller.current?.update(latest.current);if(isCustom&&latest.current.autoplay&&!paused)void controller.current?.replay();last.current=latest.current;}},[settingsKey,isCustom,paused]);
 useEffect(()=>{if(paused)controller.current?.pause();else controller.current?.resume();},[paused]);
 useEffect(()=>{if(routeKey!==firstRoute.current){firstRoute.current=routeKey;if(!paused)void controller.current?.replay();}},[routeKey,paused]);
 return isCustom?<div ref={host} data-page-transitions data-pt-preset="pixels" className={className} style={{'--pt-bg':settings.background,'--pt-fg':settings.foreground,'--pt-height':`${settings.minHeight}px`,...style} as CSSProperties}><div data-pt-content>{children}</div></div>:<div ref={host} className={className} style={style} dangerouslySetInnerHTML={{__html:initial.current}}/>;
}
export const Component=PixelSweepTransition;
