import type { LayoutServerLoad } from './$types.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export const load: LayoutServerLoad = async () => {
  // Load available photos once at the layout level
  let availablePhotos: string[] = [];
  
  try {
    // Read files from the static directory
    const staticPhotosDir = path.join(process.cwd(), 'static', 'photography_assets');
    
    let files: string[] = [];
    try {
      files = await fs.readdir(staticPhotosDir);
    } catch (err) {
      console.warn('Could not read photography assets directory:', err);
      files = [];
    }

    // Filter for image files and create URLs
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    availablePhotos = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(filename => `/photography_assets/${filename}`)
      .sort((a, b) => {
        const numA = parseInt(a.match(/\/(\d+)\.\w+$/)?.[1] || "0");
        const numB = parseInt(b.match(/\/(\d+)\.\w+$/)?.[1] || "0");
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      });
  } catch (err) {
    console.error("Error loading photos in layout:", err);
    // If error occurs, availablePhotos will remain empty array
  }

  return {
    availablePhotos
  };
}; 