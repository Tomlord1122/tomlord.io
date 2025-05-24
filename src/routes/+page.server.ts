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

function getDefaultHomeContent() {
  return ``;
}

export const load: PageServerLoad = async () => {
  try {
    await ensureContentDir();
    
    const filePath = path.join(contentDir, "home.md");
    
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return {
        pageContent: content
      };
    } catch (readError: any) {
      if (readError.code === 'ENOENT') {
        // File doesn't exist, return default content
        return {
          pageContent: ""
        };
      }
      throw readError;
    }
  } catch (error) {
    console.error("Error loading home page content:", error);
    return {
      pageContent: ""
    };
  }
}; 