import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { requireUser, HttpError } from "@/lib/server";

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Resize configuration
const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 85;

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    const UPLOAD_DIR = path.join(
      process.env.DATA_DIR || path.join(process.cwd(), "data"),
      "uploads",
    );
    const length = Number(request.headers.get("content-length") || 0);
    if (length > MAX_FILE_SIZE + 65536)
      return NextResponse.json(
        { error: "Image trop volumineuse." },
        { status: 413 },
      );
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // 'wishlist' or 'item'

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Choisissez une image." },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format d’image non accepté." },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image trop volumineuse : 5 Mo maximum." },
        { status: 400 },
      );
    }

    // Create upload directory if it doesn't exist
    const typeDir = path.join(UPLOAD_DIR, user.id);
    if (!existsSync(typeDir)) {
      // Create directory with 0775 permissions (rwxrwxr-x)
      await mkdir(typeDir, { recursive: true, mode: 0o775 });
    }

    // Generate unique filename (always use .webp for output)
    const timestamp = Date.now();
    const filename = `${randomUUID()}.webp`;
    const filepath = path.join(typeDir, filename);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Resize and optimize image
    const processedImage = await sharp(buffer, {
      limitInputPixels: 40000000,
      animated: false,
    })
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toBuffer();

    // Save processed image with proper permissions (0664 = rw-rw-r--)
    // This respects the umask setting and ensures proper group access
    await writeFile(filepath, processedImage, { mode: 0o664 });

    // Return the public URL (served from /uploads route)
    const publicUrl = `/uploads/${user.id}/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
    });
  } catch (error) {
    if (error instanceof HttpError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Image illisible ou envoi impossible." },
      { status: 500 },
    );
  }
}
