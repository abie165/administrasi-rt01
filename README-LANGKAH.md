# APLIKASI ADMINISTRASI RT — FINAL

## Isi paket
- `index.html` — tampilan aplikasi
- `style.css` — desain mobile ringan
- `app.js` — fungsi aplikasi + koneksi Firebase
- `firebase.json` — konfigurasi Firebase Hosting/Firestore
- `firestore.rules` — aturan keamanan database

## Hak akses
- Warga: melihat data warga, mencari/filter, melihat kas dan statistik.
- Ketua RT: mengelola data warga dan kas.
- Bendahara: mengelola kas.
- Tidak ada login saat aplikasi dibuka. Login hanya saat tombol **Pengelola** ditekan.

## 1. Buat project Firebase
1. Buka Firebase Console.
2. Buat project baru.
3. Tambahkan Web App.
4. Salin konfigurasi Firebase.
5. Buka `app.js`, cari `const firebaseConfig`, lalu ganti nilai `GANTI_...` dengan konfigurasi milik Anda.

## 2. Aktifkan Authentication
Firebase Console → Authentication → Sign-in method → aktifkan **Email/Password**.
Buat akun email untuk Ketua RT dan Bendahara.

## 3. Buat Firestore
Firebase Console → Firestore Database → Create database.
Buat collection `users`.
Untuk masing-masing akun, buat dokumen dengan ID = UID akun Authentication.
Contoh:
- `users/UID_KETUA` → `role: ketua`
- `users/UID_BENDAHARA` → `role: bendahara`

## 4. Pasang Rules
Firebase Console → Firestore Database → Rules → salin isi `firestore.rules` → Publish.

## 5. Upload ke GitHub
Buat repository baru, lalu upload semua file dalam paket ini. Jangan upload data warga nyata di repository.

## 6. Publish ke Firebase Hosting
Install Firebase CLI:
`npm install -g firebase-tools`

Lalu:
`firebase login`

Di folder aplikasi:
`firebase deploy`

## 7. Alur penggunaan
Dashboard langsung terbuka tanpa login. Warga dapat mencari nama dan memakai filter. Untuk perubahan data, tekan **Pengelola** dan masuk dengan akun Ketua RT/Bendahara.

## Catatan privasi
Data lengkap NIK/KK disimpan di `warga_private` dan hanya dapat diakses Ketua RT melalui Rules. Data yang tampil kepada pengunjung berada di `warga_public` dengan NIK/KK sudah disamarkan. Karena `warga_public` dan `kas` dapat dibaca tanpa login, jangan memasukkan informasi sensitif lain ke data publik.
