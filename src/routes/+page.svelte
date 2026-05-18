<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import EditPageModal from '$lib/components/EditPageModal.svelte';
	import { renderMarkdown } from '$lib/util/markdown.js';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { isSuperUser } from '$lib/util/auth.js';
	import { revalidateISR } from '$lib/api/revalidate.js';
	import { trackVisitor } from '$lib/api/analytics.js';
	import type { VisitorStats } from '$lib/api/analytics.js';
	import type { LinkPreview } from '$lib/types/preview.js';
	import { formatCompactNumber, generateSparklinePath } from '$lib/util/format.js';

	// Get data from the server load function
	let { data } = $props();

	// Check if user can edit (super user only)
	let canEdit = $derived(isSuperUser(auth.user));
	let showEditModal = $state(false);
	let pageContent = $derived(data.pageContent);

	// Visitor stats - initialized from SSR data, then updated client-side
	let visitorStats = $state<VisitorStats | null>(null);
	let visitorTracked = $state(false);
	let resolvedPreviews = $state<Record<string, LinkPreview>>({});

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

	$effect(() => {
		let cancelled = false;

		Promise.resolve(data.previews).then((previews) => {
			if (!cancelled) {
				resolvedPreviews = previews ?? {};
			}
		});

		return () => {
			cancelled = true;
		};
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

	let htmlContent = $derived(renderMarkdown(pageContent || '', resolvedPreviews));
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

	<div class="mb-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-tight">
		<div class="flex items-center gap-1.5">
			<span class="text-gray-500">Welcome! You're visitor</span>
			{#if visitorStats}
				<span
					class="font-semibold text-gray-900"
					title={visitorStats.total_count.toLocaleString()}
					in:fade={{ duration: 250 }}
				>
					#{formatCompactNumber(visitorStats.total_count)}
				</span>
			{/if}
		</div>

		{#if visitorStats?.recent && visitorStats.recent.length > 1}
			{@const sparkPath = generateSparklinePath(
				visitorStats.recent.map((d) => d.visit_count).reverse(),
				48,
				20
			)}
			<div class="flex items-center gap-1.5" in:fade={{ duration: 250 }}>
					<div class="group relative inline-flex cursor-help items-center">
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
							aria-label="Recent visitor trend"
						>
							<path d={sparkPath} />
						</svg>
						<div class="absolute bottom-full left-0 z-10 mb-2 hidden group-hover:block">
							<div
								class="rounded-lg bg-gray-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg"
							>
								<div class="mb-1 font-medium">Recent visits</div>
								{#each visitorStats.recent as day, i (day.date)}
									<div
										class="flex justify-between gap-4 {i === 0
											? 'text-emerald-400'
											: 'text-gray-300'}"
									>
										<span>{i === 0 ? 'Today' : `${i} days ago`}</span>
										<span>{day.visit_count} visits</span>
									</div>
								{/each}
							</div>
							<div class="absolute -bottom-1 left-4 h-2 w-2 rotate-45 bg-gray-900"></div>
						</div>
					</div>
			</div>
		{/if}
	</div>

	<main in:fly={{ y: 60, duration: 800, delay: 150 }} class="main-content-area mt-1">
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
