import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RealtimeModule } from './realtime/realtime.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { DevicesModule } from './devices/devices.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { WeatherModule } from './weather/weather.module';
import { CommandsModule } from './commands/commands.module';
import { LocationModule } from './location/location.module';
import { SettingsModule } from './settings/settings.module';
import { HacsModule } from './hacs/hacs.module';
import { ActivityModule } from './activity/activity.module';
import { EwelinkModule } from './integrations/ewelink/ewelink.module';
import { GroupsModule } from './groups/groups.module';
import { MediaModule } from './media/media.module';
import { DevToolsModule } from './dev-tools/dev-tools.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HomeAssistantModule } from './home-assistant/home-assistant.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USER', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'homeassistant'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Auto-create tables (DEVELOPMENT ONLY)
        dropSchema: false, // PRESERVE DATA on restart
        logging: false,
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    IntegrationsModule,
    DashboardsModule,
    RealtimeModule,
    WeatherModule,
    CommandsModule,
    DevicesModule,
    LocationModule,
    SettingsModule,
    HacsModule,
    ActivityModule,
    EwelinkModule,
    GroupsModule,
    MediaModule,
    DevToolsModule,
    NotificationsModule,
    HomeAssistantModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // Points to backend/public
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
