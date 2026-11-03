/**
 * ============================================================================
 * GOOGLE APPS SCRIPT - PRESENSI SANTRI ASRAMA (SAKIT, IZIN, ALPA)
 * Versi 8.0 (Multi-Sender Kumulatif & Pemisahan Gedung Asrama 3/2/1)
 * ============================================================================
 * 
 * FITUR UTAMA VERSI 8.0:
 * 1. MULTI-SENDER KUMULATIF (1 HARI BANYAK PENGURUS/PEMBINA):
 *    - Jika dalam 1 hari ada 2 orang atau lebih yang mengirim formulir (misal:
 *      Pembina Asrama 1 kirim Kelas 7, lalu Pembina Asrama 2 kirim Kelas 8),
 *      data dari SEMUA pengirim otomatis DIGABUNGKAN (KUMULATIF) di tab sesi
 *      hari tersebut tanpa saling menimpa atau menghilangkan data sebelumnya!
 *    - Header laporan otomatis menampilkan seluruh nama pembina pelapor
 *      (contoh: "Ust. Faisal (Asrama 1) • Ust. Huda (Asrama 2)").
 * 
 * 2. PEMISAHAN DATA GEDUNG ASRAMA & JENJANG KELAS (BERSIH & TERPISAH):
 *    - Gedung Asrama 3 • Kelas 9
 *    - Gedung Asrama 2 • Kelas 8
 *    - Gedung Asrama 1 • Kelas 7
 *    Setiap gedung/kelas memiliki Banner Utama yang tegas, dan di dalamnya
 *    tersusun rapi kotak-kotak tabel kamar masing-masing.
 * 
 * 3. 1 HARI 1 FILE SPREADSHEET DENGAN LINK SHARING PUBLIK:
 *    - Semua sesi (Pagi & Malam) dan semua kiriman pembina pada hari yang sama
 *      tersimpan rapi di dalam 1 file spreadsheet harian yang sama.
 *    - Begitu berganti hari kalender (lewat pukul 00:00), sistem otomatis
 *      membuat file Google Spreadsheet BARU dengan link baru.
 *    - Link sharing otomatis berformat "?usp=sharing" sehingga langsung dapat
 *      dibuka oleh siapa saja tanpa perlu request akses.
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
 * 0. FUNGSI OTORISASI IZIN GOOGLE DRIVE (JALANKAN SEKALI DARI EDITOR JIKA DIMINTA)
 * Baris DriveApp di bawah sengaja dibuat TANPA try-catch agar Google Apps Script
 * memunculkan jendela pop-up otorisasi izin Drive jika belum pernah disetujui:
 * "Authorization required (Otorisasi Diperlukan)" -> Review permissions -> Allow!
 */
function otorisasiAksesPublikDrive() {
  DriveApp.getRootFolder().getName();

  const props = PropertiesService.getScriptProperties();
  const currentId = props.getProperty("CURRENT_SPREADSHEET_ID");
  if (currentId) {
    const f = DriveApp.getFileById(currentId);
    try {
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
    } catch (e1) {
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    Logger.log("BERHASIL! Spreadsheet (" + currentId + ") sekarang TERBUKA untuk siapa saja dengan link.");
  }
}

/**
 * 1. FUNGSI MENAMPILKAN STATUS SERVER (GET)
 * Mengembalikan status server dan link spreadsheet terbaru yang dibuat.
 */
function doGet(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    let latestUrl = props.getProperty("LATEST_SPREADSHEET_URL") || "";
    if (latestUrl && !latestUrl.includes("usp=sharing")) {
      latestUrl = latestUrl.replace(/\/edit.*$/, "") + "/edit?usp=sharing";
    }
    const latestName = props.getProperty("LATEST_SPREADSHEET_NAME") || "";
    const latestTotal = props.getProperty("LATEST_TOTAL_SANTRI") || "0";
    const currentId = props.getProperty("CURRENT_SPREADSHEET_ID") || "";

    let driveIzinStatus = "TIDAK_DICEK";
    if (currentId) {
      try {
        const file = DriveApp.getFileById(currentId);
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
          driveIzinStatus = "TERBUKA_PUBLIK_EDIT";
        } catch(e1) {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          driveIzinStatus = "TERBUKA_PUBLIK_VIEW";
        }
      } catch(eShare) {
        driveIzinStatus = "PERLU_OTORISASI: " + eShare.toString();
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Server Google Apps Script Presensi Asrama (v8.0) Aktif!",
      spreadsheetUrl: latestUrl,
      spreadsheetName: latestName,
      totalSantri: latestTotal,
      driveAkses: driveIzinStatus,
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
 * mendukung multi-sender kumulatif dalam 1 hari, KOP Judul SMP,
 * dan pemisahan tegas Gedung Asrama 3 (Kelas 9), Gedung Asrama 2 (Kelas 8), dan Gedung Asrama 1 (Kelas 7).
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000); // Kunci 30 detik untuk pencegahan konflik penulisan ganda

  try {
    // Parsing data dari request
    let data = {};
    if (!e) {
      // Data simulasi jika dites langsung dari editor Apps Script
      data = {
        sesi: "Pagi",
        namaPelapor: "Ust. Pembina Asrama (Test)",
        keterangan: "Pemeriksaan rutin asrama pagi hari",
        santriItems: [
          {
            kelas: "Kelas 9",
            kamar: "Kamar 1",
            namaSantri: "Chaedar Dwi Osama",
            statusKehadiran: "Alpa",
            sakit: "Belum kembali ke kamar saat presensi",
            rincianSakit: "Tanpa surat izin",
            obat: "-",
            dariKapan: "Hari Ini (Pagi)",
            lokasi: "Tidak Berada di Kamar (Alpa)",
            suhuTubuh: "-"
          },
          {
            kelas: "Kelas 8",
            kamar: "3.01",
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
            kamar: "1.01",
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
    let tglNomor = now.getDate();
    let bulanIndex = now.getMonth();
    let tahunNomor = now.getFullYear();

    if (data.tanggal && typeof data.tanggal === "string" && data.tanggal.includes("-")) {
      const parts = data.tanggal.split("-");
      if (parts.length === 3) {
        tahunNomor = parseInt(parts[0], 10) || tahunNomor;
        const b = parseInt(parts[1], 10) - 1;
        if (b >= 0 && b <= 11) bulanIndex = b;
        tglNomor = parseInt(parts[2], 10) || tglNomor;
      }
    }

    const namaBulanPanjang = NAMA_BULAN_INDO[bulanIndex];
    const namaBulanPendek = NAMA_BULAN_PENDEK[bulanIndex];
    const tanggalPanjang = tglNomor + " " + namaBulanPanjang + " " + tahunNomor;
    const tanggalIso = tahunNomor + "-" + String(bulanIndex + 1).padStart(2, "0") + "-" + String(tglNomor).padStart(2, "0");
    const sesi = data.sesi || "Pagi";

    // Bersihkan nama pelapor
    let rawPelapor = (data.namaPelapor || data.checker || "").trim();
    let namaPelapor = "";
    if (rawPelapor && !/faris|zahran/i.test(rawPelapor)) {
      namaPelapor = rawPelapor;
    }

    const catatanUmum = (data.keterangan || data.catatanKamar || "-").trim();

    // Normalisasi array santri dari request saat ini
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
    // TAHAP 1: KELOLA FILE SPREADSHEET (1 HARI LINK SAMA, LEWAT 1 HARI BUAT BARU)
    // ========================================================================
    const judulSpreadsheetHarian = "Laporan Rekap Santri Sakit SMP - " + tanggalPanjang;
    let ssTarget = null;
    let spreadsheetUrl = "";
    const props = PropertiesService.getScriptProperties();
    const lastDate = (props.getProperty("CURRENT_SPREADSHEET_DATE") || "").trim();
    const lastId = (props.getProperty("CURRENT_SPREADSHEET_ID") || "").trim();

    // 1. Cek apakah sudah ada file spreadsheet untuk hari ini (Link sama dalam 1 hari)
    if (lastDate === tanggalIso && lastId) {
      try {
        ssTarget = SpreadsheetApp.openById(lastId);
        spreadsheetUrl = ssTarget.getUrl();
        Logger.log("Menggunakan spreadsheet hari ini (" + tanggalIso + "): " + lastId);
      } catch (errOpen) {
        Logger.log("Gagal membuka spreadsheet lama, akan buat baru: " + errOpen.toString());
        ssTarget = null;
      }
    }

    // 2. Jika belum ada atau tanggal sudah berganti (lewat 1 hari), buat spreadsheet BARU
    if (!ssTarget) {
      try {
        ssTarget = SpreadsheetApp.create(judulSpreadsheetHarian);
        spreadsheetUrl = ssTarget.getUrl();
      } catch (errCreate) {
        Logger.log("Gagal SpreadsheetApp.create: " + errCreate.toString());
        ssTarget = SpreadsheetApp.getActiveSpreadsheet();
        if (ssTarget) spreadsheetUrl = ssTarget.getUrl();
      }

      if (!ssTarget) {
        throw new Error("Tidak dapat menginisialisasi Google Spreadsheet.");
      }

      // Simpan tanggal dan ID file baru hari ini ke ScriptProperties
      props.setProperty("CURRENT_SPREADSHEET_DATE", tanggalIso);
      props.setProperty("CURRENT_SPREADSHEET_ID", ssTarget.getId());
      props.setProperty("CURRENT_SPREADSHEET_URL", spreadsheetUrl);
    }

    // Format link menjadi link sharing publik resmi Google Sheets (?usp=sharing)
    let publicSharingUrl = spreadsheetUrl;
    if (publicSharingUrl && !publicSharingUrl.includes("usp=sharing")) {
      publicSharingUrl = publicSharingUrl.replace(/\/edit.*$/, "") + "/edit?usp=sharing";
    }

    // 3. Pastikan izin berbagi SIAPA SAJA DENGAN LINK AKTIF agar tidak diblokir/minta akses di HP atau akun lain
    try {
      const driveFile = DriveApp.getFileById(ssTarget.getId());
      try {
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
      } catch (eEdit) {
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
    } catch (eDrive) {
      Logger.log("Info setting sharing Drive: " + eDrive.toString());
    }

    // ========================================================================
    // TAHAP 2: SIMPAN DATA MASUK KE TAB MASTER "Semua Riwayat" DI FILE HARIAN
    // (Disimpan terlebih dahulu agar riwayat setiap kiriman tersimpan abadi)
    // ========================================================================
    let sheetMasterHarian = ssTarget.getSheetByName(NAMA_SHEET_MASTER);
    if (!sheetMasterHarian) {
      sheetMasterHarian = ssTarget.insertSheet(NAMA_SHEET_MASTER);
      buatHeaderKolomMaster(sheetMasterHarian);
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
        publicSharingUrl
      ];
      sheetMasterHarian.appendRow(rowMaster);
      formatBarisMaster(sheetMasterHarian, rowStatus);
    });

    // ========================================================================
    // TAHAP 3: HIMPUN SELURUH SANTRI SESI INI SECARA KUMULATIF DARI SEMUA PENGIRIM
    // (Jika ada 2 orang atau lebih yang kirim hari ini, SEMUA DATA DIGABUNGKAN)
    // ========================================================================
    const rekapSesi = ambilSemuaSantriSesiHariIni(sheetMasterHarian, sesi);
    const santriKumulatif = (rekapSesi.santriList && rekapSesi.santriList.length > 0) ? rekapSesi.santriList : santriList;
    const gabunganPelapor = (rekapSesi.pelaporList && rekapSesi.pelaporList.length > 0) ? rekapSesi.pelaporList.join(" • ") : namaPelapor;
    const gabunganCatatan = (rekapSesi.catatanList && rekapSesi.catatanList.length > 0) ? rekapSesi.catatanList.join("; ") : catatanUmum;

    // Update info spreadsheet terbaru untuk respon GET fallback
    try {
      props.setProperty("LATEST_SPREADSHEET_URL", publicSharingUrl);
      props.setProperty("LATEST_SPREADSHEET_NAME", judulSpreadsheetHarian);
      props.setProperty("LATEST_TOTAL_SANTRI", String(santriKumulatif.length));
    } catch (eProp) {
      Logger.log("Info props: " + eProp.toString());
    }

    // ========================================================================
    // TAHAP 4: TAMPILKAN TAB SESI (PAGI / MALAM) DENGAN DATA KUMULATIF LENGKAP
    // ========================================================================
    const namaTabSesi = "Sesi " + sesi;
    let sheetSesi = ssTarget.getSheetByName(namaTabSesi);

    if (!sheetSesi) {
      const existingSheets = ssTarget.getSheets();
      if (existingSheets.length === 1 && (existingSheets[0].getName() === "Sheet1" || existingSheets[0].getName().toLowerCase().includes("sheet"))) {
        sheetSesi = existingSheets[0];
        sheetSesi.setName(namaTabSesi);
      } else {
        sheetSesi = ssTarget.insertSheet(namaTabSesi, 0);
      }
    } else {
      // Bersihkan tab sesi untuk direkonstruksi dengan data kumulatif dari seluruh pembina
      sheetSesi.clear();
    }

    // Bangun tampilan rapi di tab sesi tersebut (terpisah Gedung 3/2/1 & per kamar)
    bangunTampilanLaporan(sheetSesi, santriKumulatif, namaBulanPanjang, tahunNomor, tanggalPanjang, sesi, formattedTimestamp, gabunganPelapor, gabunganCatatan);

    // ========================================================================
    // TAHAP 5: SIMPAN JUGA KE CONTAINER JIKA BERBEDA (ARSIP GLOBAL LENGKAP)
    // ========================================================================
    const ssContainer = SpreadsheetApp.getActiveSpreadsheet();
    if (ssContainer && ssContainer.getId() !== ssTarget.getId()) {
      try {
        let sheetMasterGlobal = ssContainer.getSheetByName(NAMA_SHEET_MASTER);
        if (!sheetMasterGlobal) {
          sheetMasterGlobal = ssContainer.insertSheet(NAMA_SHEET_MASTER);
          buatHeaderKolomMaster(sheetMasterGlobal);
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
            publicSharingUrl
          ];
          sheetMasterGlobal.appendRow(rowMaster);
          formatBarisMaster(sheetMasterGlobal, rowStatus);
        });
      } catch (eGlobal) {
        Logger.log("Info arsip global: " + eGlobal.toString());
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Laporan sesi " + sesi + " berhasil disimpan di file " + tanggalPanjang + "! (" + santriKumulatif.length + " santri tercatat kumulatif)",
      spreadsheetUrl: publicSharingUrl,
      spreadsheetName: judulSpreadsheetHarian,
      tabBaru: namaTabSesi,
      jumlahSantri: santriKumulatif.length,
      santriBaru: santriList.length,
      pelapor: gabunganPelapor
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
 * 3. FUNGSI HIMPUN DATA KUMULATIF PER SESI HARI INI DARI TAB MASTER
 * Menggabungkan laporan dari Orang 1, Orang 2, dst. yang mengirim di sesi yang sama.
 * Jika santri yang sama diperbarui informasinya, data terbaru yang digunakan.
 */
function ambilSemuaSantriSesiHariIni(sheetMasterHarian, targetSesi) {
  const data = sheetMasterHarian.getDataRange().getValues();
  if (data.length <= 1) {
    return { santriList: [], pelaporList: [], catatanList: [] };
  }

  const targetSesiClean = String(targetSesi || "").trim().toLowerCase();
  const santriMap = {};
  const pelaporSet = [];
  const catatanSet = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowSesi = String(row[1] || "").trim().toLowerCase();

    // Cocokkan dengan sesi yang sedang diproses (misal "Pagi" atau "Malam")
    if (rowSesi === targetSesiClean) {
      const kelas = String(row[2] || "").trim();
      const kamar = String(row[3] || "").trim();
      const nama = String(row[4] || "").trim();
      const status = String(row[5] || "Sakit").trim();
      const keluhan = String(row[6] || "-").trim();
      const rincian = String(row[7] || "-").trim();
      const obat = String(row[8] || "-").trim();
      const dariKapan = String(row[9] || "-").trim();
      const lokasi = String(row[10] || "-").trim();
      const suhu = String(row[11] || "-").trim();
      const catatan = String(row[12] || "-").trim();
      const pelapor = String(row[13] || "").trim();

      if (!nama || nama === "-") continue;

      // Kunci unik per santri: kelas + kamar + nama
      // Jika pembina yang sama/berbeda mengirim koreksi untuk santri yang sama, record terupdate
      const santriKey = (kelas + "__" + kamar + "__" + nama).toLowerCase();

      santriMap[santriKey] = {
        kelas: kelas,
        kamar: kamar,
        namaSantri: nama,
        statusKehadiran: status,
        sakit: keluhan,
        rincianSakit: rincian,
        obat: obat,
        dariKapan: dariKapan,
        lokasi: lokasi,
        suhuTubuh: suhu,
        catatan: catatan
      };

      if (pelapor && pelapor !== "-" && !pelaporSet.includes(pelapor)) {
        pelaporSet.push(pelapor);
      }
      if (catatan && catatan !== "-" && !catatanSet.includes(catatan)) {
        catatanSet.push(catatan);
      }
    }
  }

  const santriKumulatif = Object.keys(santriMap).map(function(k) {
    return santriMap[k];
  });

  return {
    santriList: santriKumulatif,
    pelaporList: pelaporSet,
    catatanList: catatanSet
  };
}

/**
 * 4. FUNGSI MEMBANGUN STRUKTUR TAMPILAN LAPORAN (KOP, KPI, GEDUNG 3/2/1 & KOTAK KAMAR)
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
  sheet.getRange(1, 1, 300, TOTAL_KOLOM).setFontFamily("Arial");

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

  // Baris 3: Info Waktu Kirim & Total Santri Kumulatif
  let infoKop = "Waktu Pembaruan: " + formattedTimestamp + " WIB   •   Total Dilaporkan: " + santriList.length + " Santri";
  if (namaPelapor) {
    infoKop = "Waktu Pembaruan: " + formattedTimestamp + " WIB   •   Petugas: " + namaPelapor + "   •   Total Dilaporkan: " + santriList.length + " Santri";
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

  // Helper identifikasi jenjang kelas
  function tentukanKelasKey(kelasRaw) {
    const k = String(kelasRaw || "").toLowerCase();
    if (k.includes("9")) return "Kelas 9";
    if (k.includes("8")) return "Kelas 8";
    if (k.includes("7")) return "Kelas 7";
    return "Lainnya";
  }

  // Pengelompokan bertingkat: Jenjang Gedung Asrama / Kelas -> Kamar
  const perKelasMap = {};
  santriList.forEach(function(item) {
    const kelasKey = tentukanKelasKey(item.kelas);
    const kamarRaw = (item.kamar || "Kamar Umum").trim();

    if (!perKelasMap[kelasKey]) {
      perKelasMap[kelasKey] = {
        santriSemua: [],
        kamarMap: {}
      };
    }
    perKelasMap[kelasKey].santriSemua.push(item);

    if (!perKelasMap[kelasKey].kamarMap[kamarRaw]) {
      perKelasMap[kelasKey].kamarMap[kamarRaw] = [];
    }
    perKelasMap[kelasKey].kamarMap[kamarRaw].push(item);
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

  // Urutan resmi jenjang asrama: Kelas 9 (Gedung 3), Kelas 8 (Gedung 2), Kelas 7 (Gedung 1)
  const urutanKelas = ["Kelas 9", "Kelas 8", "Kelas 7", "Lainnya"];

  urutanKelas.forEach(function(kelasKey) {
    const dataKelas = perKelasMap[kelasKey];
    if (!dataKelas || dataKelas.santriSemua.length === 0) return;

    let judulGedung = "";
    let bgGedung = "#0F172A";
    let textGedung = "#FFFFFF";
    let borderGedung = "#38BDF8";

    if (kelasKey === "Kelas 9") {
      judulGedung = "🏢   GEDUNG ASRAMA 3  •  KELAS 9   (TOTAL: " + dataKelas.santriSemua.length + " SANTRI DILAPORKAN)";
      bgGedung = "#0F172A"; // Dark Navy Slate
      borderGedung = "#38BDF8";
    } else if (kelasKey === "Kelas 8") {
      judulGedung = "🏢   GEDUNG ASRAMA 2  •  KELAS 8   (TOTAL: " + dataKelas.santriSemua.length + " SANTRI DILAPORKAN)";
      bgGedung = "#1E293B"; // Slate Tua Elegan
      borderGedung = "#818CF8";
    } else if (kelasKey === "Kelas 7") {
      judulGedung = "🏢   GEDUNG ASRAMA 1  •  KELAS 7   (TOTAL: " + dataKelas.santriSemua.length + " SANTRI DILAPORKAN)";
      bgGedung = "#0F2942"; // Deep Blue Asrama
      borderGedung = "#60A5FA";
    } else {
      judulGedung = "🏢   " + kelasKey.toUpperCase() + "   (TOTAL: " + dataKelas.santriSemua.length + " SANTRI DILAPORKAN)";
      bgGedung = "#334155";
      borderGedung = "#94A3B8";
    }

    // ------------------------------------------------------------------------
    // BANNER UTAMA GEDUNG ASRAMA / JENJANG KELAS (LEVEL 1)
    // ------------------------------------------------------------------------
    const rangeBannerGedung = sheet.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
    rangeBannerGedung.merge();
    rangeBannerGedung.setValue(judulGedung);
    rangeBannerGedung.setBackground(bgGedung);
    rangeBannerGedung.setFontColor(textGedung);
    rangeBannerGedung.setFontWeight("bold");
    rangeBannerGedung.setFontSize(11.5);
    rangeBannerGedung.setHorizontalAlignment("left");
    rangeBannerGedung.setVerticalAlignment("middle");
    rangeBannerGedung.setBorder(true, true, true, true, false, false, borderGedung, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sheet.setRowHeight(barisSaatIni, 34);
    barisSaatIni++;

    // Spacer kecil di bawah banner gedung
    sheet.setRowHeight(barisSaatIni, 8);
    barisSaatIni++;

    // ------------------------------------------------------------------------
    // KOTAK TABEL PER KAMAR DI DALAM GEDUNG INI (LEVEL 2)
    // ------------------------------------------------------------------------
    const daftarKamar = Object.keys(dataKelas.kamarMap).sort(function(a, b) {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    });

    daftarKamar.forEach(function(kamarKey) {
      const itemsKamar = dataKelas.kamarMap[kamarKey];
      if (!itemsKamar || itemsKamar.length === 0) return;

      const barisMulaiKotak = barisSaatIni;

      // 1. Sub-Header Kamar
      const rangeBannerKamar = sheet.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
      rangeBannerKamar.merge();
      rangeBannerKamar.setValue("🛏️   KAMAR " + kamarKey.toUpperCase() + "   —   " + itemsKamar.length + " Santri Dilaporkan");
      rangeBannerKamar.setBackground("#334155"); // Medium Slate
      rangeBannerKamar.setFontColor("#FFFFFF");
      rangeBannerKamar.setFontWeight("bold");
      rangeBannerKamar.setFontSize(10);
      rangeBannerKamar.setHorizontalAlignment("left");
      rangeBannerKamar.setVerticalAlignment("middle");
      sheet.setRowHeight(barisSaatIni, 28);
      barisSaatIni++;

      // 2. Baris Header Kolom Tabel
      const rangeHeaderKotak = sheet.getRange(barisSaatIni, 1, 1, TOTAL_KOLOM);
      rangeHeaderKotak.setValues([headerKolomTabel]);
      rangeHeaderKotak.setBackground("#475569"); // Slate Header
      rangeHeaderKotak.setFontColor("#FFFFFF");
      rangeHeaderKotak.setFontWeight("bold");
      rangeHeaderKotak.setFontSize(9.5);
      rangeHeaderKotak.setHorizontalAlignment("center");
      rangeHeaderKotak.setVerticalAlignment("middle");
      sheet.setRowHeight(barisSaatIni, 26);
      barisSaatIni++;

      // 3. Baris Data Santri
      itemsKamar.forEach(function(item, idx) {
        const rowStatus = item.statusKehadiran || item.status || "Sakit";
        const rowKelas = item.kelas || kelasKey || "-";
        const rowKamar = item.kamar || kamarKey || "-";
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

      // 4. Pasang Border Luar Mengelilingi Kotak Kamar (Efek Card Rapi)
      const rangeSeluruhKotak = sheet.getRange(barisMulaiKotak, 1, barisAkhirKotak - barisMulaiKotak + 1, TOTAL_KOLOM);
      rangeSeluruhKotak.setBorder(true, true, true, true, false, false, "#64748B", SpreadsheetApp.BorderStyle.SOLID);

      // Jeda antar kamar di dalam gedung yang sama
      sheet.setRowHeight(barisSaatIni, 12);
      barisSaatIni++;
    });

    // ------------------------------------------------------------------------
    // JEDA PEMISAH BESAR ANTAR GEDUNG ASRAMA
    // ------------------------------------------------------------------------
    sheet.setRowHeight(barisSaatIni, 18);
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
 * 5. FUNGSI HEADER TAB MASTER ARSIP
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
 * 6. FUNGSI FORMAT BARIS TAB MASTER
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
