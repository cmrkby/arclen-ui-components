export type SignalFieldCursor = "default" | "crosshair" | "hidden";

export interface SignalFieldOptions {
  interaction?: "classic" | "ascii-lens";
  asciiSize?: number;
  asciiStrength?: number;
  asciiSoftness?: number;
  baseColor?: string;
  surfaceColor?: string;
  accentColor?: string;
  secondaryAccentColor?: string;
  accentIntensity?: number;
  accentSpread?: number;
  detail?: 1 | 2 | 3 | 4;
  distortion?: number;
  contrast?: number;
  flowAngle?: number;
  speed?: number;
  scale?: number;
  pointerStrength?: number;
  pointerRadius?: number;
  pointerSmoothing?: number;
  grain?: number;
  animate?: boolean;
  cursor?: SignalFieldCursor;
  frameRate?: number;
  resolutionScale?: number;
  showGlyphs?: boolean;
  showText?: boolean;
  text?: string;
  glyphs?: string;
  glyphOpacity?: number;
  glyphSize?: number;
  glyphColor?: string;
  glyphActiveColor?: string;
  glyphStrength?: number;
  glyphRadius?: number;
  glyphDensity?: number;
  glyphResponse?: "attract" | "repel" | "shimmer";
}

export type ResolvedSignalFieldOptions = Required<SignalFieldOptions>;

export interface SignalFieldController {
  setOptions(next: SignalFieldOptions): void;
  resize(): void;
  destroy(): void;
}
