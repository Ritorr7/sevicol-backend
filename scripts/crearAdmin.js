// backend/scripts/crearUsuario.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const ROLES = new Set(['dev', 'admin', 'admin2']);

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sevicol',
  });

  // Uso: node scripts/crearUsuario.js <username> <password> [role] [protected]
  const username = process.argv[2] || 'dev';
  const plain    = process.argv[3] || '1234';
  const roleArg  = (process.argv[4] || 'dev').toLowerCase();
  const role     = ROLES.has(roleArg) ? roleArg : 'dev';
  const protArg  = process.argv[5]; // opcional
  const protectedFlag = protArg != null ? (protArg === '1' ? 1 : 0) : (role === 'dev' ? 1 : 0);

  const hash = await bcrypt.hash(plain, 10);

  // ¿Existe el usuario?
  const [rows] = await conn.execute(
    'SELECT id FROM users WHERE username = ? LIMIT 1',
    [username]
  );

  if (rows.length) {
    // Update (útil si querés rotar contraseña o cambiar rol)
    await conn.execute(
      `UPDATE users
         SET password_hash=?, role=?, enabled=1, protected=?, updated_at=NOW()
       WHERE id=?`,
      [hash, role, protectedFlag, rows[0].id]
    );
    console.log(`✅ Usuario actualizado: ${username} (role=${role}, protected=${protectedFlag})`);
  } else {
    // Insert
    await conn.execute(
      `INSERT INTO users (username, password_hash, role, enabled, protected, tenant_id)
       VALUES (?, ?, ?, 1, ?, NULL)`,
      [username, hash, role, protectedFlag]
    );
    console.log(`✅ Usuario creado: ${username} (role=${role}, protected=${protectedFlag})`);
  }

  await conn.end();
}

main().catch((err) => {
  console.error('❌ Error creando/actualizando usuario:', err);
  process.exit(1);
});


