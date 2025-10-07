import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import jwt from 'jsonwebtoken';

declare global { namespace Express { interface Request { user?: { id: string; role: 'admin' | 'operator'; email?: string; name?: string } } } }

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
    const token = auth.slice('Bearer '.length);

    // Coba verifikasi sebagai Supabase JWT terlebih dahulu
    const { data, error } = await supabase.auth.getUser(token);
    if (data?.user && !error) {
      const userId = data.user.id;
      const email = data.user.email ?? undefined;
      const name = (data.user.user_metadata as any)?.name ?? undefined;
      // Ambil role via Supabase REST untuk menghindari ketergantungan koneksi PG
      const { data: prof, error: perr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();
      const roleStr = perr ? 'user' : (prof?.role ?? 'user');
      const role = (roleStr === 'admin' ? 'admin' : 'operator') as 'admin' | 'operator';
      req.user = { id: userId, role, email, name };
      return next();
    }

    // Fallback: verifikasi JWT lokal (untuk /user/login demo)
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'rahasia') as any;
      const id = String(payload.id ?? '');
      const role = (payload.role === 'admin' ? 'admin' : 'operator') as 'admin' | 'operator';
      const email = typeof payload.email === 'string' ? payload.email : undefined;
      const name = typeof payload.name === 'string' ? payload.name : undefined;
      req.user = { id, role, email, name };
      return next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  } catch (e) { next(e); }
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  next();
}