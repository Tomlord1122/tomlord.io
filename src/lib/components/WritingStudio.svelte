<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		show,
		drawerOpen = $bindable(false),
		onClose,
		labelledBy,
		header,
		meta,
		footer,
		drawer,
		children
	}: {
		show: boolean;
		drawerOpen?: boolean;
		onClose: () => void;
		labelledBy: string;
		header: Snippet;
		meta?: Snippet;
		footer?: Snippet;
		drawer?: Snippet;
		children: Snippet;
	} = $props();

	$effect(() => {
		if (!show) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function handleKeydown(event: KeyboardEvent) {
		if (!show || event.key !== 'Escape') return;
		if (document.querySelector('.slash-menu, [data-nested-dialog]')) return;
		if (drawerOpen) {
			drawerOpen = false;
			return;
		}
		onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<div
		class="fixed inset-0 z-50 flex bg-white"
		role="dialog"
		aria-modal="true"
		aria-labelledby={labelledBy}
	>
		<div class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
			<header class="shrink-0 border-b border-gray-200">
				{@render header()}
			</header>
			{#if meta}
				<div class="shrink-0 border-b border-gray-100 px-5 pt-5 pb-4 sm:px-6">
					{@render meta()}
				</div>
			{/if}
			<div class="min-h-0 flex-1 overflow-hidden">
				{@render children()}
			</div>
			{#if footer}
				<footer class="shrink-0 border-t border-gray-200">
					{@render footer()}
				</footer>
			{/if}
			{#if drawer}
				{@render drawer()}
			{/if}
		</div>
	</div>
{/if}
