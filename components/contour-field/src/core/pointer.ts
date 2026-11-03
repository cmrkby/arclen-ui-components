export interface PointerSample {x: number; y: number; strength: number;}
export interface PointerState extends PointerSample {targetX: number; targetY: number; targetStrength: number;}
export const createPointer = (): PointerState => ({x: .5, y: .5, strength: 0, targetX: .5, targetY: .5, targetStrength: 0});
export function targetPointer(pointer: PointerState, x: number, y: number): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const entering = pointer.targetStrength === 0 && pointer.strength < .001;
  pointer.targetX = Math.max(0, Math.min(1, x)); pointer.targetY = Math.max(0, Math.min(1, y));
  if (entering) {pointer.x = pointer.targetX; pointer.y = pointer.targetY;}
  pointer.targetStrength = 1;
}
export function pointerPending(pointer: PointerState): boolean {
  return Math.abs(pointer.strength - pointer.targetStrength) > .001 || (pointer.targetStrength > 0 && (Math.abs(pointer.x - pointer.targetX) > .0001 || Math.abs(pointer.y - pointer.targetY) > .0001));
}
export function advancePointer(pointer: PointerState, seconds: number): void {
  const follow = 1 - Math.exp(-seconds / .028);
  pointer.x += (pointer.targetX - pointer.x) * follow; pointer.y += (pointer.targetY - pointer.y) * follow;
  const fade = 1 - Math.exp(-seconds / (pointer.targetStrength > 0 ? .012 : .018));
  pointer.strength += (pointer.targetStrength - pointer.strength) * fade;
  if (Math.abs(pointer.strength - pointer.targetStrength) <= .001) pointer.strength = pointer.targetStrength;
  if (Math.abs(pointer.x - pointer.targetX) <= .0001) pointer.x = pointer.targetX;
  if (Math.abs(pointer.y - pointer.targetY) <= .0001) pointer.y = pointer.targetY;
}
export function clearPointer(pointer: PointerState): void {pointer.strength = 0; pointer.targetStrength = 0;}
