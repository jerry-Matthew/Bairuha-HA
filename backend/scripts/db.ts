import { Pool, PoolClient } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

// Ensure env is loaded
dotenv.config({ path: path.join(process.cwd(), ".env") });

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "homeassistant",
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const transaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
};

export default pool;
