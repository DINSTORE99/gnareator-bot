# Vercel Bot Script Generator

Generator project bot WhatsApp / Telegram berbasis Node.js yang dapat di-deploy ke Vercel.

## GitHub
1. Buat repository baru di GitHub.
2. Upload seluruh isi folder ini.
3. Pastikan `package.json`, `vercel.json`, `api/`, dan `public/` berada di root repository.

## Vercel
Import repository tersebut ke Vercel.
Vercel akan menjalankan API `/api/generate`.

Tidak perlu VPS untuk website generator.

## Catatan
Website ini menghasilkan ZIP template. Bot WhatsApp/Telegram hasil generate tetap dijalankan di VPS/hosting Node.js, bukan sebagai proses permanen di Vercel.
