<script lang="ts">
	import { fly } from 'svelte/transition';
	import EditPageModal from '$lib/components/EditPageModal.svelte';
	import { renderMarkdown } from '$lib/util/markdown.js';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { isSuperUser } from '$lib/util/auth.js';
	import { revalidateISR } from '$lib/api/revalidate.js';
	import type { LinkPreview } from '$lib/types/preview.js';

	// Get data from the server load function
	let { data } = $props();

	// Check if user can edit (super user only)
	let canEdit = $derived(isSuperUser(auth.user));
	let showEditModal = $state(false);
	let optimisticPageContent = $state<string | null>(null);
	let pageContent = $derived(optimisticPageContent ?? data.pageContent);
	let resolvedPreviews = $state<Record<string, LinkPreview>>({});

	$effect(() => {
		data.pageContent;
		optimisticPageContent = null;
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

	// Callback for successful save
	function handlePageSaved(content?: string) {
		console.log('Project page content saved successfully.');
		if (content) optimisticPageContent = content;
		void (async () => {
			await revalidateISR('/project');
			const { invalidateAll } = await import('$app/navigation');
			await invalidateAll();
		})();
	}

	// Callback for modal cancellation
	function handleEditCancel() {
		console.log('Edit cancelled.');
	}

	// Function to open the edit modal
	function openEditModal() {
		showEditModal = true;
	}

	// Derived HTML content for rendering
	let htmlContent = $derived(renderMarkdown(pageContent || '', resolvedPreviews));
</script>

<svelte:head>
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Projects | Tomlord's Blog" />
	<meta name="twitter:description" content="My learning journey" />
	<meta name="twitter:image" content="https://tomlord.fyi/socail-card-v2.png" />
	<meta name="twitter:image:alt" content="Tomlord's Blog" />

	<meta property="og:title" content="Projects | Tomlord's Blog" />
	<meta property="og:description" content="My learning journey" />
	<meta property="og:image" content="https://tomlord.fyi/socail-card-v2.png" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://tomlord.fyi/project" />
</svelte:head>

<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base mx-auto lg:max-w-screen-md">
	<!-- A large heading for the page title or your name -->
	<h1 class="page-title">
		{#if canEdit}
			<button
				onclick={openEditModal}
				aria-label="Edit Project Page"
				class="transition-colors hover:text-gray-600"
			>
				tom.project
			</button>
		{:else}
			tom.project
		{/if}
	</h1>

	<main in:fly={{ y: 100, duration: 800, delay: 100 }} class="main-content-area">
		<div class="prose prose-sm sm:prose-lg max-w-none">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html htmlContent}
		</div>
	</main>
</div>

{#if canEdit}
	<EditPageModal
		bind:show={showEditModal}
		pageTitle="Project Page"
		initialContent={pageContent}
		pageName="project"
		availablePhotos={data.availablePhotos || []}
		availableAssets={data.availableAssets || []}
		onSaved={handlePageSaved}
		onCancel={handleEditCancel}
	/>
{/if}
