# Formulir Presensi & Pendataan Santri Asrama (Sakit, Izin, Alpa) - Versi 5.0

Aplikasi web presensi santri per kamar asrama dengan antarmuka yang bersih menyerupai **Google Forms (GForm)**, mengikuti spesifikasi **Antigravity Design System (Tailwind CSS / React)**.

Dibuat khusus untuk pengurus kamar (**Faris, Zahran**) dan instruksi **Pak Mufti** untuk pelaporan presensi santri (Sakit, Izin, Alpa) sesi **Pagi** dan **Malam** yang terintegrasi langsung dengan **Google Sheets** (otomatis memisahkan tab Kelas 7, Kelas 8, Kelas 9) serta format rekap **WhatsApp**.

---

## 🌟 Fitur Utama (Versi 5.0)

1. **Sesi Laporan Fleksibel:**
   - Sesi terstandar: **Pagi** dan **Malam** (otomatis mendeteksi waktu setempat).
2. **Multi-Kamar & Multi-Asrama Sekaligus:**
   - Pengurus dapat memeriksa kamar secara berurutan (misal: 1.01, lalu 1.02, lalu pindah kelas ke Kamar 2).
   - Data santri yang dipilih tidak akan hilang saat berpindah kamar dan dapat dikirim sekaligus dalam satu kali klik.
3. **Status Presensi Per-Santri (Sakit, Izin, Alpa):**
   - Setiap santri memiliki kartu rincian masing-masing.
   - Santri **Sakit**: checklist keluhan, rincian gejala, obat yang diberikan (catatan manual + rekomendasi cepat), sejak kapan, lokasi istirahat, dan suhu tubuh (°C).
   - Santri **Izin**: pilihan alasan izin pulang / acara keluarga / lomba, serta catatan surat izin.
   - Santri **Alpa**: catatan ketidakhadiran tanpa keterangan.
4. **Data Roster Lengkap (281 Santri, 20 Kamar):**
   - **Kelas 7:** Kamar 1.01 s.d. 2.05 (104 santri).
   - **Kelas 8:** Kamar 3.01 s.d. 3.07 (89 santri).
   - **Kelas 9:** Kamar 1 s.d. 5 (88 santri).
5. **Integrasi Google Sheets Multi-Tab:**
   - Otomatis mencatat ke Tab **Kelas 7**, **Kelas 8**, dan **Kelas 9** sesuai kelas santri.
   - Otomatis mencatat ke Tab Harian bertanggal (misal: `28-10-2026`).
   - Otomatis mencatat arsip permanen ke Tab Master `Semua Riwayat`.
6. **Integrasi WhatsApp Siap Kirim:**
   - Tombol langsung mengarahkan pesan rekap terformat rapi tanpa emoji ke nomor tujuan **08935603130** (`628935603130`).

---

## 🚀 Panduan Setup Google Sheets (Hanya 2 Menit)

Agar data yang dikirim santri/pengurus kamar otomatis masuk ke Google Sheets Pak Mufti:

1. Buka spreadsheet baru di [sheets.new](https://sheets.new).
2. Beri judul Spreadsheet, misal: **Data Santri Sakit Asrama**.
3. Di bilah menu Google Sheets, klik **Extensions (Ekstensi)** > **Apps Script**.
4. Hapus seluruh isi kode bawaan, lalu buka file `Code.gs` (atau `google-apps-script.js`), salin seluruh kodenya, dan tempelkan ke editor Apps Script.
5. Klik ikon **Simpan (Save / Ctrl+S)**.
6. Klik tombol **Deploy (Terapkan)** di pojok kanan atas > pilih **New deployment (Penerapan baru)**.
7. Di sebelah kiri (ikon roda gigi), pilih jenis: **Web app (Aplikasi web)**.
8. Konfigurasi:
   - **Description:** `Absen Sakit Asrama`
   - **Execute as:** `Me (email Anda)`
   - **Who has access:** `Anyone (Siapa saja)` *(Penting agar pengurus kamar bisa mengisi form tanpa login email Google).*
9. Klik tombol **Deploy**.
10. Klik **Authorize access**, pilih akun Google Anda, klik *Advanced (Lanjutan)* lalu *Go to Untitled project (unsafe)* dan klik *Allow*.
11. Salin **Web app URL** yang muncul (berakhiran `/exec`).
12. Buka web formulir ini, klik tombol **Set Sheets (⚙️)** di pojok kanan atas, tempelkan URL tersebut, lalu klik **Simpan Pengaturan**. Selesai!

---

## 💻 Cara Menjalankan Aplikasi

Terdapat 2 opsi praktis:

### Opsi 1: Tanpa Instalasi Apapun (Standalone HTML)
Cukup buka file `absen-sakit.html` atau `absen-sakit/standalone.html` dengan klik ganda di laptop atau kirim file tersebut ke WhatsApp HP. File ini 100% mandiri, tidak memerlukan instalasi apapun, dan langsung berjalan di Google Chrome / Safari / Edge / browser HP.

### Opsi 2: Menggunakan React + Vite (Untuk Hosting Web / Vercel / Netlify)
```bash
# Masuk ke direktori
cd absen-sakit

# Jalankan server pengembangan
npm run dev

# Atau build untuk deployment produksi
npm run build
```
Folder `dist/` hasil build dapat langsung diunggah ke Vercel, Netlify, atau GitHub Pages untuk dijadikan tautan online publik yang bisa dibagikan ke seluruh grup WhatsApp ketua kamar.
