import type { PageServerLoad } from "./$types.js";
import projectContent from "../../content/project.md?raw";

function getDefaultProjectContent() {
  return `- **[go-recipe](https://github.com/Tomlord1122/go-recipe)**: A TUI app that can store commands you frequently use.`;
}

export const load: PageServerLoad = async () => {
  try {
    return {
      pageContent: projectContent || getDefaultProjectContent(),
    };
  } catch (error) {
    console.error("Error loading project page content:", error);
    return {
      pageContent: getDefaultProjectContent(),
    };
  }
};
