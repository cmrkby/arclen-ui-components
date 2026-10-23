/** Admitted numerical tween engine. Each mount owns its scheduler and values. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (at(mid, x1, x2) < x) lo = mid; else hi = mid; }
    return at((lo + hi) / 2, y1, y2);
  };
}
export const EASE = cubicBezier(.76, 0, .24, 1), EASE_OUT = cubicBezier(0, 0, .58, 1), EASE_IN = cubicBezier(.42, 0, 1, 1);
type Painter = {paint(): void};
type Animation = {from: number; to: number; start: number; ms: number; ease: (x: number) => number};
export type Value = {v: number; owner: Painter; anim: Animation | null; done: (() => void) | null};
export function createEngine(view: Window) {
  const running = new Set<Value>(); let raf = 0, speed = 1;
  const now = () => view.performance.now();
  const value = (v: number, owner: Painter): Value => ({v, owner, anim: null, done: null});
  function advance(val: Value, t: number) {
    const a = val.anim!; const p = a.ms > 0 ? Math.min(1, Math.max(0, (t - a.start) / a.ms)) : t >= a.start ? 1 : 0;
    val.v = a.from + (a.to - a.from) * a.ease(p);
    if (p < 1) return false; val.v = a.to; val.anim = null; return true;
  }
  function tick(t: number) {
    raf = 0; const dirty = new Set<Painter>(), finished: Value[] = [];
    for (const val of running) { if (advance(val, t)) { running.delete(val); finished.push(val); } dirty.add(val.owner); }
    for (const owner of dirty) owner.paint(); for (const val of finished) { const done = val.done; val.done = null; done?.(); }
    if (running.size) raf = view.requestAnimationFrame(tick);
  }
  function settle() {
    if (raf) view.cancelAnimationFrame(raf); raf = 0;
    const dirty = new Set<Painter>(), done: Array<() => void> = [];
    for (const val of running) { val.v = val.anim!.to; val.anim = null; dirty.add(val.owner); if (val.done) done.push(val.done); val.done = null; }
    running.clear(); for (const owner of dirty) owner.paint(); done.forEach(fn => fn());
  }
  return {value, now, settle,
    setSpeed(next: number) {speed = next;},
    tween(val: Value, target: number, options: {duration: number; ease: (x: number) => number; delay?: number; done?: (() => void) | null}) {
      if (val.anim ? val.anim.to === target : val.v === target) return;
      const time = now(); if (val.anim) advance(val, time);
      val.anim = {from: val.v, to: target, start: time + (options.delay ?? 0) * 1000 * speed, ms: options.duration * 1000 * speed, ease: options.ease};
      val.done = options.done ?? null; running.add(val);
      if (!speed || typeof view.requestAnimationFrame !== 'function') {settle(); return;}
      if (!raf) raf = view.requestAnimationFrame(tick);
    },
    destroy() {if (raf) view.cancelAnimationFrame(raf); raf = 0; running.clear();}
  };
}
