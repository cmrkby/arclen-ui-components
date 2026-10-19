'use client';
import {useEffect,useId,useRef,type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount,render,resolveSettings,defaults,type Settings,type Controller,type ChangeDetail} from '../core';
import '../styles.css';
export type GooeySwitchProps = Partial<Settings> & {className?:string;style?:CSSProperties;paused?:boolean;defaultChecked?:boolean;onCheckedChange?:(checked:boolean,detail:ChangeDetail)=>void};
export function GooeySwitch(props:GooeySwitchProps) {
  const id=useId(),host=useRef<HTMLSpanElement>(null),controller=useRef<Controller|null>(null),latest=useRef(props);
  latest.current=props;
  const initial=useRef<{__html:string}|null>(null);
  if(initial.current===null)initial.current={__html:render(resolveSettings({...Object.fromEntries(manifest.settings.map(s=>[s.key,s.default])),...props,checked:props.checked??props.defaultChecked??defaults.checked}),id)};
  useEffect(()=>{
    const p=latest.current;
    controller.current=mount(host.current!,resolveSettings({...p,checked:p.checked??p.defaultChecked??defaults.checked}),{get controlled(){return latest.current.checked!==undefined;},onCheckedChange:(checked,detail)=>latest.current.onCheckedChange?.(checked,detail)});
    return()=>{controller.current?.destroy();controller.current=null;};
  },[]);
  useEffect(()=>{
    const settings:Partial<Settings>=resolveSettings(props);
    if(props.checked===undefined)delete settings.checked;
    controller.current?.update(settings);
    if(props.paused)controller.current?.pause();else controller.current?.resume();
  });
  return <span ref={host} className={props.className} style={{display:'inline-block',maxWidth:'100%',...props.style}} dangerouslySetInnerHTML={initial.current}/>;
}
export const Component=GooeySwitch;
