export type TextReelMode = "original" | "readable" | "on-demand";

export interface TextReelOptions {
  mode?: TextReelMode;
  leading?: string;
  words?: readonly string[];
}

export interface ResolvedTextReelOptions {
  mode: TextReelMode;
  leading: string;
  words: readonly string[];
}

export interface TextReelController {
  setOptions(next: TextReelOptions): void;
  replay(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
