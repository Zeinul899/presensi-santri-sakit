/**
 * ============================================================================
 * GOOGLE APPS SCRIPT - PRESENSI SANTRI ASRAMA (SAKIT, IZIN, ALPA)
 * Versi 6.0 (Sheet Baru Otomatis Per Laporan, KOP Judul SMP, Kotak Per Asrama)
 * Untuk: Faris, Zahran & Pengurus Kamar Asrama
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
 *    (Atau Deploy > New deployment > Web app > Anyone > Deploy).
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
      message: "Server Google Apps Script Presensi Asrama (v6.0) Aktif!",
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
      // Data simulasi jika dites langsung dari editor
      data = {
        sesi: "Pagi",
        namaPelapor: "Faris & Zahran",
        keterangan: "Pengecekan rutin asrama pagi hari",
        santriItems: [
          {
            kelas: "Kelas 9",
            kamar: "IPS Lt 3 - Kamar 2",
            namaSantri: "Zahran Yasser Hamzah",
            statusKehadiran: "Alpa",
            sakit: "Tidak berada di kamar saat jam presensi",
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
    const namaPelapor = (data.namaPelapor || data.checker || "Pengurus Asrama").trim();
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

    // ========================================================================
    // TAHAP 2: BANGUN KOP JUDUL LAPORAN SMP (Bulan & Tanggal)
    // ========================================================================
    const TOTAL_KOLOM = 10;

    // Baris 1: Judul Utama
    const rangeJudul = sheetBaru.getRange(1, 1, 1, TOTAL_KOLOM);
    rangeJudul.merge();
    rangeJudul.setValue("LAPORAN REKAPITULASI SANTRI SAKIT SMP");
    rangeJudul.setBackground("#0F172A"); // Dark Slate
    rangeJudul.setFontColor("#FFFFFF");
    rangeJudul.setFontWeight("bold");
    rangeJudul.setFontSize(14);
    rangeJudul.setHorizontalAlignment("center");
    rangeJudul.setVerticalAlignment("middle");
    sheetBaru.setRowHeight(1, 42);

    // Baris 2: Sub-KOP Bulan, Tanggal & Sesi
    const rangeSubJudul = sheetBaru.getRange(2, 1, 1, TOTAL_KOLOM);
    rangeSubJudul.merge();
    rangeSubJudul.setValue("Bulan: " + namaBulanPanjang + " " + tahunNomor + "  |  Tanggal: " + tanggalPanjang + "  |  Sesi Laporan: " + sesi);
    rangeSubJudul.setBackground("#1E293B"); // Slate medium
    rangeSubJudul.setFontColor("#38BDF8"); // Sky Blue
    rangeSubJudul.setFontWeight("bold");
    rangeSubJudul.setFontSize(11);
    rangeSubJudul.setHorizontalAlignment("center");
    rangeSubJudul.setVerticalAlignment("middle");
    sheetBaru.setRowHeight(2, 28);

    // Baris 3: Info Waktu Kirim & Petugas Pemeriksa
    const rangeInfo = sheetBaru.getRange(3, 1, 1, TOTAL_KOLOM);
    rangeInfo.merge();
    rangeInfo.setValue("Waktu Kirim: " + formattedTimestamp + " WIB   •   Petugas Pemeriksa: " + namaPelapor + "   •   Total Dilaporkan: " + santriList.length + " Santri");
    rangeInfo.setBackground("#F1F5F9");
    rangeInfo.setFontColor("#475569");
    rangeInfo.setFontSize(10);
    rangeInfo.setHorizontalAlignment("center");
    rangeInfo.setVerticalAlignment("middle");
    sheetBaru.setRowHeight(3, 24);

    // Baris 4: Kosong pemisah
    sheetBaru.setRowHeight(4, 10);

    // Baris 5: Kotak Ringkasan Status Santri
    let countSakit = 0;
    let countIzin = 0;
    let countAlpa = 0;
    santriList.forEach(function(s) {
      const st = (s.statusKehadiran || s.status || "").toLowerCase();
      if (st.includes("sakit")) countSakit++;
      else if (st.includes("izin")) countIzin++;
      else countAlpa++;
    });

    const boxSakit = sheetBaru.getRange("A5:B5");
    boxSakit.merge().setValue("TOTAL SAKIT: " + countSakit + " Santri")
      .setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle").setBorder(true, true, true, true, false, false, "#EF4444", SpreadsheetApp.BorderStyle.SOLID);

    const boxIzin = sheetBaru.getRange("C5:D5");
    boxIzin.merge().setValue("TOTAL IZIN: " + countIzin + " Santri")
      .setBackground("#FEF3C7").setFontColor("#92400E").setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle").setBorder(true, true, true, true, false, false, "#F59E0B", SpreadsheetApp.BorderStyle.SOLID);

    const boxAlpa = sheetBaru.getRange("E5:F5");
    boxAlpa.merge().setValue("TOTAL ALPA: " + countAlpa + " Santri")
      .setBackground("#F3E8FF").setFontColor("#6B21A8").setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle").setBorder(true, true, true, true, false, false, "#A855F7", SpreadsheetApp.BorderStyle.SOLID);

    const boxTotal = sheetBaru.getRange("G5:J5");
    boxTotal.merge().setValue("TOTAL KESELURUHAN: " + santriList.length + " Santri")
      .setBackground("#E2E8F0").setFontColor("#0F172A").setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle").setBorder(true, true, true, true, false, false, "#94A3B8", SpreadsheetApp.BorderStyle.SOLID);

    sheetBaru.setRowHeight(5, 30);
    sheetBaru.setRowHeight(6, 16); // Jeda sebelum kotak data

    // ========================================================================
    // TAHAP 3: PENGELOMPOKKAN PER KOTAK ASRAMA
    // ========================================================================
    // Kelompokkan santri berdasarkan gedung / jenjang:
    // 1. Kelas 9 (Asrama IPS Lt 3)
    // 2. Kelas 8
    // 3. Kelas 7
    // 4. Lainnya (jika ada)

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
      "Suhu Tubuh",
      "Catatan Tambahan"
    ];

    // Iterasi setiap kelompok untuk digambar sebagai KOTAK TERPISAH
    const daftarKunci = Object.keys(kelompokMap).sort(function(a, b) {
      const ia = urutanKelompok.indexOf(a);
      const ib = urutanKelompok.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

    daftarKunci.forEach(function(kategoriKey, indexKotak) {
      const items = kelompokMap[kategoriKey];
      if (!items || items.length === 0) return;

      let namaHeaderKotak = "";
      let warnaBanner = "#1E293B"; // Dark Slate
      if (kategoriKey === "Kelas 9") {
        namaHeaderKotak = "KOTAK DATA: KELAS 9 • ASRAMA IPS LT 3 (" + items.length + " Santri Dilaporkan)";
        warnaBanner = "#0F172A"; // Slate gelap
      } else if (kategoriKey === "Kelas 8") {
        namaHeaderKotak = "KOTAK DATA: KELAS 8 (" + items.length + " Santri Dilaporkan)";
        warnaBanner = "#1E293B";
      } else if (kategoriKey === "Kelas 7") {
        namaHeaderKotak = "KOTAK DATA: KELAS 7 (" + items.length + " Santri Dilaporkan)";
        warnaBanner = "#1E293B";
      } else {
        namaHeaderKotak = "KOTAK DATA: " + kategoriKey.toUpperCase() + " (" + items.length + " Santri)";
        warnaBanner = "#334155";
      }

      const barisMulaiKotak = barisSaatIni;

      // 1. Baris Judul Kotak (Banner Kotak)
      const rangeBanner = sheetBaru.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
      rangeBanner.merge();
      rangeBanner.setValue(namaHeaderKotak);
      rangeBanner.setBackground(warnaBanner);
      rangeBanner.setFontColor("#FFFFFF");
      rangeBanner.setFontWeight("bold");
      rangeBanner.setFontSize(11);
      rangeBanner.setVerticalAlignment("middle");
      rangeBanner.setHorizontalAlignment("left");
      sheetBaru.setRowHeight(barisSaatIni, 32);
      barisSaatIni++;

      // 2. Baris Header Kolom Tabel di dalam Kotak
      const rangeHeaderKotak = sheetBaru.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
      rangeHeaderKotak.setValues([headerKolomTabel]);
      rangeHeaderKotak.setBackground("#334155"); // Steel slate
      rangeHeaderKotak.setFontColor("#FFFFFF");
      rangeHeaderKotak.setFontWeight("bold");
      rangeHeaderKotak.setFontSize(10);
      rangeHeaderKotak.setHorizontalAlignment("center");
      rangeHeaderKotak.setVerticalAlignment("middle");
      sheetBaru.setRowHeight(barisSaatIni, 28);
      barisSaatIni++;

      // 3. Baris-baris Data Santri
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
        rowRange.setFontSize(10);
        sheetBaru.setRowHeight(barisSaatIni, 26);

        // Format kolom
        sheetBaru.getRange(barisSaatIni, 1).setHorizontalAlignment("center"); // No
        sheetBaru.getRange(barisSaatIni, 2).setFontWeight("bold"); // Nama
        sheetBaru.getRange(barisSaatIni, 3).setHorizontalAlignment("center"); // Kamar
        sheetBaru.getRange(barisSaatIni, 7).setHorizontalAlignment("center"); // Mulai Sejak
        sheetBaru.getRange(barisSaatIni, 9).setHorizontalAlignment("center"); // Suhu

        // Pewarnaan Badge Status (Kolom D)
        const cellStatus = sheetBaru.getRange(barisSaatIni, 4);
        cellStatus.setFontWeight("bold");
        cellStatus.setHorizontalAlignment("center");

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

        // Zebra striping halus
        if (idx % 2 === 1) {
          sheetBaru.getRange(barisSaatIni, 1, 1, 3).setBackground("#F8FAFC");
          sheetBaru.getRange(barisSaatIni, 5, 1, 6).setBackground("#F8FAFC");
        }

        barisSaatIni++;
      });

      // 4. Pasang Border Tebal Mengelilingi Kotak (Efek Card/Kotak)
      const barisAkhirKotak = barisSaatIni - 1;
      const rangeSeluruhKotak = sheetBaru.getRange(barisMulaiKotak, 1, barisAkhirKotak - barisMulaiKotak + 1, TOTAL_KOLOM);
      rangeSeluruhKotak.setBorder(true, true, true, true, true, true, "#94A3B8", SpreadsheetApp.BorderStyle.SOLID);

      // Jeda antar kotak
      sheetBaru.setRowHeight(barisSaatIni, 16);
      barisSaatIni++;
    });

    // Catatan Umum Pemeriksaan (Jika Ada)
    if (catatanUmum && catatanUmum !== "-") {
      const rangeCatatan = sheetBaru.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
      rangeCatatan.merge();
      rangeCatatan.setValue("Catatan Tambahan Pemeriksaan Kamar: " + catatanUmum);
      rangeCatatan.setBackground("#F8FAFC").setFontColor("#334155").setFontStyle("italic")
        .setBorder(true, true, true, true, false, false, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);
      sheetBaru.setRowHeight(barisSaatIni, 30);
      barisSaatIni++;
    }

    // Set Lebar Kolom Ideal agar terbaca rapi tanpa terpotong
    sheetBaru.setColumnWidth(1, 45);  // No
    sheetBaru.setColumnWidth(2, 220); // Nama Santri
    sheetBaru.setColumnWidth(3, 140); // Kamar
    sheetBaru.setColumnWidth(4, 95);  // Status
    sheetBaru.setColumnWidth(5, 230); // Keluhan
    sheetBaru.setColumnWidth(6, 170); // Obat
    sheetBaru.setColumnWidth(7, 130); // Mulai Sejak
    sheetBaru.setColumnWidth(8, 170); // Lokasi
    sheetBaru.setColumnWidth(9, 85);  // Suhu
    sheetBaru.setColumnWidth(10, 200); // Catatan

    // ========================================================================
    // TAHAP 4: SIMPAN KE TAB MASTER (Semua Riwayat - Arsip Permanen)
    // ========================================================================
    let sheetMaster = ss.getSheetByName(NAMA_SHEET_MASTER);
    if (!sheetMaster) {
      sheetMaster = ss.insertSheet(NAMA_SHEET_MASTER);
      buatHeaderKolomMaster(sheetMaster);
    }

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
        namaPelapor,
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

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground("#0F172A");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);

  for (let c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
  }
}

/**
 * 4. FUNGSI FORMAT BARIS TAB MASTER
 */
function formatBarisMaster(sheet, status) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const range = sheet.getRange(lastRow, 1, 1, lastCol);
  
  range.setVerticalAlignment("middle");
  sheet.setRowHeight(lastRow, 28);

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

  if (lastRow % 2 === 0) {
    sheet.getRange(lastRow, 1, 1, 5).setBackground("#F8FAFC");
    sheet.getRange(lastRow, 7, 1, lastCol - 6).setBackground("#F8FAFC");
  }
}
