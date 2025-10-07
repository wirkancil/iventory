import { supabase } from '../config/supabase';
import { pool } from '../config/database';

async function checkSupabaseAPI() {
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
    console.log('Supabase API OK: listUsers returned', data?.users?.length ?? 0, 'users');
  } catch (err) {
    console.error('Supabase API ERROR:', err);
  }
}

async function checkSupabaseDB() {
  try {
    const { rows } = await pool.query('SELECT 1 as ok');
    console.log('Supabase DB OK:', rows[0]);
  } catch (err) {
    console.error('Supabase DB ERROR:', err);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('Checking Supabase connectivity...');
  await checkSupabaseAPI();
  await checkSupabaseDB();
}

main();