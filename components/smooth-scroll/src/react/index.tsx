"use client";
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount,render,type Settings} from '../core';
import '../styles.css';
export type SmoothScrollProps=Partial<Settings>&{className?:string;style?:CSSProperties;paused?:boolean};
export function SmoothScroll({className,style,paused=false,...settings}:SmoothScrollProps){
 const host=useRef<HTMLDivElement>(null),controller=useRef<ReturnType<typeof mount>|null>(null);
 const [initial]=useState(()=>({__html:render(settings)}));
 const serialized=JSON.stringify(settings);
 const firstSettings=useRef(serialized);
 useEffect(()=>{if(!host.current)return;const instance = mount(host.current,JSON.parse(firstSettings.current)); controller.current = instance;return()=>{instance.destroy();controller.current=null;};},[]);
 useEffect(()=>{controller.current?.update(JSON.parse(serialized));},[serialized]);
 useEffect(()=>{if(paused)controller.current?.pause();else controller.current?.resume();},[paused]);
 return <div ref={host} className={className} style={style} data-component={manifest.id} dangerouslySetInnerHTML={initial}/>;
}
export const Component=SmoothScroll;
