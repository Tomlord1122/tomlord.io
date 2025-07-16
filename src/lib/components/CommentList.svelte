<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import { wsManager } from '$lib/stores/websocket.svelte';
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

	// Make WebSocket connection status reactive
	let wsConnected = $state(false);

	// Initialize WebSocket manager
	$effect(() => {
		wsManager.init();
	});

	// Handle authentication state changes
	$effect(() => {
		wsManager.onAuthChange(authState.isAuthenticated);
	});

	// Monitor WebSocket connection status
	$effect(() => {
		const checkConnection = () => {
			wsConnected = wsManager.isConnected;
		};
		
		// Check immediately
		checkConnection();
		
		// Check periodically
		const interval = setInterval(checkConnection, 1000);
		
		return () => clearInterval(interval);
	});

	// Reactive sorted comments
	let sortedComments = $derived(() => {
		const sorted = [...comments];
		if (sortBy === 'time') {
			return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
		} else if (sortBy === 'likes') {
			return sorted.sort((a, b) => b.thumb_count - a.thumb_count);
		}
		return sorted;
	});

	// Set up WebSocket subscription for this post/blog
	$effect(() => {
		const room = postSlug;  // Always use postSlug as the room name for consistency
		
		// Subscribe to this room
		wsManager.subscribeToRooms([room]);
		
		// Set up event listeners for real-time updates
		const handleNewComment = (payload: any) => {
			console.log('New comment received via WebSocket:', payload);
			// Add new comment to the list
			comments = [payload, ...comments];
		};

		const handleThumbUpdate = (payload: any) => {
			console.log('Thumb update received via WebSocket:', payload);
			
			// Only update if this change came from a different user
			// (to avoid duplicate updates from our own actions)
			if (authState.user?.id !== payload.user_id) {
				comments = comments.map(comment => {
					if (comment.id === payload.message_id) {
						return {
							...comment,
							thumb_count: payload.thumb_count
							// Keep our own user_thumbed status unchanged
						};
					}
					return comment;
				});
			}
		};

		// Add event listeners
		wsManager.addEventListener('new_comment', handleNewComment);
		wsManager.addEventListener('thumb_update', handleThumbUpdate);

		// Cleanup function
		return () => {
			wsManager.removeEventListener('new_comment', handleNewComment);
			wsManager.removeEventListener('thumb_update', handleThumbUpdate);
			wsManager.unsubscribeFromRooms([room]);
		};
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

			console.log('Loading comments from:', url);

			const headers: HeadersInit = {};
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			const response = await fetch(url, { headers });

			if (response.ok) {
				const data = await response.json();
				console.log('Comments loaded:', data.messages?.length || 0, 'comments');
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

		// Find the current comment to get its current state
		const currentComment = comments.find(c => c.id === commentId);
		if (!currentComment) return;

		// Optimistically update the UI immediately
		const wasThumbedByUser = currentComment.user_thumbed;
		const newThumbCount = wasThumbedByUser 
			? currentComment.thumb_count - 1 
			: currentComment.thumb_count + 1;

		// Update local state immediately for instant feedback
		comments = comments.map(comment => {
			if (comment.id === commentId) {
				return {
					...comment,
					thumb_count: newThumbCount,
					user_thumbed: !wasThumbedByUser
				};
			}
			return comment;
		});

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
				console.log('Like toggled successfully:', data);
				
				// Update with the actual server response to ensure consistency
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
			} else {
				// If the request failed, revert the optimistic update
				comments = comments.map(comment => {
					if (comment.id === commentId) {
						return {
							...comment,
							thumb_count: currentComment.thumb_count,
							user_thumbed: currentComment.user_thumbed
						};
					}
					return comment;
				});
				console.error('Failed to toggle like');
			}
		} catch (err) {
			// If there was an error, revert the optimistic update
			comments = comments.map((comment: Comment) => {
				if (comment.id === commentId) {
					return {
						...comment,
						thumb_count: currentComment.thumb_count,
						user_thumbed: currentComment.user_thumbed
					};
				}
				return comment;
			});
			console.error('Error toggling like:', err);
		}
	}

	function handleSortChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		sortBy = target.value as 'time' | 'likes';
	}

	// Add this function to handle comment addition manually when WebSocket fails
	function handleCommentAdded() {
		console.log('Comment added callback triggered, reloading comments...');
		loadComments();
	}
</script>

<div class="mt-6 font-serif">
	<div class="flex justify-between items-center mb-4">
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
					class="text-sm border border-gray-300 rounded-md py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
				>
					<option value="time">Newest</option>
					<option value="likes">Likes</option>
				</select>
			</div>
		{/if}
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div class="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
			<span class="ml-2 text-gray-600 text-sm">Loading comments...</span>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-red-600 text-sm">{error}</p>
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
				<svg class="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
				</svg>
			</div>
			<p class="text-gray-500 text-sm">No comments yet. Be the first to share your thoughts!</p>
		</div>
	{:else}
		<!-- Chat-like comment container -->
		<div class="bg-white rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
			<div class="divide-y divide-gray-100">
				{#each sortedComments() as comment (comment.id)}
					<CommentItem 
						{comment} 
						onLikeToggle={() => handleLikeToggle(comment.id)}
						currentUserId={authState.user?.id}
					/>
				{/each}
			</div>
		</div>
		
		<!-- WebSocket connection status indicator -->
		{#if authState.isAuthenticated}
			<div class="mt-2 text-xs text-gray-500 flex items-center space-x-2">
				<div class="w-2 h-2 rounded-full {wsConnected ? 'bg-green-500' : 'bg-red-500'}"></div>
				<span>{wsConnected ? 'Live updates active' : 'Live updates connecting...'}</span>
			</div>
		{/if}
	{/if}
	
	<!-- Comment Form should be imported and used here with the callback -->
</div> 