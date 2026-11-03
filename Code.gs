/**
 * ============================================================================
 * GOOGLE APPS SCRIPT - PRESENSI SANTRI ASRAMA (SAKIT, IZIN, ALPA)
 * Versi 8.1 (Multi-Sender 4 Petugas Piket, Kotak Kamar Standar, Link Publik Abadi)
 * ============================================================================
 * 
 * CARA KERJA SISTEM (PAGI, MALAM & HARI-HARI BERIKUTNYA):
 * 1. MULTI-SENDER (4 ORANG JAGA ASRAMA):
 *    - 2 Orang Jaga kirim Kelas 7 & Kelas 8 dari HP mereka.
 *    - 1 Orang Jaga kirim Kelas 9 dari HP-nya.
 *    - Data otomatis TERGABUNG di SATU file spreadsheet yang sama tanpa saling tindih!
 *    - Di tab sesi, kotak kamar Kelas 9, Kelas 8, dan Kelas 7 tersusun berurutan dengan rapi.
 * 
 * 2. SESI PAGI & SESI MALAM DALAM 1 FILE HARIAN:
 *    - Sesi Pagi masuk ke tab "Sesi Pagi".
 *    - Sesi Malam masuk ke tab "Sesi Malam".
 *    - Tab "Semua Riwayat" menyimpan seluruh log dari pagi sampai malam secara abadi.
 * 
 * 3. HARI BERGANTI (BESOK & SETERUSNYA):
 *    - Lewat pukul 00:00 (ganti tanggal kalender), script otomatis membuat file Google Spreadsheet BARU.
 *    - Link baru otomatis dibuat publik (?usp=sharing) sehingga siapa pun bisa membuka tanpa minta akses.
 * 
 * PANDUAN OTORISASI AGAR SHEETS SELALU OTOMATIS PUBLIK (DILAKUKAN 1 KALI SAJA):
 * 1. Di editor Apps Script, di dropdown fungsi (sebelah tombol Debug), pilih "otorisasiAksesPublikDrive".
 * 2. Klik tombol "Run" (Jalankan).
 * 3. Jika muncul "Authorization required (Otorisasi diperlukan)":
 *    - Klik "Review Permissions (Tinjau Izin)".
 *    - Pilih akun Google Anda.
 *    - Klik "Advanced (Lanjutan)" di kiri bawah -> Klik "Go to Presensi Santri Asrama (Buka/tidak aman)".
 *    - Klik "Allow (Izinkan)".
 * 4. SELESAI! Sekali diizinkan, DriveApp aktif selamanya.
 *    Setiap spreadsheet baru (pagi, malam, besok, lusa) otomatis TERBUKA PUBLIK.
 * 
 * CARA DEPLOY KE VERSI TERBARU:
 * 1. Salin seluruh isi file ini (Ctrl+A lalu Ctrl+C).
 * 2. Buka spreadsheet induk Anda > Extensions (Ekstensi) > Apps Script.
 * 3. Hapus semua teks lama di editor (Ctrl+A lalu Delete) dan Paste (Ctrl+V) kode ini.
 * 4. Klik ikon Save (Ctrl+S).
 * 5. Klik Deploy > Manage deployments > Klik ikon Pensil (Edit):
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
 * 0. FUNGSI OTORISASI IZIN GOOGLE DRIVE (JALANKAN SEKALI DARI EDITOR)
 * Berfungsi mengaktifkan izin DriveApp selamanya agar semua spreadsheet
 * (hari ini, malam nanti, besok dan seterusnya) otomatis berstatus publik.
 */
function otorisasiAksesPublikDrive() {
  DriveApp.getRootFolder().getName();

  const props = PropertiesService.getScriptProperties();
  const currentId = props.getProperty("CURRENT_SPREADSHEET_ID");
  if (currentId) {
    try {
      const f = DriveApp.getFileById(currentId);
      try {
        f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
      } catch (e1) {
        f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
      Logger.log("BERHASIL! Spreadsheet (" + currentId + ") sekarang TERBUKA untuk siapa saja dengan link.");
    } catch (eFile) {
      Logger.log("Info file: " + eFile.toString());
    }
  }
}

/**
 * 1. FUNGSI MENAMPILKAN STATUS SERVER (GET)
 * Mengembalikan status server dan link spreadsheet publik terbaru.
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
      message: "Server Google Apps Script Presensi Asrama (v8.1) Aktif!",
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
 * Menyatukan kiriman dari banyak orang jaga asrama (Kelas 7, 8, dan 9)
 * ke dalam SATU file spreadsheet yang sama, membedakan tab Pagi/Malam,
 * dan otomatis membuat spreadsheet baru ketika berganti hari.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000); // Kunci 30 detik agar antrean kiriman dari 4 HP diproses aman tanpa konflik

  try {
    let data = {};
    if (!e) {
      // Data simulasi saat pengujian manual langsung di editor
      data = {
        sesi: "Pagi",
        namaPelapor: "Ust. Piket Asrama (Test)",
        keterangan: "Pengecekan rutin asrama",
        santriItems: [
          {
            kelas: "Kelas 9",
            kamar: "Kamar 1",
            namaSantri: "Chaedar Dwi Osama",
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

    // Normalisasi daftar santri dari request saat ini
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
    // TAHAP 1: KELOLA FILE SPREADSHEET (1 HARI = 1 SPREADSHEET YANG SAMA)
    // ========================================================================
    const judulSpreadsheetHarian = "Laporan Rekap Santri Sakit SMP - " + tanggalPanjang;
    let ssTarget = null;
    let spreadsheetUrl = "";
    const props = PropertiesService.getScriptProperties();
    const lastDate = (props.getProperty("CURRENT_SPREADSHEET_DATE") || "").trim();
    const lastId = (props.getProperty("CURRENT_SPREADSHEET_ID") || "").trim();

    // 1a. Cek apakah sudah ada spreadsheet untuk hari ini via ScriptProperties
    if (lastDate === tanggalIso && lastId) {
      try {
        ssTarget = SpreadsheetApp.openById(lastId);
        spreadsheetUrl = ssTarget.getUrl();
        Logger.log("Menggunakan spreadsheet hari ini (" + tanggalIso + "): " + lastId);
      } catch (errOpen) {
        Logger.log("Gagal membuka spreadsheet lama, akan cari/buat baru: " + errOpen.toString());
        ssTarget = null;
      }
    }

    // 1b. Fallback: Cari di Google Drive jika ada file dengan judul hari ini
    if (!ssTarget) {
      try {
        const fileIter = DriveApp.getFilesByName(judulSpreadsheetHarian);
        if (fileIter.hasNext()) {
          const existingDriveFile = fileIter.next();
          ssTarget = SpreadsheetApp.openById(existingDriveFile.getId());
          spreadsheetUrl = ssTarget.getUrl();
          props.setProperty("CURRENT_SPREADSHEET_DATE", tanggalIso);
          props.setProperty("CURRENT_SPREADSHEET_ID", ssTarget.getId());
          props.setProperty("CURRENT_SPREADSHEET_URL", spreadsheetUrl);
          Logger.log("Menemukan file hari ini via Drive: " + ssTarget.getId());
        }
      } catch (eFindDrive) {
        Logger.log("Info pencarian Drive: " + eFindDrive.toString());
      }
    }

    // 2. Jika belum ada file hari ini (atau tanggal sudah berganti), BUAT BARU
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

      props.setProperty("CURRENT_SPREADSHEET_DATE", tanggalIso);
      props.setProperty("CURRENT_SPREADSHEET_ID", ssTarget.getId());
      props.setProperty("CURRENT_SPREADSHEET_URL", spreadsheetUrl);
    }

    // Format link menjadi link sharing publik resmi Google Sheets (?usp=sharing)
    let publicSharingUrl = spreadsheetUrl;
    if (publicSharingUrl && !publicSharingUrl.includes("usp=sharing")) {
      publicSharingUrl = publicSharingUrl.replace(/\/edit.*$/, "") + "/edit?usp=sharing";
    }

    // 3. SET AKSES PUBLIK (ANYONE WITH LINK DAPAT MEMBUKA)
    // Berlaku untuk sesi pagi, sesi malam, dan besok-besoknya
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
    // TAHAP 2: SIMPAN DATA BARU KE TAB MASTER "Semua Riwayat"
    // (Seluruh kiriman dari Orang 1, 2, 3 tercatat permanen di sini)
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
    // TAHAP 3: HIMPUN SEMUA SANTRI DARI SELURUH ORANG JAGA DI SESI INI
    // (Menggabungkan kiriman Kelas 7, 8 dari Orang 1 & 2 dengan Kelas 9 dari Orang 3)
    // ========================================================================
    const rekapSesi = ambilSemuaSantriSesiHariIni(sheetMasterHarian, sesi);
    const santriKumulatif = (rekapSesi.santriList && rekapSesi.santriList.length > 0) ? rekapSesi.santriList : santriList;
    const gabunganPelapor = (rekapSesi.pelaporList && rekapSesi.pelaporList.length > 0) ? rekapSesi.pelaporList.join(" • ") : namaPelapor;
    const gabunganCatatan = (rekapSesi.catatanList && rekapSesi.catatanList.length > 0) ? rekapSesi.catatanList.join("; ") : catatanUmum;

    // Simpan info rekap terbaru
    try {
      props.setProperty("LATEST_SPREADSHEET_URL", publicSharingUrl);
      props.setProperty("LATEST_SPREADSHEET_NAME", judulSpreadsheetHarian);
      props.setProperty("LATEST_TOTAL_SANTRI", String(santriKumulatif.length));
    } catch (eProp) {
      Logger.log("Info props: " + eProp.toString());
    }

    // ========================================================================
    // TAHAP 4: TAMPILKAN TAB SESI (PAGI / MALAM) DENGAN KOTAK KAMAR STANDAR
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
      sheetSesi.clear();
    }

    // Bangun tampilan rapi seragam kotak kamar per kelas (Kelas 9, Kelas 8, Kelas 7)
    bangunTampilanLaporan(sheetSesi, santriKumulatif, namaBulanPanjang, tahunNomor, tanggalPanjang, sesi, formattedTimestamp, gabunganPelapor, gabunganCatatan);

    // ========================================================================
    // TAHAP 5: ARSIP GLOBAL DI CONTAINER (JIKA BERBEDA)
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
      message: "Laporan sesi " + sesi + " tersimpan! (" + santriKumulatif.length + " santri tercatat kumulatif di 1 file)",
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
 * Menggabungkan seluruh kiriman dari semua HP yang mengirim pada sesi yang sama.
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

    // Cocokkan dengan sesi (misal "Pagi" atau "Malam")
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
      // Jika orang yang sama mengirim koreksi santri yang sama, record terupdate rapi
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
 * 4. FUNGSI MEMBANGUN STRUKTUR TAMPILAN LAPORAN (KOP, KPI & KOTAK KAMAR SERAGAM)
 * Kotak kamar seragam: KELAS 9 • KAMAR, KELAS 8 • 3.01, KELAS 7 • 1.01 dst.
 */
function bangunTampilanLaporan(sheet, santriList, namaBulanPanjang, tahunNomor, tanggalPanjang, sesi, formattedTimestamp, namaPelapor, catatanUmum) {
  try {
    sheet.setHiddenGridlines(true);
  } catch (eGrid) {
    Logger.log("Info gridlines: " + eGrid.toString());
  }

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

  // Baris 3: Info Waktu Kirim & Total Santri Kumulatif Seluruh Petugas
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
  sheet.setRowHeight(6, 14); // Spacer sebelum kotak data

  // Kelompokkan santri per kamar dan kelas (Format Seragam & Rapi)
  const kelompokMap = {};
  const urutanKelompok = ["Kelas 9", "Kelas 8", "Kelas 7", "Lainnya"];

  santriList.forEach(function(item) {
    const k = (item.kelas || "").trim();
    let kelasKey = "Lainnya";
    if (k.includes("9")) kelasKey = "Kelas 9";
    else if (k.includes("8")) kelasKey = "Kelas 8";
    else if (k.includes("7")) kelasKey = "Kelas 7";

    const kamarRaw = (item.kamar || "Kamar Umum").trim();
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

  // Urutkan kotak kamar: Kelas 9, Kelas 8, Kelas 7, lalu urutkan nomor kamar secara numerik alami
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

  // Render setiap kotak kamar secara seragam
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

    // 1. Baris Judul Kotak (Banner Kamar & Kelas)
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
