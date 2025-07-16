<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import CommentItem from './CommentItem.svelte';
	import type { Comment } from '$lib/types/comment.js';

	interface Props {
		postSlug: string;
		blogId?: string;
		refreshTrigger?: number;
	}

	let { postSlug, blogId, refreshTrigger = 0 }: Props = $props();

	let comments = $state<Comment[]>([]);
	let isLoading = $state(false);
	let error = $state('');
	let sortBy = $state<'time' | 'likes'>('time');

	// Reactive access to auth state
	let authState = $derived(authStore.state);

	// Reactive sorted comments
	let sortedComments = $derived(() => {
		const sorted = [...comments];
		if (sortBy === 'time') {
			return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
		} else {
			return sorted.sort((a, b) => b.thumb_count - a.thumb_count);
		}
	});

	// Load comments when component mounts or refresh trigger changes
	$effect(() => {
		loadComments();
	});

	$effect(() => {
		if (refreshTrigger > 0) {
			loadComments();
		}
	});

	async function loadComments() {
		isLoading = true;
		error = '';

		try {
			const token = localStorage.getItem('auth_token');
			const url = blogId 
				? `http://localhost:8080/api/blogs/${postSlug}/messages`
				: `http://localhost:8080/api/messages/post/${postSlug}`;

			const headers: HeadersInit = {};
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			const response = await fetch(url, { headers });

			if (response.ok) {
				const data = await response.json();
				comments = data.messages || [];
			} else {
				error = 'Failed to load comments';
			}
		} catch (err) {
			console.error('Error loading comments:', err);
			error = 'Failed to load comments';
		} finally {
			isLoading = false;
		}
	}

	async function handleLikeToggle(commentId: string) {
		if (!authState.isAuthenticated) {
			// Save current location and trigger login
			if (typeof window !== 'undefined') {
				sessionStorage.setItem('auth_return_to', window.location.pathname);
			}
			authStore.login();
			return;
		}

		try {
			const token = localStorage.getItem('auth_token');
			const response = await fetch(`http://localhost:8080/api/messages/${commentId}/thumb`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (response.ok) {
				const data = await response.json();
				
				// Update the comment in the list
				comments = comments.map(comment => {
					if (comment.id === commentId) {
						return {
							...comment,
							thumb_count: data.thumb_count,
							user_thumbed: data.thumbed
						};
					}
					return comment;
				});
			}
		} catch (err) {
			console.error('Error toggling like:', err);
		}
	}

	function handleSortChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		sortBy = target.value as 'time' | 'likes';
	}
</script>

<div class="mt-8 font-serif">
	<div class="flex justify-between items-center mb-6">
		<h3 class="text-lg font-semibold text-gray-800">
			Comments ({comments.length})
		</h3>
		
		{#if comments.length > 1}
			<div class="flex items-center space-x-2">
				<label for="sort" class="text-sm text-gray-600">Sort by:</label>
				<select
					id="sort"
					value={sortBy}
					onchange={handleSortChange}
					class="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-gray-500 focus:border-blue-500"
				>
					<option value="time">Newest First</option>
					<option value="likes">Most Liked</option>
				</select>
			</div>
		{/if}
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div class="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
			<span class="ml-2 text-gray-600">Loading comments...</span>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-red-600">{error}</p>
			<button
				onclick={loadComments}
				class="mt-2 text-sm text-red-700 hover:text-red-800 underline"
			>
				Try again
			</button>
		</div>
	{:else if comments.length === 0}
		<div class="text-center py-8">
			<div class="text-gray-400 mb-2">
				<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
				</svg>
			</div>
			<p class="text-gray-500">No comments yet. Be the first to share your thoughts!</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each sortedComments() as comment (comment.id)}
										<CommentItem 
							{comment} 
							onLikeToggle={() => handleLikeToggle(comment.id)}
							currentUserId={authState.user?.id}
						/>
			{/each}
		</div>
	{/if}
</div> 