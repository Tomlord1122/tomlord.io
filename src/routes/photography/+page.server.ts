import type { PageServerLoad } from "./$types.ts";
import fs from "node:fs/promises";
import path from "node:path";

// Define the structure for a photo object
interface Photo {
  src: string;
  alt: string;
}

// On Vercel, process.cwd() is /var/task.
// We are trying to list files that would have been in the project's 'static/photo' directory.
const photoDir = path.join(process.cwd(), "static", "photo");

export const load: PageServerLoad = async () => {
  let filesInPhotoDir: string[];

  try {
    // Attempt to read the contents of the 'static/photo' directory.
    // If this directory was part of your deployment (i.e., you have photos in static/photo in your repo),
    // and if it's accessible via this path in the serverless environment, this will succeed.
    filesInPhotoDir = await fs.readdir(photoDir);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      // 'ENOENT' means the directory /var/task/static/photo was not found.
      // This is an expected case if there are no photos deployed or the path isn't resolvable.
      // It's not a fatal error for the page; it just means no photos to list.
      console.log(`The photo directory ${photoDir} was not found. Returning an empty list of photos.`);
      return {
        photos: [] as Photo[],
        error: null, // No error message to the user, just no photos.
      };
    }
    // For any other type of error (e.g., permissions, if the path was somehow valid but unreadable),
    // log it and return a user-friendly error.
    console.error(`Error reading photo directory ${photoDir}:`, err);
    return {
      photos: [] as Photo[],
      error: "Could not load photos at this time due to a server issue.",
    };
  }

  // If fs.readdir was successful, proceed to filter and map the files.
  try {
    const imageFiles = filesInPhotoDir.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext);
    });

    const photos: Photo[] = imageFiles
      .map((file) => ({
        src: `/photo/${file}`, // Path relative to static directory for client-side use
        alt: `Photo ${file}`, // Basic alt text, can be improved
      }))
      .sort((a, b) => {
        // Attempt to sort numerically if filenames are like '1.jpg', '10.png'
        const numA = parseInt(a.src.match(/\/(\d+)\.\w+$/)?.[1] || '0');
        const numB = parseInt(b.src.match(/\/(\d+)\.\w+$/)?.[1] || '0');
        if (numA !== numB) return numA - numB;
        // Fallback to string sort if not clearly numerical or numbers are equal
        return a.src.localeCompare(b.src);
      });


    return {
      photos,
      error: null,
    };
  } catch (processingErr) {
    // This catch block is for errors during the .filter, .map, or .sort operations.
    console.error('Error processing photo file list:', processingErr);
    return {
      photos: [] as Photo[],
      error: 'There was an issue organizing the photo data.',
    };
  }
};
