'use client';
import {useEffect,useRef,type CSSProperties} from 'react';
import {mount,render,resolveSettings,defaults,type Settings,type Plan,type Controller} from '../core';
import '../styles.css';
export type PriceSwitchProps = Partial<Settings> & {
  className?:string; style?:CSSProperties; paused?:boolean; defaultValue?:Plan;
  onValueChange?:(value:Plan)=>void;
};
export function PriceSwitch(props:PriceSwitchProps) {
  const host=useRef<HTMLDivElement>(null),controller=useRef<Controller|null>(null),latest=useRef(props);
  latest.current=props;
  const initial=useRef<{__html:string}|null>(null);
  if(initial.current===null)initial.current={__html:render(resolveSettings({...props,value:props.value??props.defaultValue??defaults.value}))};
  useEffect(()=>{
    const p=latest.current;
    controller.current=mount(host.current!,{...p,value:p.value??p.defaultValue??defaults.value},{get controlled(){return latest.current.value!==undefined;},onValueChange:value=>latest.current.onValueChange?.(value)});
    return()=>{controller.current?.destroy();controller.current=null;};
  },[]);
  useEffect(()=>{
    const settings:Partial<Settings>=resolveSettings(props);
    if(props.value===undefined)delete settings.value;
    controller.current?.update(settings);
    if(props.paused)controller.current?.pause();else controller.current?.resume();
  });
  return <div ref={host} className={props.className} style={{display:'inline-block',maxWidth:'100%',...props.style}} dangerouslySetInnerHTML={initial.current}/>;
}
export const Component=PriceSwitch;
