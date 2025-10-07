import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

async function runSqlFile(relativePath: string) {
  const filePath = path.resolve(__dirname, relativePath);
  const sql = fs.readFileSync(filePath, 'utf-8');
  await pool.query(sql);
}

async function main() {
  try {
    console.log('Applying Supabase schema...');
    // Jalankan file SQL di root project
    await runSqlFile('../../../setup_profiles_table.sql');
    await runSqlFile('../../../setup_inventory_tables.sql');
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Error applying schema:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();