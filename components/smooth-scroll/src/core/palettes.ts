import type {Settings} from "./index";

export const colorKeys = ["background", "navy", "midnight", "indigo", "cobalt", "blue", "accent", "lavender", "violet", "magenta", "rose", "coral"] as const;
export const palettes = {
  "arclen": [
    "#090510",
    "#180d2c",
    "#2d1747",
    "#492367",
    "#66328b",
    "#8443b2",
    "#a051e1",
    "#b362ce",
    "#c471aa",
    "#dc7569",
    "#f57a32",
    "#ff9b52"
  ],
  "twilight": [
    "#040017",
    "#010836",
    "#041652",
    "#0c2675",
    "#163ba6",
    "#2254de",
    "#2e63fb",
    "#685eff",
    "#9a53ef",
    "#bd4ccb",
    "#d94a98",
    "#e55759"
  ],
  "aurora": [
    "#031514",
    "#052a29",
    "#073e3a",
    "#0b5349",
    "#126b56",
    "#228663",
    "#36a877",
    "#58c99a",
    "#7ddbc0",
    "#9ce6d6",
    "#b9ede8",
    "#d5f8f3"
  ],
  "ember": [
    "#160907",
    "#2e100b",
    "#48180d",
    "#63240e",
    "#80310f",
    "#a04411",
    "#bf5b16",
    "#d97622",
    "#ec9438",
    "#f6b45a",
    "#f9d084",
    "#ffe8b7"
  ],
  "glacier": [
    "#06111f",
    "#0a2137",
    "#103550",
    "#174a69",
    "#206184",
    "#2a7b9f",
    "#3999bb",
    "#58b6d0",
    "#7bcddd",
    "#a0dfe8",
    "#c4edf0",
    "#e4f9fa"
  ]
} as const;
export type Palette = keyof typeof palettes | "custom";

/** Presets leave the saved custom colours intact when switching. */
export function fieldSettings(settings: Settings): Settings {
 if(settings.palette === "custom") return settings;
 const colors = palettes[settings.palette];
 return {...settings, ...Object.fromEntries(colorKeys.map((key,index) => [key, colors[index]]))};
}
