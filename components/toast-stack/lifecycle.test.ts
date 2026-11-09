// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, resolveSettings, setPropPaused, type Controller } from './src/core';
const controllers: Controller[]=[];
const hosts: HTMLElement[]=[];
function setup(settings: Parameters<typeof mount>[1]={}, callbacks: Parameters<typeof mount>[2]={}) {
  const host=document.createElement('div');document.body.append(host);hosts.push(host);
  const api=mount(host,{animate:false,duration:1000,...settings},callbacks);controllers.push(api);return {api,host};
}
const card=(host:HTMLElement,id:string)=>Array.from(host.querySelectorAll<HTMLElement>('.ats-card')).find(el=>el.dataset.toastId===id);
beforeEach(()=>vi.useFakeTimers());
afterEach(()=>{controllers.splice(0).forEach(api=>api.destroy());hosts.splice(0).forEach(host=>host.remove());vi.useRealTimers();});
describe('Toast Stack lifecycle',()=>{
  it('keeps instances isolated and freezes remaining life through manual pause',()=>{
    const a=setup(),b=setup();vi.advanceTimersByTime(400);a.api.pause();vi.advanceTimersByTime(1000);
    expect(a.host.querySelectorAll('.ats-card')).toHaveLength(1);expect(b.host.querySelectorAll('.ats-card')).toHaveLength(0);
    a.api.resume();vi.advanceTimersByTime(599);expect(a.host.querySelectorAll('.ats-card')).toHaveLength(1);vi.advanceTimersByTime(1);expect(a.host.querySelectorAll('.ats-card')).toHaveLength(0);
  });
  it('starts queued lifetime only when shown and keeps queued controls inaccessible',()=>{
    const {api,host}=setup({maxVisible:1,duration:0,showClose:true});
    const queued=host.querySelector<HTMLElement>('.ats-card')!.dataset.toastId!;
    const id=api.notify({title:'Front',duration:1000});
    expect(card(host,queued)!.hidden).toBe(true);expect(card(host,queued)!.tabIndex).toBe(-1);
    vi.advanceTimersByTime(1000);expect(card(host,id)).toBeUndefined();expect(card(host,queued)!.hidden).toBe(false);
  });
  it('applies atomic patches without replacing card identity or resetting lifetime',()=>{
    const {api,host}=setup();const id=api.notify({id:'custom',title:'Saved',description:'Original'});const node=card(host,id);
    vi.advanceTimersByTime(300);expect(api.updateToast(id,{title:'Updated'})).toBe(true);expect(card(host,id)).toBe(node);
    expect(()=>api.updateToast(id,{description:'Changed',duration:-1})).toThrow();expect(node!.textContent).toContain('Original');
    vi.advanceTimersByTime(700);expect(card(host,id)).toBeUndefined();expect(()=>api.updateToast('missing',{title:null} as never)).toThrow();
  });
  it('treats settings updates as patches and does not replace programmatic content',()=>{
    const {api,host}=setup({duration:0,title:'Initial',showClose:true});const id=api.notify({title:'Programmatic'});
    api.update({title:'Settings changed',width:500});api.update({width:undefined});
    expect(card(host,id)!.textContent).toContain('Programmatic');expect(host.textContent).toContain('Settings changed');
    expect(host.querySelector<HTMLElement>('.ats-list')!.style.width).toBe('500px');
    expect(()=>api.update({unknown:undefined} as never)).toThrow();
  });
  it('contains action failures and calls host only after per-toast success',async()=>{
    const calls:string[]=[];const {api,host}=setup({duration:0},{onAction:()=>{calls.push('host');}});
    const id=api.notify({title:'Action',action:{label:'Apply',onClick:async()=>{calls.push('toast');throw Error('failure');}}});
    card(host,id)!.querySelector<HTMLButtonElement>('.ats-action')!.click();await vi.runAllTicks();await Promise.resolve();await Promise.resolve();
    expect(calls).toEqual(['toast']);expect(card(host,id)!.textContent).toContain('Could not save changes');
    api.updateToast(id,{action:{label:'Apply',onClick:async()=>{calls.push('success');}}});card(host,id)!.querySelector<HTMLButtonElement>('.ats-action')!.click();
    await Promise.resolve();await Promise.resolve();await Promise.resolve();expect(calls).toEqual(['toast','success','host']);expect(card(host,id)).toBeUndefined();
  });
  it('awaits async promise mapping, handles display failures, ignores superseded results',async()=>{
    const {api,host}=setup({duration:0});let resolve!:(s:string)=>void;
    const pending=api.notifyPromise(new Promise<string>(r=>{resolve=r;}),{loading:'Working',success:async value=>`${value} complete`,error:'Failed'});
    resolve('Save');expect(await pending.settled).toEqual({status:'fulfilled',value:'Save'});expect(card(host,pending.id)!.textContent).toContain('Save complete');
    const bad=api.notifyPromise(Promise.resolve(1),{loading:'Working',success:()=>{throw Error('display');},error:'Failed'});
    const result=await bad.settled;expect(result.status).toBe('fulfilled');expect(result.displayError).toBeInstanceOf(Error);expect(card(host,bad.id)!.dataset.type).toBe('error');
    let finish!:(s:string)=>void;const mapper=vi.fn(()=> 'Stale');const stale=api.notifyPromise(new Promise<string>(r=>{finish=r;}),{loading:'Working',success:mapper,error:'Failed'});
    api.updateToast(stale.id,{title:'Manual update',type:'default'});finish('done');await stale.settled;expect(mapper).not.toHaveBeenCalled();expect(card(host,stale.id)!.textContent).toContain('Manual update');
  });
  it('observes rejection after destroy and removes only owned nodes',async()=>{
    const {api,host}=setup();const sibling=document.createElement('p');sibling.textContent='Host content';host.append(sibling);
    let reject!:(reason:unknown)=>void;const pending=api.notifyPromise(new Promise((_,r)=>{reject=r;}),{loading:'Working',success:'Done',error:'Failed'});
    api.destroy();api.destroy();reject('offline');expect(await pending.settled).toEqual({status:'rejected',reason:'offline'});expect(host.textContent).toBe('Host content');expect(vi.getTimerCount()).toBe(0);
  });
  it('restores the actual invoker after keyboard dismissal without focusing new arrivals',()=>{
    const {api,host}=setup({showClose:true,duration:0});const trigger=document.createElement('button');host.append(trigger);trigger.focus();
    const id=api.notify({title:'Close me'});expect(document.activeElement).toBe(trigger);api.focus();card(host,id)!.querySelector<HTMLButtonElement>('.ats-close')!.focus();
    card(host,id)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));expect(document.activeElement).toBe(trigger);
  });
  it('keeps promise outcomes resolved when the configured failure text is blank',async()=>{
    const {api,host}=setup({errorLabel:'',duration:0});
    const operation=api.notifyPromise(Promise.resolve('saved'),{loading:'Working',success:()=>Promise.reject('display failed'),error:'Failed'});
    expect(await operation.settled).toEqual({status:'fulfilled',value:'saved',displayError:'display failed'});
    expect(card(host,operation.id)!.textContent).toContain('Could not save changes');
  });
  it('cancels active animation immediately when animate becomes false',()=>{
    const previousMedia=window.matchMedia, previousAnimate=HTMLElement.prototype.animate;
    const animations:Array<{cancel:ReturnType<typeof vi.fn>;pause:ReturnType<typeof vi.fn>;play:ReturnType<typeof vi.fn>}> = [];
    window.matchMedia=(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})) as unknown as typeof window.matchMedia;
    HTMLElement.prototype.animate=(()=>{const animation={cancel:vi.fn(),pause:vi.fn(),play:vi.fn()};animations.push(animation);return animation;}) as unknown as typeof HTMLElement.prototype.animate;
    try {
      const {api}=setup({animate:true,duration:0});expect(animations.length).toBeGreaterThan(0);
      api.pause();expect(animations[0].pause).toHaveBeenCalled();api.resume();expect(animations[0].play).toHaveBeenCalled();
      api.update({animate:false});expect(animations[0].cancel).toHaveBeenCalled();
    } finally {window.matchMedia=previousMedia;HTMLElement.prototype.animate=previousAnimate;}
  });
  it('contains both dismissal callback failures without delaying removal',async()=>{
    const calls:string[]=[];const {api,host}=setup({duration:0},{onDismiss:async()=>{calls.push('host');throw Error('host');}});
    const id=api.notify({title:'Dismiss',onDismiss:()=>{calls.push('toast');throw Error('toast');}});
    api.dismiss(id);api.dismiss(id);expect(card(host,id)).toBeUndefined();await Promise.resolve();await Promise.resolve();expect(calls).toEqual(['toast','host']);
  });

  it('never resurrects dismissed settings-owned cards on settings updates',()=>{
    const {api,host}=setup({duration:0});api.dismiss();expect(host.querySelectorAll('.ats-card')).toHaveLength(0);
    api.update(resolveSettings({title:'Updated',description:'Updated description',messages:[],type:'success',showAction:true,actionLabel:'Undo'}));
    api.update({textColor:'#333333'});expect(host.querySelectorAll('.ats-card')).toHaveLength(0);
    api.update({messages:['New message']});expect(host.querySelectorAll('.ats-card')).toHaveLength(1);expect(host.textContent).toContain('New message');expect(host.textContent).not.toContain('Updated description');
    api.destroy();const remounted=mount(host,{duration:0});controllers.push(remounted);expect(host.querySelectorAll('.ats-card')).toHaveLength(1);
  });
  it('announces meaningful content once and ignores layout-only notification patches',()=>{
    const {api,host}=setup({duration:0});const id=api.notify({title:'New status'});const live=host.querySelector('.ats-live')!;const announcement=live.firstChild;
    api.updateToast(id,{duration:0});api.update({radius:12});expect(live.firstChild).toBe(announcement);
    api.updateToast(id,{title:'Changed status'});expect(live.firstChild).not.toBe(announcement);expect(live.textContent).toBe('Changed status');
  });

  it('keeps prop suspension independent from manual suspension',()=>{
    const {api,host}=setup();setPropPaused(api,true);api.resume();vi.advanceTimersByTime(1500);expect(host.querySelectorAll('.ats-card')).toHaveLength(1);
    api.pause();setPropPaused(api,false);vi.advanceTimersByTime(1500);expect(host.querySelectorAll('.ats-card')).toHaveLength(1);
    api.resume();vi.advanceTimersByTime(1000);expect(host.querySelectorAll('.ats-card')).toHaveLength(0);
  });
  it('preserves focus on the card when its content and appearance change',()=>{
    const {api,host}=setup({duration:0});const id=api.notify({title:'Card',action:{label:'Apply',onClick:()=>{}}});const node=card(host,id)!;node.focus();
    api.updateToast(id,{title:'Updated'});expect(document.activeElement).toBe(node);api.update({radius:12});expect(document.activeElement).toBe(node);
    const button=node.querySelector<HTMLButtonElement>('.ats-action')!;button.focus();api.updateToast(id,{action:null});expect(document.activeElement).toBe(node);
  });
  it('allows a replacement action while an obsolete callback remains pending',async()=>{
    const {api,host}=setup({duration:0});let finishOld!:()=>void;let finishNew!:()=>void;
    const replacement=vi.fn(()=>new Promise<void>(resolve=>{finishNew=resolve;}));
    const id=api.notify({title:'Action',action:{label:'Old',onClick:()=>new Promise<void>(resolve=>{finishOld=resolve;})}});
    card(host,id)!.querySelector<HTMLButtonElement>('.ats-action')!.click();
    api.updateToast(id,{action:{label:'New',onClick:replacement,closeOnAction:false}});card(host,id)!.querySelector<HTMLButtonElement>('.ats-action')!.click();expect(replacement).toHaveBeenCalledOnce();
    finishOld();await Promise.resolve();await Promise.resolve();expect(card(host,id)!.querySelector<HTMLButtonElement>('.ats-action')!.disabled).toBe(true);
    finishNew();await Promise.resolve();await Promise.resolve();await Promise.resolve();expect(card(host,id)!.querySelector<HTMLButtonElement>('.ats-action')!.disabled).toBe(false);
  });

  it('does not restart card opacity when stack transform retargets',()=>{
    const previousMedia=window.matchMedia,previousAnimate=HTMLElement.prototype.animate;
    const calls:Array<{node:HTMLElement;frames:Keyframe[];animation:Animation;cancel:ReturnType<typeof vi.fn>}> = [];
    window.matchMedia=(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})) as unknown as typeof window.matchMedia;
    HTMLElement.prototype.animate=function(frames){const cancel=vi.fn();const animation={cancel,pause:vi.fn(),play:vi.fn(),currentTime:37,playState:'running'} as unknown as Animation;calls.push({node:this,frames:frames as Keyframe[],animation,cancel});return animation;};
    try {
      const {api,host}=setup({animate:true,duration:0});const id=api.notify({title:'First'});const node=card(host,id)!;
      const opacity=calls.find(c=>c.node===node&&'opacity' in c.frames[0])!;expect(opacity).toBeTruthy();
      api.notify({title:'Second'});api.notify({title:'Third'});expect(opacity.cancel).not.toHaveBeenCalled();expect(calls.filter(c=>c.node===node&&'opacity' in c.frames[0])).toHaveLength(1);
      api.pause();expect(opacity.animation.currentTime).toBe(37);expect(opacity.animation.pause).toHaveBeenCalled();
    } finally {window.matchMedia=previousMedia;HTMLElement.prototype.animate=previousAnimate;}
  });
  it('composes eased reversal shortening and retains unchanged tracks',()=>{
    const previousMedia=window.matchMedia,previousAnimate=HTMLElement.prototype.animate;
    const calls:Array<{node:HTMLElement;duration:number;animation:Animation}> = [];
    window.matchMedia=(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})) as unknown as typeof window.matchMedia;
    HTMLElement.prototype.animate=function(_frames,options){const animation={cancel:vi.fn(),pause:vi.fn(),play:vi.fn(),currentTime:50,playState:'running',effect:{getComputedTiming:()=>({progress:0.4})}} as unknown as Animation;calls.push({node:this,duration:(options as KeyframeAnimationOptions).duration as number,animation});return animation;};
    try {
      const {api,host}=setup({animate:true,duration:0});const id=api.notify({title:'First'});const body=card(host,id)!.querySelector<HTMLElement>('.ats-body')!;
      for (const call of calls.filter(c=>c.node===body)) call.animation.onfinish?.call(call.animation, {} as AnimationPlaybackEvent);
      body.style.opacity='1';api.notify({title:'Second'});api.update({expanded:true});
      expect(calls.filter(c=>c.node===body).at(-1)!.duration).toBeCloseTo(160);
      api.update({expanded:false});expect(calls.filter(c=>c.node===body).at(-1)!.duration).toBeCloseTo(304);
      const count=calls.length;api.update({radius:12});expect(calls).toHaveLength(count);
    } finally {window.matchMedia=previousMedia;HTMLElement.prototype.animate=previousAnimate;}
  });
  it('preserves body and status layer identity through redraw and reversals',()=>{
    const previousMedia=window.matchMedia,previousAnimate=HTMLElement.prototype.animate;
    const calls:Array<{node:HTMLElement;frames:Keyframe[];animation:Animation}> = [];
    window.matchMedia=(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})) as unknown as typeof window.matchMedia;
    HTMLElement.prototype.animate=function(frames){const animation={cancel:vi.fn(),pause:vi.fn(),play:vi.fn(),currentTime:50,playState:'running'} as unknown as Animation;calls.push({node:this,frames:frames as Keyframe[],animation});return animation;};
    try {
      const {api,host}=setup({showIcon:true,animate:true,duration:0});const id=api.notify({title:'Working',type:'loading'});const node=card(host,id)!,body=node.querySelector('.ats-body'),loader=node.querySelector('.ats-loader');
      expect(calls.filter(c=>c.node.classList.contains('ats-icon-layer'))).toHaveLength(0);
      api.notify({title:'Front'});api.update({expanded:true});api.update({radius:12});expect(node.querySelector('.ats-body')).toBe(body);expect(node.querySelector('.ats-loader')).toBe(loader);
      api.updateToast(id,{title:'Saved',type:'success'});expect(node.querySelectorAll('.ats-icon-layer')).toHaveLength(2);expect(node.querySelector('.ats-loader')).toBe(loader);
      const incoming=node.querySelector('.ats-icon-layer svg');api.updateToast(id,{description:'Saved locally'});expect(node.querySelector('.ats-icon-layer svg')).toBe(incoming);
      api.updateToast(id,{type:'loading'});expect(node.querySelector('.ats-loader')).toBe(loader);expect(node.querySelectorAll('.ats-loader')).toHaveLength(1);
      api.update({animate:false});expect(node.querySelectorAll('.ats-icon-layer')).toHaveLength(1);expect(node.querySelector('.ats-loader')).toBe(loader);expect(calls.some(c=>c.node===body&&'opacity' in c.frames[0])).toBe(true);
    } finally {window.matchMedia=previousMedia;HTMLElement.prototype.animate=previousAnimate;}
  });

  it('uses configured promise labels captured at invocation',async()=>{
    const {api,host}=setup({loadingLabel:'Publishing draft',successLabel:'Draft published',errorLabel:'Publication failed',duration:0});let finish!:(value:string)=>void;
    const operation=api.notifyPromise(new Promise<string>(resolve=>{finish=resolve;}));expect(card(host,operation.id)!.textContent).toContain('Publishing draft');
    api.update({loadingLabel:'New loading label',successLabel:'New success label',errorLabel:'New failure label'});finish('done');await operation.settled;
    expect(card(host,operation.id)!.textContent).toContain('Draft published');const next=api.notifyPromise(Promise.reject('offline'));expect(card(host,next.id)!.textContent).toContain('New loading label');await next.settled;expect(card(host,next.id)!.textContent).toContain('New failure label');
    const explicit=api.notifyPromise(Promise.resolve('done'),{loading:'Explicit loading',success:'Explicit success',error:'Explicit failure'});await explicit.settled;expect(card(host,explicit.id)!.textContent).toContain('Explicit success');
  });
  it('safely displays blank configured labels without mutating exported settings',async()=>{
    const configured=resolveSettings({title:'',regionLabel:'',showAction:true,actionLabel:'',loadingLabel:'',successLabel:'',errorLabel:'',duration:0});
    const {api,host}=setup(configured);expect(host.querySelector('.ats')!.getAttribute('aria-label')).toBe('Notifications');expect(host.querySelector('.ats-action')!.textContent).toBe('Undo');
    const operation=api.notifyPromise(Promise.resolve('done'));expect(card(host,operation.id)!.textContent).toContain('Saving changes…');await operation.settled;expect(card(host,operation.id)!.textContent).toContain('Changes saved');
    const rejected=api.notifyPromise(Promise.reject('offline'));await rejected.settled;expect(card(host,rejected.id)!.textContent).toContain('Could not save changes');expect(configured.regionLabel).toBe('');expect(configured.actionLabel).toBe('');expect(configured.loadingLabel).toBe('');
  });

  it('accounts elapsed lifetime before programmatic focus pauses it',()=>{
    const {api,host}=setup({duration:1000});const outside=document.createElement('button');document.body.append(outside);
    try {
      vi.advanceTimersByTime(900);api.focus();outside.focus();
      vi.advanceTimersByTime(99);expect(host.querySelector('.ats-card')).not.toBeNull();
      vi.advanceTimersByTime(1);expect(host.querySelector('.ats-card')).toBeNull();
    } finally {outside.remove();}
  });

});

it('keeps Toast width bounded across its compact threshold without changing legacy layouts',()=>{
 const previous=window.innerWidth;
 try{
  const {api,host}=setup({presentation:'toast',width:420,duration:0});
  for(const width of [500,600,601]){Object.defineProperty(window,'innerWidth',{configurable:true,value:width});api.update({width:420});expect(host.querySelector<HTMLElement>('.ats-list')!.style.width).toBe('420px');}
  Object.defineProperty(window,'innerWidth',{configurable:true,value:600});
  for(const presentation of ['compact','banner'] as const){api.update({presentation});expect(host.querySelector<HTMLElement>('.ats-list')!.style.width).toBe('568px');}
  Object.defineProperty(window,'innerWidth',{configurable:true,value:248});api.update({presentation:'toast'});expect(host.querySelector<HTMLElement>('.ats-list')!.style.width).toBe('216px');
 }finally{Object.defineProperty(window,'innerWidth',{configurable:true,value:previous});}
});
