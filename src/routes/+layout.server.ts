import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async () => {
  // Load available photos using import.meta.glob for production compatibility
  let availablePhotos: string[] = [];
  
  try {
    // 使用 eager: true 確保生產環境相容性
    // 這只會載入 URL 路徑，不是實際的圖片檔案
    const photoModules = import.meta.glob('/static/photography_assets/*', {
      eager: true,
      query: '?url',
      import: 'default'
    });

    // Extract the URLs and filter for image files
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    availablePhotos = Object.keys(photoModules)
      .filter(path => {
        const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(path => {
        // Convert from /static/photography_assets/filename.ext to /photography_assets/filename.ext
        return path.replace('/static', '');
      })
      .sort((a, b) => {
        // Sort numerically by filename number
        const numA = parseInt(a.match(/\/(\d+)\.\w+$/)?.[1] || "0");
        const numB = parseInt(b.match(/\/(\d+)\.\w+$/)?.[1] || "0");
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      });

    console.log(`Loaded ${availablePhotos.length} photography assets:`, availablePhotos);
  } catch (err) {
    console.error("Error loading photos in layout:", err);
    // If error occurs, availablePhotos will remain empty array
  }

  return {
    availablePhotos
  };
}; 