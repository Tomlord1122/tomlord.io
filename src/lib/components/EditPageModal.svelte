<script lang="ts">
    import { marked } from 'marked';
    import { tick } from 'svelte';
    // Props for the modal
    import type { EditPageModalType } from '../types/page.js';
    let { 
        show = $bindable(false), 
        pageTitle = '',
        initialContent = '',
        pageName = '', // 'home' or 'project' - used for API endpoint
        onSaved = () => {}, // Callback for successful save
        onCancel = () => {}  // Callback for cancellation
    } : EditPageModalType = $props();

    // State for the content being edited
    let content = $state('');
    let showPreview = $state(false);

    // Initialize content when modal opens
    $effect(() => {
        if (show) {
            content = initialContent;
            showPreview = false;
            // Focus the content area after DOM update
            tick().then(() => {
                const contentEl = document.getElementById('page-content-textarea');
                contentEl?.focus();
            });
        }
    });

    // Reactive derived value for the HTML preview of the Markdown content
    let markdownPreview = $derived(marked(content || ''));

    // Function to close the modal
    function closeModal() {
        show = false;
    }

    // Function to handle saving the page content
    async function handleSavePage() {
        if (!content.trim()) {
            alert('Please add some content to save.');
            return;
        }

        try {
            const response = await fetch(`/api/edit-page`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pageName: pageName,
                    content: content.trim()
                })
            });

            if (response.ok) {
                alert('Page content saved successfully!');
                onSaved(); // Call the onSaved callback
                closeModal();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Server error:', errorData);
                alert(`Failed to save page: ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error saving page:', error);
            alert('An error occurred while saving the page.');
        }
    }

    // Function to toggle between preview and editor
    function togglePreview() {
        showPreview = !showPreview;
    }

    // Function to reset content to initial state
    function resetContent() {
        if (confirm('Are you sure you want to reset all changes?')) {
            content = initialContent;
        }
    }
</script>

{#if show}
    <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-auto">
        <div class="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-4xl max-h-[90vh] flex flex-col">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-gray-800">Edit {pageTitle}</h2>
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
                <div class="space-y-4">
                    <div class="mt-3">
                        <div class="flex justify-between items-center mb-1">
                            <label for="page-content-textarea" class="block text-sm font-medium text-gray-700">
                                {showPreview ? 'Live Preview' : 'Content (Markdown)'}
                            </label>
                            <div class="flex gap-2">
                                <button 
                                    type="button"
                                    onclick={resetContent}
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
                                style="min-height: calc(25em + 40px);"
                            >
                                {@html markdownPreview}
                            </div>
                        {:else}
                            <textarea 
                                id="page-content-textarea"
                                bind:value={content} 
                                rows="20"
                                class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                placeholder="Edit your page content here using Markdown..."
                            ></textarea>
                        {/if}
                    </div>

                    <div class="sticky bottom-0 bg-white flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6 pb-2">
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
                            onclick={handleSavePage}
                            class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if} 