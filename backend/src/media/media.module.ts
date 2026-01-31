import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { DatabaseModule } from '../database/database.module';
import { MediaFile } from './entities/media-file.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([MediaFile]),
        DatabaseModule
    ],
    controllers: [MediaController],
    providers: [MediaService],
})
export class MediaModule { }
