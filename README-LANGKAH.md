# APLIKASI ADMINISTRASI RT — VERSI SIAP PAKAI

Paket ini sudah diperbaiki agar:

1. **Warga tidak perlu login** — langsung bisa melihat data warga, kas, dan statistik.
2. **Pengelola cukup memasukkan PASSWORD** — email Firebase disimpan di dalam program dan tidak ditampilkan.
3. Pengelola dapat **tambah, edit, dan hapus data warga**.
4. Pengelola dapat **tambah, edit, dan hapus kas RT**.
5. Data NIK/KK lengkap berada di `warga_private` dan hanya dapat dibaca pengelola.
6. Warga hanya melihat NIK/KK yang sudah disamarkan.
7. Firestore Rules sudah disesuaikan: hanya akun dengan `role: pengelola` yang boleh mengubah data.
8. Data tersimpan otomatis di Firestore.

## A. YANG PERLU DILAKUKAN SATU KALI DI FIREBASE

### 1. Authentication

Buka Firebase Console → project **administrasi-rt01** → Authentication → Sign-in method.

Aktifkan:
**Email/Password**

Kemudian buka:
Authentication → Users → Add user.

Jika akun `munzifani@gmail.com` SUDAH ADA, jangan membuat akun baru. Pakai akun tersebut.

Jika belum ada, buat akun:
- Email: `munzifani@gmail.com`
- Password: buat password rahasia Anda sendiri.

> Email tersebut hanya dipakai sebagai identitas internal Firebase. Pengguna aplikasi tidak akan melihat atau mengetiknya.

### 2. Catat UID

**Penting:** UID hanya digunakan sekali untuk membuat dokumen pengelola di Firestore. UID TIDAK dimasukkan ke halaman login dan TIDAK perlu diedit di `app.js`.

Setelah user dibuat, klik user tersebut dan salin **User UID**.

### 3. Buat dokumen Firestore

Di sinilah UID dimasukkan.

Buka Firestore Database → Data → buat collection:

`users`

Buat dokumen dengan:
- Document ID = **UID yang tadi disalin**
- Field: `role`
- Type: `string`
- Value: `pengelola`

Contoh:

`users / abc123...`

Artinya: nama collection adalah `users`, sedangkan `abc123...` adalah **UID persis dari akun `munzifani@gmail.com`**.

| Field | Type | Value |
|---|---|---|
| role | string | pengelola |

### 4. Pasang Firestore Rules

Buka Firestore Database → Rules.

Hapus rules lama, lalu isi dengan seluruh isi file `firestore.rules` dari paket ini.

Klik **Publish**.

## B. MENJALANKAN APLIKASI

### Jika sudah memakai Firebase Hosting

Buka folder aplikasi melalui terminal/Command Prompt:

`firebase deploy`

Setelah selesai, buka alamat Hosting Firebase Anda.

### Jika memakai GitHub

Upload file:
- `index.html`
- `style.css`
- `app.js`
- `firebase.json`
- `firestore.rules`

Jangan upload database atau data warga ke GitHub.

## C. CARA MEMAKAI

### Warga
Warga cukup membuka alamat aplikasi.

Warga dapat:
- melihat data warga,
- mencari nama,
- memakai filter,
- melihat kas,
- melihat statistik.

Warga **tidak memiliki tombol tambah/edit/hapus**.

### Pengelola
Klik tombol **Pengelola** → masukkan password → **Masuk**.

Setelah berhasil:
- data warga dapat ditambah/edit/hapus;
- kas dapat ditambah/edit/hapus;
- tombol **Keluar** muncul.

## D. PENTING

Jangan membagikan password pengelola.

Jika password diketahui orang lain, orang tersebut dapat mengubah data sesuai hak pengelola.

Firebase API Key yang berada di `app.js` bukan password database. Keamanan utama berada pada **Authentication + Firestore Rules**.

## E. STRUKTUR DATA

- `users` → menentukan siapa pengelola
- `warga_public` → data warga yang aman untuk ditampilkan kepada warga
- `warga_private` → NIK, KK, alamat lengkap, hanya pengelola
- `kas` → transaksi kas RT

## F. HASIL AKHIR

Alur aplikasi:

WARGA:
Buka aplikasi → langsung melihat data → selesai.

PENGELOLA:
Buka aplikasi → Pengelola → Password → masuk → tambah/edit/hapus → Keluar.

Tidak ada lagi kolom email di halaman login.


## G. KETERANGAN UNTUK PEMILIK APLIKASI

Versi ini sudah dikunci untuk akun pengelola Firebase:

`munzifani@gmail.com`

Di halaman login aplikasi hanya muncul kolom **Password**. Email tidak ditampilkan.

Jika Anda mengganti akun pengelola di masa depan, bagian `LOGIN_EMAIL` di `app.js` perlu disesuaikan oleh orang yang membantu mengelola aplikasi.
