-- Migration: setup profiles (auth) and inventory tables
-- Profiles table and policies
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTE: Skip trigger/function creation due to potential permission constraints on auth schema
-- Profiles will be populated by the seeding script (seed-auth)

-- RLS and policies will be set later via a dedicated migration.

-- Inventory tables
CREATE TABLE IF NOT EXISTS public.barang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  stok INTEGER NOT NULL DEFAULT 0 CHECK (stok >= 0),
  lokasi_rak TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barang_nama ON public.barang (nama);
CREATE INDEX IF NOT EXISTS idx_barang_kode ON public.barang (kode);

CREATE TABLE IF NOT EXISTS public.transaksi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_barang UUID NOT NULL REFERENCES public.barang(id) ON DELETE CASCADE,
  jumlah INTEGER NOT NULL CHECK (jumlah > 0),
  tipe_transaksi TEXT NOT NULL CHECK (tipe_transaksi IN ('masuk','keluar')),
  tanggal DATE NOT NULL,
  id_user UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaksi_barang ON public.transaksi (id_barang);
CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON public.transaksi (tanggal);