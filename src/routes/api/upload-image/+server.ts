import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.ts";
import fs from "node:fs/promises";
import path from "node:path";
import { dev } from "$app/environment";

const uploadDir = path.join(process.cwd(), "static", "photo");

// Ensure the upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(uploadDir);
  } catch (e) {
    // If it doesn't exist, create it
    await fs.mkdir(uploadDir, { recursive: true });
  }
}

export const POST: RequestHandler = async ({ request }) => {
  // This endpoint should only be active in development and for localhost.
  // Note: 'dev' checks if it's a development build.
  // For a runtime hostname check, you might need more context or to pass it.
  // However, since this is an API endpoint, direct hostname check from request isn't straightforward
  // without trusting headers that can be spoofed. The primary guard is 'dev' environment.
  if (!dev) {
    throw error(403, "File upload is only allowed in development mode.");
  }

  try {
    await ensureUploadDir(); // Make sure the 'static/photo' directory exists

    const formData = await request.formData();
    const imageFile = formData.get("imageFile") as File | null;

    if (!imageFile) {
      throw error(400, "No image file provided.");
    }

    if (!imageFile.type.startsWith("image/")) {
      throw error(400, "Invalid file type. Only images are allowed.");
    }

    // Determine the next available number for the filename
    const existingFiles = await fs.readdir(uploadDir);
    let maxNumber = 0;
    existingFiles.forEach((file) => {
      // Regex to match filenames like '1.jpg', '12.png', etc.
      const match = file.match(/^(\d+)\.(jpg|jpeg|png|gif|webp)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    const newNumber = maxNumber + 1;
    const originalExtension = path.extname(imageFile.name); // Get .jpeg, .png etc.

    // Ensure originalExtension includes the dot, or add it if missing and not empty
    let finalExtension = originalExtension;
    if (finalExtension && !finalExtension.startsWith(".")) {
      finalExtension = `.${finalExtension}`;
    } else if (!finalExtension) {
      // Fallback if extension cannot be determined, though browser usually provides it.
      // Consider a default like '.jpg' or throwing an error.
      // For now, let's try to infer from MIME type if possible, or default.
      const mimeTypeParts = imageFile.type.split("/");
      if (mimeTypeParts.length === 2 && mimeTypeParts[0] === "image") {
        finalExtension = `.${mimeTypeParts[1]}`;
      } else {
        finalExtension = ".jpg"; // Default extension if all else fails
        console.warn(
          `Could not determine extension for ${imageFile.name}, defaulting to .jpg`,
        );
      }
    }

    const newFileName = `${newNumber}${finalExtension}`;
    const filePath = path.join(uploadDir, newFileName);

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(filePath, buffer);

    console.log(`File uploaded successfully: /photo/${newFileName}`);
    return json(
      {
        message: "File uploaded successfully!",
        filePath: `/photo/${newFileName}`, // Path relative to static for client-side use
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("File upload error:", err);
    // Check if it's a SvelteKit error object
    if (err.status && err.body) {
      // Forward SvelteKit error
      throw error(err.status, err.body.message || "File upload failed.");
    }
    // Otherwise, throw a generic internal server error
    throw error(
      500,
      err.message || "File upload failed due to an internal server error.",
    );
  }
};
