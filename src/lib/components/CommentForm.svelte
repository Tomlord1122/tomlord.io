<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import { config, fetchWithTimeout } from '$lib/config.js';
	import type { Comment, CreateCommentRequest } from '$lib/types/comment.js';
	import TypewriterTextarea from './TypewriterTextarea.svelte';

	interface Props {
		postSlug: string;
		blogId?: string;
		onCommentAdded?: (comment: Comment) => void;
	}

	let { postSlug, blogId, onCommentAdded }: Props = $props();

	let message = $state('');
	let isSubmitting = $state(false);
	let error = $state('');

	// Reactive access to auth state
	let authState = $derived(authStore.state);

	let isComposing = $state(false); // 添加這個狀態變數

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

			// Use fetchWithTimeout for comment submission
			const response = await fetchWithTimeout(
				`${config.API.MESSAGES}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify(commentData)
				},
				5000 // 5 second timeout for comment submission
			);

			if (response.ok) {
				const data = await response.json();
				const newComment = data.message as Comment;
				message = '';
				error = ''; // Clear any previous errors
				// Pass the new comment to the callback for immediate display
				// WebSocket will handle real-time updates for other users
				if (onCommentAdded && newComment) {
					onCommentAdded(newComment);
				}
			} else {
				const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
				error = errorData.error || 'Failed to post comment';
			}
		} catch (err) {
			console.warn('Error posting comment:', err);
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

<div class="not-prose mt-8 border-t border-gray-300 pt-6 font-serif">
	<h3 class="mb-4 text-lg font-semibold text-gray-800">Leave a Comment</h3>

	{#if !authState.isAuthenticated}
		<div class=" rounded-lg border border-gray-300 p-6 text-center">
			<p class="mb-4 text-gray-600">Sign in with Google to leave a comment</p>
			<button
				onclick={handleLogin}
				class="inline-flex cursor-pointer items-center rounded-lg bg-gray-500 px-4 py-2 text-white transition-colors hover:bg-gray-500"
			>
				<svg class="mr-2 h-5 w-5" viewBox="0 0 24 24">
					<path
						fill="currentColor"
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					/>
					<path
						fill="currentColor"
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					/>
					<path
						fill="currentColor"
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
					/>
					<path
						fill="currentColor"
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					/>
				</svg>
				Sign in with Google
			</button>
		</div>
	{:else}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
		>
			<div class="mb-4">
				<label for="comment" class="mb-2 block text-sm font-medium text-gray-700">
					Comment as {authState.user?.name}
				</label>
				<TypewriterTextarea
					id="comment"
					bind:value={message}
					placeholder="Share your thoughts..."
					rows={4}
					class="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-500 focus:ring-2 focus:ring-gray-400"
					disabled={isSubmitting}
					resize="none"
					onCompositionstart={() => {
						isComposing = true;
					}}
					onCompositionend={() => {
						isComposing = false;
					}}
					onKeydown={(e) => {
						// 只有在非輸入法狀態下才處理 Enter 鍵
						if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
							e.preventDefault();
							if (message.trim() && !isSubmitting) {
								handleSubmit();
							}
						}
					}}
				/>
			</div>

			{#if error}
				<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
					<p class="text-sm text-red-600">{error}</p>
				</div>
			{/if}

			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<button
						type="button"
						onclick={authStore.logout}
						class="cursor-pointer text-sm text-gray-500 hover:text-gray-700"
					>
						Sign out
					</button>
				</div>

				<button
					type="submit"
					disabled={isSubmitting || !message.trim()}
					class="rounded-lg bg-gray-500 px-6 py-2 text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isSubmitting}
						<span class="flex items-center">
							<div
								class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
							></div>
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
