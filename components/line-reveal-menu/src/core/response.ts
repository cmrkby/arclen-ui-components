/** Finite damped step response. */
export function response(elapsed: number, duration: number, bounce: number): number {
  if (duration <= 0 || elapsed >= duration) return 1;
  if (elapsed <= 0) return 0;
  const damping = 1 - bounce;
  const frequency = 8.994 / (duration / 1000);
  const time = elapsed / 1000;
  if (damping >= 1) return 1 - Math.exp(-frequency * time) * (1 + frequency * time);
  const root = Math.sqrt(1 - damping * damping);
  const phase = frequency * root * time;
  return 1 - Math.exp(-damping * frequency * time) * (Math.cos(phase) + damping / root * Math.sin(phase));
}
export function responseEasing(duration: number, bounce: number): string {
  const count = Math.max(2, Math.round(duration / 10));
  return `linear(${Array.from({ length: count }, (_, i) => response(i * duration / (count - 1), duration, bounce).toFixed(5)).join(',')})`;
}
export function blendColor(from: string, to: string, progress: number): string {
  const parse = (value: string): number[] => value === 'transparent' ? [0, 0, 0, 0] : [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16), value.length === 9 ? parseInt(value.slice(7, 9), 16) / 255 : 1];
  const a = parse(from), b = parse(to);
  const colors = a.slice(0, 3).map((n, i) => Math.round(Math.sqrt(Math.max(0, n * n + (b[i] * b[i] - n * n) * progress))));
  return `rgba(${colors.join(',')},${Math.max(0, Math.min(1, a[3] + (b[3] - a[3]) * progress))})`;
}

export function mutedColor(color: string): string {
  if (color === 'transparent') return color;
  return '#' + [1, 3, 5].map(offset => Math.round(parseInt(color.slice(offset, offset + 2), 16) * 102 / 237).toString(16).padStart(2, '0')).join('') + color.slice(7);
}
