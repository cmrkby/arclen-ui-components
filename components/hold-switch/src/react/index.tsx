'use client';
import {useEffect,useId,useRef,type CSSProperties} from 'react';
import manifest from '../../component.json';
import {mount,render,resolveSettings,defaults,type Settings,type Controller,type ChangeDetail} from '../core';
import '../styles.css';
export type HoldSwitchProps = Partial<Settings> & {className?:string;style?:CSSProperties;paused?:boolean;defaultChecked?:boolean;onCheckedChange?:(checked:boolean,detail:ChangeDetail)=>void};
function settingsProps(props:HoldSwitchProps):Partial<Settings>{
  return Object.fromEntries(manifest.settings.filter(s=>props[s.key as keyof Settings]!==undefined).map(s=>[s.key,props[s.key as keyof Settings]]));
}
export function HoldSwitch(props:HoldSwitchProps){
  const id=useId(),host=useRef<HTMLSpanElement>(null),controller=useRef<Controller|null>(null),latest=useRef(props);
  latest.current=props;
  const initial=useRef<{__html:string}|null>(null);
  if(initial.current===null)initial.current={__html:render(resolveSettings({...settingsProps(props),checked:props.checked??props.defaultChecked??defaults.checked}),id)};
  useEffect(()=>{
    const p=latest.current;
    controller.current=mount(host.current!,resolveSettings({...settingsProps(p),checked:p.checked??p.defaultChecked??defaults.checked}),id,{get controlled(){return latest.current.checked!==undefined;},onCheckedChange:(checked,detail)=>latest.current.onCheckedChange?.(checked,detail)});
    if(p.paused)controller.current.pause();
    return()=>{controller.current?.destroy();controller.current=null;};
  },[id]);
  useEffect(()=>{
    const settings:Partial<Settings>=resolveSettings(settingsProps(props));
    if(props.checked===undefined)delete settings.checked;
    controller.current?.update(settings);
    if(props.paused)controller.current?.pause();else controller.current?.resume();
  });
  return <span ref={host} className={props.className} style={{display:'inline-block',maxWidth:'100%',...props.style}} dangerouslySetInnerHTML={initial.current}/>;
}
export const Component=HoldSwitch;
