<script lang="ts">
    import { marked } from 'marked';
    import { calculateDuration, copyImageMarkdown } from '$lib/util/helper.js';
    // Props for the modal
    import type { EditPostModalType } from '../types/post.js';
    let { 
        show = $bindable(false), 
        postData = {},
        allCurrentTags = $bindable([]),
        availableImages = [],
        onSaved = () => {}, // Callback for successful save
        onCancel = () => {}  // Callback for cancellation
    } : EditPostModalType = $props();

    // State for the post data being edited
    let title = $state('');
    let slug = $state('');
    let content = $state('');
    let postTags = $state<string[]>([]);
    let newTagInput = $state('');
    let showPreview = $state(false);
    let lang = $state('en');
    let markdownPreview = $state(''); // Changed from $derived to $state

    // Initialize form data when modal opens
    $effect(() => {
        if (show && postData) {
            title = postData.title || '';
            slug = postData.slug || '';
            content = postData.content || '';
            postTags = [...(postData.tags || [])];
            lang = postData.lang || 'en';
            showPreview = false; // Ensure preview is off initially
            markdownPreview = ''; // Clear previous preview
            newTagInput = '';
        }
    });



    // Async function to update markdown preview
    async function updatePreview() {
        if (showPreview) {
            markdownPreview = await marked(content || '');
        }
    }

    // Function to close the modal
    function closeModal() {
        show = false;
    }

    // Function to handle post update
    async function handleUpdatePost() {
        // Log the postData to see what's being used
        console.log('Attempting to update post. Current postData:', postData);
        console.log('Original slug to be sent:', postData?.slug);
        console.log('New slug to be sent:', slug);

        // Ensure originalSlug is present and valid
        if (!postData || typeof postData.slug !== 'string' || !postData.slug.trim()) {
            alert('Developer Alert: Original slug is missing or invalid in postData. See console for details.');
            console.error('EditPostModal Error: originalSlug is missing or invalid. postData.slug:', postData?.slug);
            return;
        }

        if (!title.trim()) {
            alert('Please enter a title for your post.');
            return;
        }
        if (!content.trim()) {
            alert('Please add some content to your post.');
            return;
        }
        if (!slug.trim()) { // This 'slug' is the new slug from the input
            alert('Please enter a URL slug for your post.');
            return;
        }
        
        // Use the custom slug, but still sanitize it
        const finalSlug = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        
        // Calculate duration on demand
        const durationValue = calculateDuration(content, lang);

        // Create the markdown content with frontmatter
        const frontmatter = `---
    title: '${title}'
    date: '${postData.date || new Date().toISOString().split('T')[0]}'
    slug: '${finalSlug}'
    lang: '${lang}'
    duration: '${durationValue}min'
    tags: [${postTags.map(tag => `'${tag}'`).join(', ')}]
---

${content}`;

        // Log the actual payload being sent
        const payload = {
            originalSlug: postData.slug, // This is the crucial one
            newSlug: finalSlug,
            content: frontmatter
        };
        console.log('Payload being sent to /api/edit-post:', payload);

        try {
            const response = await fetch('/api/edit-post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload) // Use the logged payload
            });

            if (response.ok) {
                alert('Post updated successfully!');
                onSaved(); // Call the onSaved callback
                closeModal();
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Unknown server error or non-JSON response' }));
                console.error('Server error response:', response.status, errorData);
                alert(`Failed to update post: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Error updating post (network or client-side issue):', error);
            alert('An error occurred while updating the post.');
        }
    }

    // Function to toggle a tag for the post
    function togglePostTag(tag: string) {
        const index = postTags.indexOf(tag);
        if (index > -1) {
            postTags = postTags.filter(t => t !== tag);
        } else {
            postTags = [...postTags, tag];
        }
    }

    // Function to add a new tag from the input field
    function addNewTag() {
        const newTag = newTagInput.trim();
        if (newTag) {
            // Add to the post's specific tags if it's not already there
            if (!postTags.includes(newTag)) {
                postTags = [...postTags, newTag];
            }

            // Add to global tags if not already there
            if (!allCurrentTags.includes(newTag)) {
                allCurrentTags = [...allCurrentTags, newTag].sort();
            }
        }
        newTagInput = '';
    }

    // Function to toggle between preview and editor
    function togglePreview() {
        showPreview = !showPreview;
        // If switching to preview, update it immediately
        if (showPreview) {
            updatePreview();
        }
    }

    // Function to reset form to original values
    function resetForm() {
        if (confirm('Are you sure you want to reset all changes?')) {
            title = postData.title || '';
            slug = postData.slug || '';
            content = postData.content || '';
            postTags = [...(postData.tags || [])];
            lang = postData.lang || 'en';
            newTagInput = '';
        }
    }
</script>

{#if show}
    <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-auto">
        <div class="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-4xl max-h-[90vh] flex flex-col">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-gray-800">Edit Post</h2>
                <button 
                    onclick={() => {
                        onCancel();
                        show = false;
                    }} 
                    class="text-gray-500 hover:text-gray-700 text-2xl"
                >
                    &times;
                </button>
            </div>

            <div class="flex-grow overflow-y-auto pr-2">
                <form onsubmit={() => { /* handleUpdatePost is called by button */ }} class="space-y-4">
                    <section class="flex justify-between">
                        <div class="gap-3 w-1/2 mr-2">
                            <label for="edit-post-title-input" class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input 
                                type="text" 
                                id="edit-post-title-input"
                                bind:value={title} 
                                class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                                required
                            />
                        </div>
                        
                        <div class="w-1/2">
                            <label for="edit-post-slug-input" class="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                            <div class="flex items-center">
                                <span class="text-gray-500 p-2 bg-gray-100 rounded-l-md border border-r-0 border-gray-300">/blog/</span>
                                <input 
                                    type="text" 
                                    id="edit-post-slug-input"
                                    bind:value={slug} 
                                    placeholder="your-post-url"
                                    class="flex-grow p-2 border border-gray-300 rounded-r-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                                    required
                                />
                            </div>
                        </div>
                    </section>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label for="edit-post-lang" class="block text-sm font-medium text-gray-700 mb-1">Language</label>
                            <select 
                                id="edit-post-lang"
                                bind:value={lang}
                                class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="en">English</option>
                                <option value="zh-tw">Traditional Chinese</option>
                            </select>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <div>
                            <p class="block text-sm font-medium text-gray-700 mb-1">Tags</p>
                            <div class="flex flex-wrap gap-2 mb-1">
                                {#each allCurrentTags as tag}
                                    {@const isSelected = postTags.includes(tag)}
                                    <button 
                                        type="button"
                                        onclick={() => togglePostTag(tag)}
                                        class={`px-3 py-1 text-xs rounded-full border 
                                                ${isSelected 
                                                    ? 'bg-gray-500 text-white border-gray-600' 
                                                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                                } transition-colors duration-150`}
                                    >
                                        {tag}
                                    </button>
                                {/each}
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <input 
                                type="text" 
                                bind:value={newTagInput} 
                                placeholder="Add new tag"
                                class="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                onkeypress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewTag(); }}}
                            />
                            <button 
                                type="button" 
                                onclick={addNewTag}
                                class="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Add Tag
                            </button>
                        </div>
                        {#if postTags.length > 0}
                            <div class="mt-1">
                                <p class="text-xs text-gray-600">Selected tags for this post:</p>
                                <div class="flex flex-wrap gap-1 mt-1">
                                    {#each postTags as tag}
                                        <span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{tag}</span>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                    
                    <!-- Section to display available images -->
                    {#if availableImages && availableImages.length > 0}
                        <div class="mt-4 pt-4 border-t border-gray-200">
                            <h4 class="text-md font-medium text-gray-700 mb-2">Available Images</h4>
                            <div class="max-h-96 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2 border rounded-md bg-gray-50">
                                {#each availableImages as imagePath}
                                    <div class="text-xs p-1.5 border border-gray-200 rounded bg-white shadow-sm hover:shadow-md transition-shadow">
                                        <img src={imagePath} alt="Preview {imagePath.split('/').pop()}" class="w-full h-24 object-cover rounded mb-1.5"/>
                                        <p class="truncate text-gray-600" title={imagePath}>{imagePath.split('/').pop()}</p>
                                        <button 
                                            type="button"
                                            onclick={() => copyImageMarkdown(imagePath)}
                                            class="mt-1 w-full text-center px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-[10px] leading-tight"
                                        >
                                            Copy MD
                                        </button>
                                    </div>
                                {/each}
                            </div>
                            <p class="text-xs text-gray-500 mt-1">Click "Copy MD" to get the Markdown for an image.</p>
                        </div>
                    {/if}

                    <div class="mt-3">
                        <div class="flex justify-between items-center mb-1">
                            <label for="edit-post-content" class="block text-sm font-medium text-gray-700">
                                {showPreview ? 'Live Preview' : 'Content (Markdown)'}
                            </label>
                            <div class="flex gap-2">
                                <button 
                                    type="button"
                                    onclick={resetForm}
                                    class="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                                >
                                    Reset
                                </button>
                                <button 
                                    type="button"
                                    onclick={togglePreview}
                                    class="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50"
                                >
                                    {showPreview ? 'Edit Content' : 'Show Preview'}
                                </button>
                            </div>
                        </div>
                        
                        {#if showPreview}
                            <div 
                                class="prose prose-sm sm:prose-base max-w-none p-3 border border-gray-300 rounded-md bg-gray-50 overflow-y-auto"
                                style="min-height: calc(20em + 40px);"
                            >
                                {@html markdownPreview}
                            </div>
                        {:else}
                            <textarea 
                                id="edit-post-content"
                                bind:value={content} 
                                rows="15"
                                class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                placeholder="Edit your blog post content here using Markdown..."
                            ></textarea>
                        {/if}
                    </div>

                    <div class="z-20 sticky bottom-0 bg-white flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6 pb-2">
                        <button 
                            type="button" 
                            onclick={() => {
                                onCancel();
                                show = false;
                            }}
                            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 border border-gray-300"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onclick={handleUpdatePost}
                            class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300"
                        >
                            Update Post
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
{/if} 