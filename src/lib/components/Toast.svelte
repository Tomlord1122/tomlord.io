<script lang="ts">
	import { getToasts } from '$lib/stores/toast.svelte.js';

	const toasts = $derived(getToasts());
</script>

{#if toasts.length > 0}
	<div class="fixed right-4 bottom-4 z-[9999] flex flex-col gap-2">
		{#each toasts as toast (toast.id)}
			<div
				class="animate-slide-in rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg {toast.type ===
				'success'
					? 'bg-green-600'
					: toast.type === 'error'
						? 'bg-red-600'
						: 'bg-gray-700'}"
			>
				{toast.message}
			</div>
		{/each}
	</div>
{/if}

<style>
	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateX(100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.animate-slide-in {
		animation: slide-in 0.2s ease-out;
	}
</style>
