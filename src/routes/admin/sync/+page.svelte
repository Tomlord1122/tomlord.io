<script lang="ts">
	import { browser } from '$app/environment';

	let isLoading = $state(false);

	let result = $state<{
		success: boolean;
		message?: string;
		results?: Array<{ filename: string; action: string; blog?: { title: string } }>;
		errors?: string[];
		summary?: { total: number; success: number; failed: number };
	} | null>(null);
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
	<h1 class="mb-6 text-3xl font-bold text-gray-800">Blog Database Sync</h1>

	<div class="rounded-lg bg-white p-6 shadow-md">
		<p class="mb-4 text-gray-600">
			This page will sync all existing markdown blog posts to the database. This is needed when
			migrating from file-based to database-based blog storage.
		</p>

		<button
			onclick={syncBlogs}
			disabled={isLoading}
			class="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if isLoading}
				<span class="flex items-center">
					<div
						class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
					></div>
					Syncing...
				</span>
			{:else}
				Sync Blogs to Database
			{/if}
		</button>
	</div>

	{#if error}
		<div class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
			<h3 class="mb-2 font-semibold text-red-800">Error</h3>
			<p class="text-red-700">{error}</p>
		</div>
	{/if}

	{#if result}
		<div class="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
			<h3 class="mb-4 font-semibold text-green-800">Sync Results</h3>

			<div class="mb-4 grid grid-cols-3 gap-4">
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
					<h4 class="mb-2 font-semibold text-green-700">Successfully Processed:</h4>
					<ul class="space-y-1">
						{#each result.results as item (item.filename)}
							<li class="text-sm">
								<span class="rounded bg-gray-100 px-2 py-1 font-mono">{item.filename}</span>
								<span class="ml-2 text-green-600">({item.action})</span>
								<span class="ml-2 text-gray-600">{item.blog?.title}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if result.errors && result.errors.length > 0}
				<div>
					<h4 class="mb-2 font-semibold text-red-700">Errors:</h4>
					<ul class="space-y-1">
						{#each result.errors as errorMsg, index (index)}
							<li class="text-sm text-red-600">{errorMsg}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}

	<div class="mt-8 text-center">
		<a href="/blog" class="text-blue-600 underline hover:text-blue-800"> ← Go to Blog </a>
	</div>
</div>
