<script lang="ts">
	import { canGoBack, goBack } from '$lib/navigation.js';
	import { browser } from '$app/environment';

	// Props
	interface Props {
		class?: string;
		showText?: boolean;
	}
	
	let { class: className = '', showText = true }: Props = $props();

	// Check if we can go back
	let canNavigateBack = $derived(browser ? canGoBack() : false);

	// Handle back navigation
	async function handleBack() {
		await goBack();
	}
</script>

{#if canNavigateBack}
	<button
		onclick={handleBack}
		class={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 ${className}`}
		type="button"
		aria-label="Go back to previous page"
	>
		<!-- Back arrow icon -->
		<svg 
			class="w-4 h-4" 
			fill="none" 
			stroke="currentColor" 
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path 
				stroke-linecap="round" 
				stroke-linejoin="round" 
				stroke-width="2" 
				d="M10 19l-7-7m0 0l7-7m-7 7h18" 
			/>
		</svg>
		
		{#if showText}
			<span>Back</span>
		{/if}
	</button>
{/if} 