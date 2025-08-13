<script lang="ts">
	import { renderMarkdown } from '$lib/util/markdown.js';
	import { formatThreadTime } from '$lib/util/time.js';
	import type { ThreadPost } from '$lib/types/thread.js';
	import type { LinkPreview } from '$lib/types/preview.js';

	let {
		thread,
		canEdit = false,
		collapsible = true,
		previews = {},
		onEdit = () => {},
		onDelete = () => {}
	}: {
		thread: ThreadPost;
		canEdit?: boolean;
		collapsible?: boolean;
		previews?: Record<string, LinkPreview>;
		onEdit?: (thread: ThreadPost) => void;
		onDelete?: (thread: ThreadPost) => void;
	} = $props();

	const FOLD_LINES = 8;

	let html = $derived(renderMarkdown(thread.content, previews));
	let lineCount = $derived(thread.content.split('\n').length);
	let foldable = $derived(collapsible && lineCount > FOLD_LINES);
	let folded = $state(true);
	let bodyEl: HTMLDivElement | null = $state(null);
	let foldTimer = 0;

	function foldHeight(el: HTMLElement): number {
		const raw = getComputedStyle(el).getPropertyValue('--thread-fold').trim();
		const value = Number.parseFloat(raw);
		if (!Number.isFinite(value)) return 192;
		if (raw.endsWith('rem')) {
			const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
			return value * root;
		}
		return value;
	}

	function toggleFold() {
		const el = bodyEl;
		if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			folded = !folded;
			return;
		}

		window.clearTimeout(foldTimer);
		const collapsed = foldHeight(el);
		const from = folded ? collapsed : el.scrollHeight;
		folded = !folded;
		const to = folded ? collapsed : el.scrollHeight;
		el.style.overflow = 'hidden';
		el.style.maxHeight = `${from}px`;
		requestAnimationFrame(() => {
			if (bodyEl !== el) return;
			el.style.maxHeight = `${to}px`;
			foldTimer = window.setTimeout(() => {
				if (bodyEl !== el) return;
				el.style.maxHeight = '';
				el.style.overflow = folded ? 'hidden' : '';
			}, 400);
		});
	}
</script>

<article
	class="thread-card not-prose relative font-serif transition-all duration-200 hover:scale-[1.01] {collapsible
		? 'cursor-pointer'
		: ''}"
>
	{#if collapsible}
		<a
			href="/thread/{thread.id}"
			class="absolute inset-0 z-0"
			aria-label="Open thread"
			data-sveltekit-preload-data="hover"
		></a>
	{/if}
	<div class="pointer-events-none relative z-10 mb-2 flex items-baseline justify-between gap-3 text-sm text-gray-500">
		<time datetime={thread.created_at} title={new Date(thread.created_at).toLocaleString()}>
			{formatThreadTime(thread.created_at)}
		</time>
		{#if canEdit}
			<div class="pointer-events-auto flex shrink-0 gap-2 text-xs">
				<button type="button" class="hover:text-gray-900" onclick={() => onEdit(thread)}>Edit</button>
				<button type="button" class="hover:text-red-700" onclick={() => onDelete(thread)}>
					Delete
				</button>
			</div>
		{/if}
	</div>
	<div class="pointer-events-none relative z-10 border-l border-gray-300 pl-4">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		<div
			bind:this={bodyEl}
			class="thread-body prose prose-base sm:prose-lg max-w-none text-gray-900"
			class:is-folded={foldable && folded}
		>
			{@html html}
		</div>
		{#if foldable && folded}
			<div class="thread-fade pointer-events-none absolute inset-x-0 bottom-0 h-10"></div>
		{/if}
		{#if foldable}
			<button
				type="button"
				onclick={toggleFold}
				class="pointer-events-auto mt-1 text-sm text-gray-500 underline decoration-gray-300 underline-offset-4 hover:text-gray-900 hover:decoration-gray-900"
			>
				{folded ? 'Show more' : 'Show less'}
			</button>
		{/if}
	</div>
</article>

<style>
	.thread-body {
		--thread-fold: 12rem;
		transition: max-height 400ms ease;
	}

	.thread-body :global(a),
	.thread-body :global(button) {
		pointer-events: auto;
	}

	.thread-body.is-folded {
		max-height: var(--thread-fold);
		overflow: hidden;
	}

	.thread-fade {
		background: linear-gradient(to top, rgb(237 237 237 / 0.55), rgb(237 237 237 / 0));
	}
</style>
