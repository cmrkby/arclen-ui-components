export const tuningNumbers = {
  fontSize: [16, 12, 24],
  paddingX: [24, 8, 48],
  paddingY: [12, 4, 24],
  letterSpacing: [0, -0.02, 0.2],
  cornerSize: [8, 4, 16],
  cornerWeight: [1, 1, 3],
  cornerTravel: [4, 0, 12],
  cornerDuration: [600, 200, 1200],
  cornerStagger: [100, 0, 250],
  scrambleInterval: [100, 30, 180],
  classicInset: [4, 0, 10],
  classicBlur: [1, 0, 6],
  labelScale: [0.95, 0.85, 1],
  scanDuration: [420, 180, 1000],
  scanOpacity: [0.12, 0, 0.5],
  shutterDuration: [1, 0.5, 2],
  shutterDamping: [32, 24, 44],
  pressDepth: [1, 0, 3],
} as const;
export type Tuning = {-readonly [K in keyof typeof tuningNumbers]: number} & {scramble: boolean};
export function tuning(input: Partial<Tuning>): Tuning {
  const next = {scramble: input.scramble !== false} as Tuning;
  for (const key of Object.keys(tuningNumbers) as (keyof typeof tuningNumbers)[]) {
    const [fallback,min,max] = tuningNumbers[key], value = input[key];
    next[key] = typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fallback;
  }
  return next;
}
export function tuningVariables(input: Partial<Tuning>): string {
  const s = tuning(input);
  return `--tb-font:${s.fontSize}px;--tb-padding-x:${s.paddingX}px;--tb-padding-y:${s.paddingY}px;--tb-tracking:${s.letterSpacing}em;--tb-corner-size:${s.cornerSize}px;--tb-corner-weight:${s.cornerWeight}px;--tb-scan-opacity:${s.scanOpacity}`;
}
export function applyTuning(button: HTMLElement, input: Partial<Tuning>) {
  for (const pair of tuningVariables(input).split(';')) { const [key,value] = pair.split(':'); button.style.setProperty(key,value); }
}
