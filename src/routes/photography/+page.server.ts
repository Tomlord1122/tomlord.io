import type { PageServerLoad } from "./$types.ts";

// Define the structure for a photo object
interface Photo {
  src: string;
  alt: string;
}

export const load: PageServerLoad = async () => {
  try {
    const imageModules = import.meta.glob(
      "/static/photo/**/*.{png,jpg,jpeg,gif,webp}",
      {
        eager: true,
      },
    );

    const projectRelativePaths = Object.keys(imageModules);

    const photos: Photo[] = projectRelativePaths
      .map((relativePath) => {
        const publicSrc = relativePath.startsWith("/static/")
          ? relativePath.substring("/static".length)
          : relativePath;

        const filename = publicSrc.substring(publicSrc.lastIndexOf("/") + 1);
        return {
          src: publicSrc,
          alt: `Photo ${filename}`,
        };
      })
      .sort((a, b) => {
        const numA = parseInt(a.src.match(/\/(\d+)\.\w+$/)?.[1] || "0");
        const numB = parseInt(b.src.match(/\/(\d+)\.\w+$/)?.[1] || "0");
        if (numA !== numB) return numA - numB;
        return a.src.localeCompare(b.src);
      });

    return {
      photos,
      error: null,
    };
  } catch (processingErr) {
    console.error(
      "Error processing photo file list with import.meta.glob (keys method):",
      processingErr,
    );
    return {
      photos: [] as Photo[],
      error: "There was an issue organizing the photo data.",
    };
  }
};
