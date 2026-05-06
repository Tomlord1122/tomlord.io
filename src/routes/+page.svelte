<script lang="ts">
	import { fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import EditPageModal from '$lib/components/EditPageModal.svelte';
	import { renderMarkdown } from '$lib/util/markdown.js';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { isSuperUser } from '$lib/util/auth.js';
	import { revalidateISR } from '$lib/api/revalidate.js';
	import { trackVisitor } from '$lib/api/analytics.js';
	import { formatCompactNumber, generateSparklinePath } from '$lib/util/format.js';

	// Get data from the server load function
	let { data } = $props();

	// Check if user can edit (super user only)
	let canEdit = $derived(isSuperUser(auth.user));
	let showEditModal = $state(false);
	let pageContent = $derived(data.pageContent);

	// Visitor stats - initialized from SSR data, then updated client-side
	// svelte-ignore state_referenced_locally
	let visitorStats = $state(data.visitorStats);
	let visitorTracked = $state(false);

	// Track visit client-side on mount
	$effect(() => {
		if (browser && !visitorTracked) {
			visitorTracked = true;
			trackVisitor()
				.then((stats) => {
					visitorStats = stats;
				})
				.catch((err) => {
					console.error('Failed to track visitor:', err);
				});
		}
	});

	async function handlePageSaved() {
		console.log('Home page content saved successfully.');
		await revalidateISR('/');
		// Soft refresh via SvelteKit navigation
		const { invalidateAll } = await import('$app/navigation');
		invalidateAll();
	}

	function handleEditCancel() {
		console.log('Edit cancelled.');
	}

	function openEditModal() {
		showEditModal = true;
	}

	let htmlContent = $derived(renderMarkdown(pageContent || '', data.previews));
</script>

<svelte:head>
	<meta property="og:title" content="Home | Tomlord's Blog" />
	<meta
		property="og:description"
		content="Personal blog by Tomlord, sharing tech, projects, and photography"
	/>
	<meta property="og:image" content="https://tomlord.fyi/app_icon.png" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://tomlord.fyi" />
</svelte:head>

<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base mx-auto lg:max-w-screen-md">
	<h1 class="page-title">
		{#if canEdit}
			<button
				onclick={openEditModal}
				aria-label="Edit Home Page"
				class="transition-colors hover:text-gray-600"
			>
				tom.home
			</button>
		{:else}
			tom.home
		{/if}
	</h1>

	{#if visitorStats}
		<div class="mb-6 space-y-1" in:fly={{ y: 20, duration: 600, delay: 400 }}>
			<!-- Total count line -->
			<div class="flex items-center gap-2 text-sm">
				<span class="text-gray-500">Welcome! You're visitor</span>
				<span class="font-semibold text-gray-900" title="{visitorStats.total_count.toLocaleString()}">
					#{formatCompactNumber(visitorStats.total_count)}
				</span>
			</div>

			<!-- Today count + sparkline -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-gray-500">+{visitorStats.today_count.toLocaleString()} today</span>
				{#if visitorStats.recent && visitorStats.recent.length > 1}
					{@const sparkPath = generateSparklinePath(
						visitorStats.recent.map(d => d.visit_count).reverse(),
						48,
						20
					)}
					<svg
						class="text-emerald-500"
						width="48"
						height="20"
						viewBox="0 0 48 20"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d={sparkPath} />
					</svg>
				{/if}
			</div>

			<!-- Recent days breakdown (hover to show) -->
			{#if visitorStats.recent && visitorStats.recent.length > 1}
				<div class="group relative inline-block">
					<button class="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-help">
						{visitorStats.recent.length - 1} days ago: {visitorStats.recent[1]?.visit_count ?? 0} visits
					</button>
					<!-- Tooltip -->
					<div class="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10">
						<div class="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg whitespace-nowrap">
							<div class="font-medium mb-1">Recent visits</div>
							{#each visitorStats.recent as day, i}
								<div class="flex justify-between gap-4 {i === 0 ? 'text-emerald-400' : 'text-gray-300'}">
									<span>{i === 0 ? 'Today' : `${i} days ago`}</span>
									<span>{day.visit_count} visits</span>
								</div>
							{/each}
						</div>
						<div class="w-2 h-2 bg-gray-900 rotate-45 absolute left-4 -bottom-1"></div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<main in:fly={{ y: 100, duration: 1000, delay: 200 }} class="main-content-area">
		{#if pageContent}
			<div class="prose prose-sm sm:prose-lg max-w-none">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html htmlContent}
			</div>
		{:else}
			<p class="text-gray-600">Loading content...</p>
		{/if}
	</main>
</div>

{#if canEdit}
	<EditPageModal
		bind:show={showEditModal}
		pageTitle="Home Page"
		initialContent={pageContent}
		pageName="home"
		availablePhotos={data.availablePhotos || []}
		availableAssets={data.availableAssets || []}
		onSaved={handlePageSaved}
		onCancel={handleEditCancel}
	/>
{/if}
