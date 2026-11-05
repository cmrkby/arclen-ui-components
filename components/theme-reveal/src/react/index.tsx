"use client";
import {useEffect,useId,useRef,type CSSProperties} from 'react';
import {mount,render,resolveSettings,type Settings,type Controller} from '../core';
import '../styles.css';
export {createThemeReveal} from '../core';
export type {PageRevealOptions,PageRevealController,RevealResult,MotionSettings,Origin,Theme} from '../core';
export type ThemeRevealProps=Partial<Settings>&{className?:string;style?:CSSProperties;paused?:boolean};
export function ThemeReveal({className,style,paused=false,...input}:ThemeRevealProps){
 const id=useId(),host=useRef<HTMLDivElement>(null),controller=useRef<Controller|null>(null),settings=resolveSettings(input),latest=useRef(settings),initial=useRef<string|null>(null),pause=useRef(paused),previous=useRef(settings);latest.current=settings;pause.current=paused;
 if(initial.current===null)initial.current=render(settings,id);
 useEffect(()=>{if(!host.current)return;controller.current=mount(host.current,latest.current,id);if(pause.current)controller.current.pause();return()=>{controller.current?.destroy();controller.current=null;};},[id]);
 useEffect(()=>{const patch=Object.fromEntries(Object.entries(latest.current).filter(([key,value])=>previous.current[key as keyof Settings]!==value));controller.current?.update(patch);previous.current=latest.current;});useEffect(()=>{if(paused)controller.current?.pause();else controller.current?.resume();},[paused]);
 return <div ref={host} className={className} style={style} dangerouslySetInnerHTML={{__html:initial.current}}/>;
}
export const Component=ThemeReveal;
