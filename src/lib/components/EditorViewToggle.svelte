<script lang="ts">
	import type { EditorViewMode } from '$lib/types/editor.js';

	let { value = $bindable<EditorViewMode>('write') }: { value: EditorViewMode } = $props();

	const modes = [
		{ id: 'write' as const, label: 'Write' },
		{ id: 'preview' as const, label: 'Preview' }
	];
</script>

<div class="flex overflow-hidden rounded-md border border-gray-200 text-xs">
	{#each modes as mode (mode.id)}
		<button
			type="button"
			onclick={() => (value = mode.id)}
			class="px-2.5 py-1 font-medium transition-colors
				{mode.id !== 'write' ? 'border-l border-gray-200' : ''}
				{value === mode.id ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}"
		>
			{mode.label}
		</button>
	{/each}
</div>
