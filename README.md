# tomlord.io

Personal website built with SvelteKit 2, Svelte 5, and TypeScript. Features a blog with real-time WebSocket comments, photography gallery, and project showcase. Deployed on Vercel with a separate Go backend API.

## Tech Stack

- **Framework:** SvelteKit 2 with Svelte 5 runes (`$state`, `$derived`, `$effect`)
- **Styling:** Tailwind CSS 4
- **Markdown:** `marked` + `sanitize-html` with custom `[[embed|url]]` syntax
- **Package Manager:** Bun
- **Deployment:** Vercel (adapter-vercel with ISR)
- **Backend:** Go service at `PUBLIC_BACKEND_URL`

## Features

- **Blog:** Markdown-based posts with syntax highlighting, Mermaid diagrams, and link embeds
- **Real-time Comments:** WebSocket-powered live comment updates with exponential backoff reconnection
- **CMS Pages:** Home and project pages backed by backend API
- **Link Embeds:** Notion-style `[[embed|url]]` syntax with SSR preview fetching
- **ISR:** Incremental Static Regeneration (10min for pages, 1h for blog posts)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.0+
- Node.js 20+

### Installation

```bash
bun install
```

### Development

```bash
bun run dev          # Start dev server (localhost:5173)
bun run check        # Type check with svelte-check
bun run lint         # ESLint
bun run format       # Prettier format
bun run test         # Run all tests once
bun run build        # Build for production (Vercel adapter)
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PUBLIC_BACKEND_URL=http://localhost:8080
PUBLIC_BACKEND_WS_URL=ws://localhost:8080
PUBLIC_APP_ENV=development
BYPASS_TOKEN=your-bypass-token
AUTH_TOKEN=your-auth-token
```

## Architecture

### Directory Structure

```
src/
  lib/
    api/                   # Backend HTTP wrappers (always use fetchWithTimeout)
    components/            # Reusable Svelte components
    config.ts              # API endpoints + fetchWithTimeout
    stores/                # Svelte 5 rune stores (auth, websocket, toast)
    types/                 # TypeScript interfaces
    util/                  # Utilities (markdown, embed, debounce)
  routes/
    +page.{svelte,server.ts}     # Home page (CMS-backed, ISR 10min)
    project/+page.{svelte,server.ts}   # Project page (CMS-backed, ISR 10min)
    blog/[slug]/+page.{svelte,server.ts}  # Blog post (ISR 1h)
    blog/+page.{svelte,server.ts}       # Blog list
```

### Key Patterns

- **State Management:** Svelte 5 runes (`$state`, `$derived`, `$effect`). Files exporting reactive state end in `.svelte.ts`
- **API Layer:** All backend calls through `lib/api/` with `fetchWithTimeout()` (5s default)
- **Markdown Rendering:** Always use `renderMarkdown(text, previews?)` from `lib/util/markdown.ts`
- **Server Modules:** Files ending in `.server.ts` are server-only (e.g., `embed-previews.server.ts`)
- **WebSocket:** Real-time comments via `websocket.svelte.ts` with auth-required connection

## Link Embed Feature

Inline chip rendering for URLs, similar to Notion's "paste as mention":

- **Syntax:** `[[embed|https://example.com/path]]`
- **Rendering:** `<a class="link-embed-chip">[favicon] <title or domain></a>`
- **Editor:** Slash menu or paste handler (auto-converts URLs on empty lines)
- **Preview:** SSR via `preloadEmbedPreviews()` — no client-side flash on public pages

## Testing

Tests use Vitest with `@testing-library/svelte`. Test files use `.test.ts` extension alongside source files.

```bash
bun run test         # Run once
bun run test:unit    # Watch mode
```

## Deployment

Deployed on Vercel with the `@sveltejs/adapter-vercel`. Build command runs `vite build` followed by package publishing steps.

## Related

- [Backend API](../tomlord.io-backend) — Go service providing blog, page, and WebSocket endpoints
