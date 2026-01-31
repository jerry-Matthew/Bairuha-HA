/**
 * File Storage Service
 * 
 * Handles file uploads and storage for config entries
 */

import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import type { FileConfig } from "@/components/addDevice/server/integration-config-schemas";
import { query } from "@/lib/db";

/**
 * File metadata stored in database
 */
export interface FileMetadata {
  id: string;
  configEntryId: string | null;
  fieldName: string;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  mimeType: string | null;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string | null;
}

/**
 * Upload directory for config files
 */
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "config");

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Validate file type against accept MIME types
 */
export function validateFileType(file: { type: string }, accept?: string[]): boolean {
  if (!accept || accept.length === 0) {
    return true; // No restrictions
  }
  
  return accept.some(pattern => {
    // Exact match
    if (pattern === file.type) {
      return true;
    }
    
    // Wildcard match (e.g., "image/*")
    if (pattern.endsWith("/*")) {
      const category = pattern.slice(0, -2);
      return file.type.startsWith(category + "/");
    }
    
    return false;
  });
}

/**
 * Validate file size
 */
export function validateFileSize(file: { size: number }, maxSize?: number): boolean {
  if (!maxSize) {
    return true; // No size restriction
  }
  
  return file.size <= maxSize;
}

/**
 * Upload a file and store metadata
 */
export async function uploadFile(
  file: File,
  fieldName: string,
  fieldSchema: { fileConfig?: FileConfig },
  userId?: string,
  configEntryId?: string
): Promise<FileMetadata> {
  await ensureUploadDir();
  
  // Validate file type
  if (fieldSchema.fileConfig?.accept) {
    if (!validateFileType(file, fieldSchema.fileConfig.accept)) {
      throw new Error(
        `File type ${file.type} is not allowed. Allowed types: ${fieldSchema.fileConfig.accept.join(", ")}`
      );
    }
  }
  
  // Validate file size
  if (fieldSchema.fileConfig?.maxSize) {
    if (!validateFileSize(file, fieldSchema.fileConfig.maxSize)) {
      const maxSizeMB = (fieldSchema.fileConfig.maxSize / (1024 * 1024)).toFixed(2);
      throw new Error(`File size exceeds maximum allowed size of ${maxSizeMB} MB`);
    }
  }
  
  // Generate unique filename
  const fileId = randomUUID();
  const extension = file.name.split(".").pop() || "";
  const storedFilename = `${fileId}.${extension}`;
  const filePath = join(UPLOAD_DIR, storedFilename);
  
  // Convert File to Buffer and write to disk
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(filePath, buffer);
  
  // Store metadata in database
  const result = await query<FileMetadata>(
    `INSERT INTO config_files (
      id, config_entry_id, field_name, original_filename, stored_filename,
      file_path, mime_type, file_size, uploaded_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      fileId,
      configEntryId || null,
      fieldName,
      file.name,
      storedFilename,
      filePath,
      file.type || null,
      file.size,
      userId || null,
    ]
  );
  
  return result[0];
}

/**
 * Get file metadata by ID
 */
export async function getFile(fileId: string): Promise<FileMetadata | null> {
  const result = await query<FileMetadata>(
    `SELECT * FROM config_files WHERE id = $1`,
    [fileId]
  );
  
  return result[0] || null;
}

/**
 * Delete file and metadata
 */
export async function deleteFile(fileId: string): Promise<void> {
  const file = await getFile(fileId);
  
  if (!file) {
    throw new Error(`File with ID ${fileId} not found`);
  }
  
  // Delete file from disk
  try {
    if (existsSync(file.filePath)) {
      await unlink(file.filePath);
    }
  } catch (error) {
    console.error(`Error deleting file ${file.filePath}:`, error);
  }
  
  // Delete metadata from database
  await query(`DELETE FROM config_files WHERE id = $1`, [fileId]);
}

/**
 * Delete all files for a config entry
 */
export async function deleteFilesForConfigEntry(configEntryId: string): Promise<void> {
  const files = await query<FileMetadata>(
    `SELECT * FROM config_files WHERE config_entry_id = $1`,
    [configEntryId]
  );
  
  await Promise.all(files.map(file => deleteFile(file.id)));
}
