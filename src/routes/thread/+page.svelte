<script lang="ts">
	import { fly } from 'svelte/transition';
	import ThreadCard from '$lib/components/ThreadCard.svelte';
	import ThreadEditorModal from '$lib/components/ThreadEditorModal.svelte';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { isSuperUser } from '$lib/util/auth.js';
	import { deleteThread, fetchThreads } from '$lib/api/threads.js';
	import { fetchLinkPreview } from '$lib/api/preview.js';
	import { extractEmbedUrls } from '$lib/util/embed.js';
	import { mockThreads } from '$lib/data/thread-mock.js';
	import { showToast } from '$lib/stores/toast.svelte.js';
	import type { ThreadPost } from '$lib/types/thread.js';
	import type { LinkPreview } from '$lib/types/preview.js';

	const PAGE_SIZE = 12;

	let { data } = $props();

	let threads = $state<ThreadPost[]>([]);
	let nextCursor = $state<string | null>(null);
	let hasMore = $state(false);
	let isMock = $state(false);
	let isLoadingMore = $state(false);
	let showEditor = $state(false);
	let editing = $state<ThreadPost | null>(null);
	let sentinelEl: HTMLDivElement | null = $state(null);
	let canEdit = $derived(isSuperUser(auth.user));
	let previews = $state<Record<string, LinkPreview>>({});

	$effect(() => {
		let cancelled = false;
		Promise.resolve(data.previews).then((next) => {
			if (!cancelled) previews = next ?? {};
		});
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		threads = data.threads;
		nextCursor = data.nextCursor;
		hasMore = data.hasMore;
		isMock = data.mock;
	});

	async function loadMore() {
		if (!hasMore || isLoadingMore) return;
		isLoadingMore = true;
		try {
			if (isMock) {
				const start = threads.length;
				const more = mockThreads.slice(start, start + PAGE_SIZE);
				threads = [...threads, ...more];
				hasMore = threads.length < mockThreads.length;
				return;
			}
			const page = await fetchThreads({ limit: PAGE_SIZE, cursor: nextCursor });
			const seen = new Set(threads.map((thread) => thread.id));
			const more = page.threads.filter((thread) => !seen.has(thread.id));
			const urls = [
				...new Set(more.flatMap((thread) => extractEmbedUrls(thread.content)))
			].filter((url) => !previews[url]);
			const fetched = await Promise.all(
				urls.map(async (url) => [url, await fetchLinkPreview(url)] as const)
			);
			const extra: Record<string, LinkPreview> = {};
			for (const [url, preview] of fetched) {
				if (preview) extra[url] = preview;
			}
			previews = { ...previews, ...extra };
			threads = [...threads, ...more];
			nextCursor = page.next_cursor;
			hasMore = page.has_more;
		} catch (error) {
			showToast(error instanceof Error ? error.message : 'Could not load more', 'error', 3000);
		} finally {
			isLoadingMore = false;
		}
	}

	$effect(() => {
		if (!sentinelEl) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) loadMore();
			},
			{ rootMargin: '240px' }
		);
		observer.observe(sentinelEl);
		return () => observer.disconnect();
	});

	function openCreate() {
		editing = null;
		showEditor = true;
	}

	function openEdit(thread: ThreadPost) {
		editing = thread;
		showEditor = true;
	}

	function handleSaved(saved: ThreadPost) {
		const index = threads.findIndex((thread) => thread.id === saved.id);
		if (index === -1) {
			threads = [saved, ...threads];
			return;
		}
		threads = threads.map((thread) => (thread.id === saved.id ? saved : thread));
	}

	async function handleDelete(thread: ThreadPost) {
		if (!confirm('Delete this thread?')) return;
		if (isMock) {
			threads = threads.filter((item) => item.id !== thread.id);
			return;
		}
		if (!auth.token) return;
		try {
			await deleteThread(thread.id, auth.token);
			threads = threads.filter((item) => item.id !== thread.id);
			showToast('Thread deleted', 'success', 1600);
		} catch (error) {
			showToast(error instanceof Error ? error.message : 'Delete failed', 'error', 3000);
		}
	}
</script>

<svelte:head>
	<title>Thread - Tomlord</title>
	<meta name="description" content="Short notes from Tomlord" />
	<meta property="og:title" content="Thread | Tomlord" />
	<meta property="og:description" content="Short notes, newest first." />
	<meta property="og:url" content="https://tomlord.fyi/thread" />
</svelte:head>

<div class="prose prose-sm sm:prose-base mx-auto lg:max-w-screen-md">
	<h1 class="page-title">
		{#if canEdit}
			<button
				onclick={openCreate}
				aria-label="New thread"
				class="transition-colors hover:text-gray-600"
			>
				tom.thread
			</button>
		{:else}
			tom.thread
		{/if}
	</h1>
	{#if threads.length === 0}
		<p class="py-8 text-sm text-gray-500">Nothing here yet.</p>
	{:else}
		<div class="not-prose" in:fly={{ y: 24, duration: 500 }}>
			{#each threads as thread (thread.id)}
				<ThreadCard {thread} {canEdit} {previews} onEdit={openEdit} onDelete={handleDelete} />
			{/each}
		</div>
	{/if}

	<div bind:this={sentinelEl} class="h-8"></div>
	{#if isLoadingMore}
		<p class="pb-6 text-center text-xs text-gray-400">Loading…</p>
	{/if}
</div>

{#if canEdit}
	<ThreadEditorModal bind:show={showEditor} thread={editing} onSaved={handleSaved} />
{/if}
