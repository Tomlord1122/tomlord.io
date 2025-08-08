<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import { wsManager, ConnectionState } from '$lib/stores/websocket.svelte';
	import { config, fetchWithTimeout } from '$lib/config.js';
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
	let wsState = $state('disconnected');

	// Initialize WebSocket manager only once
	$effect(() => {
		wsManager.init();
	});

	// Handle authentication state changes
	$effect(() => {
		wsManager.onAuthChange(authState.isAuthenticated);
	});

	// Monitor WebSocket connection status with improved tracking
	$effect(() => {
		const updateConnectionStatus = () => {
			const connected = wsManager.isConnected;
			const state = wsManager.state;

			if (wsConnected !== connected || wsState !== state) {
				wsConnected = connected;
				wsState = state;
			}
		};

		// Check immediately
		updateConnectionStatus();

		// Check periodically but less frequently to reduce overhead
		const interval = setInterval(updateConnectionStatus, 2000);

		return () => clearInterval(interval);
	});

	// Reactive sorted comments
	let sortedComments = $derived(() => {
		const sorted = [...comments];
		if (sortBy === 'time') {
			return sorted.sort(
				(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			);
		} else if (sortBy === 'likes') {
			return sorted.sort((a, b) => b.thumb_count - a.thumb_count);
		}
		return sorted;
	});

	// Set up WebSocket subscription for this post/blog with improved cleanup
	$effect(() => {
		const room = postSlug; // Always use postSlug as the room name for consistency

		// Subscribe to this room
		wsManager.subscribeToRooms([room]);

		// Set up event listeners for real-time updates
		const handleNewComment = (payload: unknown) => {
			// Add new comment to the list if it's a valid comment
			if (payload && typeof payload === 'object' && 'id' in payload) {
				comments = [payload as Comment, ...comments];
			}
		};

		const handleThumbUpdate = (payload: unknown) => {
			// Only update if this change came from a different user and payload is valid
			// (to avoid duplicate updates from our own actions)
			if (
				payload &&
				typeof payload === 'object' &&
				'user_id' in payload &&
				'message_id' in payload &&
				'thumb_count' in payload
			) {
				const thumbPayload = payload as {
					user_id: string;
					message_id: string;
					thumb_count: number;
				};
				if (authState.user?.id !== thumbPayload.user_id) {
					comments = comments.map((comment) => {
						if (comment.id === thumbPayload.message_id) {
							return {
								...comment,
								thumb_count: thumbPayload.thumb_count
								// Keep our own user_thumbed status unchanged
							};
						}
						return comment;
					});
				}
			}
		};

		// Add handler for comment deletion
		const handleCommentDelete = (payload: unknown) => {
			// Remove the deleted comment from the list if payload is valid
			if (payload && typeof payload === 'object' && 'message_id' in payload) {
				const deletePayload = payload as { message_id: string };
				comments = comments.filter((comment) => comment.id !== deletePayload.message_id);
			}
		};

		// Add event listeners
		wsManager.addEventListener('new_comment', handleNewComment);
		wsManager.addEventListener('thumb_update', handleThumbUpdate);
		wsManager.addEventListener('comment_delete', handleCommentDelete);

		// Cleanup function with better error handling
		return () => {
			try {
				wsManager.removeEventListener('new_comment', handleNewComment);
				wsManager.removeEventListener('thumb_update', handleThumbUpdate);
				wsManager.removeEventListener('comment_delete', handleCommentDelete);
				wsManager.unsubscribeFromRooms([room]);
			} catch (error) {
				console.error('Error during WebSocket cleanup:', error);
			}
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

		const maxRetries = 3;
		const retryDelay = 1000; // 1 秒

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const token = localStorage.getItem('auth_token');
				const url = blogId
					? `${config.API.BLOGS}/${postSlug}/messages`
					: `${config.API.MESSAGES}/post/${postSlug}`;

				const headers: HeadersInit = {};
				if (token) {
					headers['Authorization'] = `Bearer ${token}`;
				}

				// 增加超時時間到 8 秒，給冷啟動足夠時間
				const response = await fetchWithTimeout(
					url,
					{ headers },
					5000 // 5 秒超時
				);

				if (response.ok) {
					const data = await response.json();
					comments = data.messages || [];
					break; // 成功就跳出重試循環
				} else {
					console.warn(`Attempt ${attempt}/${maxRetries} failed:`, response.status);

					// 如果不是最後一次嘗試，等待後重試
					if (attempt < maxRetries) {
						await new Promise((resolve) => setTimeout(resolve, retryDelay));
					} else {
						// 最後一次嘗試失敗，設為空陣列
						comments = [];
					}
				}
			} catch (err) {
				console.warn(`Attempt ${attempt}/${maxRetries} error:`, err);

				// 如果不是最後一次嘗試，等待後重試
				if (attempt < maxRetries) {
					await new Promise((resolve) => setTimeout(resolve, retryDelay));
				} else {
					// 最後一次嘗試失敗，設為空陣列
					comments = [];
				}
			}
		}

		isLoading = false;
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
		const currentComment = comments.find((c) => c.id === commentId);
		if (!currentComment) return;

		// Optimistically update the UI immediately
		const wasThumbedByUser = currentComment.user_thumbed;
		const newThumbCount = wasThumbedByUser
			? currentComment.thumb_count - 1
			: currentComment.thumb_count + 1;

		// Update local state immediately for instant feedback
		comments = comments.map((comment) => {
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

			// Use fetchWithTimeout for like toggle as well
			const response = await fetchWithTimeout(
				`${config.API.MESSAGES}/${commentId}/thumb`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`
					}
				},
				3000 // 3 second timeout for like toggle
			);

			if (response.ok) {
				const data = await response.json();
				console.log('Like toggled successfully:', data);

				// Update with the actual server response to ensure consistency
				comments = comments.map((comment) => {
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
				comments = comments.map((comment) => {
					if (comment.id === commentId) {
						return {
							...comment,
							thumb_count: currentComment.thumb_count,
							user_thumbed: currentComment.user_thumbed
						};
					}
					return comment;
				});
				console.warn('Failed to toggle like');
			}
		} catch (error) {
			console.warn('Error toggling like:', error);

			// Revert the optimistic update
			comments = comments.map((comment) => {
				if (comment.id === commentId) {
					return {
						...comment,
						thumb_count: currentComment.thumb_count,
						user_thumbed: currentComment.user_thumbed
					};
				}
				return comment;
			});
		}
	}

	async function handleDeleteMessage(commentId: string) {
		if (!authState.isAuthenticated) {
			// Save current location and trigger login
			if (typeof window !== 'undefined') {
				sessionStorage.setItem('auth_return_to', window.location.pathname);
			}
			authStore.login();
			return;
		}

		// Find the current comment to get its current state
		const currentComment = comments.find((c) => c.id === commentId);
		if (!currentComment) return;

		// Optimistically update the UI immediately
		comments = comments.filter((c) => c.id !== commentId);

		try {
			const token = localStorage.getItem('auth_token');
			const response = await fetch(`${config.API.MESSAGES}/${commentId}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (response.ok) {
				console.log('Message deleted successfully');
			} else {
				// If the request failed, revert the optimistic update
				comments = [currentComment, ...comments];
				console.error('Failed to delete message');
			}
		} catch (err) {
			// If there was an error, revert the optimistic update
			comments = [currentComment, ...comments];
			console.error('Error deleting message:', err);
		}
	}

	function handleSortChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		sortBy = target.value as 'time' | 'likes';
	}

	// Helper function to get connection status display
	function getConnectionStatusDisplay() {
		switch (wsState) {
			case ConnectionState.CONNECTED:
				return 'Live updates active';
			case ConnectionState.CONNECTING:
				return 'Connecting...';
			case ConnectionState.RECONNECTING:
				return 'Reconnecting...';
			case ConnectionState.FAILED:
				return 'Connection failed';
			default:
				return 'Live updates disconnected';
		}
	}

	// Helper function to get status color
	function getStatusColor() {
		switch (wsState) {
			case ConnectionState.CONNECTED:
				return 'bg-green-500';
			case ConnectionState.CONNECTING:
			case ConnectionState.RECONNECTING:
				return 'bg-yellow-500';
			case ConnectionState.FAILED:
				return 'bg-red-500';
			default:
				return 'bg-gray-500';
		}
	}
</script>

<div class="not-prose mt-6 font-serif">
	<div class="mb-4 flex items-center justify-between">
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
					class="rounded-md border border-gray-300 bg-white py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
				>
					<option value="time">Newest</option>
					<option value="likes">Likes</option>
				</select>
			</div>
		{/if}
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div
				class="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
			></div>
			<span class="ml-2 text-sm text-gray-600">Loading comments...</span>
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center rounded-lg border border-gray-300 p-4">
			<p class="text-sm">{error}</p>
			<button
				onclick={loadComments}
				class="mt-2 cursor-pointer text-sm text-gray-500 underline hover:text-gray-700"
			>
				Try again
			</button>
		</div>
	{:else if comments.length === 0}
		<div class="py-8 text-center">
			<div class="mb-2 text-gray-400">
				<svg class="mx-auto h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
					/>
				</svg>
			</div>
			<p class="text-sm text-gray-500">No comments yet. Be the first to share your thoughts!</p>
		</div>
	{:else}
		<!-- Chat-like comment container -->
		<div class="max-h-96 overflow-y-auto rounded-lg border border-gray-300">
			<div class="divide-y divide-gray-100">
				{#each sortedComments() as comment (comment.id)}
					<CommentItem
						{comment}
						onLikeToggle={() => handleLikeToggle(comment.id)}
						onDeleteMessage={() => handleDeleteMessage(comment.id)}
						currentUser={authState.user}
					/>
				{/each}
			</div>
		</div>

		<!-- WebSocket connection status indicator -->
		{#if authState.isAuthenticated}
			<div class="mt-2 flex items-center space-x-2 text-xs text-gray-500">
				<div class="h-2 w-2 rounded-full {getStatusColor()}"></div>
				<span>{getConnectionStatusDisplay()}</span>
			</div>
		{/if}
	{/if}

	<!-- Comment Form should be imported and used here with the callback -->
</div>
