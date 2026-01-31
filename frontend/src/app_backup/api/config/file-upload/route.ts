/**
 * File Upload API
 * 
 * Handles file uploads for config entries
 */

import { NextRequest, NextResponse } from "next/server";
import { uploadFile, validateFileType, validateFileSize } from "@/lib/config-flow/file-storage";
import { getConfigSchema } from "@/components/addDevice/server/integration-config-schemas";
import { verifyAccessToken } from "@/lib/auth/tokens";

// Helper to get user from request
async function getUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyAccessToken(token);
    return { id: payload.userId, email: payload.email };
  } catch (e) {
    return null;
  }
}

/**
 * POST /api/config/file-upload
 * Upload a file for a config field
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fieldName = formData.get("fieldName") as string;
    const integrationId = formData.get("integrationId") as string;
    const configEntryId = formData.get("configEntryId") as string | null;

    if (!file || !fieldName || !integrationId) {
      return NextResponse.json(
        { error: "Missing required fields: file, fieldName, integrationId" },
        { status: 400 }
      );
    }

    // Get schema for validation
    const schema = await getConfigSchema(integrationId);
    const fieldSchema = schema[fieldName];

    if (!fieldSchema) {
      return NextResponse.json(
        { error: `Field ${fieldName} not found in schema` },
        { status: 400 }
      );
    }

    if (fieldSchema.type !== "file") {
      return NextResponse.json(
        { error: `Field ${fieldName} is not a file field` },
        { status: 400 }
      );
    }

    // Validate file type and size
    if (fieldSchema.fileConfig?.accept) {
      if (!validateFileType(file, fieldSchema.fileConfig.accept)) {
        return NextResponse.json(
          {
            error: `File type ${file.type} is not allowed`,
            allowedTypes: fieldSchema.fileConfig.accept,
          },
          { status: 400 }
        );
      }
    }

    if (fieldSchema.fileConfig?.maxSize) {
      if (!validateFileSize(file, fieldSchema.fileConfig.maxSize)) {
        const maxSizeMB = (fieldSchema.fileConfig.maxSize / (1024 * 1024)).toFixed(2);
        return NextResponse.json(
          {
            error: `File size exceeds maximum allowed size of ${maxSizeMB} MB`,
            maxSize: fieldSchema.fileConfig.maxSize,
          },
          { status: 400 }
        );
      }
    }

    // Upload file
    const fileMetadata = await uploadFile(
      file,
      fieldName,
      fieldSchema,
      user.id,
      configEntryId || undefined
    );

    return NextResponse.json({
      success: true,
      file: {
        id: fileMetadata.id,
        originalFilename: fileMetadata.originalFilename,
        mimeType: fileMetadata.mimeType,
        fileSize: fileMetadata.fileSize,
        uploadedAt: fileMetadata.uploadedAt,
      },
    });
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: error.message || "File upload failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/config/file-upload?id=<fileId>
 * Get file metadata
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json(
        { error: "Missing file ID" },
        { status: 400 }
      );
    }

    // Import getFile function
    const { getFile } = await import("@/lib/config-flow/file-storage");

    const fileMetadata = await getFile(fileId);

    if (!fileMetadata) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      file: {
        id: fileMetadata.id,
        originalFilename: fileMetadata.originalFilename,
        mimeType: fileMetadata.mimeType,
        fileSize: fileMetadata.fileSize,
        uploadedAt: fileMetadata.uploadedAt,
      },
    });
  } catch (error: any) {
    console.error("File details error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch file details" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/config/file-upload?id=<fileId>
 * Delete a uploaded file
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json(
        { error: "Missing file ID" },
        { status: 400 }
      );
    }

    // Import deleteFile function
    const { deleteFile } = await import("@/lib/config-flow/file-storage");

    // Delete file
    await deleteFile(fileId);

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error: any) {
    console.error("File delete error:", error);
    return NextResponse.json(
      { error: error.message || "File deletion failed" },
      { status: 500 }
    );
  }
}
