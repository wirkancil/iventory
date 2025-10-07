import { supabase } from '../config/supabase';

async function ensureUser(email: string, password: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  // Jika sudah ada, error code akan muncul; abaikan jika user sudah terdaftar
  if (error && !String(error.message).toLowerCase().includes('already')) {
    throw error;
  }
  return data?.user?.id;
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error as any;
  const usr = data.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
  return usr?.id ?? null;
}

async function upsertProfile(email: string, role: 'admin' | 'user') {
  const userId = await getUserIdByEmail(email);
  if (!userId) {
    console.warn(`User id not found for ${email}, skipping profiles upsert`);
    return;
  }
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, email, role });
  if (error) throw error as any;
}

async function syncAdminRole(email: string) {
  // Pastikan profile admin ber-role 'admin'
  const { data: users, error: uerr } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('email', email)
    .limit(1);
  if (uerr) throw uerr;
  const user = users?.[0];
  if (user && user.role !== 'admin') {
    const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
    if (error) throw error;
  }
}

async function main() {
  try {
    console.log('Seeding auth users...');
    await ensureUser('admin@example.com', 'admin123');
    await upsertProfile('admin@example.com', 'admin');
    await ensureUser('user@example.com', 'user123');
    await upsertProfile('user@example.com', 'user');
    await syncAdminRole('admin@example.com');
    console.log('Seed auth users completed.');
  } catch (e) {
    console.error('Seed auth error:', e);
    process.exitCode = 1;
  }
}

main();