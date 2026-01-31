
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function resetPassword() {
    try {
        const email = 'aisotop@gmail.com';
        const newPassword = 'password123';
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        const res = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING *',
            [hashedPassword, email]
        );

        if (res.rowCount === 0) {
            console.log(`User ${email} not found.`);
        } else {
            console.log(`Password for ${email} has been reset to: ${newPassword}`);
        }
    } catch (err: any) {
        console.error('Reset failed:', err.message);
    } finally {
        await pool.end();
    }
}

resetPassword();
