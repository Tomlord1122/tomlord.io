<script lang="ts">
	import { browser } from '$app/environment';
	
	let isLoading = $state(false);
	let result = $state<any>(null);
	let error = $state('');

	async function syncBlogs() {
		if (!browser) return;
		
		isLoading = true;
		error = '';
		result = null;

		try {
			// Get token from localStorage if available
			const token = localStorage.getItem('auth_token');
			const headers: Record<string, string> = {
				'Content-Type': 'application/json'
			};
			
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			const response = await fetch('/api/sync-blogs', {
				method: 'POST',
				headers
			});

			if (response.ok) {
				result = await response.json();
			} else {
				const errorData = await response.json().catch(() => ({}));
				error = `Failed to sync: ${errorData.error || 'Unknown error'}`;
			}
		} catch (err) {
			error = `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Admin - Sync Blogs</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-6">
	<h1 class="text-3xl font-bold mb-6 text-gray-800">Blog Database Sync</h1>
	
	<div class="bg-white rounded-lg shadow-md p-6">
		<p class="text-gray-600 mb-4">
			This page will sync all existing markdown blog posts to the database.
			This is needed when migrating from file-based to database-based blog storage.
		</p>
		
		<button
			onclick={syncBlogs}
			disabled={isLoading}
			class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		>
			{#if isLoading}
				<span class="flex items-center">
					<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
					Syncing...
				</span>
			{:else}
				Sync Blogs to Database
			{/if}
		</button>
	</div>

	{#if error}
		<div class="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
			<h3 class="text-red-800 font-semibold mb-2">Error</h3>
			<p class="text-red-700">{error}</p>
		</div>
	{/if}

	{#if result}
		<div class="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
			<h3 class="text-green-800 font-semibold mb-4">Sync Results</h3>
			
			<div class="grid grid-cols-3 gap-4 mb-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-gray-700">{result.summary?.total || 0}</div>
					<div class="text-sm text-gray-600">Total Files</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-green-600">{result.summary?.success || 0}</div>
					<div class="text-sm text-gray-600">Success</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-red-600">{result.summary?.failed || 0}</div>
					<div class="text-sm text-gray-600">Failed</div>
				</div>
			</div>

			{#if result.results && result.results.length > 0}
				<div class="mb-4">
					<h4 class="font-semibold text-green-700 mb-2">Successfully Processed:</h4>
					<ul class="space-y-1">
						{#each result.results as item}
							<li class="text-sm">
								<span class="font-mono bg-gray-100 px-2 py-1 rounded">{item.filename}</span>
								<span class="ml-2 text-green-600">({item.action})</span>
								<span class="ml-2 text-gray-600">{item.blog?.title}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if result.errors && result.errors.length > 0}
				<div>
					<h4 class="font-semibold text-red-700 mb-2">Errors:</h4>
					<ul class="space-y-1">
						{#each result.errors as errorMsg}
							<li class="text-sm text-red-600">{errorMsg}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}

	<div class="mt-8 text-center">
		<a href="/blog" class="text-blue-600 hover:text-blue-800 underline">
			← Go to Blog
		</a>
	</div>
</div> 