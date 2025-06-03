<script lang="ts">
	import { fly, fade, slide } from 'svelte/transition';
	import { browser } from '$app/environment';
	import ImageUploadModal from '$lib/components/ImageUploadModal.svelte';
	import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
	import { invalidateAll } from '$app/navigation'; // For refreshing data

	// Get data from both page and layout
	let { data } = $props();

	// Create photo objects from layout's availablePhotos
	let photos = $derived(
		data.availablePhotos
			? data.availablePhotos.map((photoUrl: string) => {
					const filename = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);
					return {
						src: photoUrl,
						alt: `Photo ${filename}`,
						filename
					};
				})
			: []
	);

	// isDev state to control visibility of the uploader trigger
	let isDev = $state(false);

	// Use a normal variable for this check instead of wrapping in an effect
	if (browser) {
		// Only localhost is considered development for showing the uploader
		isDev = window.location.hostname === 'localhost';
	}

	// State to control the visibility of the image upload modal
	let showImageUploadModal = $state(false);

	// State to control the full-size image modal
	let showFullSizeImage = $state(false);
	let currentFullSizeImage = $state('');

	// ---- Load More 分頁載入狀態 ----
	const PHOTOS_TO_LOAD_AT_ONCE = 10; // 每次載入 10 張照片
	let visiblePhotosCount = $state(PHOTOS_TO_LOAD_AT_ONCE);
	let isLoadingMore = $state(false);

	// ---- Derived state for displayed photos ----
	let displayedPhotos = $derived(photos ? photos.slice(0, visiblePhotosCount) : []);

	// ---- Function to load more photos ----
	async function loadMorePhotos() {
		isLoadingMore = true;

		// await new Promise(resolve => setTimeout(resolve, 1000));

		visiblePhotosCount += PHOTOS_TO_LOAD_AT_ONCE;
		// Ensure we don't try to show more photos than available
		if (photos && visiblePhotosCount > photos.length) {
			visiblePhotosCount = photos.length;
		}

		isLoadingMore = false;
	}

	// Function to open the full-size image modal
	function openFullSizeImage(imageSrc: string) {
		currentFullSizeImage = imageSrc;
		showFullSizeImage = true;
	}

	// Function to close the full-size image modal
	function closeFullSizeImage() {
		showFullSizeImage = false;
	}

	// Callback for successful upload from the modal
	function handleModalUploadSuccess(newImagePaths: string[]) {
		console.log(`${newImagePaths.length} new image(s) uploaded`);
		if (newImagePaths.length > 0) {
			invalidateAll(); // Refresh data if at least one image was successful
		}
	}

	// Callback for when the modal is cancelled
	function handleModalCancel() {
		console.log('Image upload modal cancelled.');
	}
</script>

<svelte:head>
	<meta name="twitter:title" content="Photography | Tomlord's Blog" />
</svelte:head>

<!-- This is the main container for your page content -->
<div class="prose prose-sm sm:prose-base mx-auto lg:max-w-screen-md">
	<h1 class="page-title flex items-center justify-between">
		{#if isDev}
			<!-- Button to open the image upload modal -->
			<button
				onclick={() => (showImageUploadModal = true)}
				class="transition-colors hover:text-gray-600"
			>
				tom.photography
			</button>
		{:else}
			tom.photography
		{/if}
	</h1>
</div>

<main in:fly={{ y: 100, duration: 1000, delay: 100 }} class="main-content-area mt-10">
	{#if displayedPhotos && displayedPhotos.length > 0}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each displayedPhotos as photo, i (photo.src)}
				<div in:fade|global={{ duration: 300, delay: (i % 10) * 50 + 200 }}>
						<ResponsiveImage
						src={photo.src}
						alt={photo.alt}
						loading={i < 10 ? 'eager' : 'lazy'}
						onclick={() => openFullSizeImage(photo.src)}
						/>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-gray-600">No photos to display yet. Upload some if you're on localhost!</p>
	{/if}

	<!-- "Load More" Button -->
	{#if photos && displayedPhotos.length < photos.length && !isLoadingMore}
		<div class="mt-8 mb-8 text-center">
			<button
				onclick={loadMorePhotos}
				class="relative overflow-hidden rounded-lg px-6 py-3 cursor-pointer"
			>
				Load More Photos ({displayedPhotos.length} / {photos.length})
			</button>
		</div>
	{/if}
</main>

<!-- Full-size image modal -->
{#if showFullSizeImage}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-lg backdrop-filter"
		onclick={closeFullSizeImage}
		onkeydown={(e) => e.key === 'Escape' && closeFullSizeImage()}
		role="dialog"
		tabindex="0"
		in:fade={{ duration: 200 }}
	>
		<div class="max-h-full max-w-full overflow-auto">
			<img
				src={currentFullSizeImage}
				alt="Full size view"
				class="max-h-[90vh] max-w-full object-contain"
				loading="eager"
			/>
		</div>
	</div>
{/if}

<!-- Conditionally render the ImageUploadModal -->
{#if isDev}
	<ImageUploadModal
		bind:show={showImageUploadModal}
		onUploadSuccess={handleModalUploadSuccess}
		onCancel={handleModalCancel}
	/>
{/if}
