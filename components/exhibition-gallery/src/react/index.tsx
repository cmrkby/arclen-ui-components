"use client";
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount,render,type Settings} from '../core';
import '../styles.css';
export type ExhibitionGalleryProps=Partial<Settings>&{className?:string;style?:CSSProperties;paused?:boolean};
export function ExhibitionGallery({className,style,paused=false,...settings}:ExhibitionGalleryProps){
 const host=useRef<HTMLDivElement>(null),engine=useRef<ReturnType<typeof mount>|null>(null);
 const serialized=JSON.stringify(settings);
 const initial=useRef(settings);
 const [html]=useState(()=>({__html:render(settings)}));
 useEffect(()=>{if(!host.current)return;const instance = mount(host.current,initial.current); engine.current = instance;return()=>{instance.destroy();engine.current=null;};},[]);
 useEffect(()=>{engine.current?.update(JSON.parse(serialized));},[serialized]);
 useEffect(()=>{if(paused)engine.current?.pause();else engine.current?.resume();},[paused,serialized]);
 return <div ref={host} className={className} style={style} data-component={manifest.id} dangerouslySetInnerHTML={html}/>;
}
export const Component=ExhibitionGallery;
