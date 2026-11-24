'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {mount,render,resolveSettings} from '../core';
import '../styles.css';

type Props = {settings?: Record<string,string|number|boolean>;paused?:boolean;style?:CSSProperties;className?:string;[key:string]:unknown};
export function RicizenSlideshow({settings={},paused=false,className,style,...individual}:Props){
  const host=useRef<HTMLDivElement>(null);
  const api=useRef<ReturnType<typeof mount>|null>(null);
  const values=JSON.stringify(resolveSettings({...settings,...individual}));
  const initial=useRef({values,paused});
  const [markup]=useState(()=>({__html:render(JSON.parse(values))}));
  useEffect(()=>{
    if(!host.current)return;
    const instance=mount(host.current,JSON.parse(initial.current.values),undefined,{paused:initial.current.paused});
    api.current=instance;
    return ()=>{instance.destroy();api.current=null;};
  },[]);
  useEffect(()=>{api.current?.update(JSON.parse(values));},[values]);
  useEffect(()=>{if(paused)api.current?.pause();else api.current?.resume();},[paused]);
  return <div className={className} style={style} ref={host} dangerouslySetInnerHTML={markup}/>;
}
export const Component=RicizenSlideshow;
export const TracksideSlideshow = Component;
