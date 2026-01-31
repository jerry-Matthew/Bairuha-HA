import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // Points to backend/public
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
