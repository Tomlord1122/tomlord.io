import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { dev } from "$app/environment";

// Define the content storage directory
const contentDir = path.join(process.cwd(), "src", "content");

async function ensureContentDir() {
  try {
    await fs.access(contentDir);
  } catch (e) {
    await fs.mkdir(contentDir, { recursive: true });
  }
}

export const POST: RequestHandler = async ({ request }) => {
  if (!dev) {
    throw error(403, "Page editing is only allowed in development mode.");
  }

  try {
    await ensureContentDir();

    const { pageName, content } = await request.json();

    if (!pageName || !content) {
      throw error(400, "Page name and content are required.");
    }

    // Validate page name to prevent directory traversal
    if (!/^[a-zA-Z0-9_-]+$/.test(pageName)) {
      throw error(
        400,
        "Invalid page name. Only alphanumeric characters, hyphens, and underscores are allowed.",
      );
    }

    const fileName = `${pageName}.md`;
    const filePath = path.join(contentDir, fileName);

    await fs.writeFile(filePath, content, "utf-8");

    console.log(`Page content saved successfully: ${filePath}`);
    return json(
      {
        message: "Page content saved successfully!",
        fileName: fileName,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Page save error:", err);
    if (err.status && err.body) {
      throw error(
        err.status,
        err.body.message || "Failed to save page content.",
      );
    }
    throw error(
      500,
      err.message ||
        "Failed to save page content due to an internal server error.",
    );
  }
};

export const GET: RequestHandler = async ({ url }) => {
  if (!dev) {
    throw error(
      403,
      "Page content access is only allowed in development mode.",
    );
  }

  try {
    await ensureContentDir();

    const pageName = url.searchParams.get("page");

    if (!pageName) {
      throw error(400, "Page name is required.");
    }

    // Validate page name to prevent directory traversal
    if (!/^[a-zA-Z0-9_-]+$/.test(pageName)) {
      throw error(400, "Invalid page name.");
    }

    const fileName = `${pageName}.md`;
    const filePath = path.join(contentDir, fileName);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      return json({ content });
    } catch (readError: any) {
      if (readError.code === "ENOENT") {
        // File doesn't exist, return empty content
        return json({ content: "" });
      }
      throw readError;
    }
  } catch (err: any) {
    console.error("Page load error:", err);
    if (err.status && err.body) {
      throw error(
        err.status,
        err.body.message || "Failed to load page content.",
      );
    }
    throw error(
      500,
      err.message ||
        "Failed to load page content due to an internal server error.",
    );
  }
};
