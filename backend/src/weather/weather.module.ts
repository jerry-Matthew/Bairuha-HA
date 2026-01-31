import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DevicesModule } from '../devices/devices.module';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

@Module({
    imports: [ConfigModule, DevicesModule],
    controllers: [WeatherController],
    providers: [WeatherService],
})
export class WeatherModule { }
