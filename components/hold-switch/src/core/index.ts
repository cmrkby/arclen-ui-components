import manifest from '../../component.json';

export interface Settings {
  accessibleName: string; checked: boolean; disabled: boolean; width: number;
  trackTop: string; trackBottom: string; trackEdge: string; inkColor: string;
  thumbTop: string; thumbBottom: string; dotColor: string; shadowStrength: number;
  interaction: 'pressure' | 'hold'; holdDuration: number; quickTapWindow: number;
  releaseThreshold: number; pressureAmount: number; showProgress: boolean;
  progressColor: string; progressWidth: number; motionDuration: number;
  springDamping: number; stretchAmount: number;
}
export interface ChangeDetail { checked: boolean; source: 'pointer' | 'keyboard' | 'assistive'; activation: 'click' | 'hold' }
export interface MountOptions { readonly controlled?: boolean; onCheckedChange?: (checked: boolean, detail: ChangeDetail) => void }
export interface Controller { update(input: unknown): void; pause(): void; resume(): void; destroy(): void }
export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(s => [s.key, s.default]))) as unknown as Readonly<Settings>;
const object = (input: unknown): Record<string, unknown> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Hold Switch settings must be an object');
  return input as Record<string, unknown>;
};
export function resolveSettings(input: unknown): Settings {
  const given = object(input), result = {...defaults} as unknown as Record<string, unknown>;
  for (const key of Object.keys(given)) {
    const s = manifest.settings.find(s => s.key === key) as {kind:string;min?:number;max?:number;maxLength?:number;options?:Array<{value:string}>} | undefined;
    if (!s) throw new TypeError(`Unknown Hold Switch setting: ${key}`);
    const value = given[key];
    if (s.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < s.min! || value > s.max!) throw new TypeError(`Invalid number: ${key}`);
    } else if (s.kind === 'boolean') {
      if (typeof value !== 'boolean') throw new TypeError(`Invalid boolean: ${key}`);
    } else {
      if (typeof value !== 'string' || value.length > (s.maxLength ?? 120)) throw new TypeError(`Invalid text: ${key}`);
      if (s.kind === 'color' && !/^(?:transparent|#[0-9a-f]{6}(?:[0-9a-f]{2})?)$/i.test(value)) throw new TypeError(`Invalid color: ${key}`);
      if (s.kind === 'select' && !s.options?.some(o => o.value === value)) throw new TypeError(`Invalid selection: ${key}`);
      if (s.kind === 'text' && !value.trim()) throw new TypeError(`Empty accessible name: ${key}`);
    }
    result[key] = s.kind === 'text' ? (value as string).trim() : value;
  }
  return result as unknown as Settings;
}
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
let serial = 0;
const session = Math.random().toString(36).slice(2);
const unique = () => `auto-${session}-${++serial}`;
const encode = (id: string) => 'hold-' + Array.from(id).map(c => c.codePointAt(0)!.toString(16)).join('-');
const center = (i: number) => 28 + i * 304 / 27;
function variables(s: Settings) {
  return `--hold-width:${s.width}px;--hold-track-top:${s.trackTop};--hold-track-bottom:${s.trackBottom};--hold-edge:${s.trackEdge};--hold-ink:${s.inkColor};--hold-thumb-top:${s.thumbTop};--hold-thumb-bottom:${s.thumbBottom};--hold-dot:${s.dotColor};--hold-shadow:${s.shadowStrength};--hold-progress-color:${s.progressColor};--hold-progress-width:${s.progressWidth}`;
}
function description(s: Settings) {
  const seconds = s.holdDuration / 1000, duration = `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  return s.interaction === 'hold' ? `Hold Space or Enter for ${duration} to switch. Release early to cancel.` : `Press briefly to switch, or hold Space or Enter for ${duration}. Release after ${Math.round(s.releaseThreshold * 100)} percent to complete a partial hold.`;
}
export function render(input: unknown = defaults, id = unique()): string {
  const s = resolveSettings(input), key = encode(id), x = s.checked ? 266 : 94;
  return `<span class="hold-switch" data-hold-switch data-hold-phase="idle" data-hold-progress="0" style="${variables(s)}"><button class="hold-switch__button" type="button" role="switch" aria-checked="${s.checked}" aria-label="${escape(s.accessibleName)}" aria-describedby="${key}-description" disabled data-hold-inert><svg class="hold-switch__art" viewBox="0 0 360 180" aria-hidden="true" focusable="false"><defs><linearGradient id="${key}-track" x1="0" y1="0" x2="0" y2="1"><stop class="hold-switch__track-top" offset="0"/><stop class="hold-switch__track-bottom" offset="1"/></linearGradient><linearGradient id="${key}-thumb" x1="0" y1="0" x2="0" y2="1"><stop class="hold-switch__thumb-top" offset="0"/><stop class="hold-switch__thumb-mid-top" offset=".38"/><stop class="hold-switch__thumb-mid-bottom" offset=".76"/><stop class="hold-switch__thumb-bottom" offset="1"/></linearGradient><clipPath id="${key}-clip"><rect x="10" y="6" width="340" height="168" rx="84"/></clipPath><filter id="${key}-merge" x="-30%" y="-100%" width="160%" height="300%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="5"/><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -8"/></filter></defs><rect class="hold-switch__track" x="10" y="6" width="340" height="168" rx="84" fill="url(#${key}-track)"/><g clip-path="url(#${key}-clip)"><rect data-hold-solid class="hold-switch__ink" x="10" y="6" width="340" height="168" rx="84" opacity="${s.checked ? 1 : 0}"/><g class="hold-switch__ink" filter="url(#${key}-merge)">${Array.from({length:28}, (_,i) => `<circle data-hold-drop cx="${s.checked ? center(i) : 94}" cy="90" r="${s.checked ? 90 : 32}"/>`).join('')}</g></g><g data-hold-thumb transform="translate(${x} 90) scale(1 1)"><circle class="hold-switch__thumb" cx="0" cy="0" r="77" fill="url(#${key}-thumb)"/><circle data-hold-dot class="hold-switch__dot" cx="0" cy="1" r="2.4"/></g><circle data-hold-progress-ring class="hold-switch__progress" cx="0" cy="0" r="82" transform="translate(${x} 90) rotate(-90)" opacity="0"/></svg></button><span class="hold-switch__description" id="${key}-description">${escape(description(s))}</span></span>`;
}

// Analytic damped oscillator for thumb travel and pressure recoil.
function spring(x: number, velocity: number, target: number, seconds: number, damping: number): [number, number] {
  const w2 = 200, a = damping / 2, y = x - target, d = w2 - a * a;
  if (Math.abs(d) < .00001) {
    const b = velocity + a * y, decay = Math.exp(-a * seconds);
    return [target + (y + b * seconds) * decay, (velocity - a * b * seconds) * decay];
  }
  if (d > 0) {
    const w = Math.sqrt(d), c = Math.cos(w * seconds), sn = Math.sin(w * seconds), b = (velocity + a * y) / w, decay = Math.exp(-a * seconds);
    return [target + decay * (y * c + b * sn), decay * (velocity * c - (a * b + w * y) * sn)];
  }
  const w = Math.sqrt(-d), r1 = -a + w, r2 = -a - w, c1 = (velocity - r2 * y) / (r1 - r2), c2 = y - c1;
  return [target + c1 * Math.exp(r1 * seconds) + c2 * Math.exp(r2 * seconds), r1 * c1 * Math.exp(r1 * seconds) + r2 * c2 * Math.exp(r2 * seconds)];
}
interface Pose { x:number; velocity:number; fill:number; fillVelocity:number; compression:number; wave:number }
interface Animation extends Pose { start:number; target:number; duration:number; damping:number; recoil:number }
interface Gesture { pointer:number|null; key:string|null; source:'pointer'|'keyboard'; start:number; progress:number; startChecked:boolean; baseFill:number; baseCompression:number; committed:boolean; cancelled:boolean }
export function mount(host: HTMLElement, input: unknown = defaults, id = unique(), options: MountOptions = {}): Controller {
  let settings = resolveSettings(input), checked = settings.checked, dead = false, paused = false, visible = true;
  const doc = host.ownerDocument, win = doc.defaultView;
  if (!win) throw new Error('Hold Switch requires a window to mount');
  host.innerHTML = render(settings, id);
  const root = host.querySelector<HTMLElement>('[data-hold-switch]')!, button = root.querySelector<HTMLButtonElement>('button')!;
  const thumb = root.querySelector<SVGGElement>('[data-hold-thumb]')!, drops = [...root.querySelectorAll<SVGCircleElement>('[data-hold-drop]')];
  const solid = root.querySelector<SVGRectElement>('[data-hold-solid]')!, ring = root.querySelector<SVGCircleElement>('[data-hold-progress-ring]')!, hint = root.querySelector<HTMLElement>('.hold-switch__description')!;
  let pose: Pose = {x:+checked,velocity:0,fill:+checked,fillVelocity:0,compression:0,wave:0};
  let animation: Animation|null = null, gesture: Gesture|null = null, raf:number|null = null, timer:number|null = null;
  let cancelledKey:string|null=null;
  let ignorePointerClick = false, ignoreKeyboardClick = false, keyboardClickTimer:number|null = null;
  const media = typeof win.matchMedia === 'function' ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reduced = media?.matches ?? true;
  const hasObserver = typeof win.IntersectionObserver === 'function', hasFrame = typeof win.requestAnimationFrame === 'function';
  const now = () => win.performance.now();
  const enabled = () => !dead && !paused && !doc.hidden && !settings.disabled;
  const decorate = () => enabled() && visible && !reduced && hasObserver && hasFrame;
  const pendingHold = () => gesture !== null && !gesture.cancelled && !gesture.committed;
  function stopFrame() { if (raf !== null) win!.cancelAnimationFrame(raf); if (timer !== null) win!.clearTimeout(timer); raf = timer = null; }
  function sync() {
    root.setAttribute('style', variables(settings)); button.setAttribute('aria-label', settings.accessibleName); button.setAttribute('aria-checked', String(checked));
    button.disabled = !enabled(); button.removeAttribute('data-hold-inert'); hint.textContent = description(settings);
  }
  function paint() {
    const x = 94 + clamp(pose.x, -.04, 1.04) * 172;
    const pressureScale = 1 - (reduced ? 0 : pose.compression), stretch = decorate() && animation ? settings.stretchAmount * clamp(Math.abs(pose.velocity) / 7) : 0;
    thumb.setAttribute('transform', `translate(${x} 90) scale(${pressureScale * (1 + stretch)} ${pressureScale * (1 - stretch * .65)})`);
    drops.forEach((drop, i) => { const f = clamp(pose.fill); drop.setAttribute('cx', String(94 + (center(i) - 94) * f)); drop.setAttribute('cy', String(90 + Math.sin(i * .75) * pose.wave)); drop.setAttribute('r', String(32 + 58 * f)); });
    solid.setAttribute('opacity', pose.fill >= .9999 && Math.abs(pose.wave) < .001 ? '1' : '0');
    const progress = gesture && !gesture.cancelled ? gesture.progress : 0, radius = 77 * pressureScale + 5, circumference = 2 * Math.PI * radius;
    ring.setAttribute('r', String(radius)); ring.setAttribute('transform', `translate(${x} 90) rotate(-90)`); ring.setAttribute('stroke-dasharray', String(circumference)); ring.setAttribute('stroke-dashoffset', String(circumference * (1 - progress))); ring.setAttribute('opacity', settings.showProgress && progress > 0 ? '1' : '0');
    root.dataset.holdProgress = String(Number(progress.toFixed(6)));
    root.dataset.holdPhase = pendingHold() ? 'pressing' : gesture?.committed && !gesture.cancelled ? 'committed' : animation ? 'settling' : 'idle';
  }
  function sample(time: number) {
    if (animation) {
      const a = animation, elapsed = Math.max(0, (time - a.start) * 880 / a.duration), seconds = elapsed / 1000;
      [pose.x, pose.velocity] = spring(a.x,a.velocity,a.target,seconds,a.damping);
      [pose.fill, pose.fillVelocity] = spring(a.fill,a.fillVelocity,a.target,seconds,a.damping);
      if (elapsed < 260) pose.fill -= Math.sign(a.target - a.fill) * a.recoil * Math.sin(Math.PI * elapsed / 260) ** 2;
      pose.compression = a.compression * Math.exp(-elapsed / 85); pose.wave = a.wave * Math.exp(-elapsed / 90);
      if (elapsed > 880 && Math.abs(pose.x-a.target)<.0003 && Math.abs(pose.fill-a.target)<.0003 || elapsed>2400) {
        pose = {x:a.target,velocity:0,fill:a.target,fillVelocity:0,compression:0,wave:0}; animation = null;
      }
    }
    if (pendingHold()) {
      const g = gesture!; g.progress = clamp((time-g.start)/settings.holdDuration);
      pose.fill = g.baseFill + (1-Number(g.startChecked)-g.baseFill) * .92 * g.progress;
      pose.compression = reduced ? 0 : g.baseCompression + (settings.pressureAmount-g.baseCompression)*g.progress;
      pose.wave = reduced ? 0 : 14*g.progress;
    }
  }
  function schedule() {
    if (dead || raf !== null || timer !== null || !enabled() || !animation && !pendingHold()) return;
    if (hasFrame) raf = win!.requestAnimationFrame(frame); else timer = win!.setTimeout(() => frame(now()),16);
  }
  function animateToEndpoint(recoil = 0) {
    if (!decorate()) { animation = null; pose = {x:+checked,velocity:0,fill:+checked,fillVelocity:0,compression:0,wave:0}; }
    else animation = {...pose,start:now(),target:+checked,duration:settings.motionDuration,damping:settings.springDamping,recoil};
    paint(); schedule();
  }
  function commit(source: ChangeDetail['source'], activation: ChangeDetail['activation']) {
    if (!enabled() || gesture?.committed || gesture?.cancelled) return;
    sample(now()); const strength = gesture?.progress ?? 0;
    if (gesture) { gesture.committed = true; gesture.progress = 1; }
    const next = !checked;
    if (!options.controlled) { checked = next; settings.checked = next; button.setAttribute('aria-checked',String(next)); }
    animateToEndpoint(strength > .8 ? .08 : 0);
    const detail:ChangeDetail = {checked:next,source,activation};
    options.onCheckedChange?.(next,detail);
    if (!dead) button.dispatchEvent(new win!.CustomEvent<ChangeDetail>('hold-switch-change',{bubbles:true,detail}));
  }
  function frame(time:number) {
    raf = timer = null;
    if (dead) return;
    if (!enabled()) { suspend(); return; }
    sample(time);
    if (pendingHold() && time-gesture!.start >= settings.holdDuration) commit(gesture!.source,'hold');
    paint(); schedule();
  }
  function releaseCapture(pointer:number|null) { if (pointer === null) return; try { if (button.hasPointerCapture?.(pointer)) button.releasePointerCapture(pointer); } catch { /* Already released by browser. */ } }
  function suppressKeyboardClick() {
    ignoreKeyboardClick = true;
    if (keyboardClickTimer !== null) win!.clearTimeout(keyboardClickTimer);
    keyboardClickTimer = win!.setTimeout(() => { ignoreKeyboardClick=false; keyboardClickTimer=null; },0);
  }
  function cancelGesture() {
    if (!gesture) return;
    const g=gesture; sample(now()); gesture=null;
    if (g.source === 'pointer') ignorePointerClick=true; else {cancelledKey=g.key;suppressKeyboardClick();}
    releaseCapture(g.pointer); animateToEndpoint();
  }
  function suspend() {
    cancelGesture(); stopFrame(); animation=null; pose={x:+checked,velocity:0,fill:+checked,fillVelocity:0,compression:0,wave:0}; sync(); paint();
  }
  function begin(source:'pointer'|'keyboard',pointer:number|null,key:string|null) {
    if (!enabled() || pendingHold() || gesture?.committed) return;
    sample(now()); gesture={pointer,key,source,start:now(),progress:0,startChecked:checked,baseFill:pose.fill,baseCompression:pose.compression,committed:false,cancelled:false};
    if(source==='pointer')ignorePointerClick=false;
    paint();schedule();
  }
  function finish() {
    const g=gesture; if(!g)return;
    const releasedAt=now(), elapsed=releasedAt-g.start;
    sample(releasedAt);
    const sampledProgress=g.progress;
    if (!g.cancelled && !g.committed && enabled()) {
      if(elapsed>=settings.holdDuration)commit(g.source,'hold');
      else if(settings.interaction==='pressure' && (elapsed<=settings.quickTapWindow || sampledProgress>=settings.releaseThreshold))commit(g.source,elapsed<=settings.quickTapWindow?'click':'hold');
      else cancelGesture();
    }
    if(g.source==='pointer')ignorePointerClick=true;else {cancelledKey=null;suppressKeyboardClick();}
    gesture=null;releaseCapture(g.pointer);paint();schedule();
  }
  function down(e:PointerEvent) {
    if(!e.isPrimary || e.button!==0 || !enabled())return;
    begin('pointer',e.pointerId,null);
    if(gesture?.pointer===e.pointerId)try{button.setPointerCapture(e.pointerId);}catch{/* Window listeners retain cancellation. */}
  }
  function move(e:PointerEvent) {
    if(!pendingHold() || gesture!.pointer!==e.pointerId)return;
    const box=button.getBoundingClientRect();
    if(e.clientX<box.left || e.clientX>box.right || e.clientY<box.top || e.clientY>box.bottom)cancelGesture();
  }
  function up(e:PointerEvent) { if(gesture?.pointer===e.pointerId)finish(); }
  function cancel(e:PointerEvent) { if(gesture?.pointer===e.pointerId)cancelGesture(); }
  function leave(e:PointerEvent) { if(gesture?.pointer===e.pointerId && !button.hasPointerCapture?.(e.pointerId))cancelGesture(); }
  function keydown(e:KeyboardEvent) {
    if(e.key==='Escape'){if(gesture){e.preventDefault();cancelGesture();}return;}
    if(e.key!==' ' && e.key!=='Enter')return;
    e.preventDefault();
    if(e.repeat || gesture && !gesture.cancelled)return;
    if(cancelledKey===e.key)cancelledKey=null;
    begin('keyboard',null,e.key);
  }
  function keyup(e:KeyboardEvent) { if(cancelledKey===e.key){e.preventDefault();cancelledKey=null;suppressKeyboardClick();return;} if(gesture?.key===e.key){e.preventDefault();finish();} }
  function click(e:MouseEvent) {
    if(e.detail>0 && ignorePointerClick){ignorePointerClick=false;e.preventDefault();return;}
    if(e.detail===0 && (ignoreKeyboardClick || gesture?.key)){e.preventDefault();return;}
    if(!enabled())return;
    if(gesture){cancelGesture();gesture=null;}
    commit(e.detail===0?'assistive':'pointer','click');
  }
  function blur(){cancelGesture();}
  function visibility(){if(doc.hidden)suspend();else sync();}
  function mediaChange(){reduced=media?.matches??true;sample(now());if(reduced){animation=null;pose.x=+checked;pose.velocity=0;pose.compression=0;pose.wave=0;if(!pendingHold())pose.fill=+checked;}paint();schedule();}
  function contextmenu(e:Event){e.preventDefault();}
  button.addEventListener('pointerdown',down);button.addEventListener('pointerleave',leave);button.addEventListener('pointercancel',cancel);button.addEventListener('lostpointercapture',cancel);
  win.addEventListener('pointermove',move);win.addEventListener('pointerup',up);button.addEventListener('keydown',keydown);win.addEventListener('keyup',keyup);button.addEventListener('click',click);button.addEventListener('blur',blur);win.addEventListener('blur',blur);button.addEventListener('contextmenu',contextmenu);doc.addEventListener('visibilitychange',visibility);
  if(media?.addEventListener)media.addEventListener('change',mediaChange);else media?.addListener?.(mediaChange);
  const observer=hasObserver?new win.IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(!visible)suspend();else sync();}):null;observer?.observe(root);
  sync();paint();
  return {
    update(input:unknown){
      if(dead)return;
      const next=resolveSettings({...settings,...object(input)});
      if(manifest.settings.every(s=>next[s.key as keyof Settings]===settings[s.key as keyof Settings]))return;
      sample(now());
      const locked=gesture?.committed;
      if(!locked)cancelGesture();
      settings=next;checked=next.checked;sync();animateToEndpoint();
      if(!enabled())suspend();
    },
    pause(){if(dead||paused)return;paused=true;suspend();},
    resume(){if(dead||!paused)return;paused=false;sync();paint();},
    destroy(){
      if(dead)return;suspend();dead=true;stopFrame();if(keyboardClickTimer!==null)win.clearTimeout(keyboardClickTimer);gesture=null;
      button.removeEventListener('pointerdown',down);button.removeEventListener('pointerleave',leave);button.removeEventListener('pointercancel',cancel);button.removeEventListener('lostpointercapture',cancel);win.removeEventListener('pointermove',move);win.removeEventListener('pointerup',up);button.removeEventListener('keydown',keydown);win.removeEventListener('keyup',keyup);button.removeEventListener('click',click);button.removeEventListener('blur',blur);win.removeEventListener('blur',blur);button.removeEventListener('contextmenu',contextmenu);doc.removeEventListener('visibilitychange',visibility);if(media?.removeEventListener)media.removeEventListener('change',mediaChange);else media?.removeListener?.(mediaChange);observer?.disconnect();button.disabled=true;button.setAttribute('data-hold-inert','');root.dataset.holdPhase='idle';root.dataset.holdProgress='0';ring.setAttribute('opacity','0');
    }
  };
}
