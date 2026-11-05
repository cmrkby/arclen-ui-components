"use client";
import {useEffect,useRef,type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount,render,type Settings} from '../core';
import '../styles.css';
export type SmoothScrollProps=Partial<Settings>&{className?:string;style?:CSSProperties;paused?:boolean};
export function SmoothScroll({className,style,paused=false,...settings}:SmoothScrollProps){
 const host=useRef<HTMLDivElement>(null),controller=useRef<ReturnType<typeof mount>|null>(null);
 const initial=useRef(render(settings));
 const serialized=JSON.stringify(settings);
 const firstSettings=useRef(serialized);
 useEffect(()=>{if(!host.current)return;controller.current=mount(host.current,JSON.parse(firstSettings.current));return()=>{controller.current?.destroy();controller.current=null;};},[]);
 useEffect(()=>{controller.current?.update(JSON.parse(serialized));},[serialized]);
 useEffect(()=>{if(paused)controller.current?.pause();else controller.current?.resume();},[paused]);
 return <div ref={host} className={className} style={style} data-component={manifest.id} dangerouslySetInnerHTML={{__html:initial.current}}/>;
}
export const Component=SmoothScroll;
