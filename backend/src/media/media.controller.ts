
import { Controller, Get, Post, Delete, Param, UseGuards, Req, UploadedFile, UseInterceptors, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { MediaService } from './media.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/media')
export class MediaController {
    private readonly logger = new Logger(MediaController.name);

    constructor(private readonly mediaService: MediaService) { }

    @Get('list')
    @UseGuards(AuthGuard('jwt'))
    async getList(@Req() req: any) {
        return { files: await this.mediaService.findAll(req.user.userId) };
    }

    @Post('upload')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
                return cb(new BadRequestException('Invalid file type'), false);
            }
            cb(null, true);
        }
    }))
    async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
        if (!file) throw new BadRequestException('No file provided');
        return await this.mediaService.uploadFile(req.user.userId, file);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    async delete(@Param('id') id: string, @Req() req: any) {
        const deleted = await this.mediaService.deleteFile(req.user.userId, id);
        if (!deleted) throw new NotFoundException('File not found');
        return { success: true };
    }
}
