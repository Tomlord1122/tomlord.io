import type { PageServerLoad } from "./$types.ts";
import fs from "node:fs/promises";
import path from "node:path";

// Define the structure for a photo object
interface Photo {
  src: string;
  alt: string;
}

const photoDir = path.join(process.cwd(), "static", "photo");

export const load: PageServerLoad = async () => {
  try {
    // Ensure the photo directory exists to prevent errors if it's not there yet
    try {
      await fs.access(photoDir);
    } catch (e) {
      // If it doesn't exist, create it and return an empty array for photos
      await fs.mkdir(photoDir, { recursive: true });
      return {
        photos: [] as Photo[],
        error: null,
      };
    }

    const files = await fs.readdir(photoDir);

    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext);
    });

    const photos: Photo[] = imageFiles
      .map((file) => ({
        src: `/photo/${file}`, // Path relative to static directory
        alt: `Photo ${file}`, // Basic alt text, can be improved
      }))
      .sort((a, b) => b.src.localeCompare(a.src)); // Sort by name, newest first if names are timestamps or similar

    return {
      photos,
      error: null,
    };
  } catch (err) {
    console.error("Error loading photos:", err);
    return {
      photos: [] as Photo[],
      error: "Could not load photos.",
    };
  }
};
