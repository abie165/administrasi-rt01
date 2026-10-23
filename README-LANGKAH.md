PANDUAN PERBAIKAN DOKUMEN RT-01 — MODE GRATIS TANPA FIREBASE STORAGE

PENTING
- Paket ini tidak menggunakan Firebase Storage untuk dokumen BARU, sehingga tidak meminta upgrade Firebase ke Blaze.
- Data warga, data kas, login, dan dokumen lama di Firestore tidak dihapus atau dimigrasikan.
- Dokumen baru diunggah manual ke Google Drive, lalu tautannya disimpan ke daftar Dokumen RT melalui Firestore.
- File yang sudah ada di Firebase Storage tetap seperti semula; jangan hapus.

CARA MENAMBAH DOKUMEN BARU
1. Buka https://drive.google.com/ dan masuk ke akun Google Anda.
2. Klik Baru > Upload file, lalu pilih PDF. Tunggu hingga upload Drive selesai.
3. Klik kanan file PDF di Drive > Bagikan.
4. Pada Akses umum, pilih “Siapa saja yang memiliki link” dan peran “Pelihat”. Klik Selesai.
   PERHATIAN: orang yang memiliki tautan dapat membuka dokumen. Jangan gunakan untuk PDF rahasia atau berisi NIK/No. KK.
5. Salin tautan berbagi. Biasanya formatnya https://drive.google.com/file/d/ID_FILE/view?usp=sharing
6. Di GitHub, perbarui hanya index.html dan app.js dari paket ini. Jangan mengganti firebase.json, firestore.rules, storage.rules, atau style.css.
7. Buka situs GitHub Pages dan tekan Ctrl+F5. Login sebagai Pengelola > Dokumen > Unggah PDF. Isi judul, kategori, keterangan, lalu tempel tautan Drive dan tekan Simpan tautan PDF.
8. Buka laman Dokumen sebagai warga dan uji tautan.

CATATAN KEAMANAN DAN DATA
- Ini adalah cara gratis sederhana; proses upload file dilakukan di Google Drive, bukan langsung di aplikasi.
- Firestore hanya menyimpan metadata dan tautan. Data lama tidak dihapus.
- Tombol Hapus pada dokumen lama dapat menghapus catatan Firestore dan, untuk dokumen lama yang memiliki storagePath, mencoba menghapus file lama di Storage. Jangan hapus dokumen lama kecuali memang yakin.
- Jika aturan Firestore belum mengizinkan pengelola menambah dokumen pada koleksi dokumen_rt, penyimpanan tautan akan ditolak. Jangan mengganti aturan secara membabi buta; minta bantuan untuk memeriksa aturan yang sedang dipakai.
