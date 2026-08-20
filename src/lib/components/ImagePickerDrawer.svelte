<script lang="ts">
	import LazyImage from './LazyImage.svelte';
	import S3Modal from './S3Modal.svelte';
	import { copyImageMarkdown } from '$lib/util/helper.js';
	import { listDrawings, deleteFromStorage, type StorageFile } from '$lib/supabase.js';
	import { showToast } from '$lib/stores/toast.svelte.js';
	import { SvelteSet } from 'svelte/reactivity';
	import { fade, fly } from 'svelte/transition';

	let {
		open = $bindable(false),
		availablePhotos = [],
		availableAssets = [],
		enableS3 = false
	}: {
		open: boolean;
		availablePhotos?: string[];
		availableAssets?: string[];
		enableS3?: boolean;
	} = $props();

	type Collection = 'content' | 'photography' | 's3';

	let collection = $state<Collection>('content');
	let showS3Modal = $state(false);
	let s3Images = $state<StorageFile[]>([]);
	let s3Loading = $state(false);
	let s3Deleting = new SvelteSet<string>();

	let activeImages = $derived(collection === 'photography' ? availablePhotos : availableAssets);

	async function loadS3Images() {
		s3Loading = true;
		const { files, error } = await listDrawings();
		if (error) {
			console.error('Failed to load S3 images:', error.message);
		} else {
			s3Images = files;
		}
		s3Loading = false;
	}

	async function deleteS3Image(name: string) {
		if (!confirm(`Delete "${name}" from S3 storage? This cannot be undone.`)) return;
		s3Deleting.add(name);
		try {
			const { error } = await deleteFromStorage(`drawings/${name}`);
			if (error) {
				alert(`Delete failed: ${error.message}`);
			} else {
				s3Images = s3Images.filter((img) => img.name !== name);
			}
		} finally {
			s3Deleting.delete(name);
		}
	}

	function selectCollection(next: Collection) {
		collection = next;
		if (next === 's3' && s3Images.length === 0) {
			loadS3Images();
		}
	}

	async function handleS3Upload(imageMarkdown: string) {
		try {
			await navigator.clipboard.writeText(imageMarkdown);
			showToast('Copied to clipboard!', 'success', 1000);
		} catch {
			showToast('Failed to copy. Please try again.', 'error', 2000);
		}
		if (collection === 's3') {
			loadS3Images();
		}
	}
</script>

{#if open}
	<button
		type="button"
		class="absolute inset-0 z-10 bg-black/20"
		aria-label="Close image drawer"
		onclick={() => (open = false)}
		transition:fade={{ duration: 150 }}
	></button>
	<aside
		class="absolute inset-y-0 right-0 z-20 flex w-80 flex-col border-l border-gray-200 bg-[#EDEDED] shadow-xl"
		transition:fly={{ x: 320, duration: 220, opacity: 1 }}
	>
		<div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
			<h3 class="text-sm font-medium text-gray-800">Images</h3>
			<button
				type="button"
				onclick={() => (open = false)}
				class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
				aria-label="Close images"
			>
				&times;
			</button>
		</div>

		<div
			class="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 py-2"
		>
			<div class="flex overflow-hidden rounded-md border border-gray-300">
				<button
					type="button"
					onclick={() => selectCollection('content')}
					class="px-2.5 py-1 text-xs font-medium transition-colors
						{collection === 'content' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}"
				>
					Content
				</button>
				<button
					type="button"
					onclick={() => selectCollection('photography')}
					class="border-l border-gray-300 px-2.5 py-1 text-xs font-medium transition-colors
						{collection === 'photography'
						? 'bg-gray-800 text-white'
						: 'bg-white text-gray-600 hover:bg-gray-50'}"
				>
					Photo
				</button>
				{#if enableS3}
					<button
						type="button"
						onclick={() => selectCollection('s3')}
						class="border-l border-gray-300 px-2.5 py-1 text-xs font-medium transition-colors
							{collection === 's3' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}"
					>
						S3
					</button>
				{/if}
			</div>
			{#if enableS3 && collection === 's3'}
				<button
					type="button"
					onclick={() => (showS3Modal = true)}
					class="rounded-md border border-purple-300 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50"
				>
					+ Upload
				</button>
			{/if}
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto p-3">
			{#if collection === 's3'}
				{#if s3Loading}
					<p class="rounded-md bg-gray-50 p-3 text-xs text-gray-500">Loading S3 images...</p>
				{:else if s3Images.length > 0}
					<div class="grid grid-cols-2 gap-2">
						{#each s3Images as image (image.name)}
							<div
								class="group relative aspect-square rounded border border-gray-200 bg-white p-1 transition-shadow hover:shadow-md"
							>
								<button
									type="button"
									onclick={() => copyImageMarkdown(image.publicUrl)}
									class="absolute inset-0 rounded"
									title="Click to copy: {image.name}"
								>
									<LazyImage
										src={image.publicUrl}
										alt="S3 {image.name}"
										class="h-full w-full rounded object-cover"
									/>
									<span
										class="absolute inset-0 flex items-center justify-center rounded bg-black/40 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
									>
										Copy
									</span>
								</button>
								<button
									type="button"
									onclick={() => deleteS3Image(image.name)}
									disabled={s3Deleting.has(image.name)}
									class="absolute top-0.5 right-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 disabled:bg-gray-400"
									title="Delete {image.name}"
									aria-label="Delete {image.name}"
								>
									{#if s3Deleting.has(image.name)}
										<svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
											></path>
										</svg>
									{:else}
										<svg
											class="h-3 w-3"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="3"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									{/if}
								</button>
							</div>
						{/each}
					</div>
				{:else}
					<p class="rounded-md bg-gray-50 p-3 text-xs text-gray-500">
						No S3 images yet. Click "+ Upload" to add one.
					</p>
				{/if}
			{:else if activeImages.length > 0}
				<div class="grid grid-cols-2 gap-2">
					{#each activeImages as imagePath (imagePath)}
						<button
							type="button"
							onclick={() => copyImageMarkdown(imagePath)}
							class="group relative aspect-square rounded border border-gray-200 bg-white p-1 transition-shadow hover:shadow-md"
							title="Click to copy: {imagePath.split('/').pop()}"
						>
							<LazyImage
								src={imagePath}
								alt="Preview {imagePath.split('/').pop() ?? ''}"
								class="h-full w-full rounded object-cover"
							/>
							<span
								class="absolute inset-0 flex items-center justify-center rounded bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
							>
								Copy
							</span>
						</button>
					{/each}
				</div>
			{:else}
				<p class="rounded-md bg-gray-50 p-3 text-xs text-gray-500">
					No {collection === 'content' ? 'content' : 'photography'} images available yet.
				</p>
			{/if}
		</div>

		<p class="shrink-0 border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
			Click an image to copy its Markdown.
		</p>
	</aside>
{/if}

<S3Modal bind:show={showS3Modal} onInsert={handleS3Upload} />
