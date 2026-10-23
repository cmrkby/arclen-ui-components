/** Types for renderer.js, so projects with strict TypeScript can import the core without allowJs. */
import type { Settings } from './index';

export function toVec4(color: unknown): number[];

/** The host members the renderer reads and writes. Any HTMLElement qualifies; at runtime the resize and visibility observers also need a real Element. */
export interface MeshGradientHost {
  readonly isConnected: boolean;
  style: { isolation: string; position: string };
  dataset: Record<string, string | undefined>;
  prepend(...nodes: Node[]): void;
}

export class MeshGradientRenderer {
  constructor(host: MeshGradientHost, props: Settings);
  readonly gl: WebGL2RenderingContext | null;
  /** Undefined when WebGL2 is unavailable; null after destroy. */
  readonly program: WebGLProgram | null | undefined;
  readonly buffer: WebGLBuffer | null | undefined;
  update(props: Settings): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
