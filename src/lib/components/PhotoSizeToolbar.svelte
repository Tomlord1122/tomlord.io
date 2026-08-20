<script lang="ts">
	import { PHOTO_SIZE_MAX, PHOTO_SIZE_PRESETS } from '$lib/util/helper.js';

	let {
		widthPx,
		onChange,
		onClose,
		hint = ''
	}: {
		widthPx: number | null;
		onChange: (widthPx: number | null) => void;
		onClose: () => void;
		hint?: string;
	} = $props();

	const presets = [
		{ id: 's', label: 'S', px: PHOTO_SIZE_PRESETS.s },
		{ id: 'm', label: 'M', px: PHOTO_SIZE_PRESETS.m },
		{ id: 'l', label: 'L', px: PHOTO_SIZE_PRESETS.l },
		{ id: 'full', label: 'Full', px: null }
	] as const;

	let sliderValue = $derived(widthPx ?? PHOTO_SIZE_MAX);
	let label = $derived(widthPx == null ? 'Full width' : `${widthPx}px on the post`);
</script>

<div
	class="flex flex-wrap items-center gap-2 border-t border-gray-200 bg-[#EDEDED] px-3 py-2"
>
	<p class="text-xs font-medium text-gray-600">Image size</p>
	<div class="flex overflow-hidden rounded-md border border-gray-200 text-xs">
		{#each presets as preset (preset.id)}
			<button
				type="button"
				onclick={() => onChange(preset.px)}
				class="px-2.5 py-1 font-medium transition-colors
					{preset.id !== 's' ? 'border-l border-gray-200' : ''}
					{(preset.px == null && widthPx == null) || preset.px === widthPx
					? 'bg-gray-800 text-white'
					: 'bg-white text-gray-600 hover:bg-gray-50'}"
			>
				{preset.label}
			</button>
		{/each}
	</div>
	<input
		type="range"
		min="160"
		max={PHOTO_SIZE_MAX}
		step="20"
		value={sliderValue}
		oninput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
		class="h-1 w-28 cursor-pointer accent-gray-800 sm:w-36"
		aria-label="Image width"
	/>
	<span class="min-w-24 text-xs text-gray-500">{label}</span>
	<button
		type="button"
		onclick={onClose}
		class="ml-auto rounded-md px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700"
		aria-label="Deselect image"
	>
		&times;
	</button>
	{#if hint}
		<p class="w-full text-[11px] text-gray-400">{hint}</p>
	{/if}
</div>
