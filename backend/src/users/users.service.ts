
import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { User } from './user.entity';

@Injectable()
export class UsersService {
    constructor(@Inject(DATABASE_POOL) private pool: Pool) { }

    async findOneByEmail(email: string): Promise<User | undefined> {
        const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    }

    async findOneById(id: string): Promise<User | undefined> {
        const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0];
    }

    async create(email: string, passwordHash: string, name?: string): Promise<User> {
        const result = await this.pool.query(
            `INSERT INTO users (id, email, password_hash, name, is_active) 
       VALUES (gen_random_uuid(), $1, $2, $3, true) 
       RETURNING *`,
            [email, passwordHash, name],
        );
        return result.rows[0];
    }
}
