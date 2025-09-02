const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'dbaas_platform',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function updatePassword() {
  try {
    const plainPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    console.log('Plain password:', plainPassword);
    console.log('Generated hash:', hashedPassword);
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hashedPassword, 'admin@example.com']
    );
    
    console.log('Update result:', result.rowCount, 'rows affected');
    
    // Verify the update
    const verification = await pool.query(
      'SELECT email, password_hash FROM users WHERE email = $1',
      ['admin@example.com']
    );
    
    console.log('Stored hash:', verification.rows[0].password_hash);
    
    // Test comparison
    const isValid = await bcrypt.compare(plainPassword, verification.rows[0].password_hash);
    console.log('Password comparison test:', isValid);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updatePassword();
