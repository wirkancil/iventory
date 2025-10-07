import { Router } from 'express';
import { authMiddleware, adminOnly } from '../../middleware/auth';
import { supabase } from '../../config/supabase';
import { z } from 'zod';

const router = Router();

// Nonaktifkan endpoint login lokal: gunakan Supabase Cloud untuk autentikasi

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Admin: daftar users dari tabel profiles
router.get('/', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) { next(err); }
});

// Admin: buat user baru dengan role (admin|user)
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'user']),
  name: z.string().optional(),
});

router.post('/', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    // Buat user via Supabase Admin API
    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      user_metadata: body.name ? { name: body.name } : undefined,
      email_confirm: true,
    });
    if (cErr) throw cErr;
    const userId = created.user?.id;
    if (!userId) throw new Error('User creation failed');

    // Simpan role ke profiles
    const { error: pErr } = await supabase
      .from('profiles')
      .upsert({ id: userId, email: body.email, role: body.role });
    if (pErr) throw pErr;

    res.status(201).json({ id: userId, email: body.email, role: body.role });
  } catch (err) { next(err); }
});

// Admin: ambil user berdasarkan id
router.get('/:id', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Not Found' });
    res.json(data);
  } catch (err) { next(err); }
});

// Admin: update email/role/name/password
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user']).optional(),
  name: z.string().optional(),
  password: z.string().min(6).optional(),
});

router.put('/:id', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const body = updateUserSchema.parse(req.body);

    // Update user di Supabase auth (email, password, metadata)
    if (body.email || body.password || body.name) {
      const { error: uErr } = await supabase.auth.admin.updateUserById(id, {
        email: body.email,
        password: body.password,
        user_metadata: body.name ? { name: body.name } : undefined,
      } as any);
      if (uErr) throw uErr;
    }

    // Update profiles (email/role)
    if (body.email || body.role) {
      const patch: any = {};
      if (body.email) patch.email = body.email;
      if (body.role) patch.role = body.role;
      const { error: pErr } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', id);
      if (pErr) throw pErr;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// Admin: hapus user
router.delete('/:id', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    // Hapus dari auth.users
    const { error: dErr } = await supabase.auth.admin.deleteUser(id);
    if (dErr) throw dErr;
    // Bersihkan dari profiles
    const { error: pErr } = await supabase.from('profiles').delete().eq('id', id);
    if (pErr) throw pErr;
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;