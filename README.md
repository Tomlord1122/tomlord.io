# tomlord.io — SvelteKit + TypeScript + mdsvex

A modern SvelteKit app with TypeScript, TailwindCSS, mdsvex content (SVX), robust config and a content sync pipeline. This README is a professional, step‑by‑step guide to build, run, extend, and deploy a project like this.

## Table of Contents
- Getting Started
- Tech Stack
- Project Structure
- Environment & Config
- Scripts
- Development Workflow (Pages, Components, Stores)
- Content (mdsvex) & Sync Pipeline
- Backend Integration Patterns
- Testing
- Linting, Formatting, Type Checking
- Build & Preview
- Deployment (Vercel)

---

## Getting Started

Prerequisites:
- Node 18+
- pnpm installed globally

Clone and run dev server:
```bash
git clone https://github.com/Tomlord1122/tomlord.io
cd tomlord.io
pnpm install
pnpm dev
```

This starts Vite’s dev server with SvelteKit. Visit the printed URL.

---

## Tech Stack
- SvelteKit + Svelte 5
- TypeScript
- TailwindCSS 4
- mdsvex (for `.svx`/Markdown content)
- Vitest + @testing-library/svelte
- ESLint 9 + Prettier 3
- Vercel (deployment)

---

## Project Structure

```
src/
  app.html                 # App shell
  app.css                  # Global styles (Tailwind)
  routes/                  # Pages & server endpoints (filesystem routing)
    +layout.svelte
    +layout.server.ts
    +page.svelte
    blog/
      [slug]/+page.svelte
      [slug]/+page.ts
      +layout.server.ts
      +page.svelte
    api/                   # Server endpoints (proxy, CRUD)
      add-post/+server.ts
      edit-post/+server.ts
      edit-page/+server.ts
      upload-image/+server.ts
      sync-blogs/+server.ts
  lib/
    components/            # Reusable UI components
    stores/                # Svelte stores (auth, websocket)
    types/                 # App types
    util/                  # Helpers
    config.ts              # Centralized env + API helpers
  markdown/
    posts/*.svx            # mdsvex blog posts with frontmatter
scripts/
  sync-blogs.js            # Content sync pipeline
static/                    # Public assets (served at /)
```

Svelte config (mdsvex enabled) lives in `svelte.config.js`, Tailwind in `tailwind.config.ts`, test config in `vite.config.ts`.

---

## Environment & Config

All public env variables are defined in `.env.*` and consumed centrally by `src/lib/config.ts`.

`.env.example`:
```env
PUBLIC_BACKEND_URL=http://localhost:8080
PUBLIC_BACKEND_WS_URL=ws://localhost:8080
PUBLIC_APP_ENV=development
AUTH_TOKEN=[Your Token Here]
PUBLIC_AUTH_SUPER_USER_EMAIL=r12944044@csie.ntu.edu.tw
```

Central config: `src/lib/config.ts` exposes a single `config` with computed endpoints and helpers.

Key fields:
- `config.BACKEND_URL`, `config.BACKEND_WS_URL`, `config.APP_ENV`
- `config.API.HEALTH`, `config.API.BLOGS`, `config.API.MESSAGES`, `config.API.WEBSOCKET`, `config.API.AUTH_*`
- `checkBackendHealth()`: Fast health check with caching
- `smartLoadWithFallback(apiCall, fallbackCall)`: Health-aware loading strategy
- `fetchWithTimeout(url, options, timeout)` and `fetchWithFallback(api, fallback, timeout)`
- `clientFirstLoadWithBackgroundSync(localCall, apiCall, onBackgroundSync)`
- `preWarmBackend()`

Best practice: import env only in `src/lib/config.ts`, and use `config` everywhere else.

---

## Scripts

Available scripts (pnpm):
```json
{
  "dev": "vite dev",
  "build": "vite build && npm run prepack",
  "build:prod": "node scripts/sync-blogs.js && vite build && npm run prepack",
  "sync-blogs": "node scripts/sync-blogs.js",
  "preview": "vite preview",
  "prepare": "svelte-kit sync || echo ''",
  "prepack": "svelte-kit sync && svelte-package && publint",
  "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
  "lint": "eslint .",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test:unit": "vitest",
  "test": "npm run test:unit -- --run"
}
```

Common usage:
```bash
pnpm dev              # start dev server
pnpm check            # type checks
pnpm lint             # lint
pnpm format           # format codebase
pnpm test             # run unit & DOM tests
pnpm build            # local build
pnpm build:prod       # runs sync-blogs then builds (for Vercel)
```

---

## Development Workflow

### Pages & Routing
- Create pages under `src/routes/**` using `+page.svelte` and optional `+page.ts` or `+page.server.ts` for data loading.
- Use `+layout.svelte`/`+layout.server.ts` to share layout or server data across routes.

Example `+page.ts` data load via config:
```ts
import { config, fetchWithTimeout } from '$lib/config';

export async function load() {
  const res = await fetchWithTimeout(config.API.BLOGS, { headers: { accept: 'application/json' } });
  const blogs = res.ok ? await res.json() : [];
  return { blogs };
}
```

### Components
Place reusable UI in `src/lib/components/*`. Prefer typed props and Tailwind utility classes.

Example props pattern:
```svelte
<script lang="ts">
  export let src: string;
  export let alt = '';
  export let sizes = '(min-width: 768px) 768px, 100vw';
</script>

<img src={src} alt={alt} sizes={sizes} class="w-full h-auto" />
```

### Stores
Encapsulate side-effects in `src/lib/stores/*`. This repo includes `auth.svelte.ts` and `websocket.svelte.ts`.

WebSocket example (connecting via `config.API.WEBSOCKET`):
```ts
import { readable } from 'svelte/store';
import { config } from '$lib/config';

export function createWebSocketStore(path: string) {
  return readable<MessageEvent | null>(null, (set) => {
    const socket = new WebSocket(`${config.API.WEBSOCKET}${path}`);
    socket.addEventListener('message', set);
    return () => socket.close();
  });
}
```

---

## Content (mdsvex) & Sync Pipeline

### Writing Posts
Create posts under `src/markdown/posts/*.svx` with frontmatter:
```md
---
title: My Post
slug: my-post
date: 2025-01-01
lang: en
duration: 5min
tags: ['svelte', 'guide']
description: A demo post
---

Your content can mix Markdown and Svelte.
```

### Sync Blogs to Backend
The script `scripts/sync-blogs.js`:
- Parses frontmatter in `src/markdown/posts/*.svx`
- Builds a batch payload
- Calls backend `/api/sync-blogs` with `Authorization: Bearer <AUTH_TOKEN>`
- In production builds, warns on failure but does not block the build

Run locally:
```bash
# AUTH_TOKEN required
AUTH_TOKEN=xxxxx pnpm sync-blogs
```

`pnpm build:prod` runs the sync automatically before building.

---

## Backend Integration Patterns

Prefer central helpers from `src/lib/config.ts`:
- `fetchWithTimeout` for resilient network calls
- `fetchWithFallback` and `smartLoadWithFallback` for fast, safe UX
- Use server routes under `src/routes/api/**/+server.ts` when secrets or server-only logic are involved

Example endpoint that proxies uploads:
```ts
import type { RequestHandler } from './$types';
import { config, fetchWithTimeout } from '$lib/config';

export const POST: RequestHandler = async ({ request }) => {
  const form = await request.formData();
  const res = await fetchWithTimeout(`${config.BACKEND_URL}/api/images`, { method: 'POST', body: form });
  return new Response(await res.text(), { status: res.status });
};
```

---

## Testing

Vitest is configured with client (jsdom) and server workspaces in `vite.config.ts`.

Commands:
```bash
pnpm test          # run all tests
```

Example unit test:
```ts
import { describe, it, expect } from 'vitest';
import { fetchWithFallback } from '$lib/config';

describe('fetchWithFallback', () => {
  it('returns fallback on failure', async () => {
    const value = await fetchWithFallback(
      async () => { throw new Error('fail'); },
      async () => 42
    );
    expect(value).toBe(42);
  });
});
```

---

## Linting, Formatting, Type Checking

Commands:
```bash
pnpm check          # types via svelte-check
pnpm lint           # ESLint (plugin-svelte)
pnpm format         # Prettier (+ tailwind plugin)
pnpm format:check
```

Conventions:
- Descriptive names; guard clauses; shallow control flow
- Minimal comments that explain “why”
- Do not import `$env/static/public` outside `src/lib/config.ts`; consume via `config`

---

## Build & Preview

```bash
pnpm build          # local build
pnpm preview        # preview production build
```

`build:prod` runs the blog sync first, then builds and packages:
```bash
pnpm build:prod
```

---

## Deployment (Vercel)

`vercel.json` uses pnpm and the `build:prod` script:
```json
{
  "installCommand": "pnpm install",
  "buildCommand": "pnpm build:prod",
  "outputDirectory": "build",
  "framework": "sveltekit"
}
```

Steps:
1) Create a new Vercel project from this repo
2) Set environment variables (PUBLIC_* and AUTH_TOKEN for sync) in Vercel
3) Deploy; the sync script will run during the build

---

## Notes & Pitfalls
- Keep env access centralized in `src/lib/config.ts`
- Ensure PUBLIC_* vars are non-sensitive; secrets belong on the server only
- mdsvex frontmatter must be valid; the sync script fails fast in dev
- Prefer server endpoints for any operation that requires credentials

---

Built with pnpm throughout. Happy hacking!