# Arclen UI Components

Source for the free components in the [Arclen UI library](https://arclenui.dev/components). Each package includes its React wrapper, standalone HTML core, CSS, settings manifest, usage notes, tests, and any assets needed to run it.

| Component | Package |
| --- | --- |
| Cascade Menu | [`components/cascade-menu`](components/cascade-menu) |
| Connected FAQ | [`components/connected-faq`](components/connected-faq) |
| Editorial FAQ | [`components/editorial-faq`](components/editorial-faq) |
| Halftone Portrait | [`components/halftone-portrait`](components/halftone-portrait) |
| Signal Field | [`components/signal-field`](components/signal-field) |
| Split FAQ | [`components/split-faq`](components/split-faq) |
| Status Swap | [`components/status-swap`](components/status-swap) |
| Text Reel | [`components/text-reel`](components/text-reel) |

Open a package's `docs.mdx` for its usage and settings. `src/react/index.tsx` is the React entry point. `src/core/index.ts` provides the framework-neutral renderer and mount lifecycle, and `src/styles.css` supplies its styles. Keep the package's assets with the source when copying it. The component and HTML bundle schemas live in [`packages/spec`](packages/spec).

Run `pnpm install --frozen-lockfile` and `pnpm check` to validate the source. The code is MIT licensed; bundled fonts retain their listed licenses.
