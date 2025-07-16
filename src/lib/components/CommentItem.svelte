<script lang="ts">
	import type { Comment } from '$lib/types/comment.js';

	interface Props {
		comment: Comment;
		onLikeToggle: () => void;
		currentUserId?: string;
	}

	let { comment, onLikeToggle, currentUserId }: Props = $props();

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

	// Check if current user is the comment author
	let isOwnComment = $derived(currentUserId === comment.user_id);
</script>

<div class="bg-white rounded-lg border border-gray-200 p-4 shadow-sm font-serif">
	<div class="flex items-start space-x-3">
		<!-- User Avatar -->
		<div class="flex-shrink-0">
			{#if comment.user_picture}
				<img 
					src={comment.user_picture} 
					alt={comment.user_name}
					class="w-10 h-10 rounded-full"
				>
			{:else}
				<div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
					<span class="text-gray-600 font-medium text-sm">
						{comment.user_name.charAt(0).toUpperCase()}
					</span>
				</div>
			{/if}
		</div>

		<!-- Comment Content -->
		<div class="flex-1 min-w-0">
			<!-- Header -->
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-2">
					<h4 class="text-sm font-medium text-gray-900">
						{comment.user_name}
					</h4>
					{#if isOwnComment}
						<span class="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
							You
						</span>
					{/if}
				</div>
				<time class="text-xs text-gray-500" datetime={comment.created_at}>
					{formatRelativeTime(comment.created_at)}
				</time>
			</div>

			<!-- Comment Text -->
			<div class="mt-2">
				<p class="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
					{comment.message}
				</p>
			</div>

			<!-- Actions -->
			<div class="mt-3 flex items-center space-x-4">
				<button
					onclick={onLikeToggle}
					class="flex items-center space-x-1 text-sm transition-colors {comment.user_thumbed 
						? 'text-blue-600 hover:text-blue-700' 
						: 'text-gray-500 hover:text-blue-600'}"
				>
					<svg 
						class="w-4 h-4 {comment.user_thumbed ? 'fill-current' : ''}" 
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
					<span>{comment.thumb_count}</span>
					<span class="sr-only">
						{comment.user_thumbed ? 'Unlike' : 'Like'} this comment
					</span>
				</button>

				<!-- Optional: Reply button for future feature -->
				<!-- 
				<button class="text-sm text-gray-500 hover:text-gray-700">
					Reply
				</button>
				-->
			</div>
		</div>
	</div>
</div> 