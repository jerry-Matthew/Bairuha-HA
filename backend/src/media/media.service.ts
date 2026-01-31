import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaFile } from './entities/media-file.entity';
import { existsSync } from 'fs';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class MediaService implements OnModuleInit {
    private readonly logger = new Logger(MediaService.name);

    constructor(
        @InjectRepository(MediaFile)
        private readonly mediaRepository: Repository<MediaFile>,
    ) { }

    async onModuleInit() {
        await this.ensureUploadsDir();
    }

    private async ensureUploadsDir() {
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'media');
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
            this.logger.log(`Created uploads directory: ${uploadsDir}`);
        }
    }

    async findAll(userId: string) {
        return this.mediaRepository.find({
            where: { userId },
            order: { uploadedAt: 'DESC' },
        });
    }

    async uploadFile(userId: string, file: Express.Multer.File) {
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'media');
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

        const mediaFile = this.mediaRepository.create({
            id: fileId,
            userId,
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            filePath: dbFilePath,
            url: url,
        });

        return this.mediaRepository.save(mediaFile);
    }

    async deleteFile(userId: string, fileId: string) {
        const file = await this.mediaRepository.findOne({
            where: { id: fileId, userId },
        });

        if (!file) {
            return null;
        }

        const fileName = file.filePath.split('/').pop();
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

        await this.mediaRepository.remove(file);
        return true;
    }
}
