# Rally Tijdtabel

Photograph a rally time table, get back the average-speed table.

The organiser hands out a sheet with the cumulative time at every 100 m of the
stage. What a crew actually needs is the schedule behind it: which stretch is
driven at which average speed. This app derives that from a photo.

<!-- The RT 10 sheet of the Zoute Rally 2023 is the reference case, in
     `src/core/__tests__/fixtures.ts`. -->

| From km | To km | Avg speed |
| ------: | ----: | --------: |
|    0.00 |  2.60 |   42 km/h |
|    2.60 |  4.40 |   43 km/h |
|    4.40 |  5.00 |   40 km/h |
|    5.00 |  5.50 |   30 km/h |
|    5.50 |  6.00 |   43 km/h |

## How it works

Three layers, deliberately kept apart.

**1. Photo → grid** (`src/ocr`). A vision model transcribes the sheet into
`{ km, cells[] }` rows, via structured outputs so the response is schema-valid.
It only transcribes — it never computes, corrects or completes a cell. The photo
is downscaled to 1568 px in the browser first, which is all the model needs and
keeps the request small.

**2. Grid → segments** (`src/core/solve.ts`). No model, fully deterministic.
At *v* km/h a 100 m step takes exactly 360/*v* seconds, so the schedule is a
chain of integer-speed runs with breakpoints on 100 m boundaries.

The naive approach — read a speed off each cell-to-cell difference — does not
work: 42 km/h gives 8.571 s per 100 m and 43 km/h gives 8.372 s, a difference of
0.2 s on a table printed to a tenth. So each further cell instead *narrows an
interval* on the step length, and a long segment pins its speed far more sharply
than any single cell could. A greedy left-to-right pass proposes the
breakpoints; a local search then nudges, drops and inserts them while that
explains more cells.

**3. Segments → verification** (`segmentsToGrid`). The full table is rebuilt
from the fitted schedule and laid back over what was scanned.

## Why the verification layer matters

Roughly 160 cells decide about five segments. That redundancy is the point: a
misread cell is outvoted by the ~30 others in its segment, and then shows up as
a cell the schedule cannot explain. The app reports `61/61 cells agree` rather
than asking you to trust it — and when cells disagree it names them, so you can
check those against the sheet. For numbers a crew is penalised on, that
difference matters.

Two cheap guards run before the fit: cells that break monotonicity are dropped
via a longest-increasing-subsequence (so one bad cell goes, not everything after
it), and rows are placed by their printed kilometre label rather than by
position, so a skipped row cannot shift the rest.

## Running it

```bash
npm install
npm test                 # 24 tests, no API key needed
npm run dev              # http://localhost:5173
```

The dev server mounts `api/ocr.ts` itself, so `npm run dev` behaves like the
deployed site. Put your key in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

To check a sheet from the command line, without the browser:

```bash
npm run read-table -- photo.jpg
```

## Deploying

Built for Vercel (Netlify works the same way): `api/ocr.ts` becomes a serverless
function so `ANTHROPIC_API_KEY` stays server-side. Set it as an environment
variable in the project settings — a purely static host such as GitHub Pages
cannot work here, since the key would have to ship in the bundle.

It is a PWA: installable from the browser, and the last derived speed table is
kept in `localStorage` so it stays readable without signal. Transcription itself
needs the network, which is fine — sheets are handed out at the start.

## Assumptions

Both confirmed against the organiser's sheets, both load-bearing for the solver:

- Average speeds are whole km/h.
- Breakpoints fall on a multiple of 100 m.
