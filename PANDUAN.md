# Sistem Presensi Santri Asrama (Versi 6.0)
## Sheet Baru Otomatis Per Laporan, KOP Judul SMP & Kotak Data Per Asrama

Dokumentasi pembaruan menyeluruh sistem presensi santri asrama per kamar:
- **Tautan Langsung Google Sheets:** [Buka Google Sheets Presensi](https://docs.google.com/spreadsheets/d/144kdft1ccg2csUMS65NhTev9u7sl8ObiNJ75ybQRKF8/edit)
- **Aplikasi Web Presensi:**
  - Versi React/Vite: `http://localhost:5174/`
  - File HTML Mandiri: [standalone.html](file:///c:/Users/Admin/Downloads/Sinau-Beta-test-main/absen-sakit/standalone.html) / [absen-sakit.html](file:///c:/Users/Admin/Downloads/Sinau-Beta-test-main/absen-sakit.html)
- **Repositori GitHub:** [https://github.com/Zeinul899/presensi-santri-sakit](https://github.com/Zeinul899/presensi-santri-sakit)

---

## 1. Ringkasan Perubahan Utama (Versi 6.0)

1. **Penghapusan Fitur WhatsApp:**
   - Tombol dan pengaturan WhatsApp telah dihapus sepenuhnya dari antarmuka formulir.
   - Digantikan dengan tombol langsung **"Buka Sheets"** di bar atas dan **"Buka Spreadsheet Google Sheets"** serta **"Salin Link Sheets"** pada layar konfirmasi pengiriman.
2. **Sheet / Tab Baru Otomatis Setiap Kirim Laporan:**
   - Setiap kali petugas menekan tombol *Kirim Laporan*, Google Apps Script akan secara otomatis membuat sebuah **Tab Baru di posisi paling depan (index 0)**.
   - Penamaan Tab Otomatis: Contoh `28 Okt 2026 - Pagi`, `28 Okt 2026 - Malam`. Jika ada sesi susulan di waktu yang sama, otomatis diberi stempel jam (contoh `28 Okt 2026 - Pagi (14.50)`).
3. **KOP Judul Resmi SMP:**
   - Bagian atas sheet baru memuat KOP resmi:
     - Baris 1: **LAPORAN REKAPITULASI SANTRI SAKIT SMP** (Banner slate gelap, font tebal).
     - Baris 2: Sub-KOP memuat: `Bulan: [Nama Bulan] [Tahun] | Tanggal: [DD-MM-YYYY] | Sesi: [Pagi/Malam]`.
     - Baris 3: Info `Waktu Kirim | Petugas Pemeriksa | Total Dilaporkan`.
     - Baris 5: 4 Kotak Ringkasan Cepat: **TOTAL SAKIT**, **TOTAL IZIN**, **TOTAL ALPA**, dan **TOTAL KESELURUHAN**.
4. **Data Terpisah "Per Kotak" Berdasarkan Asrama:**
   - Santri yang dilaporkan tidak dicampur aduk dalam satu tabel panjang, melainkan dipisah menjadi **Kotak-kotak Data Terpisah** dengan garis batas solid mengelilingi kotak:
     - **KOTAK DATA: KELAS 9 • ASRAMA IPS LT 3**
     - **KOTAK DATA: KELAS 8**
     - **KOTAK DATA: KELAS 7**
   - Setiap kotak memiliki header kolom lengkap: `No | Nama Santri | Kamar | Status | Keluhan / Penyakit / Alasan | Obat yang Diberikan | Mulai Sejak | Lokasi Istirahat | Suhu Tubuh | Catatan Tambahan`.
5. **Penamaan Kamar Asrama yang Presisi:**
   - **Kelas 9:** Khusus mencantumkan `IPS Lt 3 - Kamar [Nomor]` (Kamar 1 s.d. 5).
   - **Kelas 8 & 7:** Hanya menampilkan `Kamar [Nomor]` (tanpa tulisan IPS).
6. **Penyimpanan Permanen (Master Sheet):**
   - Selain membuat tab baru per sesi, seluruh data juga dicatat secara permanen di tab **`Semua Riwayat`** sebagai arsip lengkap.

---

## 2. Struktur Tampilan Sheet Baru di Google Sheets

```
+--------------------------------------------------------------------------------------------------+
|                              LAPORAN REKAPITULASI SANTRI SAKIT SMP                               |
+--------------------------------------------------------------------------------------------------+
| Bulan: Oktober 2026   |   Tanggal: 28 Oktober 2026   |   Sesi Laporan: Pagi                      |
+--------------------------------------------------------------------------------------------------+
| Waktu Kirim: 28/10/2026 14:50:00 WIB  •  Petugas Pemeriksa: Faris  •  Total: 3 Santri            |
+--------------------------------------------------------------------------------------------------+
| [TOTAL SAKIT: 1]  |  [TOTAL IZIN: 1]  |  [TOTAL ALPA: 1]  |  [TOTAL KESELURUHAN: 3 SANTRI]       |
+--------------------------------------------------------------------------------------------------+

+--------------------------------------------------------------------------------------------------+
| KOTAK DATA: KELAS 9 • ASRAMA IPS LT 3 (1 Santri Dilaporkan)                                      |
+----+-----------------------+---------------------+--------+------------------------+-------------+
| No | Nama Santri           | Kamar               | Status | Keluhan / Alasan       | Obat        |
+----+-----------------------+---------------------+--------+------------------------+-------------+
| 1  | Zahran Yasser Hamzah  | IPS Lt 3 - Kamar 2  | ALPA   | Belum kembali ke kamar | -           |
+----+-----------------------+---------------------+--------+------------------------+-------------+

+--------------------------------------------------------------------------------------------------+
| KOTAK DATA: KELAS 8 (1 Santri Dilaporkan)                                                        |
+----+-----------------------+---------------------+--------+------------------------+-------------+
| No | Nama Santri           | Kamar               | Status | Keluhan / Alasan       | Obat        |
+----+-----------------------+---------------------+--------+------------------------+-------------+
| 1  | Alvin Kurniawan       | Kamar 3.01          | SAKIT  | Demam / Badan Panas    | Paracetamol |
+----+-----------------------+---------------------+--------+------------------------+-------------+

+--------------------------------------------------------------------------------------------------+
| KOTAK DATA: KELAS 7 (1 Santri Dilaporkan)                                                        |
+----+-----------------------+---------------------+--------+------------------------+-------------+
| No | Nama Santri           | Kamar               | Status | Keluhan / Alasan       | Obat        |
+----+-----------------------+---------------------+--------+------------------------+-------------+
| 1  | Ahmad Mushtofa Kamal  | Kamar 1.01          | IZIN   | Izin Pulang ke Rumah   | -           |
+----+-----------------------+---------------------+--------+------------------------+-------------+
```

---

## 3. Cara Memperbarui Skrip di Google Apps Script

Agar spreadsheet otomatis membuat tab baru dan format kotak data di atas:

1. Buka spreadsheet: [Google Sheets Presensi Asrama](https://docs.google.com/spreadsheets/d/144kdft1ccg2csUMS65NhTev9u7sl8ObiNJ75ybQRKF8/edit).
2. Di menu atas Google Sheets, klik **Extensions (Ekstensi)** > **Apps Script**.
3. Di editor Apps Script:
   - Tekan **Ctrl + A** (pilih semua kode).
   - Tekan **Delete** atau **Backspace** hingga halaman editor benar-benar kosong bersih.
4. Buka file [Code.gs](file:///c:/Users/Admin/Downloads/Sinau-Beta-test-main/absen-sakit/Code.gs) di komputer ini.
5. Salin semua isinya (**Ctrl + A** lalu **Ctrl + C**), lalu tempel (**Ctrl + V**) ke editor Apps Script.
6. Klik tombol **Save** (ikon disket atau **Ctrl + S**).
7. Klik tombol biru **Deploy (Terapkan)** di pojok kanan atas:
   - Pilih **Manage deployments (Kelola penerapan)**.
   - Klik ikon **Edit (Pensil)** di sebelah kiri.
   - Pada pilihan **Version**, pilih **New version (Versi baru)**.
   - Klik **Deploy (Terapkan)**.
8. Selesai! Kini setiap kali laporan dikirim dari formulir, tab baru langsung otomatis muncul di urutan paling depan.
