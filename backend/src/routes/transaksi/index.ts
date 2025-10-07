import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { z } from 'zod';
import { transaksiService } from '../../services/transaksi.service';
import { supabase } from '../../config/supabase';

const router = Router();

const bodySchema = z.object({
  id_barang: z.string(),
  jumlah: z.number().int().positive(),
  tipe_transaksi: z.enum(['masuk', 'keluar']),
  tanggal: z.string(),
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const body = bodySchema.parse(req.body);
    const userId = req.user!.id;
    const trx = await transaksiService.handleTransaksi({ ...body, id_user: userId });
    res.status(201).json(trx);
  } catch (err) { next(err); }
});

// Riwayat transaksi (sederhana): daftar 100 terakhir, bisa difilter opsional
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { id_barang, tipe_transaksi, limit } = req.query as { id_barang?: string; tipe_transaksi?: 'masuk' | 'keluar'; limit?: string };
    let query = supabase
      .from('transaksi')
      .select('id, id_barang, jumlah, tipe_transaksi, tanggal, id_user, created_at')
      .order('created_at', { ascending: false })
      .limit(Number(limit ?? 100));

    if (id_barang) query = query.eq('id_barang', id_barang);
    if (tipe_transaksi) query = query.eq('tipe_transaksi', tipe_transaksi);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) { next(err); }
});

export default router;