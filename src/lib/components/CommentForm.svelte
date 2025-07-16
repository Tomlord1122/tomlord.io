<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import { wsManager } from '$lib/stores/websocket.svelte';
	import type { CreateCommentRequest } from '$lib/types/comment.js';

	interface Props {
		postSlug: string;
		blogId?: string;
		onCommentAdded?: () => void;
	}

	let { postSlug, blogId, onCommentAdded }: Props = $props();

	let message = $state('');
	let isSubmitting = $state(false);
	let error = $state('');

	// Reactive access to auth state
	let authState = $derived(authStore.state);

	async function handleSubmit() {
		if (!authState.isAuthenticated || !authState.user) {
			// Save current location and trigger login
			if (typeof window !== 'undefined') {
				sessionStorage.setItem('auth_return_to', window.location.pathname);
			}
			authStore.login();
			return;
		}

		if (!message.trim()) {
			error = 'Please enter a comment';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			const token = localStorage.getItem('auth_token');
			const commentData: CreateCommentRequest = {
				user_id: authState.user.id,
				post_slug: postSlug,
				message: message.trim()
			};

			if (blogId) {
				commentData.blog_id = blogId;
			}

			const response = await fetch('http://localhost:8080/api/messages/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify(commentData)
			});

			if (response.ok) {
				const responseData = await response.json();
				message = '';
				
				// Call the callback once for immediate feedback
				// WebSocket will handle real-time updates for other users
				if (onCommentAdded) {
					onCommentAdded();
				}
			} else {
				const errorData = await response.json();
				error = errorData.error || 'Failed to post comment';
			}
		} catch (err) {
			console.error('Error posting comment:', err);
			error = 'Failed to post comment. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleLogin() {
		if (typeof window !== 'undefined') {
			sessionStorage.setItem('auth_return_to', window.location.pathname);
		}
		authStore.login();
	}
</script>

<div class="mt-8 border-t border-gray-300 pt-6 font-serif">
	<h3 class="text-lg font-semibold text-gray-800 mb-4">Leave a Comment</h3>
	
	{#if !authState.isAuthenticated}
		<div class="bg-gray-50 rounded-lg p-6 text-center">
			<p class="text-gray-600 mb-4">Sign in with Google to leave a comment</p>
			<button
				onclick={handleLogin}
				class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
			>
				<svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
					<path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
					<path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
					<path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
					<path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
				</svg>
				Sign in with Google
			</button>
		</div>
	{:else}
		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
			<div class="mb-4">
				<label for="comment" class="block text-sm font-medium text-gray-700 mb-2">
					Comment as {authState.user?.name}
				</label>
				<textarea
					id="comment"
					bind:value={message}
					placeholder="Share your thoughts..."
					rows="4"
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-500 resize-none"
					disabled={isSubmitting}
					onkeydown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							if (message.trim() && !isSubmitting) {
								handleSubmit();
							}
						}
					}}
				></textarea>
			</div>
			
			{#if error}
				<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
					<p class="text-red-600 text-sm">{error}</p>
				</div>
			{/if}
			
			<div class="flex justify-between items-center">
				<div class="flex items-center space-x-4">
					<button
						type="button"
						onclick={authStore.logout}
						class="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
					>
						Sign out
					</button>
				</div>
				
				<button
					type="submit"
					disabled={isSubmitting || !message.trim()}
					class="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{#if isSubmitting}
						<span class="flex items-center">
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
							Posting...
						</span>
					{:else if !message.trim()}
						Type ...
					{:else}
						Post Comment
					{/if}
				</button>
			</div>
		</form>
	{/if}
</div> 