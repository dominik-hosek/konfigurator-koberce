# CLAUDE.md – URUG rug configurator

Web configurator for custom tufted rugs for URUG (urug.cz). The customer uploads an
image → the app reduces it to a limited yarn palette, sets shape and size, renders a
realistic preview, computes an indicative price → the customer sends an inquiry.

Progress, open questions and next steps live in `PROGRESS.md`. Read it at the start of
every session and update it at the end of every phase.

## Stack

- Vite + React + TypeScript (strict) + Tailwind CSS
- Vitest for unit tests, ESLint + Prettier
- npm (lockfile committed)
- No backend. Everything runs in the browser: Canvas API, heavy work in a Web Worker.
- Deployment: GitHub Pages via GitHub Actions. Must work embedded in an iframe on
  urug.cz and on mobile.
- Inquiries are sent via a form service (e.g. Formspree); the endpoint lives in config.

## Hard rules

1. **Language:** all UI text in Czech. Code, identifiers, comments, commit messages and
   technical docs in English.
2. **No hardcoded business data.** Yarn palette, pricing, size limits, minimum detail,
   upload limits and the form endpoint live in `src/config/*.json` and are read through
   the typed loader in `src/config/index.ts`. Placeholder values carry
   `"_placeholder": true` until the real values are confirmed.
3. **Customer images never leave the browser** except as the preview attached to an
   inquiry the customer explicitly submits. No analytics on image content, no third-party
   image APIs, no AI models.
4. **The UI must never freeze.** Anything that loops over pixels runs in the worker and
   reports progress. The main thread only draws finished buffers.
5. **Pure logic is pure.** `src/lib/**` must not touch the DOM, React or `window`; it
   operates on typed arrays and plain objects so it runs in the worker and in Vitest.
6. **Accessibility:** every control has a visible Czech label (or `aria-label`), works
   from the keyboard, and has a visible focus state. Sliders show their current value.
7. **Phased delivery.** Work phase by phase (see `PROGRESS.md`). At the end of a phase:
   update `PROGRESS.md`, run `npm run build`, `npm run lint`, `npm test`, commit with a
   conventional commit message, summarize, and **ask before pushing**.
8. **Never delete or overwrite user content and never push** without explicit approval.

## Conventions

- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `ci:`.
- Tests are colocated: `foo.ts` → `foo.test.ts`. Required for colour quantization,
  palette mapping, ΔE, price calculation, dimension conversion, smoothing.
- Units: real-world lengths in **mm** internally (`widthMm`), shown to the user in cm.
  Money in **CZK, integers** (whole crowns). Colours internally as sRGB `[r, g, b]`
  0–255; perceptual comparisons in CIELAB using CIEDE2000.
- Images are processed at max ~1024 px on the longer side. Final render can upscale.
- Palette indices are `Uint8Array` per pixel; `TRANSPARENT_INDEX` (255) marks background.
- Quantization: 5-bit-per-channel histogram (bins keep their mean colour), then weighted
  k-means++ in Lab with a fixed seed. Histogram and per-colour-count results are cached
  in the worker.
- Worker messages are typed discriminated unions in `src/workers/protocol.ts`.
- React state: a single reducer for the configuration (`src/state`), derived values
  (price, spec) computed with selectors, not stored.
- Styling: Tailwind utilities, neutral palette, generous whitespace; the customer's rug is
  the only strong colour on the page. Use URUG brand assets from `brand/` if present.
- Components are small and named in English (`ColorsPanel`, `ShapePicker`); Czech copy
  lives in `src/strings/cs.ts`, not scattered through JSX.

## Processing pipeline

```
file → decode + downscale (≤1024 px)
     → background mask (alpha channel, or click-picked colour + tolerance)
     → colour quantization (k-means++, 2–12 colours, foreground pixels only)
     → map clusters to nearest yarns (Lab, CIEDE2000) + manual overrides
     → detail smoothing (remove islands/lines below min detail; depends on real size)
     → shape mask (rectangle / circle / oval / contour with margin)
     → render: flat preview | tufted preview (procedural pile texture, noise, edge shading)
```

Each stage caches its output; changing a later setting must not recompute earlier stages.

## Commands

```
npm run dev       # local dev server
npm run build     # typecheck + production build
npm run lint      # eslint
npm test          # vitest run
```

## Folder structure

```
.github/workflows/deploy.yml   GitHub Pages deploy
brand/                         URUG logo / colours (optional, provided by the client)
public/                        static assets, embed snippet example
src/
  main.tsx, App.tsx, index.css
  config/                      yarns.json, pricing.json, limits.json, inquiry.json
                               + index.ts (types, validation, typed access)
  strings/cs.ts                all Czech UI copy
  lib/                         pure, tested logic (no DOM; enforced by ESLint)
    random.ts                  seeded PRNG (results must be deterministic)
    color/                     srgb↔lab, deltaE (CIEDE2000), kmeans, palette mapping
    image/                     downscale math, background mask, smoothing, contour/shape
    geometry/                  dimensions, aspect ratio, mm↔px
    pricing/                   price calculation
    spec/                      inquiry JSON spec builder
  workers/                     processor.worker.ts, protocol.ts
  render/                      browser canvas I/O: loadImage.ts (decode + downscale),
                               flat.ts, tufted.ts (drawing finished buffers)
  state/                       reducer, actions, selectors
  hooks/                       useProcessor, useAutoHeight (iframe postMessage)
  components/                  UI: Upload, Background, Colors, Shape, Size, Preview,
                               Price, InquiryForm, ui/ (Slider, Button, Field…)
```
