<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';

	let isProcessing = $state(true);
	let error = $state('');

	$effect(() => {
		if (browser) {
			processCallback();
		}
	});

	async function processCallback() {
		try {
			const urlParams = new URLSearchParams(window.location.search);
			const token = urlParams.get('token');
			const errorParam = urlParams.get('error');

			if (errorParam) {
				error = 'Authentication failed: ' + errorParam;
				isProcessing = false;
				return;
			}

			if (token) {
				// Save token and update auth state
				authStore.setToken(token);

				// Redirect back to where user came from or home
				const returnTo = sessionStorage.getItem('auth_return_to') || '/';
				sessionStorage.removeItem('auth_return_to');

				await goto(returnTo);
			} else {
				error = 'No authentication token received';
				isProcessing = false;
			}
		} catch (err) {
			console.error('Error processing auth callback:', err);
			error = 'Failed to process authentication';
			isProcessing = false;
		}
	}

	function goHome() {
		goto('/');
	}
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="text-center">
		{#if isProcessing}
			<div class="mb-4">
				<div
					class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"
				></div>
			</div>
			<h2 class="text-xl font-semibold text-gray-700">Authenticating...</h2>
			<p class="text-gray-500">Please wait while we complete your login.</p>
		{:else if error}
			<div class="mb-4">
				<svg
					class="mx-auto h-12 w-12 text-red-500"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<h2 class="mb-2 text-xl font-semibold text-red-600">Authentication Failed</h2>
			<p class="mb-4 text-gray-600">{error}</p>
			<button
				onclick={goHome}
				class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
			>
				Go to Home
			</button>
		{/if}
	</div>
</div>
