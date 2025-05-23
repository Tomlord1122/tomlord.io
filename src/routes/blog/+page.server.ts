import type { PageServerLoad } from "./$types.js";
import type { PostMetadata } from "$lib/types/types.ts";

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

  return {
    posts,
  };
};
