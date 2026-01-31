
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function checkUsers() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        console.log('Columns in users table:');
        console.table(res.rows);

        const usersRes = await pool.query('SELECT * FROM users');
        if (usersRes.rows.length === 0) {
            console.log('No users found in the database.');
        } else {
            console.log('Users found:');
            console.table(usersRes.rows);
        }
    } catch (err: any) {
        console.error('Error querying users:', err.message);
    } finally {
        await pool.end();
    }
}

checkUsers();
