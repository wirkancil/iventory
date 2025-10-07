import { Router } from 'express';
import { authMiddleware, adminOnly } from '../../middleware/auth';
import { supabase } from '../../config/supabase';
import { z } from 'zod';

const router = Router();

router.get('/', authMiddleware, async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('barang')
      .select('id, kode, nama, stok, lokasi_rak, updated_at')
      .order('nama');
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) {
    console.error('Error fetching barang:', e);
    next(e);
  }
});

const createSchema = z.object({ kode: z.string(), nama: z.string(), stok: z.number().int().nonnegative(), lokasi_rak: z.string().nullable().optional() });
router.post('/', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const { data, error } = await supabase
      .from('barang')
      .insert([{ kode: body.kode, nama: body.nama, stok: body.stok, lokasi_rak: body.lokasi_rak ?? null, created_at: new Date(), updated_at: new Date() }])
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    console.error('Error creating barang:', e);
    next(e);
  }
});

// Tambah endpoint untuk update barang
const updateSchema = z.object({ 
  kode: z.string().optional(), 
  nama: z.string().optional(), 
  stok: z.number().int().nonnegative().optional(), 
  lokasi_rak: z.string().nullable().optional() 
});

router.put('/:id', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = updateSchema.parse(req.body);

    if (Object.keys(body).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('barang')
      .update({ ...body, updated_at: new Date() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Barang not found' });
    res.json(data);
  } catch (e) {
    console.error('Error updating barang:', e);
    next(e);
  }
});

// Tambah endpoint untuk delete barang
router.delete('/:id', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('barang')
      .delete()
      .eq('id', id)
      .select('id')
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Barang not found' });
    res.json({ message: 'Barang deleted successfully', id: data.id });
  } catch (e) {
    console.error('Error deleting barang:', e);
    next(e);
  }
});

export default router;