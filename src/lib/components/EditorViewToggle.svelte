<script lang="ts">
	import { onMount } from 'svelte';
	import type { EditorViewMode } from '$lib/types/editor.js';

	let { value = $bindable<EditorViewMode>('split') }: { value: EditorViewMode } = $props();
	let isWide = $state(true);
	let visual = $derived(!isWide && value === 'split' ? 'write' : value);

	const modes = [
		{ id: 'write' as const, label: 'Write' },
		{ id: 'split' as const, label: 'Split', desktopOnly: true },
		{ id: 'preview' as const, label: 'Preview' }
	];

	onMount(() => {
		const media = window.matchMedia('(min-width: 1024px)');
		const sync = () => {
			isWide = media.matches;
		};
		sync();
		media.addEventListener('change', sync);
		return () => media.removeEventListener('change', sync);
	});
</script>

<div class="flex overflow-hidden rounded-md border border-gray-200 text-xs">
	{#each modes as mode (mode.id)}
		<button
			type="button"
			onclick={() => (value = mode.id)}
			class="px-2.5 py-1 font-medium transition-colors
				{mode.desktopOnly ? 'hidden lg:inline-block' : ''}
				{mode.id !== 'write' ? 'border-l border-gray-200' : ''}
				{visual === mode.id ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}"
		>
			{mode.label}
		</button>
	{/each}
</div>
