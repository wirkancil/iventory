# Inventory Management System — Node.js, Supabase, React

Ringkasan arsitektur yang sepenuhnya Node-first dengan pemisahan ketat: frontend hanya I/O, backend memproses logika bisnis, dan database (Supabase Postgres) menyimpan data. Autentikasi menggunakan Supabase Auth (diverifikasi di backend), realtime menggunakan Socket.io dari backend, dan deployment ke Railway.app.

## Arsitektur Sistem
- Frontend: `React + TypeScript + Vite`, konsumsi backend REST API via `axios`, realtime via `socket.io-client`.
- Backend: `Node.js + Express + TypeScript`, database via `pg`, validasi `zod`, keamanan `helmet`, `cors`, rate limiting, autentikasi via Supabase Auth (server client, service key), realtime via `socket.io`.
- Database: `Supabase Cloud (Postgres)` dengan RLS dan trigger audit; koneksi dari backend menggunakan `pg` dengan SSL.
- Testing: `k6` untuk uji performa, skenario CRUD dan concurrency transaksi (race condition). 
- Deployment: `Railway.app` untuk backend dan frontend. Supabase tetap sebagai layanan DB/Auth terkelola.

## Struktur Proyek
```
inventory/
  frontend/
    src/
      components/
      hooks/
      services/
      store/
      utils/
    index.html
    vite.config.ts
  backend/
    src/
      routes/
        barang/
          index.ts
        transaksi/
          index.ts
        user/
          index.ts
      middleware/
        auth.ts
        validator.ts
        error.ts
      services/
        transaksi.service.ts
      config/
        database.ts
        supabase.ts
        socket.ts
      server.ts
  tests/
    k6/
      transaksi-concurrency.js
  readme.md
  readme-new.md
```

## Frontend (React + TS + Vite)

Tujuan: Frontend tidak berkomunikasi langsung dengan Supabase. Semua data diambil dari backend REST API dan realtime via Socket.io.

- Konfigurasi API client (`frontend/src/services/api.ts`):
```ts
// frontend/src/services/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

// Lampirkan JWT yang diberikan backend pada login
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

- Socket.io client (`frontend/src/services/socket.ts`):
```ts
// frontend/src/services/socket.ts
import { io } from 'socket.io-client';

export const socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket'],
});
```

- Hook Auth (`frontend/src/hooks/useAuth.ts`):
```ts
import { useState, useEffect } from 'react';
import { api } from '@/services/api';

type User = { id: string; email: string; role: 'admin' | 'operator' };

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const me = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
  };

  useEffect(() => {
    me().catch(() => void 0);
  }, []);

  return { user, loading, login };
}
```

- Hook Barang (`frontend/src/hooks/useBarang.ts`):
```ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { socket } from '@/services/socket';

type Barang = {
  id: string;
  kode: string;
  nama: string;
  stok: number;
  lokasi_rak: string | null;
  updated_at: string;
};

export function useBarang(id?: string) {
  const qc = useQueryClient();

  const list = useQuery<Barang[]>({
    queryKey: ['barang'],
    queryFn: async () => (await api.get('/barang')).data,
  });

  // Realtime stok update dari backend via Socket.io
  if (id) {
    socket.emit('join', `barang-${id}`);
    socket.on('stok-updated', (payload: { id_barang: string; stok: number }) => {
      qc.setQueryData<Barang[]>(['barang'], (prev) =>
        (prev || []).map((b) => (b.id === payload.id_barang ? { ...b, stok: payload.stok } : b))
      );
    });
  }

  const create = async (payload: Omit<Barang, 'id' | 'updated_at'>) => {
    await api.post('/barang', payload);
    await qc.invalidateQueries({ queryKey: ['barang'] });
  };

  return { list, create };
}
```

## API Routes (Bagian dari Backend)

Semua routes berada di `backend/src/routes` dan di-mount pada prefix `/api`.

- Contoh registrasi routes (`backend/src/server.ts`):
```ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { Server } from 'socket.io';
import barangRouter from './routes/barang';
import transaksiRouter from './routes/transaksi';
import userRouter from './routes/user';
import { errorHandler } from './middleware/error';

const app = express();
const server = http.createServer(app);
export const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN } });

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.use('/api/barang', barangRouter);
app.use('/api/transaksi', transaksiRouter);
app.use('/api/user', userRouter);

app.use(errorHandler);

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`API running on :${port}`));
```

- Contoh route transaksi (`backend/src/routes/transaksi/index.ts`):
```ts
import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { z } from 'zod';
import { transaksiService } from '../../services/transaksi.service';

const router = Router();

const bodySchema = z.object({
  id_barang: z.string().uuid(),
  jumlah: z.number().int().positive(),
  tipe_transaksi: z.enum(['masuk', 'keluar']),
  tanggal: z.string().datetime(),
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const body = bodySchema.parse(req.body);
    const userId = req.user!.id;
    const trx = await transaksiService.handleTransaksi({ ...body, id_user: userId });
    res.json(trx);
  } catch (err) { next(err); }
});

export default router;
```

## Backend (Node.js + Express + pg)

- Koneksi database (`backend/src/config/database.ts`):
```ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
```

- Supabase server client (`backend/src/config/supabase.ts`):
```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

- Auth middleware (Supabase v2) (`backend/src/middleware/auth.ts`):
```ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { pool } from '../config/database';

declare global { namespace Express { interface Request { user?: { id: string; role: 'admin' | 'operator' } } } }

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
    const token = auth.slice('Bearer '.length);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ message: 'Unauthorized' });

    const { rows } = await pool.query('SELECT role FROM user_roles WHERE id = $1 LIMIT 1', [data.user.id]);
    const role = rows[0]?.role ?? 'operator';
    req.user = { id: data.user.id, role };
    next();
  } catch (e) { next(e); }
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  next();
}
```

- Transaksi service (ACID, row locking) (`backend/src/services/transaksi.service.ts`):
```ts
import { pool } from '../config/database';
import { io } from '../server';

type HandleTransaksiInput = {
  id_barang: string;
  jumlah: number;
  tipe_transaksi: 'masuk' | 'keluar';
  tanggal: string;
  id_user: string;
};

async function handleTransaksi(input: HandleTransaksiInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: barangs } = await client.query('SELECT stok FROM barang WHERE id = $1 FOR UPDATE', [input.id_barang]);
    if (!barangs.length) throw new Error('Barang not found');
    const stok = Number(barangs[0].stok);

    const delta = input.tipe_transaksi === 'masuk' ? input.jumlah : -input.jumlah;
    const newStok = stok + delta;
    if (newStok < 0) throw new Error('Stok tidak cukup');

    await client.query('UPDATE barang SET stok = $2, updated_at = NOW() WHERE id = $1', [input.id_barang, newStok]);

    const { rows: trxRows } = await client.query(
      `INSERT INTO transaksi (id_barang, jumlah, tipe_transaksi, tanggal, id_user, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [input.id_barang, input.jumlah, input.tipe_transaksi, input.tanggal, input.id_user]
    );

    await client.query('COMMIT');
    io.to(`barang-${input.id_barang}`).emit('stok-updated', { id_barang: input.id_barang, stok: newStok });
    return trxRows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export const transaksiService = { handleTransaksi };
```

## Database (Supabase Postgres) — Schema, RLS, Audit

- Tabel: `barang`, `transaksi`, `user_roles`.
```sql
-- barang
CREATE TABLE IF NOT EXISTS public.barang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  stok INTEGER NOT NULL DEFAULT 0,
  lokasi_rak TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- transaksi
CREATE TABLE IF NOT EXISTS public.transaksi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_barang UUID NOT NULL REFERENCES public.barang(id) ON DELETE RESTRICT,
  jumlah INTEGER NOT NULL CHECK (jumlah > 0),
  tipe_transaksi TEXT NOT NULL CHECK (tipe_transaksi IN ('masuk', 'keluar')),
  tanggal TIMESTAMPTZ NOT NULL,
  id_user UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- user_roles (sinkron dengan auth.users)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY, -- sama dengan auth.users.id
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- RLS Policies (contoh garis besar):
```sql
ALTER TABLE public.barang ENABLE ROW LEVEL SECURITY;
CREATE POLICY barang_select_authenticated ON public.barang
  FOR SELECT TO authenticated USING (true);
CREATE POLICY barang_write_admin ON public.barang
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.id = auth.uid() AND ur.role = 'admin'));

ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;
CREATE POLICY transaksi_select_authenticated ON public.transaksi
  FOR SELECT TO authenticated USING (true);
CREATE POLICY transaksi_insert_authenticated ON public.transaksi
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY transaksi_delete_admin ON public.transaksi
  FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.id = auth.uid() AND ur.role = 'admin'));
```

- Audit log dan trigger:
```sql
CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID,
  before_data JSONB,
  after_data JSONB
);

CREATE OR REPLACE FUNCTION public.audit_trigger_func() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_log(table_name, record_id, action, changed_by, after_data)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_log(table_name, record_id, action, changed_by, before_data, after_data)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_log(table_name, record_id, action, changed_by, before_data)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_barang ON public.barang;
CREATE TRIGGER audit_barang AFTER INSERT OR UPDATE OR DELETE ON public.barang
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_transaksi ON public.transaksi;
CREATE TRIGGER audit_transaksi AFTER INSERT OR UPDATE OR DELETE ON public.transaksi
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
```

- Proteksi stok tidak negatif (server-side):
```sql
CREATE OR REPLACE FUNCTION public.ensure_stok_not_negative() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stok < 0 THEN
    RAISE EXCEPTION 'Stok tidak boleh negatif';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_stok_not_negative_tr ON public.barang;
CREATE TRIGGER ensure_stok_not_negative_tr BEFORE UPDATE ON public.barang
FOR EACH ROW EXECUTE FUNCTION public.ensure_stok_not_negative();
```

Catatan: Logika transaksi utama tetap di-backend (Node + pg, `SELECT ... FOR UPDATE`) untuk konsistensi arsitektur, sementara trigger ini sebagai guard.

## Keamanan API
- Verifikasi JWT via Supabase `auth.getUser` dengan server client (service key).
- Role authorization via tabel `user_roles` (admin/operator).
- Validasi input dengan `zod` di routes.
- Tambahkan middleware keamanan:
  - `helmet()` untuk header keamanan.
  - `cors({ origin: CORS_ORIGIN })` untuk pembatasan asal.
  - Rate limiter (mis. `express-rate-limit`) untuk menahan brute force.

## k6 — Uji Concurrency & CRUD
```js
// tests/k6/transaksi-concurrency.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    keluar_heavy: {
      executor: 'constant-vus', vus: 50, duration: '30s',
    },
    masuk_heavy: {
      executor: 'constant-vus', vus: 50, duration: '30s',
    },
    crud_read: {
      executor: 'constant-arrival-rate', rate: 20, timeUnit: '1s', duration: '30s', preAllocatedVUs: 20,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE = __ENV.API_URL;
const TOKEN = __ENV.ACCESS_TOKEN; // dapatkan dari proses login backend

function headers() {
  return { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
}

export default function () {
  // transaksi keluar
  const payloadKeluar = JSON.stringify({
    id_barang: __ENV.BARANG_ID,
    jumlah: Math.floor(Math.random() * 3) + 1,
    tipe_transaksi: 'keluar',
    tanggal: new Date().toISOString(),
  });
  const r1 = http.post(`${BASE}/api/transaksi`, payloadKeluar, { headers: headers() });
  check(r1, { 'status 200-201': (res) => res.status === 200 || res.status === 201 });

  // transaksi masuk
  const payloadMasuk = JSON.stringify({
    id_barang: __ENV.BARANG_ID,
    jumlah: Math.floor(Math.random() * 3) + 1,
    tipe_transaksi: 'masuk',
    tanggal: new Date().toISOString(),
  });
  const r2 = http.post(`${BASE}/api/transaksi`, payloadMasuk, { headers: headers() });
  check(r2, { 'status 200-201': (res) => res.status === 200 || res.status === 201 });

  // read list transaksi
  const r3 = http.get(`${BASE}/api/transaksi`, { headers: headers() });
  check(r3, { 'status 200': (res) => res.status === 200 });

  sleep(1);
}
```

## Deployment ke Railway.app

### Backend
- Environment variables:
  - `PORT=3000`
  - `CORS_ORIGIN=https://your-frontend.example`
  - `SUPABASE_URL=https://YOUR_PROJECT.supabase.co`
  - `SUPABASE_SERVICE_KEY=...` (service role)
  - `SUPABASE_DB_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require`
- Pastikan `pg` menggunakan SSL: `ssl: { rejectUnauthorized: false }`.
- Build & start:
  - `npm run build` (tsc) → output ke `dist/`
  - `npm run start` → menjalankan server Express (dengan Socket.io).

### Frontend
- Environment variables:
  - `VITE_API_URL=https://your-backend.onrailway.app`
- Build & deploy via Railway static atau gunakan Netlify/Vercel; penting: arahkan ke backend API.

### Supabase
- Buat project Supabase, aktifkan Auth, buat tabel dan kebijakan RLS sesuai bagian Database.
- Catat `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, dan connection string Postgres.

## Catatan & Referensi
- Dokumen ini menyelaraskan requirement dari `readme.md` (login admin/operator, CRUD, low stock marking, k6 race condition, akurasi stok saat update concurrent, deployment ke Railway.app) dengan arsitektur Node-first.
- Realtime dipindahkan ke Socket.io agar frontend tidak berhubungan langsung dengan Supabase.
- Trigger database tetap sebagai guard; transaksi utama dilakukan di backend untuk kontrol penuh.