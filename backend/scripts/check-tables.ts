import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'homeassistant',
});

async function checkTables() {
    try {
        const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

        console.log(`\n✅ Found ${result.rows.length} tables:\n`);
        for (const row of result.rows) {
            console.log(`- ${row.tablename}`);
            const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${row.tablename}'
      `);
            columns.rows.forEach(col => {
                console.log(`  |-- ${col.column_name} (${col.data_type})`);
            });
        }

        await pool.end();
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

checkTables();
