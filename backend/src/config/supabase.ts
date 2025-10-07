import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Fungsi untuk memverifikasi token JWT dari Supabase
export const verifySupabaseToken = async (token: string) => {
  try {
    // Gunakan Supabase client untuk mendapatkan user dari token
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      throw error;
    }
    
    return data.user;
  } catch (error) {
    console.error('Error verifying Supabase token:', error);
    throw error;
  }
};

// Fungsi untuk mendapatkan role user dari Supabase
export const getUserRole = async (userId: string) => {
  try {
    // Ambil data profile user dari tabel profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data?.role || 'user'; // Default ke 'user' jika tidak ada role
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'user'; // Default ke 'user' jika terjadi error
  }
};