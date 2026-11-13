"use client";
import {useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount,render,resolveSettings,type Settings,type Controller} from '../core';
import '../styles.css';
export type LuminousFoldsProps=Partial<Settings>&{className?:string;style?:CSSProperties;paused?:boolean};
export function LuminousFolds({className=undefined,style=undefined,paused=false,...input}:LuminousFoldsProps){
 const host=useRef<HTMLDivElement>(null),controller=useRef<Controller|null>(null),id=useId();
 const settings=resolveSettings(input),latest=useRef({settings,paused});useEffect(() => { latest.current = {settings,paused}; });
 const [markup]=useState(()=>({__html:render(settings,id)}));
 const key=JSON.stringify(settings);
 useEffect(()=>{const api=mount(host.current!,latest.current.settings,id,{paused:latest.current.paused});controller.current=api;return()=>{api.destroy();if(controller.current===api)controller.current=null;};},[id]);
 useEffect(()=>{controller.current?.update(JSON.parse(key));},[key]);
 useEffect(()=>{if(paused)controller.current?.pause();else controller.current?.resume();},[paused]);
 return <div ref={host} className={className} style={style} data-arclen-component={manifest.id} dangerouslySetInnerHTML={markup}/>;
}
export const Component=LuminousFolds;
