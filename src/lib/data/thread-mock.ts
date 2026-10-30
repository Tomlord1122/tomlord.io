import type { ThreadPost } from '$lib/types/thread.js';

/** Local preview posts so the timeline can be reviewed before the API is live. */
export const mockThreads: ThreadPost[] = [
	{
		id: '018f6a10-1111-7000-8000-000000000001',
		content:
			'Shipped the first cut of `/thread`. Short notes, newest first, no title required.\n\nThis is the mock feed so the page can be reviewed before the API is wired up.',
		created_at: '2026-07-11T08:00:00.000Z',
		updated_at: '2026-07-11T08:00:00.000Z'
	},
	{
		id: '018f6a10-1111-7000-8000-000000000014',
		content:
			'A normal link, and the same embed chip used on the other pages.\n\n[tomlord.fyi](https://tomlord.fyi)\n\n[[embed|https://tomlord.fyi]]',
		created_at: '2026-07-11T07:30:00.000Z',
		updated_at: '2026-07-11T07:30:00.000Z'
	},
	{
		id: '018f6a10-1111-7000-8000-000000000002',
		content:
			'A thread can still be **markdown**.\n\n- inline `code`\n- a link to [the blog](/blog)\n- and a second paragraph that should wrap like a normal post',
		created_at: '2026-07-11T04:00:00.000Z',
		updated_at: '2026-07-11T04:00:00.000Z'
	},
	{
		id: '018f6a10-1111-7000-8000-000000000003',
		content: 'Cursor pagination is keyed on `(created_at, id)`, so two posts in the same millisecond still have a stable order.',
		created_at: '2026-07-10T14:00:00.000Z',
		updated_at: '2026-07-10T14:00:00.000Z'
	},
	{
		id: '018f6a10-1111-7000-8000-000000000004',
		content:
			'```ts\nconst pageSize = 12;\nconst next = cursor ? decode(cursor) : null;\n```\n\nCode blocks stay compact. This is a note, not a changelog entry.',
		created_at: '2026-07-10T02:00:00.000Z',
		updated_at: '2026-07-10T06:00:00.000Z'
	},
	{
		id: '018f6a10-1111-7000-8000-000000000005',
		content: `Only the admin account can create, edit, or delete. Everyone else just scrolls.

This one is long on purpose, so the timeline can fold it.

A short note should stay open. Once it runs past a few lines, the feed shows the top and a fade, then Unfold.

The single-thread page still shows the whole thing. Folding is only for the scrolling list.

1. first
2. second
3. third
4. fourth
5. fifth

That should be enough to cross the fold.`,
		created_at: '2026-07-09T08:00:00.000Z',
		updated_at: '2026-07-09T08:00:00.000Z'
	},
	{
		id: '018f6a10-1111-7000-8000-000000000006',
		content:
			'Single posts live at `/thread/:id`, so a note can be shared without dumping the whole timeline into the URL.',
		created_at: '2026-07-08T08:00:00.000Z',
		updated_at: '2026-07-08T08:00:00.000Z'
	},
	{
		id: '018f6a10-1111-7000-8000-000000000007',
		content: 'No likes, no replies. Just the note.',
		created_at: '2026-07-07T08:00:00.000Z',
		updated_at: '2026-07-07T08:00:00.000Z'
	},
	{
		id: '018f6a10-1111-7000-8000-000000000008',
		content:
			'The composer is the page title, same trick as `tom.home` and `tom.changelog`. Click it when you are signed in as admin.',
		created_at: '2026-07-05T12:00:00.000Z',
		updated_at: '2026-07-05T12:00:00.000Z'
	},
	{
		id: '018f6a10-1111-7000-8000-000000000009',
		content: 'Scroll a little further. This one only shows up after the first page, so the cursor handoff is visible.',
		created_at: '2026-07-04T12:00:00.000Z',
		updated_at: '2026-07-04T12:00:00.000Z'
	},
	{
		id: '018f6a10-1111-7000-8000-000000000010',
		content: 'Still just text. Images can wait until the notes themselves feel right.',
		created_at: '2026-07-02T12:00:00.000Z',
		updated_at: '2026-07-02T12:00:00.000Z'
	},
	{
		id: '018f6a10-1111-7000-8000-000000000011',
		content: 'If this card appeared without a refresh, infinite scroll is doing its job.',
		created_at: '2026-06-28T12:00:00.000Z',
		updated_at: '2026-06-28T12:00:00.000Z'
	},
	{
		id: '018f6a10-1111-7000-8000-000000000012',
		content: 'Last mock note. After deploy, this feed comes from `GET /api/threads`.',
		created_at: '2026-06-20T12:00:00.000Z',
		updated_at: '2026-06-20T12:00:00.000Z'
	},
	{
		id: '018f6a10-1111-7000-8000-000000000013',
		content: 'Older than a week, so this one shows the full date instead of a relative time.',
		created_at: '2025-11-02T12:00:00.000Z',
		updated_at: '2025-11-02T12:00:00.000Z'
	}
];
