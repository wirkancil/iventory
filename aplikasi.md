# Inventori – Dokumentasi Aplikasi

Aplikasi inventori berbasis web yang terdiri dari frontend Next.js dan backend Express (Node.js), dengan autentikasi menggunakan Supabase. Dokumen ini menjelaskan arsitektur, konfigurasi lingkungan, cara menjalankan, alur autentikasi/otorisasi, endpoint API, halaman frontend, migrasi database, serta panduan troubleshooting.

## Ringkas
- Frontend: Next.js (App Router), Turbopack dev server.
- Backend: Express + Supabase SDK, CORS dikonfigurasi lewat env.
- Auth: Supabase Email/Password, token `access_token` disimpan di `localStorage` dan dipakai sebagai `Authorization: Bearer <token>` untuk backend.
- DB: Supabase (Postgres) dengan tabel `profiles`, `barang`, `transaksi` dan migrasi SQL.
- Port dev standar: Frontend `http://localhost:3001`, Backend `http://localhost:3000`.

## Struktur Proyek
```
/ (root)
├── backend/               # Server Express
│   ├── src/               # Source TypeScript
│   │   ├── middleware/    # Auth middleware
│   │   ├── routes/        # API routes (user, barang, transaksi, dashboard)
│   │   └── server.ts      # Entrypoint server
│   ├── .env               # Konfigurasi backend
│   └── package.json
├── frontend/              # Aplikasi Next.js
│   ├── src/app/           # Halaman App Router
│   ├── src/lib/           # util & supabase client
│   ├── .env.local         # Konfigurasi frontend
│   └── package.json
└── supabase/              # Migrasi SQL
    └── migrations/        # Skrip migrasi schema
```

## Prasyarat
- Node.js 18+ (disarankan LTS terbaru).
- Akses ke Supabase project (ref: `gvstwbohmnzouhsmizjt` atau milik Anda sendiri).
- Paket manager `npm`.

## Konfigurasi Lingkungan

### Frontend (`frontend/.env.local`)
Wajib diisi agar login Supabase bekerja dan frontend tahu base URL API backend.
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SUPABASE_URL=https://<project_ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_public_key>
```
Catatan:
- `NEXT_PUBLIC_SUPABASE_URL` harus mengarah ke project Supabase Anda (contoh: `https://gvstwbohmnzouhsmizjt.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` adalah kunci publik (anon) dari Supabase Dashboard: Project Settings → API → Project API keys → `anon public`.

### Backend (`backend/.env`)
Contoh variabel yang dipakai backend (sesuaikan jika belum ada):
```
PORT=3000
CORS_ORIGIN=http://localhost:3001
SUPABASE_URL=https://<project_ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
JWT_SECRET=rahasia
```
Catatan:
- `CORS_ORIGIN` harus mencakup origin frontend (mis. `http://localhost:3001`).
- `SUPABASE_SERVICE_KEY` disimpan hanya di backend (jangan pernah di frontend). Digunakan bila server perlu aksi privileged.
- `JWT_SECRET` hanya dipakai untuk fallback demo login lokal (jika ada fitur tersebut).

## Menjalankan Secara Lokal
1. Instal dependensi:
   - Backend: `cd backend && npm install`
   - Frontend: `cd frontend && npm install`
2. Pastikan env sudah diisi sesuai bagian di atas.
3. Jalankan backend:
   - `cd backend`
   - `npm run dev`
   - Output: `API running on :3000`
4. Jalankan frontend di port 3001:
   - `cd frontend`
   - `npm run dev -- -p 3001`
   - Kunjungi `http://localhost:3001/`

## Alur Autentikasi & Otorisasi
- Login di halaman utama menggunakan email/password Supabase.
- Frontend memanggil `supabase.auth.signInWithPassword` dan mendapatkan `session.access_token`.
- Token disimpan di `localStorage` dengan key `token`.
- Setiap request ke backend mengirim header `Authorization: Bearer <token>`.
- Middleware backend (`src/middleware/auth.ts`):
  - Memverifikasi token via `supabase.auth.getUser(token)`.
  - Mengambil `role` user dari tabel `profiles`.
  - Menolak akses (`401 Unauthorized`) jika token tidak valid.
  - Menolak akses admin-only (`403 Forbidden`) jika `role` bukan `admin`.

## Endpoint API (Ringkasan)
Prefix: `http://localhost:3000/api`
- `GET /user/me` — Profil user saat ini (role, email, id).
- `GET /user` — Daftar pengguna (admin-only).
- `POST /user` — Buat pengguna baru (admin-only).
- `PUT /user/:id` — Update pengguna (role, dll) (admin-only).
- `DELETE /user/:id` — Hapus pengguna (admin-only).
- `GET /barang` — Daftar barang (mendukung query `search`, `page`, `limit`).
- `GET /barang/:id` — Detail barang.
- `POST /barang` — Buat barang (admin-only).
- `PUT /barang/:id` — Update barang (admin-only).
- `DELETE /barang/:id` — Hapus barang (admin-only).
- `POST /transaksi` — Catat transaksi `masuk/keluar` dan update stok.
- `GET /transaksi` — Daftar transaksi (opsional query `id_barang`, `tipe_transaksi`, `limit`).
- `GET /dashboard/summary` — Ringkasan dashboard.
- `GET /dashboard/activity` — Aktivitas terbaru.
- `GET /dashboard/top-products` — Produk dengan stok tertinggi.

Catatan: Beberapa endpoint memerlukan peran `admin`. Pastikan `profiles.role='admin'` untuk akun yang digunakan.

## Halaman Frontend & Fitur
- `/` — Halaman login (Supabase Email/Password).
- `/dashboard` — Ringkasan inventori: total produk, total stok, stok menipis, stok habis, top stok.
- `/products` — CRUD barang, pencarian, edit, hapus (aksi modals). Membutuhkan peran admin untuk operasi tulis.
- `/transactions` — Form transaksi masuk/keluar, riwayat transaksi.
- `/low-stock` — Daftar barang dengan stok di bawah ambang batas (default ≤10).
- `/users` — Manajemen pengguna: list, ubah role, hapus (admin-only) dan membuka `Add User` ke halaman admin.
- `/admin` — Form tambah akun baru (oleh admin).

## Manajemen Peran Admin
- Peran disimpan pada tabel `profiles` di Supabase.
- Mengubah role via SQL (contoh):
  ```sql
  update profiles set role = 'admin' where email = 'email_anda@example.com';
  ```
- Setelah perubahan role, lakukan login ulang agar sesi memuat status terbaru.

## Migrasi Database Supabase
- Folder: `supabase/migrations/` berisi skrip SQL untuk menyiapkan schema.
- Terapkan migrasi via Supabase SQL Editor:
  1. Buka Dashboard → SQL Editor.
  2. Jalankan file SQL migrasi sesuai urutan kebutuhan (contoh yang ada di folder: setup profiles, inventori, auth, extensions).
- Atau gunakan Supabase CLI (opsional) jika proyek sudah terkonfigurasi untuk itu.

## Troubleshooting
- Login gagal: `AuthApiError: Invalid API key`
  - Periksa `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `frontend/.env.local`.
  - Pastikan tidak ada spasi/karakter tersembunyi; restart frontend setelah mengubah env.
- Aksi admin gagal: `API error: Forbidden`
  - Akun Anda bukan admin. Ubah role di `profiles` menjadi `admin` dan login ulang.
- Data tidak muncul: `API error: Unauthorized`
  - Token tidak tersimpan atau kedaluwarsa. Login lagi, pastikan `localStorage.getItem('token')` terisi.
- ERR_ABORTED di dev (`...?_rsc=...`)
  - Terjadi jika ada dua dev server aktif atau navigasi/HMR membatalkan request. Jalankan hanya satu instance frontend (3001) dan satu backend (3000). Hard refresh halaman.
- CORS error
  - Pastikan `CORS_ORIGIN` backend mencakup `http://localhost:3001`. Restart backend setelah mengubah env.
- Port sudah digunakan
  - Tutup server yang berjalan di port tersebut atau ubah port lewat env sebelum restart.

## Cheat Sheet Perintah
- Backend dev: `cd backend && npm run dev`
- Frontend dev (3001): `cd frontend && npm run dev -- -p 3001`
- Install deps: `npm install` pada masing-masing folder.

## Catatan Keamanan
- Jangan pernah menaruh `service_role_key` di frontend; hanya di backend `.env`.
- Lindungi endpoint admin dengan middleware `adminOnly`.
- Simpan rahasia hanya di `.env` dan jangan commit ke repository publik.

## Deploy (Garis Besar)
- Backend: Deploy Node.js (Express) ke platform pilihan, set env (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CORS_ORIGIN`, `PORT`).
- Frontend: Build Next.js dan deploy ke Vercel atau platform lain, set env publik (`NEXT_PUBLIC_*`). Pastikan `NEXT_PUBLIC_API_URL` mengarah ke domain backend terdeploy.

---