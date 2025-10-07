import { createClient } from '@supabase/supabase-js';

// Pastikan variabel lingkungan tersedia
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL dan Anon Key harus disediakan di file .env.local');
}

// Buat client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fungsi untuk login dengan email dan password
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
};

// Fungsi untuk logout
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};

// Fungsi untuk mendapatkan session saat ini
export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    throw error;
  }
  
  return data.session;
};

// Fungsi untuk mendapatkan user saat ini
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  
  if (error) {
    throw error;
  }
  
  return data.user;
};