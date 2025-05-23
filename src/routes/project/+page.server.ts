import type { PageServerLoad } from "./$types.js";
import fs from "node:fs/promises";
import path from "node:path";

const contentDir = path.join(process.cwd(), "src", "lib", "page_content");

async function ensureContentDir() {
  try {
    await fs.access(contentDir);
  } catch (e) {
    await fs.mkdir(contentDir, { recursive: true });
  }
}

function getDefaultProjectContent() {
  return `- **[go-recipe](https://github.com/Tomlord1122/go-recipe)**: A TUI app that can store commands you frequently use.`;
}

export const load: PageServerLoad = async () => {
  try {
    await ensureContentDir();
    
    const filePath = path.join(contentDir, "project.md");
    
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return {
        pageContent: content
      };
    } catch (readError: any) {
      if (readError.code === 'ENOENT') {
        // File doesn't exist, return default content
        return {
          pageContent: getDefaultProjectContent()
        };
      }
      throw readError;
    }
  } catch (error) {
    console.error("Error loading project page content:", error);
    return {
      pageContent: getDefaultProjectContent()
    };
  }
}; 