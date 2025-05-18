import type { PageServerLoad } from "./$types.js";
import type { PostMetadata } from "$lib/types/types.ts";
import fs from "node:fs/promises"; // Import fs promises
import path from "node:path"; // Import path
const photoDir = path.join(process.cwd(), "static", "photo");

export const load: PageServerLoad = async () => {
  const posts: PostMetadata[] = [];
  const modules = import.meta.glob("/src/markdown/posts/**/*.svx", {
    eager: true,
  });

  for (const path in modules) {
    const file = modules[path];
    if (file && typeof file === "object" && "metadata" in file) {
      const metadata = file.metadata as PostMetadata;
      if (metadata.slug && metadata.title && metadata.date) {
        posts.push({
          title: metadata.title,
          date: metadata.date,
          slug: metadata.slug,
          description: metadata.description || "",
          tags: metadata.tags || [],
          lang: metadata.lang,
        });
      }
    }
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (window.location.hostname === 'localhost'){
    // --- Load available photos ---
    let availablePhotos: string[] = [];
    try {
      // Ensure the photo directory exists
      try {
        await fs.access(photoDir);
      } catch (e) {
        // If it doesn't exist, create it
        await fs.mkdir(photoDir, { recursive: true });
      }

      const files = await fs.readdir(photoDir);
      const imageFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext);
      });
      // Create paths relative to the static directory, suitable for web use
      availablePhotos = imageFiles
        .map((file) => `/photo/${file}`)
        .sort((a, b) => {
          // Extract numbers and sort numerically, then by full name for consistency
          const numA = parseInt(a.match(/(\d+)/)?.[0] || "0");
          const numB = parseInt(b.match(/(\d+)/)?.[0] || "0");
          if (numA !== numB) return numA - numB;
          return a.localeCompare(b);
        });
    } catch (err) {
      console.error("Error loading photos for blog modal:", err);
      // If there's an error, availablePhotos will remain empty, which is fine.
    }
    // --- End loading available photos ---

    return{
      posts,
      availablePhotos

    }
  }
  
  return {
    posts,
  };
};
