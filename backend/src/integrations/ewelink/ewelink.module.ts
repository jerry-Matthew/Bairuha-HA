
import { Module } from '@nestjs/common';
import { EwelinkService } from './ewelink.service';
import { DevicesModule } from '../../devices/devices.module';

@Module({
    imports: [DevicesModule],
    providers: [EwelinkService],
    exports: [EwelinkService],
})
export class EwelinkModule { }
