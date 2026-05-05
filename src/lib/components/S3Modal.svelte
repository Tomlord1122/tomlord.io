<script lang="ts">
	import { uploadToStorage } from '$lib/supabase.js';

	let {
		show = $bindable(false),
		onInsert,
		onClose
	}: {
		show?: boolean;
		onInsert?: (markdown: string) => void;
		onClose?: () => void;
	} = $props();

	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let isUploading = $state(false);
	let isDragging = $state(false);

	function setFile(file: File | null) {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
		selectedFile = file;
		if (file) {
			previewUrl = URL.createObjectURL(file);
		}
	}

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		setFile(input.files?.[0] ?? null);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		// Only clear if leaving the drop zone entirely (not a child element)
		if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
			isDragging = false;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		const file = event.dataTransfer?.files[0] ?? null;
		if (file && file.type.startsWith('image/')) {
			setFile(file);
		}
	}

	async function handleUpload() {
		if (!selectedFile) {
			alert('Please select an image first.');
			return;
		}

		isUploading = true;

		try {
			const ext = selectedFile.name.split('.').pop() ?? 'png';
			const path = `drawings/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
			const { publicUrl, error } = await uploadToStorage(selectedFile, path);

			if (error) {
				alert(`Upload failed: ${error.message}`);
				return;
			}

			const imageMarkdown = `<div class="flex justify-center">\n<img src="${publicUrl}" alt="Storage image" class="photo-post">\n</div>`;
			onInsert?.(imageMarkdown);
			handleClose();
		} catch (err) {
			console.error('Upload error:', err);
			alert('Failed to upload image. Please try again.');
		} finally {
			isUploading = false;
		}
	}

	function handleClose() {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
		selectedFile = null;
		isDragging = false;
		show = false;
		onClose?.();
	}
</script>

{#if show}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
	>
		<div class="flex w-[500px] max-w-[95vw] flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
			<!-- Header -->
			<div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
				<h2 class="text-lg font-semibold text-gray-800">Upload Image</h2>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={handleUpload}
						disabled={isUploading || !selectedFile}
						class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isUploading ? 'Uploading...' : 'Upload & Copy'}
					</button>
					<button
						type="button"
						onclick={handleClose}
						class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
					>
						Cancel
					</button>
				</div>
			</div>

			<!-- Body -->
			<div class="flex flex-col gap-4 p-6">
				<!-- Drop zone -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					ondrop={handleDrop}
					class="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 transition-colors
						{isDragging
						? 'border-blue-400 bg-blue-50'
						: 'border-gray-300 bg-gray-50 hover:border-gray-400'}"
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
						{isDragging ? 'Drop image here' : 'Drag & drop an image here, or'}
					</p>
					{#if !isDragging}
						<label
							class="cursor-pointer rounded-md bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm ring-1 ring-gray-300 transition-colors hover:bg-gray-50"
						>
							Browse file
							<input
								type="file"
								accept="image/*"
								onchange={handleFileChange}
								class="sr-only"
							/>
						</label>
					{/if}
					{#if selectedFile}
						<p class="text-xs text-gray-500">{selectedFile.name}</p>
					{/if}
				</div>

				<!-- Preview -->
				{#if previewUrl}
					<div class="overflow-hidden rounded-md border border-gray-200 bg-gray-50">
						<img src={previewUrl} alt="Preview" class="max-h-64 w-full object-contain" />
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
