# Deploying

The app is a static front end plus one serverless function. The function exists
for a single reason: it holds the Anthropic API key, so the key never reaches
the browser. That rules out a purely static host such as GitHub Pages — there
the key would have to ship in the bundle, where anyone could read it.

These steps target **Vercel**, which the repository is already configured for.

## 1. Get an Anthropic API key

1. Sign in at [console.anthropic.com](https://console.anthropic.com).
2. Add billing under **Plans & Billing** — a new key with no credit returns a
   quota error on the first photo.
3. **API keys → Create key**. Copy it; the console will not show it again.

## 2. Import the repository

1. Sign in at [vercel.com](https://vercel.com) with the GitHub account that owns
   the repository.
2. **Add New… → Project**, then import `AI-MASTER99/Rally-app`.
3. Leave the build settings alone. `vercel.json` already pins the build command
   (`npm run build`), the output directory (`dist`) and the function's time
   limit, and Vercel detects Vite by itself.

## 3. Add the API key *before* the first deploy

On the same import screen, open **Environment Variables** and add:

| Name                | Value          | Environments |
| ------------------- | -------------- | ------------ |
| `ANTHROPIC_API_KEY` | your key       | all three    |

Name it exactly that. Anything prefixed `VITE_` is compiled into the browser
bundle by Vite, so `VITE_ANTHROPIC_API_KEY` would publish your key.

Adding it later works too, but environment variables are bound to a deployment:
after adding one you have to **Deployments → ⋯ → Redeploy** for it to take
effect.

## 4. Deploy

Press **Deploy** and wait about a minute.

The repository's default branch is `claude/rally-timetable-photo-app-6pp07h`, so
that branch is what Vercel treats as production — there is nothing to merge
first. Every later push to it redeploys automatically; pushes to any other
branch get their own preview URL.

## 5. Use the right URL

Vercel hands out several URLs per project, and they are not equally public:

| URL                                        | Who can open it                    |
| ------------------------------------------ | ---------------------------------- |
| `your-project.vercel.app` — the production domain | anyone, no login |
| `your-project-a1b2c3-you.vercel.app` — a generated deployment URL | only you, after a Vercel login |
| a preview URL from a non-default branch    | only you, after a Vercel login     |

New projects get Deployment Protection switched on by default. On the Hobby
plan that is Vercel Authentication with Standard Protection: it covers preview
and generated deployment URLs, while the production domain stays public.

So share the **production domain**, the one on the project's overview page under
**Domains**. Copying the link off a deployment's detail page gives you a
generated URL instead, and on any other device that lands on a Vercel login
screen — which looks exactly like the app demanding an account.

Nobody needs a Vercel account to use the app. The login only ever guards *your*
dashboard and your protected URLs.

## 6. Check it

Open the production domain and:

- Visit `/api/ocr` directly in a browser. It answers `{"ok":true,"hasApiKey":true}`.
  That one line settles the two things that go wrong: whether the function is
  running and routed, and whether it can see the key. `hasApiKey: false` means
  the environment variable is missing, or the deployment predates it — add it and
  redeploy. No JSON at all, or a 500, means the function did not load; read the
  runtime log.
- Photograph a sheet from the home page. If the speeds come back, you are done.

Then open the production domain on the phone that will be in the car and use
**Add to home screen**. It installs as an app, and the last derived speeds stay
readable without signal.

### The flip side of a public URL

Anyone who has the link can use it, and every photo they send spends your
Anthropic credit. There is no way to password-protect a production domain on
the Hobby plan — that needs Pro or Enterprise. So keep the link within the crew,
and set a spend limit under **Plans & Billing → Spend limits** in the Anthropic
console. If the link ever gets out, a shared code in front of the function is a
small change.

## Command line instead

```bash
npm i -g vercel
vercel login
vercel link                              # connect this checkout to a project
vercel env add ANTHROPIC_API_KEY production
vercel --prod
```

`vercel dev` then reproduces the deployed behaviour locally. Plain `npm run dev`
does the same without the Vercel CLI, reading the key from `.env.local`.

## What it costs to run

Vercel's free tier covers this comfortably; the spend is the Anthropic API. Each
photo is one call to Claude Opus 5 with an image — on the order of ten cents,
most of it the model's reasoning tokens. If that matters at volume, the lever is
`output_config: { effort: 'low' }` in `src/ocr/recognize.ts`: transcription is
mechanical work that does not need much deliberation. Measure the accuracy on
your own sheets before and after, since a misread table is worth more than the
saving.

Nothing is stored server-side. The photo goes to the function and on to the
Anthropic API; the derived speeds are kept in the phone's own local storage.

## Troubleshooting

**Anything returns 500.** The route never answers 500 itself — a missing key is
503, a failed transcription 502, both with a readable message. A 500 means the
function crashed before reaching its own code, or was never deployed. Check
`/api/ocr` in a browser first: no JSON means the function is not running, which
is a deployment problem rather than a key problem. Then open **Deployments → the
deployment → Runtime Logs**, where the stack trace names the cause.

**The function times out.** `vercel.json` allows 120 s, and Vercel permits up to
300 s on every plan, so raise it there if a large sheet needs longer.

**"Geen leesbare tijdtabel of roadbook gevonden".** The model returned nothing
it could parse as a sheet. Retake the photo with the table filling the frame and
the paper flat.

**A speed looks wrong.** For a time table, the warning line tells you how many
cells disagree with the derived speeds — check those cells against the sheet.
`npm run read-table -- photo.jpg` prints the same analysis from a terminal.

## Editing the function later

Vercel does not bundle the functions. It compiles each file on its own and lets
Node resolve the imports at runtime, and Node's ESM resolver needs an explicit
file extension — it will not try `.js` for you, and will not resolve a directory
to its `index`. So inside the functions' import graph, write

```ts
import { recognizeSheet } from '../src/ocr/recognize.js';   // not '../src/ocr/recognize'
import { solveGrid } from '../src/core/index.js';           // not '../src/core'
```

The `.js` is what TypeScript expects here; it maps back to the `.ts` source, and
Vite resolves it the same way.

Nothing local catches a missing extension. The type checker, Vitest and the dev
server all resolve bundler-style, so the code runs fine everywhere except on the
deployed site, where the whole function fails to load with
`FUNCTION_INVOCATION_FAILED`. `api/__tests__/imports.test.ts` walks the
functions' real import graph and fails on any relative specifier Node could not
resolve — it is the only thing standing between you and that afternoon.

The rest of `src/` is free to use bare specifiers, because Vite bundles the
front end. The boundary is exactly "reachable from `api/`", which is what the
test checks.

## Another host

`api/ocr.ts` exports `handleOcr`, a plain `Request → Response` function, and
default-exports `{ fetch: handleOcr }` because that is the shape Vercel's Node
runtime routes to. Other platforms want their own wrapper — Netlify Functions v2
takes a bare default-exported function, Cloudflare Workers an object with
`fetch` — so porting means a few lines around `handleOcr`, not a rewrite.
