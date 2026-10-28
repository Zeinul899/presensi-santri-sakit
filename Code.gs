/**
 * ============================================================================
 * GOOGLE APPS SCRIPT - PRESENSI SANTRI ASRAMA (SAKIT, IZIN, ALPA)
 * Versi 5.0 (Pemisahan Tab Kelas 7, 8, 9, Multi-Asrama/Kamar, Sesi Pagi & Malam)
 * Untuk: Faris, Zahran & Pengurus Kamar Asrama
 * Nomor WhatsApp Tujuan: 08935603130 (628935603130)
 * ============================================================================
 * 
 * PENTING: Sebelum menempelkan kode ini ke Apps Script:
 * 1. Buka Google Sheets Anda > Menu Extensions (Ekstensi) > Apps Script.
 * 2. HAPUS SEMUA teks bawaan di editor Apps Script (Ctrl+A lalu Delete)
 *    sehingga halamannya benar-benar kosong bersih.
 * 3. Paste SEMUA isi file ini dari baris 1 sampai baris terakhir.
 * 4. Klik icon Save (Ctrl+S).
 * 5. Klik Deploy (Terapkan) > New deployment (Penerapan baru) > Web app:
 *    - Execute as: Me (email Anda)
 *    - Who has access: Anyone (Siapa saja)
 *    - Klik Deploy dan salin link Web App yang berakhiran /exec.
 */

const NAMA_SHEET_MASTER = "Semua Riwayat";
const DAFTAR_KELAS_TABS = ["Kelas 7", "Kelas 8", "Kelas 9"];

/**
 * 1. FUNGSI MENAMPILKAN STATUS SERVER (GET)
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetUrl = ss ? ss.getUrl() : "";
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Server Google Apps Script Presensi Asrama Aktif!",
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
 * Otomatis memisahkan ke Tab Harian, Tab Kelas (Kelas 7 / 8 / 9), dan Tab Master
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(20000); // Kunci 20 detik untuk multi-data

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error("Spreadsheet tidak ditemukan! Buka script ini dari menu Extensions > Apps Script di Google Sheets.");
    }

    // Parsing data dari request
    let data = {};
    if (!e) {
      // Data simulasi jika dijalankan manual dari editor
      data = {
        sesi: "Pagi",
        santriItems: [
          {
            kelas: "Kelas 7",
            kamar: "1.01",
            namaSantri: "Ahmad Mushtofa Kamal (Simulasi)",
            statusKehadiran: "Sakit",
            sakit: "Demam / Badan Panas",
            rincianSakit: "Suhu 38.0°C",
            obat: "Paracetamol 500mg",
            dariKapan: "Hari Ini (Pagi)",
            lokasi: "Istirahat di Kamar Asrama",
            suhuTubuh: "38.0°C",
            namaPelapor: "Faris & Zahran"
          },
          {
            kelas: "Kelas 9",
            kamar: "Kamar 2",
            namaSantri: "Zahran Yasser Hamzah (Simulasi)",
            statusKehadiran: "Alpa",
            sakit: "Belum kembali ke kamar saat presensi",
            rincianSakit: "-",
            obat: "-",
            dariKapan: "-",
            lokasi: "Tidak Berada di Kamar (Alpa)",
            suhuTubuh: "-",
            namaPelapor: "Faris & Zahran"
          }
        ],
        keterangan: "Pengecekan lintas asrama",
        namaPelapor: "Faris & Zahran"
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
    const tglHariIni = Utilities.formatDate(now, "Asia/Jakarta", "dd-MM-yyyy");

    // 1. Siapkan Tab Tanggal Hari Ini
    const namaTabHarian = tglHariIni;
    let sheetHarian = ss.getSheetByName(namaTabHarian);
    if (!sheetHarian) {
      sheetHarian = ss.insertSheet(namaTabHarian, 0); // Di urutan pertama
      buatHeaderKolom(sheetHarian, "REKAP HARIAN - " + namaTabHarian);
    }

    // 2. Siapkan Tab Master Rekapitulasi
    let sheetMaster = ss.getSheetByName(NAMA_SHEET_MASTER);
    if (!sheetMaster) {
      sheetMaster = ss.insertSheet(NAMA_SHEET_MASTER);
      buatHeaderKolom(sheetMaster, "REKAPITULASI SEMUA DATA ASRAMA");
    }

    // Helper untuk mengambil sheet kelas tertentu (Kelas 7, Kelas 8, Kelas 9)
    function dapatkanSheetKelas(namaKelas) {
      let target = (namaKelas || "").trim();
      if (target.includes("7")) target = "Kelas 7";
      else if (target.includes("8")) target = "Kelas 8";
      else if (target.includes("9")) target = "Kelas 9";

      let sheet = ss.getSheetByName(target);
      if (!sheet) {
        sheet = ss.insertSheet(target);
        buatHeaderKolom(sheet, "DATA PRESENSI " + target.toUpperCase());
      }
      return sheet;
    }

    let itemsProcessed = 0;

    // KASUS A: Array santriItems (banyak santri dari berbagai kamar/kelas)
    if (Array.isArray(data.santriItems) && data.santriItems.length > 0) {
      for (let i = 0; i < data.santriItems.length; i++) {
        const item = data.santriItems[i];
        const rowStatus = item.statusKehadiran || item.status || "Sakit";
        const rowKelas = item.kelas || data.kelas || "Kelas 9";
        const rowKamar = item.kamar || data.kamar || "-";
        const rowSesi = item.sesi || data.sesi || "Pagi";

        const rowData = [
          formattedTimestamp,
          rowSesi,
          rowKelas,
          rowKamar,
          item.namaSantri || "-",
          rowStatus,
          item.sakit || item.alasan || "-",
          item.rincianSakit || item.rincian || "-",
          item.obat || "-",
          item.dariKapan || "-",
          item.lokasi || "-",
          item.suhuTubuh || "-",
          item.keterangan || data.keterangan || "-",
          item.namaPelapor || data.namaPelapor || "-"
        ];

        // Tulis ke Tab Tanggal Harian
        sheetHarian.appendRow(rowData);
        formatBarisData(sheetHarian, rowStatus);

        // Tulis ke Tab Kelas Spesifik (Kelas 7 / Kelas 8 / Kelas 9)
        const sheetKelasSpesifik = dapatkanSheetKelas(rowKelas);
        sheetKelasSpesifik.appendRow(rowData);
        formatBarisData(sheetKelasSpesifik, rowStatus);

        // Tulis ke Tab Master
        sheetMaster.appendRow(rowData);
        formatBarisData(sheetMaster, rowStatus);

        itemsProcessed++;
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: itemsProcessed + " data santri berhasil dicatat ke Sheets (Tab Harian & Tab Kelas)!",
        jumlahSantri: itemsProcessed,
        tabHarian: namaTabHarian,
        spreadsheetUrl: ss.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // KASUS B: Single record atau santriList tunggal
    const singleStatus = data.statusKehadiran || data.status || "Sakit";
    const singleKelas = data.kelas || "Kelas 9";
    const singleKamar = data.kamar || "-";
    const singleSesi = data.sesi || "Pagi";

    let santriArr = [];
    if (Array.isArray(data.santriList) && data.santriList.length > 0) {
      santriArr = data.santriList;
    } else if (Array.isArray(data.namaSantri) && data.namaSantri.length > 0) {
      santriArr = data.namaSantri;
    } else if (typeof data.namaSantri === "string" && data.namaSantri.trim()) {
      if (data.namaSantri.includes(",")) {
        santriArr = data.namaSantri.split(",").map(function(s) { return s.trim(); }).filter(Boolean);
      } else {
        santriArr = [data.namaSantri.trim()];
      }
    } else {
      santriArr = ["-"];
    }

    for (let i = 0; i < santriArr.length; i++) {
      const nama = santriArr[i];
      const rowData = [
        formattedTimestamp,
        singleSesi,
        singleKelas,
        singleKamar,
        nama,
        singleStatus,
        data.sakit || data.alasan || "-",
        data.rincianSakit || data.rincian || "-",
        data.obat || "-",
        data.dariKapan || "-",
        data.lokasi || "-",
        data.suhuTubuh || "-",
        data.keterangan || "-",
        data.namaPelapor || "-"
      ];

      // Tulis ke tab harian
      sheetHarian.appendRow(rowData);
      formatBarisData(sheetHarian, singleStatus);

      // Tulis ke tab kelas spesifik
      const sheetKelasSpesifik = dapatkanSheetKelas(singleKelas);
      sheetKelasSpesifik.appendRow(rowData);
      formatBarisData(sheetKelasSpesifik, singleStatus);

      // Tulis ke tab master
      sheetMaster.appendRow(rowData);
      formatBarisData(sheetMaster, singleStatus);

      itemsProcessed++;
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: itemsProcessed + " data santri berhasil dicatat ke Sheets (Tab Harian & Tab " + singleKelas + ")!",
      jumlahSantri: itemsProcessed,
      tabHarian: namaTabHarian,
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
 * 3. FUNGSI PEMBUAT HEADER KOLOM LENGKAP
 */
function buatHeaderKolom(sheet, judulTab) {
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
    "Petugas Pemeriksa"
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground("#0F172A"); // Slate Gelap
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
 * 4. FUNGSI FORMAT BARIS & PEWARNAAN STATUS
 */
function formatBarisData(sheet, status) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const range = sheet.getRange(lastRow, 1, 1, lastCol);
  
  range.setVerticalAlignment("middle");
  range.setFontFamily("Inter");
  sheet.setRowHeight(lastRow, 28);

  // Pewarnaan status di kolom F (kolom ke-6)
  const cellStatus = sheet.getRange(lastRow, 6);
  cellStatus.setFontWeight("bold");
  cellStatus.setHorizontalAlignment("center");

  const st = (status || "").toLowerCase();
  if (st.includes("sakit")) {
    cellStatus.setBackground("#FEE2E2"); // Merah muda lembut
    cellStatus.setFontColor("#991B1B");
  } else if (st.includes("izin")) {
    cellStatus.setBackground("#FEF3C7"); // Kuning lembut
    cellStatus.setFontColor("#92400E");
  } else if (st.includes("alpa")) {
    cellStatus.setBackground("#F3E8FF"); // Ungu lembut
    cellStatus.setFontColor("#6B21A8");
  }

  // Zebra striping untuk baris
  if (lastRow % 2 === 0) {
    sheet.getRange(lastRow, 1, 1, 5).setBackground("#F8FAFC");
    sheet.getRange(lastRow, 7, 1, lastCol - 6).setBackground("#F8FAFC");
  }
}

/**
 * 5. FUNGSI SIMULASI UNTUK TES LANGSUNG DARI EDITOR
 */
function testSimulasiKirim() {
  Logger.log("Menjalankan simulasi multi-kelas multi-kamar...");
  const dummyEvent = {
    postData: {
      contents: JSON.stringify({
        sesi: "Pagi",
        santriItems: [
          {
            kelas: "Kelas 7",
            kamar: "1.01",
            namaSantri: "Ahmad Mushtofa Kamal (Tes Kelas 7)",
            statusKehadiran: "Sakit",
            sakit: "Demam / Badan Panas",
            rincianSakit: "Suhu 38.0°C",
            obat: "Paracetamol 500mg",
            dariKapan: "Hari Ini (Pagi)",
            lokasi: "Istirahat di Kamar Asrama",
            suhuTubuh: "38.0°C",
            namaPelapor: "Faris & Zahran"
          },
          {
            kelas: "Kelas 9",
            kamar: "Kamar 2",
            namaSantri: "Zahran Yasser Hamzah (Tes Kelas 9)",
            statusKehadiran: "Alpa",
            sakit: "Belum kembali ke kamar saat presensi",
            rincianSakit: "-",
            obat: "-",
            dariKapan: "-",
            lokasi: "Tidak Berada di Kamar (Alpa)",
            suhuTubuh: "-",
            namaPelapor: "Faris & Zahran"
          }
        ],
        keterangan: "Pengecekan kamar pagi",
        namaPelapor: "Faris & Zahran"
      })
    }
  };

  const hasil = doPost(dummyEvent);
  Logger.log("Hasil: " + hasil.getContent());
}
