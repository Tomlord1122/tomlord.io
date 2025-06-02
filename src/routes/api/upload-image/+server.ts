import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.ts";
import fs from "node:fs/promises";
import path from "node:path";
import { dev } from "$app/environment";
import sharp from "sharp"; // Import sharp

const uploadDir = path.join(process.cwd(), "static", "photography_assets");

async function ensureUploadDir() {
  try {
    await fs.access(uploadDir);
  } catch (e) {
    await fs.mkdir(uploadDir, { recursive: true });
  }
}

export const POST: RequestHandler = async ({ request }) => {
  if (!dev) {
    throw error(403, "File upload is only allowed in development mode.");
  }

  try {
    await ensureUploadDir();

    const formData = await request.formData();
    const imageFile = formData.get("imageFile") as File | null;

    if (!imageFile) {
      throw error(400, "No image file provided.");
    }

    if (!imageFile.type.startsWith("image/")) {
      throw error(400, "Invalid file type. Only images are allowed.");
    }

    const existingFiles = await fs.readdir(uploadDir);
    let maxNumber = 0;
    existingFiles.forEach((file) => {
      const match = file.match(/^(\d+)\.(jpg|jpeg|png|gif|webp)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    const newNumber = maxNumber + 1;
    // We will save as WebP, so the extension will be .webp
    const newFileName = `${newNumber}.webp`;
    const filePath = path.join(uploadDir, newFileName);

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert to WebP using sharp and then save
    const webpBuffer = await sharp(buffer)
      .rotate()
      .webp({ quality: 80 }) // Adjust quality as needed (0-100)
      .toBuffer();

    await fs.writeFile(filePath, webpBuffer); // Save the WebP buffer

    console.log(
      `File uploaded, auto-rotated, and converted to WebP successfully: ${filePath}`,
    );
    return json(
      {
        message: "File uploaded and converted to WebP successfully!",
        fileName: newFileName, // Send back the new .webp filename
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("File upload error:", err);
    if (err.status && err.body) {
      throw error(err.status, err.body.message || "File upload failed.");
    }
    throw error(
      500,
      err.message || "File upload failed due to an internal server error.",
    );
  }
};
