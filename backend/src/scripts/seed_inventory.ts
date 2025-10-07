import { supabase } from '../config/supabase';

async function upsertItems() {
  const items = [
    { kode: 'B-001', nama: 'Kardus Besar', stok: 120, lokasi_rak: 'A1' },
    { kode: 'B-002', nama: 'Lakban', stok: 300, lokasi_rak: 'A2' },
    { kode: 'B-003', nama: 'Pallet Kayu', stok: 50, lokasi_rak: 'B1' },
    { kode: 'B-004', nama: 'Bubble Wrap', stok: 200, lokasi_rak: 'A3' },
  ];

  // Gunakan upsert berdasarkan unique key 'kode'
  const { error } = await supabase
    .from('barang')
    .upsert(
      items.map((it) => ({ ...it })),
      { onConflict: 'kode' }
    );
  if (error) throw error;
}

async function main() {
  try {
    console.log('Seeding inventory (via Supabase API)...');
    await upsertItems();
    console.log('Seed inventory data completed.');
  } catch (e) {
    console.error('Seed error:', e);
    process.exitCode = 1;
  }
}

main();