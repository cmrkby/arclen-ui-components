"use client";
import {useEffect,useId,useRef,type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount,render,resolveSettings,type Settings,type Controller} from '../core';
import '../styles.css';
export type LuminousFoldsProps=Partial<Settings>&{className?:string;style?:CSSProperties;paused?:boolean};
export function LuminousFolds({className=undefined,style=undefined,paused=false,...input}:LuminousFoldsProps){
 const host=useRef<HTMLDivElement>(null),controller=useRef<Controller|null>(null),id=useId();
 const settings=resolveSettings(input),latest=useRef({settings,paused});latest.current={settings,paused};
 const markup=useRef({__html:render(settings,id)});
 const key=JSON.stringify(manifest.settings.map(s=>settings[s.key as keyof Settings]));
 useEffect(()=>{const api=mount(host.current!,latest.current.settings,id,{paused:latest.current.paused});controller.current=api;return()=>{api.destroy();if(controller.current===api)controller.current=null;};},[id]);
 useEffect(()=>{controller.current?.update(latest.current.settings);},[key]);
 useEffect(()=>{if(paused)controller.current?.pause();else controller.current?.resume();},[paused]);
 return <div ref={host} className={className} style={style} data-arclen-component={manifest.id} dangerouslySetInnerHTML={markup.current}/>;
}
export const Component=LuminousFolds;
