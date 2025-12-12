<script lang="ts">
	import { fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { marked } from 'marked';
	import EditPostModal from '$lib/components/EditPostModal.svelte';
	import CommentForm from '$lib/components/CommentForm.svelte';
	import CommentList from '$lib/components/CommentList.svelte';
	import ReadingProgressBar from '$lib/components/ReadingProgressBar.svelte';
	import type { PostData } from '$lib/types/post.js';
	import { auth } from '$lib/stores/auth.svelte.js';
	import { isSuperUser } from '$lib/util/auth.js';

	let { data } = $props();

	const { title, date, tags, content, duration, slug } = data.post;

	// Convert markdown content to HTML
	let contentHtml = $state('');

	$effect(() => {
		if (content) {
			const result = marked(content);
			Promise.resolve(result).then((html) => {
				contentHtml = html;
			});
		}
	});

	// Check if user can edit (super user only)
	let canEdit = $derived(isSuperUser(auth.user));
	let showEditModal = $state(false);
	let postData = $state<PostData>({} as PostData);
	let allTags = $state<string[]>([]);
	let commentRefreshTrigger = $state(0);

	// Initialize tags from the current post
	$effect(() => {
		if (browser) {
			allTags = [...(tags || [])];
		}
	});

	// Load post data for editing
	async function loadPostForEditing() {
		try {
			const { fetchBlogBySlug } = await import('$lib/api/blogs.js');
			const blog = await fetchBlogBySlug(slug);
			postData = {
				id: blog.id,
				title: blog.title,
				slug: blog.slug,
				content: blog.content || '',
				tags: blog.tags || [],
				date: blog.date,
				lang: blog.lang || 'en',
				duration: blog.duration || '5min',
				description: blog.description || '',
				is_published: blog.is_published
			};
			showEditModal = true;
		} catch (error) {
			console.error('Error loading post for editing:', error);
			alert('An error occurred while loading the post for editing.');
		}
	}

	// Callback for successful save
	function handlePostSaved() {
		console.log('Post saved successfully.');
		window.location.reload();
	}

	// Callback for modal cancellation
	function handleEditCancel() {
		console.log('Edit cancelled.');
	}

	function handleCommentAdded() {
		commentRefreshTrigger++;
	}

	// Function to open the edit modal
	function openEditModal() {
		loadPostForEditing();
	}
</script>

<svelte:head>
	<meta name="twitter:title" content={title} />
	<meta
		name="twitter:description"
		content={data.post.description || `Read ${title} on Tomlord's Blog`}
	/>
	<meta name="twitter:image" content="https://tomlord.fyi/app_icon.png" />
	<meta name="twitter:image:alt" content="Blog post: {title}" />

	<!-- Open Graph tags for better social sharing -->
	<meta property="og:title" content={title} />
	<meta
		property="og:description"
		content={data.post.description || `Read ${title} on Tomlord's Blog`}
	/>
	<meta property="og:image" content="https://tomlord.fyi/app_icon.png" />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://tomlord.fyi/blog/{slug}" />
	<meta property="article:published_time" content={date} />
	<meta property="article:author" content="Tomlord" />
</svelte:head>

<!-- Reading Progress Bar -->
<ReadingProgressBar />

<article class="prose prose-sm sm:prose-base mx-auto lg:max-w-screen-md">
	<header class="page-title mb-8">
		<div class="prose prose-sm sm:prose-base">
			<h1>
				{#if canEdit}
					<button
						onclick={openEditModal}
						aria-label="Edit Post"
						class="text-left transition-colors hover:text-gray-600"
					>
						{title}
					</button>
				{:else}
					{title}
				{/if}
			</h1>
		</div>

		<p class="text-sm text-gray-500">
			Posted on {new Date(date).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})}
		</p>
		<p class="text-sm text-gray-500">
			Reading time: {duration}
		</p>
		{#if tags && tags.length > 0}
			<div class="mt-4 flex flex-wrap gap-2">
				{#each tags as tag (tag)}
					<span class="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700"
						>{tag}</span
					>
				{/each}
			</div>
		{/if}
	</header>
	<div
		in:fly={{ y: 50, duration: 600, delay: 200 }}
		class="prose prose-sm sm:prose-base img-center max-w-none font-serif"
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html contentHtml}
	</div>

	<!-- Comments Section -->
	<div in:fly={{ y: 50, duration: 600, delay: 400 }} class="mt-12">
		<CommentList postSlug={slug} refreshTrigger={commentRefreshTrigger} />
		<CommentForm postSlug={slug} onCommentAdded={handleCommentAdded} />
	</div>

	<div in:fly={{ y: 50, duration: 600, delay: 500 }} class="mt-12 border-t border-gray-200 pt-8">
		<a href="/blog" class="text-sky-600 hover:text-sky-800">&larr; Go back to blog list</a>
	</div>
</article>

{#if canEdit}
	<EditPostModal
		bind:show={showEditModal}
		{postData}
		bind:allCurrentTags={allTags}
		availableImages={data.availablePhotos || []}
		onSaved={handlePostSaved}
		onCancel={handleEditCancel}
	/>
{/if}
