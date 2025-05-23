<script lang="ts">
  import { browser } from '$app/environment';
  
  let { 
    src, 
    alt, 
    class: className = "",
    loading = "lazy",
    sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    onclick = () => {}
  } = $props<{
    src: string;
    alt: string;
    class?: string;
    loading?: "lazy" | "eager";
    sizes?: string;
    onclick?: () => void;
  }>();

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
  class="aspect-square overflow-hidden rounded-lg shadow-md z-10 cursor-pointer relative {className}"
  {onclick}
>
  <!-- Loading skeleton -->
  {#if !isLoaded}
    <div class="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
      <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  {/if}
  
  <img 
    bind:this={imgElement}
    src={shouldLoad ? src : ''}
    {alt}
    {sizes}
    class="photo-grid {isLoaded ? 'opacity-100' : 'opacity-0'} hover:scale-105 transition-all duration-300"
    onload={handleLoad}
    style="min-height: 200px;" 
  />
</button> 