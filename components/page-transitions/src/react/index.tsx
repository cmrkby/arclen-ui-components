"use client";
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {createPageTransition,mount,render,resolveSettings,type Settings,type PageTransitionController} from '../core';
import '../styles.css';
export {createPageTransition,presetSettings,applicableSettings} from '../core';
export type {NavigationOptions,PageTransitionController,TransitionResult,Settings} from '../core';
export type PageTransitionsProps=Partial<Settings>&{children?:ReactNode;routeKey?:string|number;className?:string;style?:CSSProperties;paused?:boolean};
export function PageTransitions({children,routeKey,className,style,paused=false,...input}:PageTransitionsProps){
 const host=useRef<HTMLDivElement>(null),controller=useRef<PageTransitionController|null>(null),settings=resolveSettings(input),latest=useRef({settings,paused}),last=useRef(settings),firstRoute=useRef(routeKey),[initial]=useState(()=>({__html:render(settings)})),isCustom=children!==undefined;useEffect(()=>{latest.current={settings,paused};});
 const settingsKey=JSON.stringify(settings);
 useEffect(()=>{if(!host.current)return;const api=isCustom?createPageTransition(host.current,latest.current.settings):mount(host.current,{...latest.current.settings,autoplay:false});controller.current=api;if(latest.current.paused)api.pause();else if(latest.current.settings.autoplay)void api.replay();return()=>{api.destroy();controller.current=null;};},[isCustom]); // settings update below preserves owned content
 useEffect(()=>{const current=JSON.parse(settingsKey) as Settings;if(JSON.stringify(last.current)!==settingsKey){controller.current?.update(current);if(isCustom&&current.autoplay&&!paused)void controller.current?.replay();last.current=current;}},[settingsKey,isCustom,paused]);
 useEffect(()=>{if(paused)controller.current?.pause();else controller.current?.resume();},[paused]);
 useEffect(()=>{if(routeKey!==firstRoute.current){firstRoute.current=routeKey;if(!paused)void controller.current?.replay();}},[routeKey,paused]);
 return isCustom?<div ref={host} data-page-transitions className={className} style={{'--pt-bg':settings.background,'--pt-fg':settings.foreground,'--pt-height':`${settings.minHeight}px`,...style} as CSSProperties}><div data-pt-content>{children}</div></div>:<div ref={host} className={className} style={style} dangerouslySetInnerHTML={initial}/>;
}
export const Component=PageTransitions;
