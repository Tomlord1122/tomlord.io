<script lang="ts">
	import type { Comment } from '$lib/types/comment.js';

	interface Props {
		comment: Comment;
		onLikeToggle: () => void;
		onDeleteMessage: () => void;
		currentUserId?: string;
	}

	let { comment, onLikeToggle, onDeleteMessage, currentUserId }: Props = $props();

	let showDeleteConfirm = $state(false);

	// Format relative time
	function formatRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

		if (diffInMinutes < 1) return 'just now';
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

		const diffInHours = Math.floor(diffInMinutes / 60);
		if (diffInHours < 24) return `${diffInHours}h ago`;

		const diffInDays = Math.floor(diffInHours / 24);
		if (diffInDays < 7) return `${diffInDays}d ago`;

		// For older comments, show the actual date
		return date.toLocaleDateString();
	}

	// Handle image error and fallback
	function handleImageError(event: Event) {
		const img = event.target as HTMLImageElement;
		console.log('Image failed to load:', img.src);
		console.log('Comment user_picture:', comment.user_picture);
		img.style.display = 'none';
		// Show fallback avatar
		if (img.nextElementSibling) {
			(img.nextElementSibling as HTMLElement).style.display = 'flex';
		}
	}

	// Debug logging for picture URL
	$effect(() => {
		if (comment.user_picture) {
			console.log(`User ${comment.user_name} picture URL:`, comment.user_picture);
		}
	});
</script>

<!-- 
	Vertically-stacked comment layout:
	- Header (avatar, name, time, like button) is on a single row.
	- Message content is placed directly below the header.
	- This creates a clear separation between user info and the message body.
	- No background/border since parent container handles styling
-->
<div class="flex flex-col gap-2 px-4 py-4 transition-colors duration-150 hover:bg-gray-200">
	<!-- Header: avatar, name, time, and like button -->
	<div class="flex items-center justify-between">
		<!-- Left side: Avatar, Name, Time -->
		<div class="flex items-center gap-3">
			<img
				src={comment.user_picture}
				alt={comment.user_name}
				class="h-8 w-8 rounded-full object-cover"
				onerror={handleImageError}
			/>
			<div class="flex items-baseline gap-2 text-sm">
				<span class="max-w-[120px] truncate font-medium text-gray-900">{comment.user_name}</span>
				<span class="text-gray-500">{formatRelativeTime(comment.created_at)}</span>
			</div>
		</div>

		<!-- Right side: Like Button -->
		<nav class="flex items-center gap-2">
			<button
				onclick={onLikeToggle}
				class="flex items-center gap-1.5 text-sm transition-colors duration-150
				{comment.user_thumbed ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}"
				aria-label="Like"
			>
				<svg
					class="h-4 w-4"
					fill={comment.user_thumbed ? 'currentColor' : 'none'}
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
					/>
				</svg>
				<span class={comment.user_thumbed ? 'font-medium' : ''}>
					{comment.thumb_count}
				</span>
			</button>
			{#if currentUserId === comment.user_id}
				<!-- Delete confirmation popup -->
				{#if showDeleteConfirm}
					<div class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
						<div class="mx-4 max-w-sm rounded-lg bg-white p-6 shadow-lg">
							<h3 class="mb-2 text-lg font-medium text-gray-900">Delete Comment</h3>
							<p class="mb-4 text-sm text-gray-600">
								Are you sure you want to delete this comment? This action cannot be undone.
							</p>
							<div class="flex justify-end gap-3">
								<button
									onclick={() => (showDeleteConfirm = false)}
									class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									onclick={onDeleteMessage}
									class="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
								>
									Delete
								</button>
							</div>
						</div>
					</div>
				{/if}

				<button
					onclick={() => (showDeleteConfirm = true)}
					class="cursor-pointer rounded-md border border-gray-300 p-1 text-sm text-gray-500 hover:text-gray-700"
				>
					Delete
				</button>
			{/if}
		</nav>
	</div>

	<!-- Message content -->
	<p class="text-base leading-relaxed break-words whitespace-pre-wrap text-gray-800">
		{comment.message}
	</p>
</div>
