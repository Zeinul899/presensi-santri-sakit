# Sistem Presensi Santri Asrama (Versi 7.0)
## Otomatis Buat Spreadsheet Baru dengan Link Baru & Tampilan Bersih Tanpa Bar Atas

Dokumentasi pembaruan sistem presensi santri asrama per kamar:
- **Aplikasi Web Presensi:**
  - Versi React/Vite: `http://localhost:5174/`
  - File HTML Mandiri: [standalone.html](file:///c:/Users/Admin/Downloads/Sinau-Beta-test-main/absen-sakit/standalone.html) / [absen-sakit.html](file:///c:/Users/Admin/Downloads/Sinau-Beta-test-main/absen-sakit.html)
- **Repositori GitHub:** [https://github.com/Zeinul899/presensi-santri-sakit](https://github.com/Zeinul899/presensi-santri-sakit)

---

## 1. Ringkasan Pembaruan Versi 7.0

1. **Penghapusan Bar Atas (Border Atas Dihapus):**
   - Bar status mengambang di atas formulir (`Presensi Asrama (Sakit/Izin/Alpa)`, tombol `[Buka Sheets]`, `Riwayat`, dan `Sheets Aktif`) serta strip dekoratif atas telah **dihapus seutuhnya**.
   - Halaman kini tampil rapi, bersih, dan langsung fokus pada formulir pendataan.
   - Akses menu **Riwayat** dan **Pengaturan Sheets** dialihkan ke footer minimalis di bagian bawah halaman.

2. **Otomatis Buat File Google Spreadsheet Baru (Link Baru, Bukan Link Lama):**
   - Skrip Google Apps Script `Code.gs` v7.0 kini menggunakan `SpreadsheetApp.create(...)` untuk secara otomatis membuat **File Google Spreadsheet Baru** di Google Drive setiap kali laporan dikirimkan.
   - Nama file baru berformat rapi:  
     `Laporan Rekap Santri Sakit SMP - [Tanggal Bulan Tahun] ([Sesi Pagi/Malam])`
   - Setelah laporan terkirim, aplikasi web langsung menerima dan menampilkan **Link Baru** file spreadsheet tersebut lengkap dengan tombol:
     - `[Buka Spreadsheet Baru (Link Baru)]`
     - `[Salin Link Baru]`
   - Tautan lama (`144kdft1ccg2csUMS65NhTev9u7sl8ObiNJ75ybQRKF8`) telah dibersihkan secara otomatis dari penyimpanan browser (`localStorage`).

3. **Format Tabel Lengkap 11 Kolom dengan Kolom Kelas:**
   - Setiap kotak asrama (`Kelas 9 - IPS Lt 3`, `Kelas 8`, `Kelas 7`) disajikan dalam tabel rapi dengan 11 kolom:
     `No | Nama Santri | Kelas | Kamar | Status | Keluhan / Penyakit / Alasan | Obat yang Diberikan | Mulai Sejak | Lokasi Istirahat | Suhu | Catatan Tambahan`

---

## 2. Cara Memperbarui Kode di Google Apps Script (v7.0)

Untuk mengaktifkan pembuatan spreadsheet baru otomatis pada setiap laporan:
1. Buka [Google Apps Script Dashboard](https://script.google.com/home) atau buka salah satu Google Spreadsheet > menu **Extensions (Ekstensi)** > **Apps Script**.
2. Di editor Apps Script:
   - Tekan **Ctrl + A** (pilih semua kode lama).
   - Tekan **Delete** atau **Backspace** hingga halaman editor benar-benar kosong bersih.
3. Buka file [Code.gs](file:///c:/Users/Admin/Downloads/Sinau-Beta-test-main/absen-sakit/Code.gs).
4. Salin semua kodenya (**Ctrl + A** lalu **Ctrl + C**), lalu tempel (**Ctrl + V**) ke editor Apps Script.
5. Klik ikon **Save** (ikon disket atau **Ctrl + S**).
6. Terapkan versi baru:
   - Klik **Deploy (Terapkan)** di pojok kanan atas > pilih **Manage deployments (Kelola penerapan)**.
   - Klik ikon **Edit (ikon pensil)** pada penerapan aktif.
   - Di bagian **Version (Versi)**, pilih **New version (Versi baru)**.
   - Pastikan **Who has access** tetap **Anyone (Siapa saja)**.
   - Klik tombol **Deploy (Terapkan)**.
7. Selesai! Sekarang setiap kali formulir dikirim, sistem otomatis membuat file spreadsheet baru dengan link baru di Google Drive Anda.
