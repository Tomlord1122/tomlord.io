# AGENT.md — tomlord.io (frontend)

Quick reference for AI coding agents working in this directory. For human-oriented
project docs see `CLAUDE.md` and the root `AGENTS.md`.

## TL;DR

- **Stack:** SvelteKit 2 · Svelte 5 (runes) · TypeScript · Tailwind 4 · Bun
- **Adapter:** `@sveltejs/adapter-vercel` (some routes use ISR)
- **Backend:** Go service at `PUBLIC_BACKEND_URL` (`../tomlord.io-backend`)
- **Markdown:** `marked` + `sanitize-html` + custom `[[embed|url]]` syntax

## Commands

```bash
bun run dev     # dev server (5173)
bun run check   # svelte-check (run after every change)
bun run build   # vite build (Vercel adapter)
bun run lint    # eslint
bun run test    # vitest once
```

`bun run check` is the cheapest signal that an edit didn't break types — run it
before declaring work complete.

## Module map

```
src/
  app.css                              # Tailwind 4 + global components (.link-embed-chip etc.)
  lib/
    api/                               # Backend HTTP wrappers (always use fetchWithTimeout)
      blogs.ts                         # CRUD for /api/blogs
      pages.ts                         # CMS for /api/pages
      preview.ts                       # /api/preview wrapper (client-side, in-memory cached)
      revalidate.ts                    # Vercel ISR revalidation
    components/
      NotionLikeEditor.svelte          # textarea-based markdown editor (slash menu, paste auto-embed)
      TypewriterTextarea.svelte        # styled textarea + onPaste prop
      PostEditorModal.svelte           # blog create/edit modal hosting NotionLikeEditor
      EditPageModal.svelte             # CMS page editor (home / project)
    config.ts                          # API endpoints + fetchWithTimeout
    stores/                            # Svelte 5 rune stores (auth, websocket, toast)
    types/
      preview.ts                       # LinkPreview interface (mirrors Go struct)
      post.ts
    util/
      markdown.ts                      # renderMarkdown(text, previews?) — single source of truth
      embed.ts                         # extractEmbedUrls + buildEmbedHTML (inline chip)
      embed-previews.server.ts         # SSR helper: preloadEmbedPreviews(text)
      debounce.ts
      helper.ts                        # calculateDuration, copyImageMarkdown
  routes/
    +page.{svelte,server.ts}           # Home page (CMS-backed, ISR 10min)
    project/+page.{svelte,server.ts}   # Project page (CMS-backed, ISR 10min)
    blog/[slug]/+page.{svelte,server.ts}  # Blog post (ISR 1h)
    blog/+page.{svelte,server.ts}      # Blog list
```

## Hard rules

1. **Always render markdown via `renderMarkdown(text, previews?)`** in
   `lib/util/markdown.ts`. Never call `marked()` directly from a component —
   doing so bypasses sanitization and the `[[embed|url]]` preprocessor.
2. **Pre-fetch embed previews server-side** for any page that renders
   user-authored markdown:
   ```ts
   import { preloadEmbedPreviews } from '$lib/util/embed-previews.server.js';
   return { content, previews: await preloadEmbedPreviews(content) };
   ```
   Then in the component: `renderMarkdown(content, data.previews)`.
3. **All backend HTTP** must go through `lib/api/*` wrappers, which use
   `fetchWithTimeout` (5 s default). Never `fetch()` the backend ad-hoc.
4. **State** uses Svelte 5 runes (`$state`, `$derived`, `$effect`). Files that
   export reactive state end in `.svelte.ts`.
5. **Server-only modules** must end in `.server.ts` (e.g. `embed-previews.server.ts`)
   so SvelteKit's bundler keeps them out of the client.

## Link-embed feature (recent addition)

Inline-chip rendering for URLs, à la Notion's "paste as mention".

- Markdown syntax: `[[embed|https://example.com/path]]`
- Renders as: `<a class="link-embed-chip">[favicon] <title or domain></a>`
- Raw URL is **never** displayed to readers (only in `title` tooltip on hover).

### Pipeline

1. **Editor input**
   - Slash menu → "Link Embed" inserts `[[embed|]]` with cursor between pipe and `]]`.
   - Paste handler (`NotionLikeEditor.handlePaste`): if the clipboard is a single
     URL **and** the current line is otherwise empty, auto-converts to
     `[[embed|url]]`. The "empty line" guard is intentional — pasting a URL into
     the middle of a sentence should not silently transform it.
2. **Live preview** (in editor)
   - `debouncedFetchPreviews` calls `/api/preview?url=` for each new URL.
   - Results are stored in a `$state` map; `renderMarkdown(content, previews)`
     re-runs when the map updates.
3. **Public page rendering**
   - `+page.server.ts` calls `preloadEmbedPreviews(content)` so the SSR HTML
     contains rich chips immediately (no client-side flash).
   - Failed previews silently degrade to a domain-only fallback chip
     (`.link-embed-chip-fallback`).

## Sanitizer allow-list gotcha

`renderMarkdown` runs every output through `sanitize()` from
`lib/util/sanitize.ts`, which is a thin wrapper over `sanitize-html`. The
allow-list there enables SVG (for Mermaid diagrams) and `<iframe>` (for
embedded videos). When adding new HTML output (a new embed variant, a new
custom tag, etc.) check whether the tag or attribute needs to be added to
`SANITIZE_OPTIONS` in `lib/util/sanitize.ts`.

### Why `sanitize-html` instead of DOMPurify

We tried three approaches before settling on `sanitize-html`:

1. `dompurify` alone — works in browser, **crashes server** (needs a DOM).
2. `isomorphic-dompurify` — bundles `jsdom`, whose transitive dep
   `@exodus/bytes` is ESM-only and triggers `ERR_REQUIRE_ESM` on Vercel's
   Node runtime. Hard crash, 500 on every SSR page.
3. `dompurify` + `linkedom` — `linkedom`'s window is missing `NodeFilter` and
   `document.implementation.createHTMLDocument`, so DOMPurify silently bypasses
   sanitization. Worse than crashing.
4. ✅ `sanitize-html` — pure JS (htmlparser2), sync, isomorphic, no DOM
   dependency. Slightly less paranoid than DOMPurify but enough for our
   single-author content model.

DOMPurify is still the right choice for adversarial UGC contexts (public
comment forms, untrusted markdown). Our content is super-user-only, so the
trade-off works.

## Adding a new page that renders markdown

```ts
// +page.server.ts
import { preloadEmbedPreviews } from '$lib/util/embed-previews.server.js';
export const load = async () => {
  const content = await fetchSomeMarkdown();
  return { content, previews: await preloadEmbedPreviews(content) };
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import { renderMarkdown } from '$lib/util/markdown.js';
  let { data } = $props();
  let html = $derived(renderMarkdown(data.content, data.previews));
</script>
{@html html}
```

## Environment variables (see `.env.example`)

- `PUBLIC_BACKEND_URL` — backend HTTP origin
- `PUBLIC_BACKEND_WS_URL` — backend WebSocket origin
- `PUBLIC_APP_ENV` — `development` | `production`
- `BYPASS_TOKEN` — Vercel ISR on-demand revalidation
- `AUTH_TOKEN` — server-side auth for build-time API calls

## Don't

- Don't introduce a second markdown renderer. Extend `renderMarkdown` instead.
- Don't reinstall `dompurify` / `isomorphic-dompurify` / `jsdom` / `linkedom`.
  See "Why `sanitize-html` instead of DOMPurify" above — every alternative
  either crashes Vercel SSR or silently fails to sanitize. If you genuinely
  need DOMPurify-grade protection, ship a separate edge function instead of
  bundling jsdom into the SvelteKit Node target.
- Don't fetch link previews client-side on public pages — rely on SSR
  `preloadEmbedPreviews`. Client-side fetch is reserved for the editor's live
  preview where SSR isn't possible.
- Don't put `LinkPreview` interface duplicates anywhere — import from
  `$lib/types/preview.js`. The shape mirrors Go's
  `services.LinkPreview` in the backend.
- Don't reach into `+page.server.ts` from client code; SvelteKit will refuse to
  bundle it. Use `.server.ts` suffix consistently.
