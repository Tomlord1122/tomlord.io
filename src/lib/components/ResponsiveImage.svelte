<script lang="ts">
  import { browser } from '$app/environment';
  import type { ResponsiveImageType } from '../types/image.js';
  
  let { 
    src, 
    alt, 
    loading = "lazy",
    onclick = () => {}
  } : ResponsiveImageType = $props();

  let isLoaded = $state(false);
  let isInView = $state(false);
  let imgElement: HTMLImageElement;
  
  // 使用 Intersection Observer 來檢測圖片是否進入視窗
  $effect(() => {
    if (!browser || !imgElement) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isInView = true;
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px' // 提前 50px 開始載入
      }
    );
    
    observer.observe(imgElement);
    
    return () => {
      observer.disconnect();
    };
  });
  
  function handleLoad() {
    isLoaded = true;
  }
  
  // 只有當圖片進入視窗或是 eager 載入時才載入圖片
  let shouldLoad = $derived(loading === "eager" || isInView);
</script>

<button 
  class="aspect-square overflow-hidden rounded-lg shadow-md z-10 cursor-pointer relative"
  {onclick}
>
  <!-- Loading skeleton -->
  {#if !isLoaded}
    <div class="absolute inset-0 flex items-center justify-center bg-gray-100 ">
      <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  {/if}
  
  <img 
    bind:this={imgElement}
    src={shouldLoad ? src : ''}
    {alt}
    class="photo-grid"
    onload={handleLoad}
    style="min-height: 200px;" 
  />
</button> 