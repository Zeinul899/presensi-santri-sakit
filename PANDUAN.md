# Sistem Presensi Santri Asrama (Versi 6.1)
## Pembaruan Tata Letak Google Sheets & Pembersihan Nama Petugas

Dokumentasi pembaruan menyeluruh sistem presensi santri asrama per kamar:
- **Tautan Langsung Google Sheets:** [Buka Google Sheets Presensi](https://docs.google.com/spreadsheets/d/144kdft1ccg2csUMS65NhTev9u7sl8ObiNJ75ybQRKF8/edit)
- **Aplikasi Web Presensi:**
  - Versi React/Vite: `http://localhost:5174/`
  - File HTML Mandiri: [standalone.html](file:///c:/Users/Admin/Downloads/Sinau-Beta-test-main/absen-sakit/standalone.html) / [absen-sakit.html](file:///c:/Users/Admin/Downloads/Sinau-Beta-test-main/absen-sakit.html)
- **Repositori GitHub:** [https://github.com/Zeinul899/presensi-santri-sakit](https://github.com/Zeinul899/presensi-santri-sakit)

---

## 1. Pembaruan Versi 6.1

1. **Penghapusan Teks "Faris / Zahran":**
   - Teks "Faris / Zahran" telah dihapus dari seluruh placeholder formulir, komentar skrip, data simulasi, dan KOP spreadsheet.
   - Pada input formulir, teks petunjuk diubah menjadi generic: `Tulis nama petugas pemeriksa kamar...`.
   - Di baris KOP Google Sheets, info petugas hanya akan muncul jika memang diketik nama oleh pengguna. Jika dikosongkan, baris KOP hanya menampilkan: `Waktu Kirim: [timestamp] WIB • Total Dilaporkan: [X] Santri`.
   - `localStorage` browser yang sebelumnya menyimpan nama lama secara otomatis dibersihkan.

2. **Perapian Tata Letak Google Sheets (Executive Layout):**
   - **Tampilan Bersih (Borderless Canvas):** Gridlines bawaan spreadsheet dinonaktifkan pada tab laporan harian sehingga lembar kerja tampak seperti dokumen PDF / dasbor profesional yang bersih dan elegan.
   - **Garis Tabel Rapi (Subtle Dividers):** Garis kotak antar sel di dalam tabel tidak lagi menggunakan border tebal yang padat, melainkan divider horizontal tipis (`#E2E8F0`) tanpa garis vertikal kolom yang kaku, sehingga data santri sangat mudah dibaca.
   - **Border Kartu Luar (Solid Card Frame):** Setiap asrama memiliki bingkai luar solid (`#64748B`) yang mempertegas pemisahan kotak per gedung asrama.
   - **Text Wrapping Aktif:** Kolom keluhan, obat, lokasi, dan catatan diatur otomatis membungkus teks (*wrap strategy*) sehingga tidak ada tulisan panjang yang terpotong.
   - **4 Kartu Ringkasan KPI Simetris:** Kotak ringkasan di Baris 5 dibagi secara proporsional dan simetris di atas 10 kolom:
     - `TOTAL SAKIT` (Kolom A-C)
     - `TOTAL IZIN` (Kolom D-E)
     - `TOTAL ALPA` (Kolom F-G)
     - `TOTAL REKAP` (Kolom H-J)

---

## 2. Struktur Tampilan Sheet Baru di Google Sheets

```
+--------------------------------------------------------------------------------------------------+
|                              LAPORAN REKAPITULASI SANTRI SAKIT SMP                               |
+--------------------------------------------------------------------------------------------------+
| Bulan: Oktober 2026   |   Tanggal: 28 Oktober 2026   |   Sesi Laporan: Pagi                      |
+--------------------------------------------------------------------------------------------------+
| Waktu Kirim: 28/10/2026 19:40:00 WIB  •  Total Dilaporkan: 3 Santri                              |
+--------------------------------------------------------------------------------------------------+
| [TOTAL SAKIT: 1]  |  [TOTAL IZIN: 1]  |  [TOTAL ALPA: 1]  |  [TOTAL REKAP: 3 SANTRI]             |
+--------------------------------------------------------------------------------------------------+

+--------------------------------------------------------------------------------------------------+
| KELAS 9 • ASRAMA IPS LT 3   —   1 Santri Dilaporkan                                              |
+----+-----------------------+---------------------+--------+------------------------+-------------+
| No | Nama Santri           | Kamar               | Status | Keluhan / Alasan       | Obat        |
+----+-----------------------+---------------------+--------+------------------------+-------------+
| 1  | Santri Contoh         | IPS Lt 3 - Kamar 2  | ALPA   | Belum kembali ke kamar | -           |
+----+-----------------------+---------------------+--------+------------------------+-------------+

+--------------------------------------------------------------------------------------------------+
| KELAS 8   —   1 Santri Dilaporkan                                                                |
+----+-----------------------+---------------------+--------+------------------------+-------------+
| No | Nama Santri           | Kamar               | Status | Keluhan / Alasan       | Obat        |
+----+-----------------------+---------------------+--------+------------------------+-------------+
| 1  | Alvin Kurniawan       | Kamar 3.01          | SAKIT  | Demam / Badan Panas    | Paracetamol |
+----+-----------------------+---------------------+--------+------------------------+-------------+

+--------------------------------------------------------------------------------------------------+
| KELAS 7   —   1 Santri Dilaporkan                                                                |
+----+-----------------------+---------------------+--------+------------------------+-------------+
| No | Nama Santri           | Kamar               | Status | Keluhan / Alasan       | Obat        |
+----+-----------------------+---------------------+--------+------------------------+-------------+
| 1  | Ahmad Mushtofa Kamal  | Kamar 1.01          | IZIN   | Izin Pulang ke Rumah   | -           |
+----+-----------------------+---------------------+--------+------------------------+-------------+
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
