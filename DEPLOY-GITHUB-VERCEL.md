# Deploy ARAH ke GitHub dan Vercel

Ikuti urutan ini. Jangan memasukkan key Supabase ke file source code atau GitHub.

## 1. Siapkan database Supabase

1. Buka project Supabase yang dipakai ARAH.
2. Masuk ke **SQL Editor** → **New query**.
3. Buka file `supabase/schema.sql`, salin seluruh isinya, tempel ke editor, lalu klik **Run**.
4. Buka **Project Settings** → **API** dan simpan tiga nilai berikut:
   - Project URL
   - Publishable/anon key
   - `service_role` key

`service_role` adalah rahasia server. Jangan memakai nama environment variable yang diawali `NEXT_PUBLIC_` untuk key tersebut.

## 2. Tes lokal versi production

Buka terminal pada folder project, lalu:

```bash
cp .env.example .env.local
nano .env.local
pnpm install
pnpm dev
```

Isi `.env.local` seperti ini:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ISI_PUBLISHABLE_ATAU_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=ISI_SERVICE_ROLE_KEY
```

Simpan di nano dengan `Ctrl+O`, Enter, lalu keluar dengan `Ctrl+X`. Buka `http://localhost:3000`, buat akun tes, dan cek tambah/edit/hapus transaksi.

## 3. Upload ke GitHub

Paket ini sudah berupa repository Git lokal. Setelah diekstrak, buka terminal pada folder `ARAH-Vercel`, lalu buat repository **kosong** di GitHub. Jangan centang README, `.gitignore`, atau license di halaman pembuatan repository.

Jalankan perintah yang diberikan GitHub, bentuknya seperti ini:

```bash
git branch -M main
git remote add origin https://github.com/USERNAME/arah-finance.git
git push -u origin main
```

Kalau diminta login, selesaikan login GitHub melalui browser/credential manager. Password akun biasa tidak dipakai sebagai password Git HTTPS.

Alternatif tanpa terminal: buka GitHub Desktop → **File** → **Add local repository** → pilih folder hasil ekstrak → **Publish repository**.

## 4. Import ke Vercel

1. Buka dashboard Vercel.
2. Pilih **Add New…** → **Project**.
3. Pilih repository `arah-finance`, lalu klik **Import**.
4. Framework seharusnya otomatis terbaca sebagai **Next.js**.
5. Buka bagian **Environment Variables** dan tambahkan:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase |

Aktifkan untuk Production, Preview, dan Development. Setelah itu klik **Deploy**.

## 5. Hubungkan URL Vercel ke Supabase Auth

Setelah deployment selesai, salin URL production, misalnya `https://arah-finance.vercel.app`.

Di Supabase buka **Authentication** → **URL Configuration**:

- **Site URL**: `https://arah-finance.vercel.app`
- **Redirect URLs**:
  - `https://arah-finance.vercel.app/**`
  - `http://localhost:3000/**`

Jika nanti memakai domain sendiri, tambahkan juga `https://domain-kamu.com/**` dan ubah Site URL ke domain utama.

## 6. Cek hasil deployment

- Buat akun baru dan konfirmasi email jika email confirmation aktif.
- Login dengan dua akun berbeda dan pastikan datanya terpisah.
- Tes CRUD transaksi, proyek, agenda, serta edit profil.
- Upload lalu download bukti transaksi berukuran di bawah 4 MB.
- Tes role admin, editor, dan viewer pada workspace bersama.
- Buka tab baru dan cek ikon ARAH di tab browser.

Favicon browser biasanya muncul langsung setelah hard refresh. Ikon di hasil mesin pencari baru muncul setelah situs dirayapi ulang, sehingga waktunya tidak dapat dipastikan oleh aplikasi.

## Update berikutnya

Setelah mengubah source code:

```bash
git add .
git commit -m "Update ARAH"
git push
```

Vercel akan membuat deployment baru otomatis dari branch `main`.

## Troubleshooting singkat

- **Supabase key missing**: cek ketiga Environment Variables di Vercel, lalu redeploy.
- **Login balik ke localhost/salah URL**: perbaiki Site URL dan Redirect URLs di Supabase Auth.
- **Database/table not found**: jalankan ulang `supabase/schema.sql` di SQL Editor.
- **Upload terlalu besar**: kompres file sampai di bawah 4 MB.
- **Favicon masih ikon lama**: hard refresh atau buka incognito; cache favicon browser bisa bertahan cukup lama.
