<script lang="ts">
	import { onMount } from 'svelte';
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

<svelte:head>
	<title>Authenticating...</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center">
	<div class="text-center">
		{#if isProcessing}
			<div class="mb-4">
				<div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
			</div>
			<h2 class="text-xl font-semibold text-gray-700">Authenticating...</h2>
			<p class="text-gray-500">Please wait while we complete your login.</p>
		{:else if error}
			<div class="mb-4">
				<svg class="h-12 w-12 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
				</svg>
			</div>
			<h2 class="text-xl font-semibold text-red-600 mb-2">Authentication Failed</h2>
			<p class="text-gray-600 mb-4">{error}</p>
			<button
				onclick={goHome}
				class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
			>
				Go to Home
			</button>
		{/if}
	</div>
</div>