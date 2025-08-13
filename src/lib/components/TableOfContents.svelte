<script lang="ts">
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import type { TocItem } from '$lib/util/markdown.js';

	let { items = [] }: { items?: TocItem[] } = $props();
	let activeId = $state('');

	function itemClass(item: TocItem): string {
		const base =
			'group/toc-item relative flex w-fit items-center py-1 leading-none transition-colors';
		const indent =
			item.level === 1 ? 'ml-0' : item.level === 2 ? 'ml-3' : item.level === 3 ? 'ml-6' : 'ml-9';
		const active = activeId === item.id ? 'text-gray-950' : 'text-gray-400 hover:text-gray-700';

		return `${base} ${indent} ${active}`;
	}

	function indicatorClass(item: TocItem): string {
		const base = 'inline-block h-0.5 w-3 shrink-0 rounded-full';
		return activeId === item.id
			? `${base} bg-gray-950`
			: `${base} bg-gray-400 transition-all group-hover/toc-item:bg-gray-700`;
	}

	$effect(() => {
		if (!browser || items.length === 0) return;

		let headings: HTMLElement[] = [];
		let frame = 0;
		let cancelled = false;

		function collectHeadings() {
			headings = items
				.map((item) => document.getElementById(item.id))
				.filter((heading): heading is HTMLElement => heading !== null);
			activeId = headings[0]?.id ?? '';
		}

		function updateActiveHeading() {
			if (headings.length === 0) return;

			const activationLine = window.scrollY + 120;
			const activeHeading = headings.findLast(
				(heading) => heading.getBoundingClientRect().top + window.scrollY <= activationLine
			);

			activeId = activeHeading?.id ?? headings[0].id;
		}

		function scheduleUpdate() {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(updateActiveHeading);
		}

		void tick().then(() => {
			if (cancelled) return;
			collectHeadings();
			updateActiveHeading();
		});

		window.addEventListener('scroll', scheduleUpdate, { passive: true });
		window.addEventListener('resize', scheduleUpdate);

		return () => {
			cancelled = true;
			cancelAnimationFrame(frame);
			window.removeEventListener('scroll', scheduleUpdate);
			window.removeEventListener('resize', scheduleUpdate);
		};
	});
</script>

{#if items.length > 0}
	<aside class="not-prose fixed top-1/2 right-20 z-30 hidden h-[50vh] -translate-y-1/2 xl:block">
		<nav aria-label="Table of contents" class="h-full overflow-visible py-2">
			<div class="flex h-full flex-col justify-center space-y-0 pr-1">
				{#each items as item (item.id)}
					<a
						href={`#${item.id}`}
						class={itemClass(item)}
						aria-current={activeId === item.id ? 'true' : undefined}
					>
						<span class={indicatorClass(item)}></span>
						<span
							class="pointer-events-none absolute top-1/2 right-full z-50 mr-3 max-w-64 -translate-y-1/2 rounded-md border border-gray-300 bg-[#EDEDED]/90 px-2.5 py-1.5 font-serif text-xs font-bold whitespace-nowrap text-gray-700 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover/toc-item:opacity-100"
						>
							{item.text}
						</span>
					</a>
				{/each}
			</div>
		</nav>
	</aside>
{/if}
