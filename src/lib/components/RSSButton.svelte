<script>
  let showTooltip = false;
  
  function copyRSSLink() {
    const rssUrl = `${window.location.origin}/rss.xml`;
    navigator.clipboard.writeText(rssUrl).then(() => {
      showTooltip = true;
      setTimeout(() => {
        showTooltip = false;
      }, 2000);
    });
  }
</script>

<div class="relative inline-block">
  <div class="flex gap-1">
    <!-- RSS Feed Button -->
    <a
      href="/rss.xml"
      target="_blank"
      class="inline-flex items-center gap-1 px-1.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium"
      title="Subscribe to RSS Feed"
    >
      <!-- RSS Icon -->
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248S0 22.546 0 20.752s1.456-3.248 3.252-3.248 3.251 1.454 3.251 3.248zM1.677 6.082v4.15c5.054 0 9.144 4.098 9.144 9.146h4.151c0-7.378-5.979-13.296-13.295-13.296zM1.677.001v4.15C9.906 4.151 16.563 10.799 16.563 19.002H20.714C20.714 8.955 11.718.001 1.677.001z"/>
      </svg>
      RSS
    </a>
    
    <!-- Copy RSS Link Button -->
    <button
      onclick={copyRSSLink}
      class="inline-flex items-center px-1.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium border border-gray-300"
      title="Copy RSS URL"
    >
      <!-- Copy Icon -->
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
    </button>
  </div>
  
  <!-- Tooltip -->
  {#if showTooltip}
    <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
      RSS URL copied to clipboard!
      <div class="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
    </div>
  {/if}
</div>

<style>
  /* Custom styles for the RSS button component */
  .inline-flex {
    display: inline-flex;
  }
</style> 