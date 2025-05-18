import type { PageServerLoad } from "./$types.js";
import type { PostMetadata } from "$lib/types/types.ts";
import fs from "node:fs/promises"; // Import fs promises
import path from "node:path"; // Import path

export const load: PageServerLoad = async () => {
  const posts: PostMetadata[] = [];
  const postModules = import.meta.glob("/src/markdown/posts/**/*.svx", {
    eager: true,
  });

  for (const postPath in postModules) {
    const file = postModules[postPath];
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

  // --- Load available photos ---
  let availablePhotos: string[] = [];
  try {
    const imageModules = import.meta.glob('/static/photo/**/*.{png,jpg,jpeg,gif,webp}', {
      eager: true,
      // 不再使用 import: 'default'
    });

    availablePhotos = Object.keys(imageModules)
      .map(relativePath => {
        // 將 '/static/photo/image.jpg' 轉換為 '/photo/image.jpg'
        return relativePath.startsWith('/static/')
          ? relativePath.substring('/static'.length)
          : relativePath;
      })
      .sort((a, b) => {
        // 排序邏輯保持不變
        const numA = parseInt(a.match(/\/(\d+)\.\w+$/)?.[1] || '0');
        const numB = parseInt(b.match(/\/(\d+)\.\w+$/)?.[1] || '0');
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      });

  } catch (err) {
    console.error("Error loading photos for blog modal (keys method):", err);
    // 如果發生錯誤，availablePhotos 將保持為空陣列
  }
  // --- End loading available photos ---

  return {
    posts,
    availablePhotos,
  };
};
