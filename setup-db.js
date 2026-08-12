require('dotenv').config();
const mysql = require('mysql2/promise');

async function setup() {
    try {
        console.log('Connecting to MySQL/MariaDB...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });
        
        console.log('Creating database dareum if not exists...');
        await connection.query('CREATE DATABASE IF NOT EXISTS dareum;');
        
        console.log('Switching to dareum database...');
        await connection.query('USE dareum;');
        
        console.log('Creating signatures table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS signatures (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                agreed BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating support_comments table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS support_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                message VARCHAR(80) NOT NULL,
                likes INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('Database setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('Failed to setup database:', error.message);
        console.error('Make sure MySQL/MariaDB is running and credentials are correct in .env');
        process.exit(1);
    }
}

setup();
