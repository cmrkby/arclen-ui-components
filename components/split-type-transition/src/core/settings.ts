import manifest from "../../component.json";
import { resolveTitle, type TitleSettings } from "./title";
export interface Settings extends TitleSettings {
  autoplay: boolean;
  label: string;
  heading: string;
  caption: string;
  background: string;
  foreground: string;
  overlayColor: string;
  overlayText: string;
  minHeight: number;
  duration: number;
  coverDuration: number;
  hold: number;
  leadIn: number;
  sliceDuration: number;
  sliceStagger: number;
  glyphStagger: number;
  settleDuration: number;
  scale: number;
  easing: "expressive" | "smooth" | "linear" | "split" | "decay" | "shutter";
  titleDelay: number;
  titleTravel: number;
  titleScale: number;
}
export const defaults = Object.fromEntries(
  manifest.settings.map((rule) => [rule.key, rule.default]),
) as unknown as Settings;
export const presetSettings = Object.fromEntries(
  manifest.previews.map((preview) => [preview.name, preview.settings]),
) as Record<string, Partial<Settings>>;
export const applicableSettings = (): string[] =>
  manifest.settings.map((rule) => rule.key);
/** Accept only this component's public settings. Invalid values restore its own defaults. */
export function resolveSettings(input: unknown = {}): Settings {
  const source =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const candidate: Record<string, unknown> = { ...defaults };
  for (const rule of manifest.settings) {
    const value = source[rule.key];
    if (value === undefined) continue;
    if (
      rule.kind === "number" &&
      typeof value === "number" &&
      Number.isFinite(value)
    )
      candidate[rule.key] = Math.max(
        rule.min ?? -Infinity,
        Math.min(rule.max ?? Infinity, value),
      );
    else if (rule.kind === "boolean" && typeof value === "boolean")
      candidate[rule.key] = value;
    else if (rule.kind === "text" && typeof value === "string")
      candidate[rule.key] = Array.from(value)
        .slice(0, rule.maxLength ?? 180)
        .join("");
    else if (
      rule.kind === "color" &&
      typeof value === "string" &&
      /^#[\da-f]{6}$/i.test(value)
    )
      candidate[rule.key] = value;
    else if (
      rule.kind === "select" &&
      rule.options?.some(
        (option) =>
          (typeof option === "string" ? option : option.value) === value,
      )
    )
      candidate[rule.key] = value;
  }
  for (const key of ["slatCount", "gridColumns", "gridRows"])
    if (key in candidate) candidate[key] = Math.round(candidate[key] as number);
  return {
    ...candidate,
    ...resolveTitle({ ...candidate, ...source }),
  } as unknown as Settings;
}
