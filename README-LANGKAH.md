# APLIKASI ADMINISTRASI RT

Aplikasi ini menggunakan:
- GitHub = menyimpan kode
- Firebase Authentication = login
- Firebase Firestore = database online
- Firebase Hosting = alamat aplikasi online

## LANGKAH 1 — Buat proyek Firebase
1. Buka https://console.firebase.google.com/
2. Login dengan akun Google.
3. Klik Add project.
4. Beri nama, misalnya `rt-01-kiyaran`.
5. Ikuti proses sampai proyek selesai.

## LANGKAH 2 — Aktifkan Authentication
1. Firebase Console > Build > Authentication.
2. Get started.
3. Sign-in method > Email/Password.
4. Aktifkan Email/Password.
5. Tambahkan akun pengguna:
   - Ketua RT
   - Bendahara/Petugas
   - Warga

## LANGKAH 3 — Aktifkan Firestore
1. Build > Firestore Database.
2. Create database.
3. Pilih Production mode.
4. Pilih lokasi database yang sesuai.

## LANGKAH 4 — Ambil konfigurasi web
1. Project settings (ikon roda gigi).
2. General > Your apps.
3. Add app > Web.
4. Daftarkan aplikasi.
5. Firebase akan memberikan `firebaseConfig`.
6. Buka `app.js`.
7. Ganti bagian `firebaseConfig` dengan konfigurasi dari Firebase.

## LANGKAH 5 — Aturan hak akses
Upload isi `firestore.rules` ke Firestore Rules.

PENTING:
- warga hanya read
- ketua/bendahara dapat create/update/delete
- NIK dan No. KK tetap disimpan di database, tetapi di tampilan aplikasi selalu disamarkan.

## LANGKAH 6 — Role akun
Aplikasi membaca custom claim:
- `ketua`
- `bendahara`
- jika tidak ada claim, pengguna dianggap `warga`.

Custom claim sebaiknya dibuat menggunakan Firebase Admin SDK/Cloud Functions, bukan dari browser.

## LANGKAH 7 — Hosting
Instal Firebase CLI di komputer:
`npm install -g firebase-tools`

Login:
`firebase login`

Di folder aplikasi:
`firebase init hosting`

Pilih proyek Firebase yang sudah dibuat dan gunakan folder saat ini sebagai public directory.

Lalu:
`firebase deploy`

Aplikasi akan mendapatkan alamat `*.web.app`.

## CATATAN KEAMANAN
Jangan pernah menaruh password Ketua RT di file JavaScript.
Jangan memasukkan NIK/No. KK asli ke kode program.
Gunakan akun Firebase Authentication.
Backup database secara berkala.

## PENGEMBANGAN LANJUT
Versi berikutnya dapat ditambahkan:
- data KK dan hubungan anggota keluarga
- pencarian/filter warga
- cetak kartu data keluarga
- laporan kas bulanan/tahunan
- ekspor Excel/PDF
- grafik kependudukan
- pengumuman RT
- surat pengantar RT
- audit log perubahan data
- backup otomatis
