import type { PageServerLoad } from "./$types.ts";

// Define the structure for a photo object
interface Photo {
  src: string;
  alt: string;
  originalPath: string; // Keep original path for sorting if needed
}

export const load: PageServerLoad = async () => {
  try {
    // Import images from the new location within src/lib
    // Use `import: 'default'` to get the processed URL of the image
    const imageAssetModules = import.meta.glob(
      "/src/lib/photography_assets/**/*.{png,jpg,jpeg,gif,webp}",
      {
        eager: true,
        import: 'default', // This is key to get the URL string
      },
    );

    // The keys of imageAssetModules will be like "/src/lib/photography_assets/image.jpg"
    // The values (module_default_export) will be the Vite-processed URLs,
    // e.g., "/_app/immutable/assets/image.abcdef.webp" if imagetools converts it.
    const photos: Photo[] = Object.entries(imageAssetModules)
      .map(([path, processedUrl]) => {
        const filename = path.substring(path.lastIndexOf("/") + 1);
        return {
          src: processedUrl as string, // This will be the URL to the (potentially) WebP image
          alt: `Photo ${filename}`,
          originalPath: path, // Store original path for sorting
        };
      })
      .sort((a, b) => {
        // Updated sorting logic to use originalPath
        const numA = parseInt(a.originalPath.match(/\/(\d+)\.\w+$/)?.[1] || "0");
        const numB = parseInt(b.originalPath.match(/\/(\d+)\.\w+$/)?.[1] || "0");
        
        if (numA !== numB) return numB - numA; // Sort numerically in reverse order
        
        return b.originalPath.localeCompare(a.originalPath); // Fallback to reverse alphabetical
      });

    return {
      photos,
      error: null,
    };
  } catch (processingErr) {
    console.error(
      "Error processing photo file list with import.meta.glob:",
      processingErr,
    );
    return {
      photos: [] as Photo[],
      error: "There was an issue organizing the photo data.",
    };
  }
};
