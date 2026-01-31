/**
 * File Upload API Tests
 * 
 * Tests for file upload API endpoints
 */

import { POST, DELETE } from "../file-upload/route";
import { NextRequest } from "next/server";

// Mock dependencies
const mockUploadFile = jest.fn();
const mockValidateFileType = jest.fn();
const mockValidateFileSize = jest.fn();
const mockDeleteFile = jest.fn();

jest.mock("@/lib/config-flow/file-storage", () => ({
  uploadFile: (...args: any[]) => mockUploadFile(...args),
  validateFileType: (...args: any[]) => mockValidateFileType(...args),
  validateFileSize: (...args: any[]) => mockValidateFileSize(...args),
  deleteFile: (...args: any[]) => mockDeleteFile(...args),
}));

jest.mock("@/components/addDevice/server/integration-config-schemas", () => ({
  getConfigSchema: jest.fn(),
}));

jest.mock("@/lib/auth/auth-service", () => ({
  getUserFromRequest: jest.fn(),
}));

import { getConfigSchema } from "@/components/addDevice/server/integration-config-schemas";
import { getUserFromRequest } from "@/lib/auth/auth-service";

describe("File Upload API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/config/file-upload", () => {
    it("should upload file successfully", async () => {
      const mockUser = { id: "user-123" };
      const mockFile = new File(["content"], "test.txt", { type: "text/plain" });
      const mockFormData = new FormData();
      mockFormData.append("file", mockFile);
      mockFormData.append("fieldName", "certificate");
      mockFormData.append("integrationId", "test-integration");

      (getUserFromRequest as jest.Mock).mockResolvedValue(mockUser);
      (getConfigSchema as jest.Mock).mockReturnValue({
        certificate: {
          type: "file",
          label: "Certificate",
          fileConfig: {
            accept: ["text/plain"],
            maxSize: 1024 * 1024,
          },
        },
      });
      mockValidateFileType.mockReturnValue(true);
      mockValidateFileSize.mockReturnValue(true);
      mockUploadFile.mockResolvedValue({
        id: "file-123",
        originalFilename: "test.txt",
        mimeType: "text/plain",
        fileSize: 1024,
        uploadedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/config/file-upload", {
        method: "POST",
        body: mockFormData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.file.id).toBe("file-123");
      expect(mockUploadFile).toHaveBeenCalled();
    });

    it("should return 401 when user is not authenticated", async () => {
      (getUserFromRequest as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/config/file-upload", {
        method: "POST",
        body: new FormData(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when required fields are missing", async () => {
      const mockUser = { id: "user-123" };
      (getUserFromRequest as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest("http://localhost:3000/api/config/file-upload", {
        method: "POST",
        body: new FormData(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 when file type is invalid", async () => {
      const mockUser = { id: "user-123" };
      const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });
      const mockFormData = new FormData();
      mockFormData.append("file", mockFile);
      mockFormData.append("fieldName", "certificate");
      mockFormData.append("integrationId", "test-integration");

      (getUserFromRequest as jest.Mock).mockResolvedValue(mockUser);
      (getConfigSchema as jest.Mock).mockReturnValue({
        certificate: {
          type: "file",
          label: "Certificate",
          fileConfig: {
            accept: ["text/plain"],
          },
        },
      });
      mockValidateFileType.mockReturnValue(false);

      const request = new NextRequest("http://localhost:3000/api/config/file-upload", {
        method: "POST",
        body: mockFormData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("not allowed");
    });

    it("should return 400 when file size exceeds limit", async () => {
      const mockUser = { id: "user-123" };
      const mockFile = new File(["content"], "test.txt", { type: "text/plain" });
      const mockFormData = new FormData();
      mockFormData.append("file", mockFile);
      mockFormData.append("fieldName", "certificate");
      mockFormData.append("integrationId", "test-integration");

      (getUserFromRequest as jest.Mock).mockResolvedValue(mockUser);
      (getConfigSchema as jest.Mock).mockReturnValue({
        certificate: {
          type: "file",
          label: "Certificate",
          fileConfig: {
            accept: ["text/plain"],
            maxSize: 100,
          },
        },
      });
      mockValidateFileType.mockReturnValue(true);
      mockValidateFileSize.mockReturnValue(false);

      const request = new NextRequest("http://localhost:3000/api/config/file-upload", {
        method: "POST",
        body: mockFormData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("exceeds maximum");
    });
  });

  describe("DELETE /api/config/file-upload", () => {
    it("should delete file successfully", async () => {
      const mockUser = { id: "user-123" };
      (getUserFromRequest as jest.Mock).mockResolvedValue(mockUser);
      mockDeleteFile.mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost:3000/api/config/file-upload?id=file-123", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDeleteFile).toHaveBeenCalledWith("file-123");
    });

    it("should return 401 when user is not authenticated", async () => {
      (getUserFromRequest as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/config/file-upload?id=file-123", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when file ID is missing", async () => {
      const mockUser = { id: "user-123" };
      (getUserFromRequest as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest("http://localhost:3000/api/config/file-upload", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing file ID");
    });
  });
});
