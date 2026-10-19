import {tuning, tuningVariables, applyTuning, type Tuning} from './tuning';
/** Independently authored, portable Tactical Button. No package or application imports. */
export interface TacticalSettings extends Partial<Tuning> {
  label: string;
  disabled: boolean;
  animate: boolean;
  textColor: string;
  scatterColor?: string;
  backgroundColor: string;
  cornerColor: string;
}
export interface TacticalController {
  update(settings: Partial<TacticalSettings>): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
export interface TacticalOptions { onAction?: (event: MouseEvent) => void }

const escape = (value: string) => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]!);
const color = /^(?:transparent|#[\da-f]{6}(?:[\da-f]{2})?)$/i;
export function resolveTactical(input: unknown, base: Readonly<TacticalSettings>): TacticalSettings {
  const next = {...base};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return next;
  const values = input as Record<string, unknown>;
  if (typeof values.label === 'string') {
    let label = values.label.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 40);
    if (/[\uD800-\uDBFF]$/.test(label)) label = label.slice(0, -1);
    next.label = label.trim() ? label : 'Button';
  }
  for (const key of ['disabled','animate'] as const) if (typeof values[key] === 'boolean') next[key] = values[key];
  for (const key of ['textColor','scatterColor','backgroundColor','cornerColor'] as const) if (typeof values[key] === 'string' && color.test(values[key])) next[key] = values[key];
  for (const key of Object.keys(tuning(next)) as (keyof Tuning)[]) {
    const candidate = {...next, [key]: values[key]};
    if (values[key] !== undefined && tuning(candidate)[key] === values[key]) Object.assign(next, {[key]: values[key]});
  }
  return next;
}
function variables(settings: TacticalSettings) {
  return `${tuningVariables(settings)};--tb-text:${settings.textColor};--tb-scramble:${settings.scatterColor ?? settings.textColor};--tb-background:${settings.backgroundColor};--tb-corner:${settings.cornerColor}`;
}
function inside(settings: TacticalSettings) {
  const corners = ['tl','bl','tr','br'].map(position => `<span class="tb-corner tb-${position}" aria-hidden="true"><span class="tb-mark"></span></span>`).join('');
  return `${corners}<span class="tb-label-wrap" data-tb-full="${escape(settings.label)}" aria-hidden="true"><span class="tb-label" data-tb-label>${escape(settings.label)}</span><span class="tb-accent-label">${escape(settings.label)}</span></span><span class="tb-surface" aria-hidden="true"></span><span class="tb-decoration" aria-hidden="true"><span class="tb-scan-band"></span></span>`;
}
export function renderTacticalButton(settings: TacticalSettings, id?: string): string {
  return `<button type="button" class="tb-button tb-scan" data-tb-trigger${id ? ` id="${escape(id)}"` : ''} aria-label="${escape(settings.label)}"${settings.disabled ? ' disabled' : ''} style="${variables(settings)}">${inside(settings)}</button>`;
}

interface Axis {value: number; velocity: number; target: number}
const axis = (): Axis => ({value:0,velocity:0,target:0});
interface CornerChannel { value: number; from: number; to: number; start: number; delay: number; duration: number }
// Use the shared bracket order, timing, trajectory and settlement.
const cornerChannels = (): CornerChannel[] => [100,200,400,300].map(delay => ({value:0,from:0,to:0,start:0,delay,duration:600}));
function ease(progress: number): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  // Solve an independently chosen cubic curve's x coordinate before sampling y.
  let low = 0, high = 1, t = progress;
  for (let i = 0; i < 15; i++) {
    const x = 3 * (1-t) * (1-t) * t * .16 + 3 * (1-t) * t * t * .3 + t * t * t;
    if (x < progress) low = t; else high = t;
    t = (low + high) / 2;
  }
  return 1 - (1-t) ** 3;
}
const attached = new WeakMap<HTMLButtonElement,TacticalController>();
export function attachTactical(button: HTMLButtonElement, initial: TacticalSettings, options: TacticalOptions = {}): TacticalController {
  attached.get(button)?.destroy();
  let settings = {...initial};
  let tune = tuning(settings);
  const doc = button.ownerDocument, win = doc.defaultView;
  button.classList.add('tb-button','tb-scan'); button.setAttribute('data-tb-trigger',''); button.type = 'button';
  if (!button.querySelector('.tb-label-wrap')) button.innerHTML = inside(settings);
  const corners = [...button.querySelectorAll<HTMLElement>('.tb-corner')];
  const labelWrap = button.querySelector<HTMLElement>('.tb-label-wrap')!;
  const label = button.querySelector<HTMLElement>('[data-tb-label]')!;
  const accent = button.querySelector<HTMLElement>('.tb-accent-label')!;
  const surface = button.querySelector<HTMLElement>('.tb-surface')!;
  const decor = button.querySelector<HTMLElement>('.tb-decoration')!;
  const reduced = win?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const pointer = win?.matchMedia?.('(hover: hover) and (pointer: fine)');
  const capable = Boolean(win && typeof win.requestAnimationFrame === 'function' && typeof win.cancelAnimationFrame === 'function' && typeof win.matchMedia === 'function' && typeof win.IntersectionObserver === 'function' && typeof win.ResizeObserver === 'function' && typeof button.animate === 'function');
  const hover = axis(), press = axis(), x = axis(), y = axis();
  let cornerMotion = cornerChannels();
  let frame = 0, previous = 0, paused = false, visible = true, destroyed = false, hovered = false;
  let sweep = 1, sweepStart: number | null = null;
  let scrambleStart: number | null = null;
  const symbols = '#%*+-/01=@_';
  function writeLabel(text: string) {
    for (const layer of [label, accent]) layer.textContent = text;
  }
  function resetScramble() {
    scrambleStart = null;
    writeLabel(settings.label);
    button.removeAttribute('data-tb-scrambling');
  }
  function sampleScramble(now: number): boolean {
    if (scrambleStart === null) return false;
    // Match Classic: first character resolves at 60ms, then one per 100ms.
    const resolved = Math.max(0, Math.floor((now - scrambleStart + tune.scrambleInterval * .4) / tune.scrambleInterval));
    let index = 0;
    const text = Array.from(settings.label).map(character => /\s/.test(character) ? character : (++index <= resolved ? character : symbols[Math.floor(Math.random() * symbols.length)])).join('');
    // Every masked colour layer receives the same sample to avoid doubled glyphs.
    writeLabel(text);
    if (resolved >= index) { resetScramble(); return false; }
    return true;
  }
  function startScramble() {
    if (!tune.scramble) return;
    scrambleStart = win!.performance.now();
    button.setAttribute('data-tb-scrambling', '');
    sampleScramble(scrambleStart);
  }
  const canAnimate = () => capable && settings.animate && !settings.disabled && !paused && visible && !doc.hidden && !reduced?.matches;
  const isFine = (event: PointerEvent) => event.pointerType !== 'touch' && pointer?.matches;
  function paint() {
    const h = hover.value, p = Math.max(0,Math.min(1,press.value)) * tune.pressDepth;
    const bounded=Math.max(0,Math.min(1,h));
    corners.forEach((corner, index) => {
      const x = index < 2 ? -1 : 1, y = index === 0 || index === 2 ? -1 : 1;
      corner.style.transform = `translate(${tune.cornerTravel * x * cornerMotion[index].value}px, ${tune.cornerTravel * y * cornerMotion[index].value}px)`;
    });
    surface.style.transform=`scaleY(${1-.045*p})`;labelWrap.style.transform=`translateY(${p}px)`;
    decor.style.opacity=String(bounded);decor.style.setProperty('--tb-scan-x',`${-40+sweep*140}%`);
    accent.style.visibility=sweep<1?'visible':'hidden';accent.style.clipPath=`inset(0 ${Math.max(0,100-sweep*135)}% 0 ${Math.max(0,sweep*135-35)}%)`;
  }
  function cancel() { if (frame) win?.cancelAnimationFrame(frame); frame = 0; previous = 0; }
  function settle() {
    cancel(); resetScramble(); hovered = false; sweep = 1; sweepStart = null; cornerMotion = cornerChannels();
    for (const a of [hover,press,x,y]) a.value = a.velocity = a.target = 0;
    button.removeAttribute('data-tb-active'); paint();
  }
  function configure() {
    button.style.setProperty('--tb-scramble', settings.scatterColor ?? settings.textColor);
    tune = tuning(settings); applyTuning(button, settings);
    button.disabled = settings.disabled; button.setAttribute('aria-label',settings.label);
    button.style.setProperty('--tb-text',settings.textColor); button.style.setProperty('--tb-background',settings.backgroundColor); button.style.setProperty('--tb-corner',settings.cornerColor);
    label.textContent = accent.textContent = settings.label; labelWrap.setAttribute('data-tb-full',settings.label);
  }
  function integrate(a: Axis, dt: number, stiffness: number, damping: number) {
    // Small bounded integration steps preserve continuity across slow frames.
    const steps = Math.max(1,Math.ceil(dt/.008)), step = dt/steps;
    for (let i=0;i<steps;i++) { a.velocity += ((a.target-a.value)*stiffness-a.velocity*damping)*step; a.value += a.velocity*step; }
    if (Math.abs(a.target-a.value)<.0005 && Math.abs(a.velocity)<.005) {a.value=a.target;a.velocity=0;}
    return a.value!==a.target || a.velocity!==0;
  }
  function sampleCorners(now: number): boolean {
    let busy = false;
    for (const channel of cornerMotion) {
      if (channel.from === channel.to) { channel.value = channel.to; continue; }
      const progress = (now - channel.start - channel.delay) / channel.duration;
      channel.value = channel.from + (channel.to - channel.from) * ease(progress);
      if (progress >= 0 && Math.abs(channel.to - channel.value) * 4 <= .01) channel.value = channel.to;
      if (progress < 1 && channel.value !== channel.to) busy = true;
    }
    return busy;
  }
  function retargetCorners(active: boolean) {
    const now = win!.performance.now();
    sampleCorners(now);
    for (const [index, channel] of cornerMotion.entries()) { channel.delay = [1,2,4,3][index] * tune.cornerStagger; channel.duration = tune.cornerDuration; channel.from = channel.value; channel.to = +active; channel.start = now; }
    // Paint from the current sampled pose.
    paint();
  }
  function tick(now: number) {
    frame = 0; if (destroyed) return;
    if (!canAnimate()) {settle();return;}
    const dt = Math.min(.064,Math.max(0,(now-(previous||now))/1000)); previous=now;
    let busy = sampleCorners(now);
    busy = sampleScramble(now) || busy;
    busy = integrate(hover,dt,380,39) || busy;
    busy = integrate(press,dt,700,42) || busy;
    busy = integrate(x,dt,240,24) || busy; busy = integrate(y,dt,240,24) || busy;
    if (sweepStart!==null) {sweep=Math.min(1,(win!.performance.now()-sweepStart)/tune.scanDuration);if(sweep>=1)sweepStart=null;else busy=true;}
    paint(); if(busy) frame=win!.requestAnimationFrame(tick); else previous=0;
  }
  function wake() {if(!frame && canAnimate()){previous=win!.performance.now();frame=win!.requestAnimationFrame(tick);}}
  function enter(event: PointerEvent) {
    if(!isFine(event)||!canAnimate()||hovered)return;
    hovered=true;hover.target=1;retargetCorners(true);startScramble();button.setAttribute('data-tb-active','');
    if(sweepStart===null){sweep=0;sweepStart=win!.performance.now();}
    wake();
  }
  function move(event: PointerEvent) {
    void event;
  }
  function leave() {if(!hovered)return;resetScramble();hovered=false;hover.target=0;x.target=y.target=0;retargetCorners(false);button.removeAttribute('data-tb-active');wake();}
  function down(event: PointerEvent) {if(canAnimate() && event.isPrimary && event.button===0){press.target=1;wake();}}
  function release() {press.target=0;wake();}
  function keyDown(event: KeyboardEvent) {if(!event.repeat && (event.key==='Enter'||event.key===' ') && canAnimate()){press.target=1;wake();}}
  function keyUp(event: KeyboardEvent) {if(event.key==='Enter'||event.key===' ')release();}
  function eligibility() {if(!canAnimate())settle();}
  function action(event: MouseEvent) {if(!destroyed&&!settings.disabled)options.onAction?.(event);}
  button.addEventListener('pointerenter',enter);button.addEventListener('pointerleave',leave);button.addEventListener('pointermove',move);button.addEventListener('pointerdown',down);
  button.addEventListener('keydown',keyDown);button.addEventListener('keyup',keyUp);button.addEventListener('blur',release);
  doc.addEventListener('pointerup',release);doc.addEventListener('pointercancel',release);doc.addEventListener('visibilitychange',eligibility);
  if(options.onAction)button.addEventListener('click',action);
  reduced?.addEventListener?.('change',eligibility);
  const observer=capable?new win!.IntersectionObserver(entries=>{if(destroyed)return;visible=entries.find(entry=>entry.target===button)?.isIntersecting??visible;eligibility();}):null;
  observer?.observe(button);configure();settle();
  const controller: TacticalController={
    update(input){if(destroyed)return;settings=resolveTactical(input,settings);configure();settle();},
    pause(){if(!destroyed){paused=true;settle();}},resume(){if(!destroyed)paused=false;},
    destroy(){if(destroyed)return;settle();destroyed=true;
      button.removeEventListener('pointerenter',enter);button.removeEventListener('pointerleave',leave);button.removeEventListener('pointermove',move);button.removeEventListener('pointerdown',down);button.removeEventListener('keydown',keyDown);button.removeEventListener('keyup',keyUp);button.removeEventListener('blur',release);
      doc.removeEventListener('pointerup',release);doc.removeEventListener('pointercancel',release);doc.removeEventListener('visibilitychange',eligibility);reduced?.removeEventListener?.('change',eligibility);observer?.disconnect();
      if(options.onAction)button.removeEventListener('click',action);if(attached.get(button)===controller)attached.delete(button);
    }
  };attached.set(button,controller);return controller;
}
