import { supabase } from '../config/supabase';
import { io } from '../server';

type HandleTransaksiInput = {
  id_barang: string;
  jumlah: number;
  tipe_transaksi: 'masuk' | 'keluar';
  tanggal: string;
  id_user: string;
};

async function handleTransaksi(input: HandleTransaksiInput) {
  // Ambil stok barang saat ini
  const { data: barang, error: bErr } = await supabase
    .from('barang')
    .select('id, stok')
    .eq('id', input.id_barang)
    .single();
  if (bErr) throw bErr;
  if (!barang) throw new Error('Barang not found');

  const stok = Number(barang.stok ?? 0);
  const delta = input.tipe_transaksi === 'masuk' ? input.jumlah : -input.jumlah;
  const newStok = stok + delta;
  if (newStok < 0) throw new Error('Stok tidak cukup');

  // Update stok barang
  const { data: updated, error: uErr } = await supabase
    .from('barang')
    .update({ stok: newStok, updated_at: new Date() })
    .eq('id', input.id_barang)
    .select('id, stok')
    .single();
  if (uErr) throw uErr;
  if (!updated) throw new Error('Gagal memperbarui stok');

  // Catat transaksi
  const { data: trx, error: tErr } = await supabase
    .from('transaksi')
    .insert([{ id_barang: input.id_barang, jumlah: input.jumlah, tipe_transaksi: input.tipe_transaksi, tanggal: input.tanggal, id_user: input.id_user, created_at: new Date() }])
    .select('*')
    .single();
  if (tErr) throw tErr;

  // Emit perubahan stok (opsional)
  io.to(`barang-${input.id_barang}`).emit('stok-updated', { id_barang: input.id_barang, stok: newStok });
  return trx;
}

export const transaksiService = { handleTransaksi };