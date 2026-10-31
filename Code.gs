/**
 * ============================================================================
 * GOOGLE APPS SCRIPT - PRESENSI SANTRI ASRAMA (SAKIT, IZIN, ALPA)
 * Versi 7.0 (Otomatis Buat SPREADSHEET BARU dengan LINK BARU per Laporan)
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
 * Mengembalikan status server dan link spreadsheet terbaru yang dibuat.
 */
function doGet(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const latestUrl = props.getProperty("LATEST_SPREADSHEET_URL") || "";
    const latestName = props.getProperty("LATEST_SPREADSHEET_NAME") || "";
    const latestTotal = props.getProperty("LATEST_TOTAL_SANTRI") || "0";
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Server Google Apps Script Presensi Asrama (v7.1) Aktif!",
      spreadsheetUrl: latestUrl,
      spreadsheetName: latestName,
      totalSantri: latestTotal,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 2. FUNGSI PENERIMA DATA FORMULIR (POST)
 * Otomatis membuat FILE SPREADSHEET BARU dengan LINK BARU di Google Drive,
 * KOP Judul SMP, kolom Kelas, dan memisahkan per kotak asrama.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000); // Kunci 30 detik untuk pemrosesan batch

  try {
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

    // Bersihkan nama pelapor
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
    } else if (Array.isArray(data.santriList) && data.santriList.length > 0) {
      santriList = data.santriList;
    } else if (Array.isArray(data.items) && data.items.length > 0) {
      santriList = data.items;
    } else if (Array.isArray(data.santri) && data.santri.length > 0) {
      santriList = data.santri;
    } else if (Array.isArray(data) && data.length > 0) {
      santriList = data;
    } else if (data.namaSantri || data.nama) {
      santriList = [{
        kelas: data.kelas || "Kelas 9",
        kamar: data.kamar || "-",
        namaSantri: data.namaSantri || data.nama,
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
    // TAHAP 1: BUAT FILE SPREADSHEET BARU DENGAN LINK BARU DI GOOGLE DRIVE
    // ========================================================================
    const judulSpreadsheetBaru = "Laporan Rekap Santri Sakit SMP - " + tanggalPanjang + " (" + sesi + ")";
    let ssBaru = null;
    let newSpreadsheetUrl = "";

    try {
      // Buat file Google Spreadsheet baru tersendiri di Drive
      ssBaru = SpreadsheetApp.create(judulSpreadsheetBaru);
      newSpreadsheetUrl = ssBaru.getUrl();
    } catch (errCreate) {
      Logger.log("Gagal buat spreadsheet baru via create, menggunakan active: " + errCreate.toString());
      ssBaru = SpreadsheetApp.getActiveSpreadsheet();
      if (ssBaru) newSpreadsheetUrl = ssBaru.getUrl();
    }

    if (!ssBaru) {
      throw new Error("Tidak dapat menginisialisasi Google Spreadsheet.");
    }

    // Simpan info spreadsheet terbaru ke ScriptProperties agar bisa diakses via GET
    try {
      const props = PropertiesService.getScriptProperties();
      props.setProperty("LATEST_SPREADSHEET_URL", newSpreadsheetUrl);
      props.setProperty("LATEST_SPREADSHEET_NAME", judulSpreadsheetBaru);
      props.setProperty("LATEST_TOTAL_SANTRI", String(santriList.length));
    } catch (eProp) {
      Logger.log("Info props: " + eProp.toString());
    }

    // Nama tab laporan
    const namaTabBaru = tglNomor + " " + namaBulanPendek + " " + tahunNomor + " - " + sesi;
    let sheetTarget = ssBaru.getSheets()[0];
    sheetTarget.setName(namaTabBaru);

    // Bangun tampilan lengkap di spreadsheet baru
    bangunTampilanLaporan(sheetTarget, santriList, namaBulanPanjang, tahunNomor, tanggalPanjang, sesi, formattedTimestamp, namaPelapor, catatanUmum);

    // ========================================================================
    // TAHAP 2: SIMPAN ARSIP KE SPREADSHEET CONTAINER (JIKA BERBEDA)
    // ========================================================================
    const ssContainer = SpreadsheetApp.getActiveSpreadsheet();
    if (ssContainer && ssContainer.getId() !== ssBaru.getId()) {
      try {
        // Buat tab arsip di spreadsheet penampung
        let sheetArsip = ssContainer.insertSheet(namaTabBaru, 0);
        bangunTampilanLaporan(sheetArsip, santriList, namaBulanPanjang, tahunNomor, tanggalPanjang, sesi, formattedTimestamp, namaPelapor, catatanUmum);
      } catch (eTab) {
        Logger.log("Info tab arsip container: " + eTab.toString());
      }

      try {
        // Catat ke tab master Semua Riwayat
        let sheetMaster = ssContainer.getSheetByName(NAMA_SHEET_MASTER);
        if (!sheetMaster) {
          sheetMaster = ssContainer.insertSheet(NAMA_SHEET_MASTER);
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
            item.namaSantri || item.nama || "-",
            rowStatus,
            item.sakit || item.keluhan || item.alasan || "-",
            item.rincianSakit || item.rincianGejala || "-",
            item.obat || "-",
            item.dariKapan || item.sejak || "-",
            item.lokasi || "-",
            item.suhuTubuh || item.suhu || "-",
            catatanUmum,
            pelaporMaster,
            newSpreadsheetUrl
          ];

          sheetMaster.appendRow(rowMaster);
          formatBarisMaster(sheetMaster, rowStatus);
        });
      } catch (eMaster) {
        Logger.log("Info master container: " + eMaster.toString());
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Laporan berhasil dibuat di Spreadsheet Baru dengan Link Baru!",
      spreadsheetUrl: newSpreadsheetUrl,
      spreadsheetName: judulSpreadsheetBaru,
      tabBaru: namaTabBaru,
      jumlahSantri: santriList.length
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
 * 3. FUNGSI MEMBANGUN STRUKTUR TAMPILAN LAPORAN (KOP, KPI & KOTAK ASRAMA)
 */
function bangunTampilanLaporan(sheet, santriList, namaBulanPanjang, tahunNomor, tanggalPanjang, sesi, formattedTimestamp, namaPelapor, catatanUmum) {
  // Matikan gridlines jika didukung agar tampilan bersih seperti dokumen resmi
  try {
    sheet.setHiddenGridlines(true);
  } catch (eGrid) {
    Logger.log("Info gridlines: " + eGrid.toString());
  }

  // 11 Kolom Total: No | Nama | Kelas | Kamar | Status | Keluhan | Obat | Sejak | Lokasi | Suhu | Catatan
  const TOTAL_KOLOM = 11;
  sheet.getRange(1, 1, 150, TOTAL_KOLOM).setFontFamily("Arial");

  // Baris 1: Judul Utama
  const rangeJudul = sheet.getRange(1, 1, 1, TOTAL_KOLOM);
  rangeJudul.merge();
  rangeJudul.setValue("LAPORAN REKAPITULASI SANTRI SAKIT SMP");
  rangeJudul.setBackground("#0F172A"); // Dark Navy Slate
  rangeJudul.setFontColor("#FFFFFF");
  rangeJudul.setFontWeight("bold");
  rangeJudul.setFontSize(13);
  rangeJudul.setHorizontalAlignment("center");
  rangeJudul.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 42);

  // Baris 2: Sub-KOP Bulan, Tanggal & Sesi Laporan
  const rangeSubJudul = sheet.getRange(2, 1, 1, TOTAL_KOLOM);
  rangeSubJudul.merge();
  rangeSubJudul.setValue("Bulan: " + namaBulanPanjang + " " + tahunNomor + "   |   Tanggal: " + tanggalPanjang + "   |   Sesi: " + sesi);
  rangeSubJudul.setBackground("#1E293B"); // Slate menengah
  rangeSubJudul.setFontColor("#38BDF8"); // Sky Blue cerah
  rangeSubJudul.setFontWeight("bold");
  rangeSubJudul.setFontSize(10.5);
  rangeSubJudul.setHorizontalAlignment("center");
  rangeSubJudul.setVerticalAlignment("middle");
  sheet.setRowHeight(2, 28);

  // Baris 3: Info Waktu Kirim & Total Santri
  let infoKop = "Waktu Kirim: " + formattedTimestamp + " WIB   •   Total Dilaporkan: " + santriList.length + " Santri";
  if (namaPelapor) {
    infoKop = "Waktu Kirim: " + formattedTimestamp + " WIB   •   Petugas: " + namaPelapor + "   •   Total Dilaporkan: " + santriList.length + " Santri";
  }

  const rangeInfo = sheet.getRange(3, 1, 1, TOTAL_KOLOM);
  rangeInfo.merge();
  rangeInfo.setValue(infoKop);
  rangeInfo.setBackground("#F8FAFC");
  rangeInfo.setFontColor("#475569");
  rangeInfo.setFontSize(9.5);
  rangeInfo.setHorizontalAlignment("center");
  rangeInfo.setVerticalAlignment("middle");
  rangeInfo.setBorder(false, false, true, false, false, false, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(3, 24);

  // Baris 4: Spacer
  sheet.setRowHeight(4, 10);

  // Baris 5: 4 Kartu Ringkasan Status Cepat (Simetris di atas 11 Kolom)
  let countSakit = 0;
  let countIzin = 0;
  let countAlpa = 0;
  santriList.forEach(function(s) {
    const st = (s.statusKehadiran || s.status || "").toLowerCase();
    if (st.includes("sakit")) countSakit++;
    else if (st.includes("izin")) countIzin++;
    else countAlpa++;
  });

  // Box Sakit (Kolom A s/d C - 3 Kolom)
  const boxSakit = sheet.getRange("A5:C5");
  boxSakit.merge().setValue("TOTAL SAKIT: " + countSakit + " Santri")
    .setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBorder(true, true, true, true, false, false, "#F87171", SpreadsheetApp.BorderStyle.SOLID);

  // Box Izin (Kolom D s/d E - 2 Kolom)
  const boxIzin = sheet.getRange("D5:E5");
  boxIzin.merge().setValue("TOTAL IZIN: " + countIzin + " Santri")
    .setBackground("#FEF3C7").setFontColor("#92400E").setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBorder(true, true, true, true, false, false, "#FBBF24", SpreadsheetApp.BorderStyle.SOLID);

  // Box Alpa (Kolom F s/d G - 2 Kolom)
  const boxAlpa = sheet.getRange("F5:G5");
  boxAlpa.merge().setValue("TOTAL ALPA: " + countAlpa + " Santri")
    .setBackground("#F3E8FF").setFontColor("#6B21A8").setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBorder(true, true, true, true, false, false, "#C084FC", SpreadsheetApp.BorderStyle.SOLID);

  // Box Total (Kolom H s/d K - 4 Kolom)
  const boxTotal = sheet.getRange("H5:K5");
  boxTotal.merge().setValue("TOTAL REKAP: " + santriList.length + " Santri")
    .setBackground("#E2E8F0").setFontColor("#0F172A").setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBorder(true, true, true, true, false, false, "#94A3B8", SpreadsheetApp.BorderStyle.SOLID);

  sheet.setRowHeight(5, 32);
  sheet.setRowHeight(6, 14); // Spacer sebelum tabel data

  // Kelompokkan santri per gedung asrama & kamar agar TIDAK CAMPUR
  const kelompokMap = {};
  const urutanKelompok = ["Kelas 9", "Kelas 8", "Kelas 7"];

  santriList.forEach(function(item) {
    const k = (item.kelas || "").trim();
    let kelasKey = "Lainnya";
    if (k.includes("9")) kelasKey = "Kelas 9";
    else if (k.includes("8")) kelasKey = "Kelas 8";
    else if (k.includes("7")) kelasKey = "Kelas 7";

    const kamarRaw = (item.kamar || "Kamar Umum").trim();
    // Kunci unik pemisah per Asrama & Kamar
    const groupKey = kelasKey + "__" + kamarRaw;

    if (!kelompokMap[groupKey]) kelompokMap[groupKey] = [];
    kelompokMap[groupKey].push(item);
  });

  let barisSaatIni = 7;
  const headerKolomTabel = [
    "No",
    "Nama Santri",
    "Kelas",
    "Kamar",
    "Status",
    "Keluhan / Penyakit / Alasan",
    "Obat yang Diberikan",
    "Mulai Sejak",
    "Lokasi Istirahat",
    "Suhu",
    "Catatan Tambahan"
  ];

  // Urutkan kotak: Kelas 9, Kelas 8, Kelas 7, lalu urutkan nomor kamar secara numerik alami
  const daftarKunci = Object.keys(kelompokMap).sort(function(a, b) {
    const partsA = a.split("__");
    const partsB = b.split("__");
    const kelasA = partsA[0];
    const kelasB = partsB[0];
    const kamarA = partsA[1] || "";
    const kamarB = partsB[1] || "";

    const ia = urutanKelompok.indexOf(kelasA);
    const ib = urutanKelompok.indexOf(kelasB);
    if (ia !== ib) {
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
    }
    return kamarA.localeCompare(kamarB, undefined, { numeric: true, sensitivity: 'base' });
  });

  daftarKunci.forEach(function(kategoriKey) {
    const items = kelompokMap[kategoriKey];
    if (!items || items.length === 0) return;

    const parts = kategoriKey.split("__");
    const kelasKey = parts[0];
    const kamarKey = parts[1] || "";

    let namaBannerKotak = "";
    let warnaBanner = "#1E293B";

    if (kelasKey === "Kelas 9") {
      namaBannerKotak = "KELAS 9 • " + kamarKey.toUpperCase() + "   —   " + items.length + " Santri Dilaporkan";
      warnaBanner = "#0F172A"; // Navy Slate Gelap
    } else if (kelasKey === "Kelas 8") {
      namaBannerKotak = "KELAS 8 • " + kamarKey.toUpperCase() + "   —   " + items.length + " Santri Dilaporkan";
      warnaBanner = "#1E293B"; // Slate
    } else if (kelasKey === "Kelas 7") {
      namaBannerKotak = "KELAS 7 • " + kamarKey.toUpperCase() + "   —   " + items.length + " Santri Dilaporkan";
      warnaBanner = "#1E293B"; // Slate
    } else {
      namaBannerKotak = (kamarKey ? kamarKey.toUpperCase() : kelasKey.toUpperCase()) + "   —   " + items.length + " Santri";
      warnaBanner = "#334155";
    }

    const barisMulaiKotak = barisSaatIni;

    // 1. Baris Judul Kotak (Banner Asrama)
    const rangeBanner = sheet.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
    rangeBanner.merge();
    rangeBanner.setValue(namaBannerKotak);
    rangeBanner.setBackground(warnaBanner);
    rangeBanner.setFontColor("#FFFFFF");
    rangeBanner.setFontWeight("bold");
    rangeBanner.setFontSize(10.5);
    rangeBanner.setVerticalAlignment("middle");
    rangeBanner.setHorizontalAlignment("left");
    sheet.setRowHeight(barisSaatIni, 30);
    barisSaatIni++;

    // 2. Baris Header Kolom Tabel
    const rangeHeaderKotak = sheet.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
    rangeHeaderKotak.setValues([headerKolomTabel]);
    rangeHeaderKotak.setBackground("#334155"); // Steel slate
    rangeHeaderKotak.setFontColor("#FFFFFF");
    rangeHeaderKotak.setFontWeight("bold");
    rangeHeaderKotak.setFontSize(9.5);
    rangeHeaderKotak.setHorizontalAlignment("center");
    rangeHeaderKotak.setVerticalAlignment("middle");
    sheet.setRowHeight(barisSaatIni, 28);
    barisSaatIni++;

    // 3. Baris Data Santri
    items.forEach(function(item, idx) {
      const rowStatus = item.statusKehadiran || item.status || "Sakit";
      const rowKelas = item.kelas || kategoriKey || "-";
      const rowKamar = item.kamar || "-";
      const rowData = [
        idx + 1,
        item.namaSantri || item.nama || "-",
        rowKelas,
        rowKamar,
        rowStatus,
        item.sakit || item.keluhan || item.alasan || "-",
        item.obat || "-",
        item.dariKapan || item.sejak || "-",
        item.lokasi || "-",
        item.suhuTubuh || item.suhu || "-",
        item.rincianSakit || item.rincianGejala || item.catatan || "-"
      ];

      const rowRange = sheet.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
      rowRange.setValues([rowData]);
      rowRange.setVerticalAlignment("middle");
      rowRange.setFontSize(9.5);
      rowRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
      sheet.setRowHeight(barisSaatIni, 28);

      // Alignment per kolom
      sheet.getRange(barisSaatIni, 1).setHorizontalAlignment("center"); // No
      sheet.getRange(barisSaatIni, 2).setFontWeight("bold").setHorizontalAlignment("left"); // Nama
      sheet.getRange(barisSaatIni, 3).setFontWeight("bold").setHorizontalAlignment("center"); // Kelas
      sheet.getRange(barisSaatIni, 4).setHorizontalAlignment("center"); // Kamar
      sheet.getRange(barisSaatIni, 6).setHorizontalAlignment("left"); // Keluhan
      sheet.getRange(barisSaatIni, 7).setHorizontalAlignment("left"); // Obat
      sheet.getRange(barisSaatIni, 8).setHorizontalAlignment("center"); // Mulai Sejak
      sheet.getRange(barisSaatIni, 9).setHorizontalAlignment("left"); // Lokasi
      sheet.getRange(barisSaatIni, 10).setHorizontalAlignment("center"); // Suhu
      sheet.getRange(barisSaatIni, 11).setHorizontalAlignment("left"); // Catatan

      // Badge Status Berwarna (Kolom E / Kolom 5)
      const cellStatus = sheet.getRange(barisSaatIni, 5);
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
      sheet.getRange(barisSaatIni, 1, 1, 4).setBackground(rowBg);
      sheet.getRange(barisSaatIni, 6, 1, 6).setBackground(rowBg);

      // Garis pemisah horizontal tipis antar baris
      rowRange.setBorder(true, false, true, false, false, false, "#E2E8F0", SpreadsheetApp.BorderStyle.SOLID);

      barisSaatIni++;
    });

    const barisAkhirKotak = barisSaatIni - 1;

    // 4. Pasang Border Luar Mengelilingi Kotak (Efek Card Rapi)
    const rangeSeluruhKotak = sheet.getRange(barisMulaiKotak, 1, barisAkhirKotak - barisMulaiKotak + 1, TOTAL_KOLOM);
    rangeSeluruhKotak.setBorder(true, true, true, true, false, false, "#64748B", SpreadsheetApp.BorderStyle.SOLID);

    // Jeda antar kotak
    sheet.setRowHeight(barisSaatIni, 14);
    barisSaatIni++;
  });

  // Catatan Umum Pemeriksaan (Jika Ada)
  if (catatanUmum && catatanUmum !== "-") {
    const rangeCatatan = sheet.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
    rangeCatatan.merge();
    rangeCatatan.setValue("Catatan Pemeriksaan: " + catatanUmum);
    rangeCatatan.setBackground("#F8FAFC").setFontColor("#334155").setFontStyle("italic").setFontSize(9.5)
      .setVerticalAlignment("middle").setBorder(true, true, true, true, false, false, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);
    sheet.setRowHeight(barisSaatIni, 30);
    barisSaatIni++;
  }

  // Lebar Kolom Proporsional (11 Kolom)
  sheet.setColumnWidth(1, 45);   // No
  sheet.setColumnWidth(2, 220);  // Nama Santri
  sheet.setColumnWidth(3, 85);   // Kelas
  sheet.setColumnWidth(4, 140);  // Kamar
  sheet.setColumnWidth(5, 95);   // Status
  sheet.setColumnWidth(6, 240);  // Keluhan / Penyakit / Alasan
  sheet.setColumnWidth(7, 170);  // Obat
  sheet.setColumnWidth(8, 120);  // Mulai Sejak
  sheet.setColumnWidth(9, 170);  // Lokasi Istirahat
  sheet.setColumnWidth(10, 75);  // Suhu
  sheet.setColumnWidth(11, 210); // Catatan Tambahan
}

/**
 * 4. FUNGSI HEADER TAB MASTER ARSIP
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
    "Link Spreadsheet Baru"
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
  sheet.setColumnWidth(15, 250); // Link Spreadsheet Baru
}

/**
 * 5. FUNGSI FORMAT BARIS TAB MASTER
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
