import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'homeassistant',
});

async function dropAllTables() {
  try {
    console.log('🗑️  Dropping all tables...');

    // Get all table names
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    console.log(`Found ${result.rows.length} tables to drop`);

    // Drop each table
    for (const row of result.rows) {
      const tableName = row.tablename;
      console.log(`  Dropping ${tableName}...`);
      await pool.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    }

    console.log('✅ All tables dropped successfully!');
    console.log('🔄 TypeORM will now auto-create tables on next server start');

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error dropping tables:', error.message);
    await pool.end();
    process.exit(1);
  }
}

dropAllTables();
