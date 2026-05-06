<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { ImageUploadModalType } from '../types/image.js';

	let {
		show = $bindable(),
		defaultTarget = 'photography',
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		onUploadSuccess = (_filePaths: string[]) => {},
		onCancel = () => {}
	}: ImageUploadModalType = $props();

	// Use raw state for arrays to prevent deep reactivity
	let selectedFiles = $state.raw<File[]>([]);
	let previewUrls = $state.raw<string[]>([]);
	let isLoading = $state(false);
	let statusMessage = $state<string | null>(null);
	let statusIsError = $state(false);
	let overallProgressMessage = $state<string | null>(null);
	/** Writable: tracks `defaultTarget` but can be overridden by the target toggle UI. */
	let selectedTarget = $derived(defaultTarget);
	let isDragging = $state(false);

	function setFiles(files: File[]) {
		const oldUrls = [...previewUrls];
		oldUrls.forEach((url) => URL.revokeObjectURL(url));

		const imageFiles = files.filter((f) => f.type.startsWith('image/'));
		selectedFiles = imageFiles;
		previewUrls = imageFiles.map((file) => URL.createObjectURL(file));

		statusMessage = null;
		statusIsError = false;
		overallProgressMessage = null;
	}

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			setFiles(Array.from(input.files));
		} else {
			const oldUrls = [...previewUrls];
			oldUrls.forEach((url) => URL.revokeObjectURL(url));
			selectedFiles = [];
			previewUrls = [];
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
			isDragging = false;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			setFiles(Array.from(files));
		}
	}

	async function uploadImages() {
		if (selectedFiles.length === 0) {
			statusMessage = 'Please select one or more images first.';
			statusIsError = true;
			return;
		}

		isLoading = true;
		statusMessage = null;
		statusIsError = false;
		overallProgressMessage = `Preparing to upload ${selectedFiles.length} image(s)...`;

		const successfulUploadPaths: string[] = [];
		let errorOccurred = false;
		let currentErrorMessages = '';

		const filesToUpload = [...selectedFiles];

		for (let i = 0; i < filesToUpload.length; i++) {
			const file = filesToUpload[i];
			overallProgressMessage = `Uploading image ${i + 1} of ${filesToUpload.length} ('${file.name}')...`;

			const formData = new FormData();
			formData.append('imageFile', file);
			formData.append('targetDir', selectedTarget);

			try {
				const response = await fetch('/api/upload-image', {
					method: 'POST',
					body: formData
				});

				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.message || `Error uploading ${file.name}: ${response.status}`);
				}

				if (result.filePath) {
					successfulUploadPaths.push(result.filePath);
				}
			} catch (err: unknown) {
				console.error(`Upload error for ${file.name}:`, err);
				const message = err instanceof Error ? err.message : 'Unknown error';
				currentErrorMessages +=
					(currentErrorMessages ? '\n' : '') + `Error with ${file.name}: ${message}`;
				errorOccurred = true;
			}
		}

		if (currentErrorMessages) {
			statusMessage = currentErrorMessages;
			statusIsError = true;
		}

		isLoading = false;

		if (successfulUploadPaths.length > 0) {
			onUploadSuccess(successfulUploadPaths);
		}

		if (errorOccurred) {
			overallProgressMessage = `Finished. Some images failed to upload. Check messages below.`;
		} else if (successfulUploadPaths.length === filesToUpload.length) {
			overallProgressMessage = `${successfulUploadPaths.length} image(s) uploaded successfully!`;
			statusMessage = null;
		} else if (
			successfulUploadPaths.length > 0 &&
			successfulUploadPaths.length < filesToUpload.length
		) {
			overallProgressMessage = `Finished. ${successfulUploadPaths.length} of ${filesToUpload.length} images uploaded. Some failed.`;
		} else if (successfulUploadPaths.length === 0 && filesToUpload.length > 0) {
			overallProgressMessage = `No images were uploaded successfully.`;
		}
		resetState();
	}

	function closeModal() {
		onCancel();
		show = false;
	}

	function resetState() {
		const urlsToRevoke = [...previewUrls];
		urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));

		selectedFiles = [];
		previewUrls = [];
		isLoading = false;
	}
</script>

{#if show}
	<button
		class="fixed inset-0 z-40 bg-black/30"
		in:fly={{ y: 0, duration: 200 }}
		onclick={closeModal}
		aria-label="Close modal"
	></button>

	<div
		class="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 transform rounded-lg bg-white p-6 shadow-xl"
		in:fly={{ y: 20, duration: 300, delay: 50 }}
	>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-gray-800">Upload New Image(s)</h2>
			<button
				onclick={closeModal}
				class="text-3xl leading-none text-gray-500 hover:text-gray-700"
				aria-label="Close modal">&times;</button
			>
		</div>

		<!-- Target toggle -->
		<div class="mb-4">
			<p class="mb-2 text-sm font-medium text-gray-700">Upload to:</p>
			<div class="flex overflow-hidden rounded-lg border border-gray-300">
				<button
					type="button"
					onclick={() => (selectedTarget = 'photography')}
					disabled={isLoading}
					class="flex-1 px-4 py-2 text-sm font-medium transition-colors duration-150
						{selectedTarget === 'photography'
						? 'bg-gray-800 text-white'
						: 'bg-white text-gray-700 hover:bg-gray-50'}"
				>
					Photography
				</button>
				<button
					type="button"
					onclick={() => (selectedTarget = 'content')}
					disabled={isLoading}
					class="flex-1 border-l border-gray-300 px-4 py-2 text-sm font-medium transition-colors duration-150
						{selectedTarget === 'content'
						? 'bg-gray-800 text-white'
						: 'bg-white text-gray-700 hover:bg-gray-50'}"
				>
					Content
				</button>
			</div>
			<p class="mt-1 text-xs text-gray-500">
				{selectedTarget === 'photography'
					? 'Images will appear in the Photography gallery.'
					: 'Images will be available for use in pages and blog posts.'}
			</p>
		</div>

		<div class="my-4">
			<!-- Drop zone -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
				class="mb-3 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 transition-colors
					{isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-10 w-10 {isDragging ? 'text-blue-400' : 'text-gray-400'}"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
					/>
				</svg>
				<p class="text-sm text-gray-600">
					{isDragging ? 'Drop images here' : 'Drag & drop images here, or'}
				</p>
				{#if !isDragging}
					<label
						class="cursor-pointer rounded-md bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm ring-1 ring-gray-300 transition-colors hover:bg-gray-50
							{isLoading ? 'pointer-events-none opacity-50' : ''}"
					>
						Browse files
						<input
							type="file"
							accept="image/*"
							multiple
							onchange={handleFileChange}
							disabled={isLoading}
							class="sr-only"
						/>
					</label>
				{/if}
				{#if selectedFiles.length > 0}
					<p class="text-xs text-gray-500">{selectedFiles.length} file(s) selected</p>
				{/if}
			</div>

			{#if previewUrls.length > 0}
				<p class="mb-1 text-sm text-gray-600">Preview ({previewUrls.length} selected):</p>
				<div
					class="mb-3 grid max-h-60 grid-cols-2 gap-2 overflow-y-auto rounded border p-2 sm:grid-cols-3 md:grid-cols-4"
					in:fly={{ y: 20, duration: 300 }}
				>
					{#each previewUrls as url, i (i)}
						<div class="group relative aspect-square overflow-hidden">
							<img
								src={url}
								alt={`Preview ${selectedFiles[i]?.name || i + 1}`}
								class="h-full w-full rounded border border-gray-200 object-cover"
							/>
							<div
								class="absolute right-0 bottom-0 left-0 truncate bg-black/50 p-1 text-xs text-white"
							>
								{selectedFiles[i]?.name || 'Image ' + (i + 1)}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<button
				onclick={uploadImages}
				disabled={isLoading || selectedFiles.length === 0}
				class="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-150 hover:bg-blue-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400"
			>
				{#if isLoading}
					<span>{overallProgressMessage || 'Uploading...'}</span>
					<svg
						class="-mr-1 ml-3 inline h-5 w-5 animate-spin text-white"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				{:else}
					Upload {selectedFiles.length > 0 ? selectedFiles.length : ''} Image(s) to {selectedTarget ===
					'photography'
						? 'Photography'
						: 'Content'}
				{/if}
			</button>

			{#if overallProgressMessage && !isLoading}
				<p class="mt-3 text-center text-sm {statusIsError ? 'text-orange-600' : 'text-green-600'}">
					{overallProgressMessage}
				</p>
			{/if}
			{#if statusMessage && (isLoading || statusIsError)}
				<p
					class="mt-3 text-center text-sm whitespace-pre-line {statusIsError
						? 'text-red-600'
						: 'text-gray-600'}"
					in:fly={{ y: 10, duration: 200 }}
				>
					{statusMessage}
				</p>
			{/if}
		</div>
	</div>
{/if}
