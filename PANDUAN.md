# Sistem Presensi Santri Asrama (Versi 6.2)
## Penambahan Kolom Kelas di Spreadsheet & Perbaikan Data Dobel

Dokumentasi pembaruan sistem presensi santri asrama per kamar:
- **Tautan Langsung Google Sheets:** [Buka Google Sheets Presensi](https://docs.google.com/spreadsheets/d/144kdft1ccg2csUMS65NhTev9u7sl8ObiNJ75ybQRKF8/edit)
- **Aplikasi Web Presensi:**
  - Versi React/Vite: `http://localhost:5174/`
  - File HTML Mandiri: [standalone.html](file:///c:/Users/Admin/Downloads/Sinau-Beta-test-main/absen-sakit/standalone.html) / [absen-sakit.html](file:///c:/Users/Admin/Downloads/Sinau-Beta-test-main/absen-sakit.html)
- **Repositori GitHub:** [https://github.com/Zeinul899/presensi-santri-sakit](https://github.com/Zeinul899/presensi-santri-sakit)

---

## 1. Pembaruan Versi 6.2

1. **Perbaikan Masalah Data Terkirim Dobel (2x Masuk Sheets):**
   - Sebelumnya, formulir mengeksekusi pengiriman ganda (pengiriman batch + pengiriman cadangan per santri + hidden form).
   - Sekarang mekanisme pengiriman disederhanakan secara presisi: **Hanya 1 permintaan (single batch request)** via `fetch POST` yang dikirimkan ke Google Apps Script.
   - Hasil: Memilih 1 santri akan tercatat tepat **1 baris** di Google Sheets (tidak akan lagi dobel 2 kali).

2. **Penambahan Kolom "Kelas" di Tabel Google Sheets:**
   - Kolom tabel di setiap kotak asrama kini berjumlah **11 Kolom Lengkap**, dengan kolom **Kelas** ditambahkan tepat di sebelah nama santri:
     `No | Nama Santri | Kelas | Kamar | Status | Keluhan / Penyakit / Alasan | Obat yang Diberikan | Mulai Sejak | Lokasi Istirahat | Suhu | Catatan Tambahan`
   - Nilai kolom kelas otomatis terisi sesuai jenjang santri: `Kelas 9`, `Kelas 8`, atau `Kelas 7`.

3. **Penghapusan Nama Petugas Bawaan:**
   - Teks "Faris / Zahran" telah dihapus dari seluruh placeholder, komentar skrip, data simulasi, dan KOP spreadsheet.
   - Info petugas pada KOP hanya akan muncul jika memang diketik nama petugas baru oleh pengurus.

---

## 2. Struktur Tampilan Sheet Baru di Google Sheets (11 Kolom)

```
+----------------------------------------------------------------------------------------------------------------+
|                                     LAPORAN REKAPITULASI SANTRI SAKIT SMP                                      |
+----------------------------------------------------------------------------------------------------------------+
| Bulan: Oktober 2026   |   Tanggal: 28 Oktober 2026   |   Sesi Laporan: Pagi                                    |
+----------------------------------------------------------------------------------------------------------------+
| Waktu Kirim: 28/10/2026 19:40:00 WIB  •  Total Dilaporkan: 3 Santri                                            |
+----------------------------------------------------------------------------------------------------------------+
| [TOTAL SAKIT: 1]      |  [TOTAL IZIN: 1]             |  [TOTAL ALPA: 1]          |  [TOTAL REKAP: 3 SANTRI]    |
+----------------------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------------------+
| KELAS 9 • ASRAMA IPS LT 3   —   1 Santri Dilaporkan                                                            |
+----+-----------------------+---------+---------------------+--------+------------------------+-----------------+
| No | Nama Santri           | Kelas   | Kamar               | Status | Keluhan / Alasan       | Obat            |
+----+-----------------------+---------+---------------------+--------+------------------------+-----------------+
| 1  | Santri Contoh         | Kelas 9 | IPS Lt 3 - Kamar 2  | ALPA   | Belum kembali ke kamar | -               |
+----+-----------------------+---------+---------------------+--------+------------------------+-----------------+

+----------------------------------------------------------------------------------------------------------------+
| KELAS 8   —   1 Santri Dilaporkan                                                                              |
+----+-----------------------+---------+---------------------+--------+------------------------+-----------------+
| No | Nama Santri           | Kelas   | Kamar               | Status | Keluhan / Alasan       | Obat            |
+----+-----------------------+---------+---------------------+--------+------------------------+-----------------+
| 1  | Alvin Kurniawan       | Kelas 8 | Kamar 3.01          | SAKIT  | Demam / Badan Panas    | Paracetamol     |
+----+-----------------------+---------+---------------------+--------+------------------------+-----------------+

+----------------------------------------------------------------------------------------------------------------+
| KELAS 7   —   1 Santri Dilaporkan                                                                              |
+----+-----------------------+---------+---------------------+--------+------------------------+-----------------+
| No | Nama Santri           | Kelas   | Kamar               | Status | Keluhan / Alasan       | Obat            |
+----+-----------------------+---------+---------------------+--------+------------------------+-----------------+
| 1  | Ahmad Mushtofa Kamal  | Kelas 7 | Kamar 1.01          | IZIN   | Izin Pulang ke Rumah   | -               |
+----+-----------------------+---------+---------------------+--------+------------------------+-----------------+
```

---

## 3. Cara Memperbarui Skrip di Google Apps Script

1. Buka spreadsheet: [Google Sheets Presensi Asrama](https://docs.google.com/spreadsheets/d/144kdft1ccg2csUMS65NhTev9u7sl8ObiNJ75ybQRKF8/edit).
2. Di menu atas Google Sheets, klik **Extensions (Ekstensi)** > **Apps Script**.
3. Di editor Apps Script:
   - Tekan **Ctrl + A** (pilih semua kode).
   - Tekan **Delete** atau **Backspace** hingga halaman editor benar-benar kosong bersih.
4. Buka file [Code.gs](file:///c:/Users/Admin/Downloads/Sinau-Beta-test-main/absen-sakit/Code.gs).
5. Salin semua isinya (**Ctrl + A** lalu **Ctrl + C**), lalu tempel (**Ctrl + V**) ke editor Apps Script.
6. Klik tombol **Save** (ikon disket atau **Ctrl + S**).
7. Klik tombol biru **Deploy (Terapkan)** di pojok kanan atas:
   - Pilih **Manage deployments (Kelola penerapan)**.
   - Klik ikon **Edit (Pensil)** di sebelah kiri.
   - Pada pilihan **Version**, pilih **New version (Versi baru)**.
   - Klik **Deploy (Terapkan)**.
