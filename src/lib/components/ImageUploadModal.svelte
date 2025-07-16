<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { ImageUploadModalType } from '../types/image.js';
	// Props for the modal
	let {
		show = $bindable(),
		onUploadSuccess = (filePaths: string[]) => {},
		onCancel = () => {}
	}: ImageUploadModalType = $props();

	// Use raw state for arrays to prevent deep reactivity
	let selectedFiles = $state.raw<File[]>([]);
	let previewUrls = $state.raw<string[]>([]);
	let isLoading = $state(false);
	let statusMessage = $state<string | null>(null);
	let statusIsError = $state(false);
	let overallProgressMessage = $state<string | null>(null);

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			// Clean up old preview URLs first
			const oldUrls = [...previewUrls];
			oldUrls.forEach((url) => URL.revokeObjectURL(url));

			// Create new arrays instead of mutating
			const newFiles = Array.from(input.files);
			const newUrls = newFiles.map((file) => URL.createObjectURL(file));

			// Replace state (not mutate)
			selectedFiles = newFiles;
			previewUrls = newUrls;

			statusMessage = null;
			statusIsError = false;
			overallProgressMessage = null;
		} else {
			// Clean up preview URLs
			const oldUrls = [...previewUrls];
			oldUrls.forEach((url) => URL.revokeObjectURL(url));

			// Reset with new arrays
			selectedFiles = [];
			previewUrls = [];
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

		// Use local copies to prevent reactivity issues during iteration
		const filesToUpload = [...selectedFiles];

		for (let i = 0; i < filesToUpload.length; i++) {
			const file = filesToUpload[i];
			overallProgressMessage = `Uploading image ${i + 1} of ${filesToUpload.length} ('${file.name}')...`;

			const formData = new FormData();
			formData.append('imageFile', file);

			try {
				const response = await fetch('/api/upload-image', {
					method: 'POST',
					body: formData
				});

				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.message || `Error uploading ${file.name}: ${response.status}`);
				}

				if (result.fileName) {
					successfulUploadPaths.push(result.fileName);
				}
			} catch (err: any) {
				console.error(`Upload error for ${file.name}:`, err);
				currentErrorMessages +=
					(currentErrorMessages ? '\n' : '') + `Error with ${file.name}: ${err.message}`;
				errorOccurred = true;
			}
		}

		// Update status only once after the loop
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
		// Copy URLs to local array before iterating
		const urlsToRevoke = [...previewUrls];
		urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));

		// Reset all state with new values instead of mutations
		selectedFiles = [];
		previewUrls = [];
		// statusMessage = null;
		// statusIsError = false;
		isLoading = false;
		// overallProgressMessage = null;
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
			<h2 class="text-xl font-semibold text-gray-800">Upload New Photo(s)</h2>
			<button
				onclick={closeModal}
				class="text-3xl leading-none text-gray-500 hover:text-gray-700"
				aria-label="Close modal">&times;</button
			>
		</div>

		<div class="my-4">
			<div class="mb-3">
				<label for="imageUploadModalInput" class="mb-1 block text-sm font-medium text-gray-700"
					>Select Image(s):</label
				>
				<input
					type="file"
					id="imageUploadModalInput"
					accept="image/*"
					multiple
					onchange={handleFileChange}
					disabled={isLoading}
					class="block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-900 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 focus:border-blue-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
				/>
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
					Upload {selectedFiles.length > 0 ? selectedFiles.length : ''} Image(s)
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
