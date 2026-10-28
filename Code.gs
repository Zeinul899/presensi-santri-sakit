/**
 * ============================================================================
 * GOOGLE APPS SCRIPT - PRESENSI SANTRI ASRAMA (SAKIT, IZIN, ALPA)
 * Versi 6.1 (Tampilan Bersih, Rapih, KOP Judul SMP & Kotak Per Asrama)
 * ============================================================================
 * 
 * CARA MEMPERBARUI DI GOOGLE APPS SCRIPT:
 * 1. Buka Google Spreadsheet Anda > Extensions (Ekstensi) > Apps Script.
 * 2. HAPUS SEMUA teks bawaan di editor Apps Script (Ctrl+A lalu Delete)
 *    sehingga halamannya benar-benar kosong bersih.
 * 3. Paste SEMUA isi file ini dari baris 1 sampai baris terakhir.
 * 4. Klik icon Save (Ctrl+S).
 * 5. Klik Deploy (Terapkan) > Manage deployments (Kelola penerapan) > Edit (ikon pensil):
 *    - Version: New version (Versi baru)
 *    - Klik Deploy.
 */

const NAMA_SHEET_MASTER = "Semua Riwayat";
const NAMA_BULAN_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
const NAMA_BULAN_PENDEK = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

/**
 * 1. FUNGSI MENAMPILKAN STATUS SERVER (GET)
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetUrl = ss ? ss.getUrl() : "";
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Server Google Apps Script Presensi Asrama (v6.1) Aktif!",
      spreadsheetUrl: sheetUrl,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Server Google Apps Script Aktif!",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 2. FUNGSI PENERIMA DATA FORMULIR (POST)
 * Otomatis membuat SHEET BARU per laporan, KOP Judul SMP, dan memisahkan per kotak asrama
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(25000); // Kunci 25 detik untuk pemrosesan batch

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error("Spreadsheet tidak ditemukan! Pastikan script dibuka dari menu Extensions > Apps Script di Google Sheets.");
    }

    // Parsing data dari request
    let data = {};
    if (!e) {
      // Data simulasi jika dites langsung dari editor Apps Script
      data = {
        sesi: "Pagi",
        namaPelapor: "",
        keterangan: "Pengecekan rutin asrama pagi hari",
        santriItems: [
          {
            kelas: "Kelas 9",
            kamar: "IPS Lt 3 - Kamar 2",
            namaSantri: "Santri Contoh Kelas 9",
            statusKehadiran: "Alpa",
            sakit: "Belum kembali ke kamar saat jam presensi",
            rincianSakit: "Tanpa surat izin",
            obat: "-",
            dariKapan: "Hari Ini (Pagi)",
            lokasi: "Tidak Berada di Kamar (Alpa)",
            suhuTubuh: "-"
          },
          {
            kelas: "Kelas 8",
            kamar: "Kamar 3.01",
            namaSantri: "Alvin Kurniawan",
            statusKehadiran: "Sakit",
            sakit: "Demam / Badan Panas, Pusing",
            rincianSakit: "Kepala terasa berat sejak semalam",
            obat: "Paracetamol 500mg (1 tablet)",
            dariKapan: "Kemarin Malam",
            lokasi: "Istirahat di Kamar Asrama",
            suhuTubuh: "38.2°C"
          },
          {
            kelas: "Kelas 7",
            kamar: "Kamar 1.01",
            namaSantri: "Ahmad Mushtofa Kamal",
            statusKehadiran: "Izin",
            sakit: "Izin Pulang ke Rumah (Dijemput Orang Tua)",
            rincianSakit: "Keperluan keluarga",
            obat: "-",
            dariKapan: "Hari Ini (Pagi)",
            lokasi: "Istirahat di Rumah (Izin Pulang)",
            suhuTubuh: "-"
          }
        ]
      };
    } else if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (errJson) {
        data = e.parameter || {};
      }
    } else if (e.parameter) {
      data = e.parameter;
    }

    const now = new Date();
    const formattedTimestamp = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    const tglNomor = now.getDate();
    const bulanIndex = now.getMonth();
    const tahunNomor = now.getFullYear();
    const namaBulanPanjang = NAMA_BULAN_INDO[bulanIndex];
    const namaBulanPendek = NAMA_BULAN_PENDEK[bulanIndex];
    const tanggalPanjang = tglNomor + " " + namaBulanPanjang + " " + tahunNomor;
    const sesi = data.sesi || "Pagi";

    // Bersihkan nama pelapor (hapus jika ada teks Faris atau Zahran)
    let rawPelapor = (data.namaPelapor || data.checker || "").trim();
    let namaPelapor = "";
    if (rawPelapor && !/faris|zahran/i.test(rawPelapor)) {
      namaPelapor = rawPelapor;
    }

    const catatanUmum = (data.keterangan || data.catatanKamar || "-").trim();

    // Normalisasi array santri
    let santriList = [];
    if (Array.isArray(data.santriItems) && data.santriItems.length > 0) {
      santriList = data.santriItems;
    } else if (data.namaSantri) {
      santriList = [{
        kelas: data.kelas || "Kelas 9",
        kamar: data.kamar || "-",
        namaSantri: data.namaSantri,
        statusKehadiran: data.statusKehadiran || data.status || "Sakit",
        sakit: data.sakit || data.keluhan || "-",
        rincianSakit: data.rincianSakit || data.rincianGejala || "-",
        obat: data.obat || "-",
        dariKapan: data.dariKapan || data.sejak || "-",
        lokasi: data.lokasi || "-",
        suhuTubuh: data.suhuTubuh || data.suhu || "-",
        catatan: catatanUmum
      }];
    }

    if (santriList.length === 0) {
      throw new Error("Tidak ada data santri yang dikirimkan.");
    }

    // ========================================================================
    // TAHAP 1: BUAT SHEET BARU PER LAPORAN (Posisi Paling Depan)
    // ========================================================================
    const jamMenitStr = Utilities.formatDate(now, "Asia/Jakarta", "HH.mm");
    let namaTabBase = tglNomor + " " + namaBulanPendek + " " + tahunNomor + " - " + sesi;
    let namaTabBaru = namaTabBase;
    let counter = 1;

    // Jika tab dengan nama tersebut sudah ada, beri tambahan waktu/angka
    while (ss.getSheetByName(namaTabBaru)) {
      counter++;
      namaTabBaru = namaTabBase + " (" + jamMenitStr + (counter > 2 ? " #" + counter : "") + ")";
    }

    const sheetBaru = ss.insertSheet(namaTabBaru, 0); // Selalu letakkan di paling awal
    ss.setActiveSheet(sheetBaru);

    // Aktifkan tampilan bersih
    sheetBaru.setHideGridlines(true);

    const TOTAL_KOLOM = 10;

    // Terapkan font Arial rapih ke seluruh range awal
    sheetBaru.getRange(1, 1, 120, TOTAL_KOLOM).setFontFamily("Arial");

    // ========================================================================
    // TAHAP 2: BANGUN KOP JUDUL RESMI SMP (Bulan & Tanggal)
    // ========================================================================

    // Baris 1: Judul Utama
    const rangeJudul = sheetBaru.getRange(1, 1, 1, TOTAL_KOLOM);
    rangeJudul.merge();
    rangeJudul.setValue("LAPORAN REKAPITULASI SANTRI SAKIT SMP");
    rangeJudul.setBackground("#0F172A"); // Dark Navy Slate
    rangeJudul.setFontColor("#FFFFFF");
    rangeJudul.setFontWeight("bold");
    rangeJudul.setFontSize(13);
    rangeJudul.setHorizontalAlignment("center");
    rangeJudul.setVerticalAlignment("middle");
    sheetBaru.setRowHeight(1, 42);

    // Baris 2: Sub-KOP Bulan, Tanggal & Sesi Laporan
    const rangeSubJudul = sheetBaru.getRange(2, 1, 1, TOTAL_KOLOM);
    rangeSubJudul.merge();
    rangeSubJudul.setValue("Bulan: " + namaBulanPanjang + " " + tahunNomor + "   |   Tanggal: " + tanggalPanjang + "   |   Sesi: " + sesi);
    rangeSubJudul.setBackground("#1E293B"); // Slate menengah
    rangeSubJudul.setFontColor("#38BDF8"); // Sky Blue cerah
    rangeSubJudul.setFontWeight("bold");
    rangeSubJudul.setFontSize(10.5);
    rangeSubJudul.setHorizontalAlignment("center");
    rangeSubJudul.setVerticalAlignment("middle");
    sheetBaru.setRowHeight(2, 28);

    // Baris 3: Info Waktu Kirim & Total Santri (Tanpa Teks Faris / Zahran)
    let infoKop = "Waktu Kirim: " + formattedTimestamp + " WIB   •   Total Dilaporkan: " + santriList.length + " Santri";
    if (namaPelapor) {
      infoKop = "Waktu Kirim: " + formattedTimestamp + " WIB   •   Petugas: " + namaPelapor + "   •   Total Dilaporkan: " + santriList.length + " Santri";
    }

    const rangeInfo = sheetBaru.getRange(3, 1, 1, TOTAL_KOLOM);
    rangeInfo.merge();
    rangeInfo.setValue(infoKop);
    rangeInfo.setBackground("#F8FAFC");
    rangeInfo.setFontColor("#475569");
    rangeInfo.setFontSize(9.5);
    rangeInfo.setHorizontalAlignment("center");
    rangeInfo.setVerticalAlignment("middle");
    rangeInfo.setBorder(false, false, true, false, false, false, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);
    sheetBaru.setRowHeight(3, 24);

    // Baris 4: Spacer
    sheetBaru.setRowHeight(4, 10);

    // Baris 5: 4 Kartu Ringkasan Status Cepat (Simetris & Bersih)
    let countSakit = 0;
    let countIzin = 0;
    let countAlpa = 0;
    santriList.forEach(function(s) {
      const st = (s.statusKehadiran || s.status || "").toLowerCase();
      if (st.includes("sakit")) countSakit++;
      else if (st.includes("izin")) countIzin++;
      else countAlpa++;
    });

    // Box Sakit (Kolom A s/d C)
    const boxSakit = sheetBaru.getRange("A5:C5");
    boxSakit.merge().setValue("TOTAL SAKIT: " + countSakit + " Santri")
      .setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold").setFontSize(10)
      .setHorizontalAlignment("center").setVerticalAlignment("middle")
      .setBorder(true, true, true, true, false, false, "#F87171", SpreadsheetApp.BorderStyle.SOLID);

    // Box Izin (Kolom D s/d E)
    const boxIzin = sheetBaru.getRange("D5:E5");
    boxIzin.merge().setValue("TOTAL IZIN: " + countIzin + " Santri")
      .setBackground("#FEF3C7").setFontColor("#92400E").setFontWeight("bold").setFontSize(10)
      .setHorizontalAlignment("center").setVerticalAlignment("middle")
      .setBorder(true, true, true, true, false, false, "#FBBF24", SpreadsheetApp.BorderStyle.SOLID);

    // Box Alpa (Kolom F s/d G)
    const boxAlpa = sheetBaru.getRange("F5:G5");
    boxAlpa.merge().setValue("TOTAL ALPA: " + countAlpa + " Santri")
      .setBackground("#F3E8FF").setFontColor("#6B21A8").setFontWeight("bold").setFontSize(10)
      .setHorizontalAlignment("center").setVerticalAlignment("middle")
      .setBorder(true, true, true, true, false, false, "#C084FC", SpreadsheetApp.BorderStyle.SOLID);

    // Box Total (Kolom H s/d J)
    const boxTotal = sheetBaru.getRange("H5:J5");
    boxTotal.merge().setValue("TOTAL REKAP: " + santriList.length + " Santri")
      .setBackground("#E2E8F0").setFontColor("#0F172A").setFontWeight("bold").setFontSize(10)
      .setHorizontalAlignment("center").setVerticalAlignment("middle")
      .setBorder(true, true, true, true, false, false, "#94A3B8", SpreadsheetApp.BorderStyle.SOLID);

    sheetBaru.setRowHeight(5, 32);
    sheetBaru.setRowHeight(6, 14); // Spacer sebelum tabel data

    // ========================================================================
    // TAHAP 3: TABEL KOTAK DATA PER ASRAMA
    // ========================================================================
    const kelompokMap = {};
    const urutanKelompok = ["Kelas 9", "Kelas 8", "Kelas 7"];

    santriList.forEach(function(item) {
      const k = (item.kelas || "").trim();
      let key = "Lainnya";
      if (k.includes("9")) key = "Kelas 9";
      else if (k.includes("8")) key = "Kelas 8";
      else if (k.includes("7")) key = "Kelas 7";

      if (!kelompokMap[key]) kelompokMap[key] = [];
      kelompokMap[key].push(item);
    });

    let barisSaatIni = 7;
    const headerKolomTabel = [
      "No",
      "Nama Santri",
      "Kamar",
      "Status",
      "Keluhan / Penyakit / Alasan",
      "Obat yang Diberikan",
      "Mulai Sejak",
      "Lokasi Istirahat",
      "Suhu",
      "Catatan Tambahan"
    ];

    const daftarKunci = Object.keys(kelompokMap).sort(function(a, b) {
      const ia = urutanKelompok.indexOf(a);
      const ib = urutanKelompok.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

    daftarKunci.forEach(function(kategoriKey) {
      const items = kelompokMap[kategoriKey];
      if (!items || items.length === 0) return;

      let namaBannerKotak = "";
      let warnaBanner = "#1E293B";
      if (kategoriKey === "Kelas 9") {
        namaBannerKotak = "KELAS 9 • ASRAMA IPS LT 3   —   " + items.length + " Santri Dilaporkan";
        warnaBanner = "#0F172A"; // Slate gelap
      } else if (kategoriKey === "Kelas 8") {
        namaBannerKotak = "KELAS 8   —   " + items.length + " Santri Dilaporkan";
        warnaBanner = "#1E293B";
      } else if (kategoriKey === "Kelas 7") {
        namaBannerKotak = "KELAS 7   —   " + items.length + " Santri Dilaporkan";
        warnaBanner = "#1E293B";
      } else {
        namaBannerKotak = kategoriKey.toUpperCase() + "   —   " + items.length + " Santri";
        warnaBanner = "#334155";
      }

      const barisMulaiKotak = barisSaatIni;

      // 1. Baris Judul Kotak (Banner Asrama)
      const rangeBanner = sheetBaru.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
      rangeBanner.merge();
      rangeBanner.setValue(namaBannerKotak);
      rangeBanner.setBackground(warnaBanner);
      rangeBanner.setFontColor("#FFFFFF");
      rangeBanner.setFontWeight("bold");
      rangeBanner.setFontSize(10.5);
      rangeBanner.setVerticalAlignment("middle");
      rangeBanner.setHorizontalAlignment("left");
      sheetBaru.setRowHeight(barisSaatIni, 30);
      barisSaatIni++;

      // 2. Baris Header Kolom Tabel
      const rangeHeaderKotak = sheetBaru.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
      rangeHeaderKotak.setValues([headerKolomTabel]);
      rangeHeaderKotak.setBackground("#334155"); // Steel slate
      rangeHeaderKotak.setFontColor("#FFFFFF");
      rangeHeaderKotak.setFontWeight("bold");
      rangeHeaderKotak.setFontSize(9.5);
      rangeHeaderKotak.setHorizontalAlignment("center");
      rangeHeaderKotak.setVerticalAlignment("middle");
      sheetBaru.setRowHeight(barisSaatIni, 28);
      barisSaatIni++;

      const barisMulaiData = barisSaatIni;

      // 3. Baris Data Santri
      items.forEach(function(item, idx) {
        const rowStatus = item.statusKehadiran || item.status || "Sakit";
        const rowKamar = item.kamar || "-";
        const rowData = [
          idx + 1,
          item.namaSantri || "-",
          rowKamar,
          rowStatus,
          item.sakit || item.keluhan || item.alasan || "-",
          item.obat || "-",
          item.dariKapan || item.sejak || "-",
          item.lokasi || "-",
          item.suhuTubuh || item.suhu || "-",
          item.rincianSakit || item.rincianGejala || item.catatan || "-"
        ];

        const rowRange = sheetBaru.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
        rowRange.setValues([rowData]);
        rowRange.setVerticalAlignment("middle");
        rowRange.setFontSize(9.5);
        rowRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
        sheetBaru.setRowHeight(barisSaatIni, 28);

        // Alignment per kolom
        sheetBaru.getRange(barisSaatIni, 1).setHorizontalAlignment("center"); // No
        sheetBaru.getRange(barisSaatIni, 2).setFontWeight("bold").setHorizontalAlignment("left"); // Nama
        sheetBaru.getRange(barisSaatIni, 3).setHorizontalAlignment("center"); // Kamar
        sheetBaru.getRange(barisSaatIni, 5).setHorizontalAlignment("left"); // Keluhan
        sheetBaru.getRange(barisSaatIni, 6).setHorizontalAlignment("left"); // Obat
        sheetBaru.getRange(barisSaatIni, 7).setHorizontalAlignment("center"); // Mulai Sejak
        sheetBaru.getRange(barisSaatIni, 8).setHorizontalAlignment("left"); // Lokasi
        sheetBaru.getRange(barisSaatIni, 9).setHorizontalAlignment("center"); // Suhu
        sheetBaru.getRange(barisSaatIni, 10).setHorizontalAlignment("left"); // Catatan

        // Badge Status Berwarna (Kolom D)
        const cellStatus = sheetBaru.getRange(barisSaatIni, 4);
        cellStatus.setFontWeight("bold").setHorizontalAlignment("center");

        const stLower = rowStatus.toLowerCase();
        if (stLower.includes("sakit")) {
          cellStatus.setBackground("#FEE2E2");
          cellStatus.setFontColor("#991B1B");
        } else if (stLower.includes("izin")) {
          cellStatus.setBackground("#FEF3C7");
          cellStatus.setFontColor("#92400E");
        } else if (stLower.includes("alpa")) {
          cellStatus.setBackground("#F3E8FF");
          cellStatus.setFontColor("#6B21A8");
        }

        // Zebra striping lembut (latar putih vs off-white slate)
        const rowBg = (idx % 2 === 1) ? "#F8FAFC" : "#FFFFFF";
        sheetBaru.getRange(barisSaatIni, 1, 1, 3).setBackground(rowBg);
        sheetBaru.getRange(barisSaatIni, 5, 1, 6).setBackground(rowBg);

        // Garis pemisah horizontal tipis antar baris
        rowRange.setBorder(true, false, true, false, false, false, "#E2E8F0", SpreadsheetApp.BorderStyle.SOLID);

        barisSaatIni++;
      });

      const barisAkhirKotak = barisSaatIni - 1;

      // 4. Pasang Border Luar Mengelilingi Kotak (Efek Card Rapi)
      const rangeSeluruhKotak = sheetBaru.getRange(barisMulaiKotak, 1, barisAkhirKotak - barisMulaiKotak + 1, TOTAL_KOLOM);
      rangeSeluruhKotak.setBorder(true, true, true, true, false, false, "#64748B", SpreadsheetApp.BorderStyle.SOLID);

      // Jeda antar kotak
      sheetBaru.setRowHeight(barisSaatIni, 14);
      barisSaatIni++;
    });

    // Catatan Umum Pemeriksaan (Jika Ada)
    if (catatanUmum && catatanUmum !== "-") {
      const rangeCatatan = sheetBaru.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
      rangeCatatan.merge();
      rangeCatatan.setValue("Catatan Pemeriksaan: " + catatanUmum);
      rangeCatatan.setBackground("#F8FAFC").setFontColor("#334155").setFontStyle("italic").setFontSize(9.5)
        .setVerticalAlignment("middle").setBorder(true, true, true, true, false, false, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);
      sheetBaru.setRowHeight(barisSaatIni, 30);
      barisSaatIni++;
    }

    // Lebar Kolom yang Dioptimalkan agar Bersih & Proporsional
    sheetBaru.setColumnWidth(1, 45);   // No
    sheetBaru.setColumnWidth(2, 230);  // Nama Santri
    sheetBaru.setColumnWidth(3, 150);  // Kamar
    sheetBaru.setColumnWidth(4, 95);   // Status
    sheetBaru.setColumnWidth(5, 250);  // Keluhan / Penyakit / Alasan
    sheetBaru.setColumnWidth(6, 180);  // Obat
    sheetBaru.setColumnWidth(7, 130);  // Mulai Sejak
    sheetBaru.setColumnWidth(8, 180);  // Lokasi Istirahat
    sheetBaru.setColumnWidth(9, 80);   // Suhu
    sheetBaru.setColumnWidth(10, 220); // Catatan Tambahan

    // ========================================================================
    // TAHAP 4: SIMPAN KE TAB MASTER (Semua Riwayat - Arsip Permanen)
    // ========================================================================
    let sheetMaster = ss.getSheetByName(NAMA_SHEET_MASTER);
    if (!sheetMaster) {
      sheetMaster = ss.insertSheet(NAMA_SHEET_MASTER);
      buatHeaderKolomMaster(sheetMaster);
    }

    const pelaporMaster = namaPelapor || "-";

    santriList.forEach(function(item) {
      const rowStatus = item.statusKehadiran || item.status || "Sakit";
      const rowKelas = item.kelas || "-";
      const rowKamar = item.kamar || "-";

      const rowMaster = [
        formattedTimestamp,
        sesi,
        rowKelas,
        rowKamar,
        item.namaSantri || "-",
        rowStatus,
        item.sakit || item.keluhan || item.alasan || "-",
        item.rincianSakit || item.rincianGejala || "-",
        item.obat || "-",
        item.dariKapan || item.sejak || "-",
        item.lokasi || "-",
        item.suhuTubuh || item.suhu || "-",
        catatanUmum,
        pelaporMaster,
        namaTabBaru
      ];

      sheetMaster.appendRow(rowMaster);
      formatBarisMaster(sheetMaster, rowStatus);
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Laporan berhasil dicatat di Sheet Baru: [" + namaTabBaru + "]!",
      tabBaru: namaTabBaru,
      jumlahSantri: santriList.length,
      spreadsheetUrl: ss.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error doPost: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

/**
 * 3. FUNGSI HEADER TAB MASTER ARSIP
 */
function buatHeaderKolomMaster(sheet) {
  const headers = [
    "Waktu Kirim",
    "Sesi",
    "Kelas",
    "Kamar",
    "Nama Santri",
    "Status Presensi",
    "Sakit / Alasan Izin",
    "Rincian Gejala / Catatan",
    "Obat yang Diberikan",
    "Mulai Sakit / Izin Sejak",
    "Kondisi & Lokasi Saat Ini",
    "Suhu Tubuh",
    "Catatan Kamar",
    "Petugas Pemeriksa",
    "Sheet Laporan"
  ];

  sheet.getRange(1, 1, 100, headers.length).setFontFamily("Arial");

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground("#0F172A");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 150); // Waktu Kirim
  sheet.setColumnWidth(2, 70);  // Sesi
  sheet.setColumnWidth(3, 80);  // Kelas
  sheet.setColumnWidth(4, 140); // Kamar
  sheet.setColumnWidth(5, 220); // Nama
  sheet.setColumnWidth(6, 95);  // Status
  sheet.setColumnWidth(7, 230); // Keluhan
  sheet.setColumnWidth(8, 180); // Rincian
  sheet.setColumnWidth(9, 170); // Obat
  sheet.setColumnWidth(10, 130); // Mulai Sejak
  sheet.setColumnWidth(11, 180); // Lokasi
  sheet.setColumnWidth(12, 80);  // Suhu
  sheet.setColumnWidth(13, 180); // Catatan
  sheet.setColumnWidth(14, 150); // Petugas
  sheet.setColumnWidth(15, 160); // Sheet Laporan
}

/**
 * 4. FUNGSI FORMAT BARIS TAB MASTER
 */
function formatBarisMaster(sheet, status) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const range = sheet.getRange(lastRow, 1, 1, lastCol);
  
  range.setVerticalAlignment("middle");
  range.setFontSize(9.5);
  range.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sheet.setRowHeight(lastRow, 28);

  // Status Badge
  const cellStatus = sheet.getRange(lastRow, 6);
  cellStatus.setFontWeight("bold");
  cellStatus.setHorizontalAlignment("center");

  const st = (status || "").toLowerCase();
  if (st.includes("sakit")) {
    cellStatus.setBackground("#FEE2E2");
    cellStatus.setFontColor("#991B1B");
  } else if (st.includes("izin")) {
    cellStatus.setBackground("#FEF3C7");
    cellStatus.setFontColor("#92400E");
  } else if (st.includes("alpa")) {
    cellStatus.setBackground("#F3E8FF");
    cellStatus.setFontColor("#6B21A8");
  }

  // Zebra striping halus
  const rowBg = (lastRow % 2 === 0) ? "#F8FAFC" : "#FFFFFF";
  sheet.getRange(lastRow, 1, 1, 5).setBackground(rowBg);
  sheet.getRange(lastRow, 7, 1, lastCol - 6).setBackground(rowBg);

  // Border horizontal tipis
  range.setBorder(true, false, true, false, false, false, "#E2E8F0", SpreadsheetApp.BorderStyle.SOLID);
}
