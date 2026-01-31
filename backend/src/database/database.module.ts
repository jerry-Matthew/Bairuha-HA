
import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const DATABASE_POOL = 'DATABASE_POOL';

const databaseProvider = {
    provide: DATABASE_POOL,
    useFactory: async (configService: ConfigService) => {
        const password = configService.get<string>('DB_PASSWORD') || '';
        const pool = new Pool({
            host: configService.get<string>('DB_HOST', 'localhost'),
            port: configService.get<number>('DB_PORT', 5432),
            database: configService.get<string>('DB_NAME', 'homeassistant'),
            user: configService.get<string>('DB_USER', 'postgres'),
            password: String(password),
            ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });

        return pool;
    },
    inject: [ConfigService],
};

@Global()
@Module({
    imports: [ConfigModule],
    providers: [databaseProvider],
    exports: [DATABASE_POOL],
})
export class DatabaseModule { }
