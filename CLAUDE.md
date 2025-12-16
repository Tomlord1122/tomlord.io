# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal website built with SvelteKit 2.x, Svelte 5, and TypeScript. Features a blog with real-time comments (WebSocket), photography gallery, and project showcase. Deployed on Vercel with a separate backend API.

## Commands

```bash
bun run dev          # Start dev server
bun run build        # Build for production
bun run preview      # Preview production build
bun run check        # Type check with svelte-check
bun run lint         # ESLint
bun run format       # Prettier format
bun run test         # Run all tests once
bun run test:unit    # Run vitest in watch mode
```

## Architecture

### Tech Stack

- **Framework:** SvelteKit 2.x with Svelte 5 runes (`$state`, `$derived`)
- **Styling:** Tailwind CSS 4.x
- **Markdown:** mdsvex for `.svx` and `.md` files
- **Package Manager:** Bun
- **Deployment:** Vercel (adapter-vercel)

### Directory Structure

- `src/lib/api/` - Backend API integration (blogs.ts, pages.ts)
- `src/lib/components/` - Reusable Svelte components
- `src/lib/stores/` - Svelte 5 rune-based stores (auth.svelte.ts, websocket.svelte.ts)
- `src/lib/types/` - TypeScript interfaces
- `src/lib/config.ts` - Environment configuration and API endpoints
- `src/routes/` - SvelteKit file-based routing

### Key Patterns

**State Management:** Uses Svelte 5 runes. Auth store exports both `authStore` (full state) and `auth` (convenience API).

**API Layer:** All backend calls go through `src/lib/api/` with `fetchWithTimeout()` utility (5s default). Backend health checks are cached for 30s.

**WebSocket:** Real-time comment updates via `websocket.svelte.ts`. Connection requires authentication. Implements reconnection with exponential backoff (max 3 attempts).

**Server vs Client:** Page data loading happens in `+page.server.ts` files. Interactive features (comments, auth) are client-side.

### Environment Variables

- `PUBLIC_BACKEND_URL` - HTTP API endpoint
- `PUBLIC_BACKEND_WS_URL` - WebSocket endpoint
- `PUBLIC_APP_ENV` - development/production
- `AUTH_TOKEN` - Server-side auth token

## Testing

Tests use Vitest with `@testing-library/svelte`. Test files go alongside source files with `.test.ts` extension. jsdom is used for DOM simulation.
