/**
 * POST /api/media/upload
 * 
 * Upload image files with validation and authentication
 * 
 * Security features:
 * - Authentication required
 * - File type validation
 * - File size limits
 * - Rate limiting
 * - Safe file storage
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import rateLimit from "@/lib/rate-limit";
import { query } from "@/lib/db";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Rate limiting: 10 uploads per 5 minutes per user
const limiter = rateLimit({
  interval: 5 * 60 * 1000, // 5 minutes
  uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = authenticate(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    // Rate limiting
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
    await limiter.check(10, `${user.userId}-${ip}`);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileId = randomUUID();
    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `${fileId}.${fileExtension}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "media");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const filePath = join(uploadsDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Generate URL
    const fileUrl = `/uploads/media/${fileName}`;
    const dbFilePath = `/uploads/media/${fileName}`;

    // Save metadata to database
    const [mediaFile] = await query(
      `INSERT INTO media_files (user_id, name, type, size, file_path, url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, type, size, url, uploaded_at`,
      [
        user.userId,
        file.name,
        file.type,
        file.size,
        dbFilePath,
        fileUrl,
      ]
    );

    return NextResponse.json(
      {
        id: mediaFile.id,
        name: mediaFile.name,
        type: mediaFile.type,
        size: mediaFile.size,
        url: mediaFile.url,
        uploadedAt: mediaFile.uploaded_at,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Upload error:", error);

    if (error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

