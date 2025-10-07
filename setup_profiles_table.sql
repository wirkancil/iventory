-- Membuat tabel profiles untuk menyimpan data user dan role
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Membuat fungsi trigger untuk membuat profile otomatis saat user baru dibuat
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 
    CASE 
      WHEN new.email = 'admin@example.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Membuat trigger untuk menjalankan fungsi saat user baru dibuat
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Membuat kebijakan Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Kebijakan untuk admin (dapat melihat dan mengedit semua profile)
CREATE POLICY "Admin dapat melihat semua profile" ON profiles
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Admin dapat mengupdate semua profile" ON profiles
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Kebijakan untuk user (hanya dapat melihat dan mengedit profile sendiri)
CREATE POLICY "User dapat melihat profile sendiri" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "User dapat mengupdate profile sendiri" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Membuat admin user jika belum ada
INSERT INTO profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'admin@example.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';