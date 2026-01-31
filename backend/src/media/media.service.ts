
import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { existsSync } from 'fs';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class MediaService implements OnModuleInit {
    private readonly logger = new Logger(MediaService.name);

    constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

    async onModuleInit() {
        await this.createTables();
        await this.ensureUploadsDir();
    }

    private async createTables() {
        try {
            await this.pool.query(`
        CREATE TABLE IF NOT EXISTS media_files (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          size INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          url TEXT NOT NULL,
          uploaded_at TIMESTAMPTZ DEFAULT now()
        );
      `);
            this.logger.log('Media tables initialized');
        } catch (error) {
            this.logger.error('Failed to initialize media tables', error);
        }
    }

    private async ensureUploadsDir() {
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'media');
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
            this.logger.log(`Created uploads directory: ${uploadsDir}`);
        }
    }

    async findAll(userId: string) {
        const result = await this.pool.query(
            `SELECT id, name, type, size, url, uploaded_at as "uploadedAt"
       FROM media_files
       WHERE user_id = $1
       ORDER BY uploaded_at DESC`,
            [userId]
        );
        return result.rows;
    }

    async uploadFile(userId: string, file: Express.Multer.File) {
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'media');
        // Ensure dir exists just in case
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }


        const fileId = randomUUID();
        const fileExtension = file.originalname.split('.').pop() || 'jpg';
        const fileName = `${fileId}.${fileExtension}`;
        const filePath = join(uploadDir, fileName);

        await writeFile(filePath, file.buffer);

        const url = `/uploads/media/${fileName}`;
        const dbFilePath = `/uploads/media/${fileName}`;

        const result = await this.pool.query(
            `INSERT INTO media_files (user_id, name, type, size, file_path, url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, type, size, url, uploaded_at as "uploadedAt"`,
            [userId, file.originalname, file.mimetype, file.size, dbFilePath, url]
        );

    }

    async deleteFile(userId: string, fileId: string) {
        const result = await this.pool.query(
            `DELETE FROM media_files 
       WHERE id = $1 AND user_id = $2
       RETURNING file_path`,
            [fileId, userId]
        );

        if (result.rowCount === 0) {
            return null;
        }

        const { file_path } = result.rows[0];

        // The file_path stored in DB is web path "/uploads/media/...", 
        // we need to convert to system path or store system path separately.
        const fileName = file_path.split('/').pop();
        if (fileName) {
            const sysPath = join(process.cwd(), 'public', 'uploads', 'media', fileName);
            try {
                if (existsSync(sysPath)) {
                    await unlink(sysPath);
                }
            } catch (error) {
                this.logger.error(`Failed to delete file at ${sysPath}`, error);
            }
        }

        return true;
    }
}
