
const { Client } = require('pg');
require('dotenv').config();

async function seedEwelink() {
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

        const check = await client.query("SELECT * FROM integration_catalog WHERE domain = 'ewelink'");
        if (check.rows.length > 0) {
            console.log('eWeLink already exists in catalog');
        } else {
            console.log('Inserting eWeLink into catalog');
            await client.query(`
        INSERT INTO integration_catalog 
        (domain, name, description, icon, supports_devices, is_cloud, documentation_url, brand_image_url, flow_type, sync_status)
        VALUES 
        ('ewelink', 'eWeLink Smart Home', 'Control eWeLink devices', 'mdi:flash', true, true, 'https://ewelink.cc', 'https://eu.ewelink.com/favicon.ico', 'manual', 'synced')
      `);
            console.log('Inserted successfully');
        }
    } catch (err) {
        console.error('Error seeding eWeLink:', err);
    } finally {
        await client.end();
    }
}

seedEwelink();
