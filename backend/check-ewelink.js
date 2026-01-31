
const { Client } = require('pg');
require('dotenv').config();

async function checkEwelink() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query("SELECT * FROM integration_catalog WHERE domain = 'ewelink'");
        if (res.rows.length > 0) {
            console.log('FOUND: eWeLink is in the catalog.');
        } else {
            console.log('MISSING: eWeLink is NOT in the catalog.');
        }
    } catch (err) {
        console.error('Error checking DB:', err);
    } finally {
        await client.end();
    }
}

checkEwelink();
