# ARAH

ARAH adalah dashboard keuangan multi-user untuk mencatat pemasukan, pengeluaran, proyek, agenda, bukti transaksi, target finansial, dan progres tabungan.

## Stack production

- Next.js + React
- Supabase Auth untuk login dan registrasi
- Supabase Postgres untuk data setiap akun/workspace
- Supabase Storage untuk bukti transfer dan mutasi
- Vercel untuk hosting

Setiap akun memiliki workspace pribadi. Workspace dapat dibagikan dengan peran admin, editor, atau viewer. Akses data dan file diperiksa kembali di server pada setiap request.

## Menjalankan secara lokal

1. Salin `.env.example` menjadi `.env.local`.
2. Isi tiga environment variable Supabase.
3. Jalankan SQL di `supabase/schema.sql` melalui Supabase SQL Editor.
4. Jalankan:

```bash
pnpm install
pnpm dev
```

Buka `http://localhost:3000`.

## Deploy

Ikuti [DEPLOY-GITHUB-VERCEL.md](./DEPLOY-GITHUB-VERCEL.md). Jangan pernah commit `.env.local` atau membagikan `SUPABASE_SERVICE_ROLE_KEY`.

## Catatan

- Upload bukti mendukung PDF, JPG, PNG, dan WebP hingga 4 MB.
- Favicon dan ikon aplikasi tersedia di `public/favicon.svg` dan otomatis dipasang oleh metadata Next.js.
- Data dari versi D1/Cloudflare lama tidak otomatis dipindahkan ke Supabase.
