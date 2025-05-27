import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async () => {
  // Load available photos using import.meta.glob for production compatibility
  let availablePhotos: string[] = [];
  
  try {
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
        const getNumber = (path: string) => {
          const filename = path.split('/').pop();
          const numberPart = filename?.split('.')[0];
          return parseInt(numberPart || '0') || 0;
        };
        return getNumber(b) - getNumber(a);
      });

    console.log(`Loaded ${availablePhotos.length} photography assets:`, availablePhotos);
  } catch (err) {
    console.error("Error loading photos in layout:", err);
  }

  return {
    availablePhotos
  };
}; 