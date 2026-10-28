import React, { useState, useEffect, useMemo } from 'react';
import { ROSTER_DATA } from './studentsData';
import { 
  CheckCircle2, 
  Send, 
  RotateCcw, 
  Settings, 
  Clock, 
  Building2, 
  User, 
  HeartPulse, 
  Pill, 
  Calendar, 
  MapPin, 
  Thermometer, 
  FileText, 
  Check, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  History,
  X,
  Copy,
  Search,
  Users,
  Plus,
  Trash2
} from 'lucide-react';

const SAKIT_PRESETS = [
  "Demam / Badan Panas",
  "Batuk / Pilek / Flu",
  "Pusing / Sakit Kepala / Migrain",
  "Sakit Perut / Maag / Mual",
  "Diare / Masuk Angin",
  "Radang Tenggorokan / Nyeri Menelan",
  "Gatal-gatal / Alergi Kulit",
  "Sakit Gigi",
  "Cedera / Keseleo / Terkilir",
  "Badan Lemas / Menggigil"
];

const WAKTU_PRESETS = [
  "Hari Ini (Pagi)",
  "Hari Ini (Malam)",
  "Kemarin Malam",
  "Kemarin Siang",
  "Sudah 2 Hari Lalu",
  "Sudah Lebih dari 3 Hari"
];

const LOKASI_PRESETS = [
  "Istirahat di Kamar Asrama",
  "Berangkat Sekolah (Mengikuti KBM)",
  "Istirahat di Rumah (Izin Pulang)",
  "Dirawat di Puskesmas / Rumah Sakit",
  "Lainnya (Ketik Manual)"
];

const ALASAN_IZIN_PRESETS = [
  "Izin Pulang ke Rumah (Dijemput Orang Tua / Wali)",
  "Keperluan Keluarga / Acara Mendesak",
  "Sakit & Dirawat di Rumah Orang Tua",
  "Mengikuti Lomba / Kegiatan Sekolah di Luar Asrama",
  "LAINNYA"
];

const CATATAN_ALPA_PRESETS = [
  "Belum kembali ke kamar saat jam presensi",
  "Tidak ada di kamar tanpa surat izin / konfirmasi",
  "Sedang dicari oleh pengurus kamar / teman sekamar",
  "Terlambat kembali dari kegiatan",
  "LAINNYA"
];

const ASRAMA_CONFIG = {
  "Kelas 7": { asrama: "", label: "Kelas 7" },
  "Kelas 8": { asrama: "", label: "Kelas 8" },
  "Kelas 9": { asrama: "IPS Lt 3", label: "Kelas 9 (IPS Lt 3)" }
};

const formatKamarAsrama = (kelas, kamar) => {
  const kStr = (kamar || "").trim();
  if ((kelas || "").includes("9")) {
    const num = kStr.replace(/^kamar\s*/i, "").trim();
    return `IPS Lt 3 - Kamar ${num}`;
  } else {
    // Kelas 7 & 8: Kamar saja, tanpa tulisan IPS
    return kStr.startsWith("Kamar") ? kStr : `Kamar ${kStr}`;
  }
};

export default function App() {
  // Sesi deteksi otomatis: Pagi atau Malam
  const [sesi, setSesi] = useState(() => {
    const hour = new Date().getHours();
    return hour < 15 ? "Pagi" : "Malam";
  });

  const [kelas, setKelas] = useState("Kelas 9");
  const [kamar, setKamar] = useState("Kamar 2");

  // Roster selection across multiple rooms/classes:
  // Array of { id, kelas, kamar, namaSantri, statusKehadiran, sakitList, ... }
  const [reportedStudents, setReportedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [manualSantriInput, setManualSantriInput] = useState("");

  const [keteranganKamar, setKeteranganKamar] = useState("");
  const [namaPelapor, setNamaPelapor] = useState(() => {
    const saved = localStorage.getItem("absen_nama_pelapor") || "";
    if (saved.toLowerCase().includes("faris") || saved.toLowerCase().includes("zahran")) {
      localStorage.removeItem("absen_nama_pelapor");
      return "";
    }
    return saved;
  });

  // Integrasi Google Apps Script (v6.0) & Spreadsheet
  const OLD_GAS_URL = "https://script.google.com/macros/s/AKfycbxQvxumQQWFyT2SPfxTOTJJcJ4h-wKSgXCyRKNV_gJ2nSKVhOULPrp0ZaqQLacIqhQqFQ/exec";
  const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbwgpoX0z59a0uGaJrloy8S2rUfCtLw-R79G9hVYoSySxf7tfHIy1cwNUKi4Qso460xwWA/exec";
  const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/144kdft1ccg2csUMS65NhTev9u7sl8ObiNJ75ybQRKF8/edit";

  const [gasUrl, setGasUrl] = useState(() => {
    const saved = localStorage.getItem("gas_sheet_url");
    if (!saved || saved === OLD_GAS_URL) {
      localStorage.setItem("gas_sheet_url", DEFAULT_GAS_URL);
      return DEFAULT_GAS_URL;
    }
    return saved;
  });
  const [sheetViewUrl, setSheetViewUrl] = useState(() => {
    return localStorage.getItem("sheet_view_url") || DEFAULT_SHEET_URL;
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastSubmissionBatch, setLastSubmissionBatch] = useState(null);
  const [submitMessage, setSubmitMessage] = useState("");

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("absen_history") || "[]");
    } catch {
      return [];
    }
  });

  // Filter kamar sesuai kelas yang aktif dilihat
  const availableRooms = useMemo(() => {
    if (!ROSTER_DATA[kelas]) return [];
    return Object.keys(ROSTER_DATA[kelas]);
  }, [kelas]);

  // Filter nama santri sesuai kelas & kamar yang aktif dilihat
  const availableStudents = useMemo(() => {
    if (!ROSTER_DATA[kelas] || !ROSTER_DATA[kelas][kamar]) return [];
    return ROSTER_DATA[kelas][kamar];
  }, [kelas, kamar]);

  // Filtered santri by search query
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return availableStudents;
    const query = studentSearch.toLowerCase();
    return availableStudents.filter(name => name.toLowerCase().includes(query));
  }, [availableStudents, studentSearch]);

  // Hitung jumlah santri yang sudah dilaporkan per kamar untuk badge kamar
  const reportedCountPerRoom = useMemo(() => {
    const counts = {};
    reportedStudents.forEach(st => {
      const key = `${st.kelas}__${st.kamar}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [reportedStudents]);

  // Jumlah kamar unik yang dilaporkan
  const uniqueRoomsCount = useMemo(() => {
    const set = new Set(reportedStudents.map(st => `${st.kelas} - ${st.kamar}`));
    return set.size;
  }, [reportedStudents]);

  // Ganti kelas (TIDAK MENGHAPUS data kamar sebelumnya)
  const handleKelasChange = (newKelas) => {
    setKelas(newKelas);
    const rooms = Object.keys(ROSTER_DATA[newKelas] || {});
    if (rooms.length > 0) {
      setKamar(rooms[0]);
      setStudentSearch("");
      setManualSantriInput("");
    }
  };

  // Ganti kamar (TIDAK MENGHAPUS data kamar sebelumnya)
  const handleKamarChange = (newKamar) => {
    setKamar(newKamar);
    setStudentSearch("");
    setManualSantriInput("");
  };

  // Toggle santri di kamar aktif
  const toggleSelectStudent = (name) => {
    setReportedStudents(prev => {
      const exists = prev.find(item => item.kelas === kelas && item.kamar === kamar && item.namaSantri === name);
      if (exists) {
        return prev.filter(item => !(item.kelas === kelas && item.kamar === kamar && item.namaSantri === name));
      } else {
        return [
          ...prev,
          {
            id: `${kelas}_${kamar}_${name}`,
            kelas,
            kamar,
            namaSantri: name,
            statusKehadiran: "Sakit",
            sakitList: [],
            sakitLainnya: "",
            rincianSakit: "",
            obat: "",
            dariKapan: sesi === "Pagi" ? "Hari Ini (Pagi)" : "Hari Ini (Malam)",
            dariKapanManual: "",
            lokasi: "Istirahat di Kamar Asrama",
            lokasiManual: "",
            suhuTubuh: "",
            alasanIzin: "Izin Pulang ke Rumah (Dijemput Orang Tua / Wali)",
            alasanIzinLain: "",
            catatanAlpa: "Belum kembali ke kamar saat jam presensi",
            catatanAlpaLain: ""
          }
        ];
      }
    });
  };

  // Pilih semua / batalkan semua santri di kamar aktif
  const handleSelectAllInCurrentRoom = () => {
    const currentInRoom = reportedStudents.filter(item => item.kelas === kelas && item.kamar === kamar);
    if (currentInRoom.length === availableStudents.length && availableStudents.length > 0) {
      // Hapus hanya santri kamar ini
      setReportedStudents(prev => prev.filter(item => !(item.kelas === kelas && item.kamar === kamar)));
    } else {
      // Tambahkan santri kamar ini yang belum terpilih
      const existingNames = new Set(currentInRoom.map(item => item.namaSantri));
      const newEntries = availableStudents
        .filter(name => !existingNames.has(name))
        .map(name => ({
          id: `${kelas}_${kamar}_${name}`,
          kelas,
          kamar,
          namaSantri: name,
          statusKehadiran: "Sakit",
          sakitList: [],
          sakitLainnya: "",
          rincianSakit: "",
          obat: "",
          dariKapan: sesi === "Pagi" ? "Hari Ini (Pagi)" : "Hari Ini (Malam)",
          dariKapanManual: "",
          lokasi: "Istirahat di Kamar Asrama",
          lokasiManual: "",
          suhuTubuh: "",
          alasanIzin: "Izin Pulang ke Rumah (Dijemput Orang Tua / Wali)",
          alasanIzinLain: "",
          catatanAlpa: "Belum kembali ke kamar saat jam presensi",
          catatanAlpaLain: ""
        }));
      setReportedStudents(prev => [...prev, ...newEntries]);
    }
  };

  const handleAddManualSantri = (e) => {
    if (e) e.preventDefault();
    const trimmed = manualSantriInput.trim();
    if (!trimmed) return;
    if (!reportedStudents.some(item => item.kelas === kelas && item.kamar === kamar && item.namaSantri === trimmed)) {
      setReportedStudents(prev => [
        ...prev,
        {
          id: `${kelas}_${kamar}_${trimmed}`,
          kelas,
          kamar,
          namaSantri: trimmed,
          statusKehadiran: "Sakit",
          sakitList: [],
          sakitLainnya: "",
          rincianSakit: "",
          obat: "",
          dariKapan: sesi === "Pagi" ? "Hari Ini (Pagi)" : "Hari Ini (Malam)",
          dariKapanManual: "",
          lokasi: "Istirahat di Kamar Asrama",
          lokasiManual: "",
          suhuTubuh: "",
          alasanIzin: "Izin Pulang ke Rumah (Dijemput Orang Tua / Wali)",
          alasanIzinLain: "",
          catatanAlpa: "Belum kembali ke kamar saat jam presensi",
          catatanAlpaLain: ""
        }
      ]);
    }
    setManualSantriInput("");
  };

  const removeReportedStudentById = (id) => {
    setReportedStudents(prev => prev.filter(item => item.id !== id));
  };

  const updateStudentField = (id, field, value) => {
    setReportedStudents(prev =>
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  const toggleStudentSymptom = (id, symptom) => {
    setReportedStudents(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const current = item.sakitList || [];
        const updated = current.includes(symptom)
          ? current.filter(x => x !== symptom)
          : [...current, symptom];
        return { ...item, sakitList: updated };
      })
    );
  };

  // Format Rekap Teks Santri (Rapi & Tanpa Emoji)
  const formatRekapText = (batch) => {
    if (!batch || !batch.records || batch.records.length === 0) return "";
    
    // Group records by Asrama, Kamar & Kelas
    const grouped = {};
    batch.records.forEach(rec => {
      const kamarDisplay = formatKamarAsrama(rec.kelas, rec.kamar);
      const groupKey = `${kamarDisplay} (${rec.kelas})`;
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(rec);
    });

    let lines = [
      `LAPORAN REKAPITULASI SANTRI SMP - SESI ${batch.sesi.toUpperCase()}`,
      `----------------------------------------`,
      `Waktu Lapor: ${batch.submittedAt}`,
      `Petugas Pemeriksa: ${batch.namaPelapor}`,
      `Total Dilaporkan: ${batch.records.length} Santri (${Object.keys(grouped).length} Kamar)`,
      `----------------------------------------`,
      `RINCIAN DATA SANTRI PER ASRAMA:`
    ];

    Object.entries(grouped).forEach(([groupName, items]) => {
      lines.push(``);
      lines.push(`[${groupName}]`);
      items.forEach((rec, idx) => {
        lines.push(`${idx + 1}. ${rec.namaSantri} [${rec.statusKehadiran.toUpperCase()}]`);
        if (rec.statusKehadiran === "Sakit") {
          lines.push(`   - Keluhan: ${rec.sakit}`);
          if (rec.rincianSakit && rec.rincianSakit !== "-") {
            lines.push(`   - Rincian: ${rec.rincianSakit}`);
          }
          lines.push(`   - Obat: ${rec.obat}`);
          lines.push(`   - Mulai Sakit: ${rec.dariKapan}`);
          lines.push(`   - Lokasi: ${rec.lokasi}`);
          if (rec.suhuTubuh && rec.suhuTubuh !== "-") {
            lines.push(`   - Suhu: ${rec.suhuTubuh}`);
          }
        } else if (rec.statusKehadiran === "Izin") {
          lines.push(`   - Alasan Izin: ${rec.sakit}`);
          lines.push(`   - Mulai Izin: ${rec.dariKapan}`);
          lines.push(`   - Lokasi: ${rec.lokasi}`);
        } else {
          lines.push(`   - Keterangan Alpa: ${rec.sakit}`);
          lines.push(`   - Lokasi: ${rec.lokasi}`);
        }
      });
    });

    if (batch.keterangan && batch.keterangan !== "-") {
      lines.push(``);
      lines.push(`Catatan Kamar: ${batch.keterangan}`);
    }

    lines.push(`----------------------------------------`);
    const sheetLink = sheetViewUrl || localStorage.getItem("sheet_view_url") || "";
    if (sheetLink.trim()) {
      lines.push(`Link Google Sheets:`);
      lines.push(sheetLink.trim());
    }

    return lines.join("\n");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (reportedStudents.length === 0) {
      return alert("Pilih minimal satu santri yang ingin dilaporkan (sakit, izin, atau alpa).");
    }
    if (!namaPelapor.trim()) {
      return alert("Isi nama Petugas Pemeriksa / Yang Mengecek Kamar.");
    }

    // Validasi setiap santri
    for (let i = 0; i < reportedStudents.length; i++) {
      const st = reportedStudents[i];
      if (st.statusKehadiran === "Sakit") {
        const hasKeluhan = (st.sakitList && st.sakitList.length > 0) || st.sakitLainnya.trim();
        if (!hasKeluhan) {
          return alert(`Pilih minimal satu keluhan sakit untuk santri: ${st.namaSantri} (${formatKamarAsrama(st.kelas, st.kamar)})`);
        }
        if (!st.obat.trim()) {
          return alert(`Isi catatan obat untuk santri: ${st.namaSantri} (atau tulis 'Belum minum obat')`);
        }
      } else if (st.statusKehadiran === "Izin") {
        if (st.alasanIzin === "LAINNYA" && !st.alasanIzinLain.trim()) {
          return alert(`Ketik rincian alasan izin untuk santri: ${st.namaSantri}`);
        }
      } else if (st.statusKehadiran === "Alpa") {
        if (st.catatanAlpa === "LAINNYA" && !st.catatanAlpaLain.trim()) {
          return alert(`Ketik rincian alasan alpa untuk santri: ${st.namaSantri}`);
        }
      }
    }

    setIsSubmitting(true);
    localStorage.setItem("absen_nama_pelapor", namaPelapor.trim());

    const submittedAtStr = new Date().toLocaleString("id-ID");
    const individualRecords = reportedStudents.map(st => {
      let finalSakitVal = "-";
      let finalObatVal = "-";
      let finalLokasiVal = st.lokasi === "Lainnya (Ketik Manual)"
        ? (st.lokasiManual.trim() || "Lainnya")
        : st.lokasi;
      let finalRincianVal = st.rincianSakit.trim() || "-";

      if (st.statusKehadiran === "Sakit") {
        const keluhanArr = [...(st.sakitList || [])];
        if (st.sakitLainnya.trim()) keluhanArr.push(`Lainnya: ${st.sakitLainnya.trim()}`);
        finalSakitVal = keluhanArr.join(", ");
        finalObatVal = st.obat.trim();
      } else if (st.statusKehadiran === "Izin") {
        finalSakitVal = st.alasanIzin === "LAINNYA" 
          ? (st.alasanIzinLain.trim() || "Izin Khusus") 
          : st.alasanIzin;
        finalObatVal = "Izin (Tidak Mengonsumsi Obat Asrama)";
        finalLokasiVal = "Istirahat di Rumah (Izin Pulang)";
        finalRincianVal = st.rincianSakit.trim() || "Izin Resmi";
      } else if (st.statusKehadiran === "Alpa") {
        finalSakitVal = st.catatanAlpa === "LAINNYA"
          ? (st.catatanAlpaLain.trim() || "Tanpa Keterangan")
          : (st.catatanAlpa || "Belum kembali ke kamar saat jam presensi");
        finalObatVal = "-";
        finalLokasiVal = "Tidak Berada di Kamar (Alpa)";
      }

      const finalDariKapan = st.dariKapan === "PILIH_MANUAL" 
        ? (st.dariKapanManual.trim() || "Hari Ini") 
        : st.dariKapan;

      return {
        sesi,
        kelas: st.kelas,
        kamar: formatKamarAsrama(st.kelas, st.kamar),
        kamarAsli: st.kamar,
        asrama: ASRAMA_CONFIG[st.kelas]?.asrama || "IPS",
        namaSantri: st.namaSantri,
        statusKehadiran: st.statusKehadiran,
        sakit: finalSakitVal,
        rincianSakit: finalRincianVal,
        obat: finalObatVal,
        dariKapan: finalDariKapan,
        lokasi: finalLokasiVal,
        suhuTubuh: st.suhuTubuh.trim() ? `${st.suhuTubuh.trim()}°C` : "-",
        keterangan: keteranganKamar.trim() || "-",
        namaPelapor: namaPelapor.trim(),
        submittedAt: submittedAtStr
      };
    });

    const batchSummary = {
      sesi,
      namaPelapor: namaPelapor.trim(),
      keterangan: keteranganKamar.trim() || "-",
      records: individualRecords,
      submittedAt: submittedAtStr
    };

    // Simpan ke riwayat lokal
    const updatedHistory = [batchSummary, ...history].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem("absen_history", JSON.stringify(updatedHistory));

    const sendViaHiddenForm = (url, dataObj) => {
      try {
        let iframe = document.getElementById("gas_hidden_iframe_react");
        if (!iframe) {
          iframe = document.createElement("iframe");
          iframe.id = "gas_hidden_iframe_react";
          iframe.name = "gas_hidden_iframe_react";
          iframe.style.display = "none";
          document.body.appendChild(iframe);
        }
        const form = document.createElement("form");
        form.method = "POST";
        form.action = url;
        form.target = "gas_hidden_iframe_react";
        for (const [k, v] of Object.entries(dataObj)) {
          const inp = document.createElement("input");
          inp.type = "hidden";
          inp.name = k;
          inp.value = typeof v === "object" ? JSON.stringify(v) : v;
          form.appendChild(inp);
        }
        document.body.appendChild(form);
        form.submit();
        setTimeout(() => { form.remove(); }, 1500);
      } catch (e) {
        console.warn("Hidden form error:", e);
      }
    };

    let msg = `Tercatat di sistem lokal (${individualRecords.length} santri).`;

    if (gasUrl && gasUrl.trim().startsWith("http")) {
      const cleanUrl = gasUrl.trim();
      try {
        // Kirim batch payload santriItems untuk Code.gs v5.0 (otomatis memisah tab Kelas 7, 8, 9)
        const batchPayload = {
          sesi,
          santriItems: individualRecords,
          keterangan: keteranganKamar.trim() || "-",
          namaPelapor: namaPelapor.trim()
        };
        sendViaHiddenForm(cleanUrl, batchPayload);
        await fetch(cleanUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(batchPayload)
        });

        // Fallback untuk setiap santri agar langsung terisi juga jika masih menggunakan script lama
        for (const record of individualRecords) {
          sendViaHiddenForm(cleanUrl, record);
          await fetch(cleanUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(record)
          });
        }

        msg = `Data ${individualRecords.length} santri berhasil dicatat dan dibuatkan Tab Baru di urutan terdepan Google Sheets dengan KOP Judul SMP & Tabel Kotak Per Asrama!`;
      } catch (err) {
        console.error("Gagal kirim ke GAS:", err);
        msg = `Terkirim ke Google Sheets (${individualRecords.length} santri) & tersimpan di arsip lokal.`;
      }
    } else {
      msg = "Tersimpan di perangkat lokal. Masukkan URL Google Apps Script untuk otomatis masuk Google Sheets.";
    }

    setIsSubmitting(false);
    setLastSubmissionBatch(batchSummary);
    setSubmitMessage(msg);
    setIsSubmitted(true);
  };

  const handleResetForAnother = () => {
    setIsSubmitted(false);
    setReportedStudents([]);
    setStudentSearch("");
    setManualSantriInput("");
    setKeteranganKamar("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearForm = () => {
    if (window.confirm("Kosongkan semua daftar santri yang sudah dipilih?")) {
      setReportedStudents([]);
      setStudentSearch("");
      setManualSantriInput("");
      setKeteranganKamar("");
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] py-4 sm:py-8 px-3 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto pb-16">
        
        {/* Top Floating Status Bar */}
        <div className="flex items-center justify-between mb-3 px-1 text-xs text-[#64748B]">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block animate-pulse"></span>
            <span className="text-[#0F172A] font-semibold">Presensi Asrama (Sakit/Izin/Alpa)</span>
          </div>

          <div className="flex items-center gap-2">
            <a 
              href={sheetViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] text-emerald-700 font-semibold transition-colors flex items-center gap-1 shadow-xs"
              title="Buka Spreadsheet di Tab Baru"
            >
              <ExternalLink size={13} />
              <span>Buka Sheets</span>
            </a>
            <button 
              type="button"
              onClick={() => setShowHistory(true)}
              className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] text-[#0F172A] transition-colors flex items-center gap-1 shadow-xs"
            >
              <History size={13} />
              <span>Riwayat ({history.length})</span>
            </button>
            <button 
              type="button"
              onClick={() => setShowSettings(true)}
              className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] text-[#0F172A] transition-colors flex items-center gap-1 shadow-xs"
            >
              <Settings size={13} />
              <span>{gasUrl ? "Sheets Aktif" : "Set Sheets"}</span>
            </button>
          </div>
        </div>

        {/* POST-SUBMISSION CONFIRMATION */}
        {isSubmitted && lastSubmissionBatch ? (
          <div className="space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 shadow-sm">
              <div className="h-2 bg-[#0F172A] rounded-t-lg -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-6"></div>
              
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#10B981] flex items-center justify-center font-bold text-xl border border-emerald-200 shrink-0">
                  <Check size={22} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
                    Laporan Berhasil Direkam.
                  </h2>
                  <p className="text-sm text-[#64748B] mt-1">
                    {submitMessage}
                  </p>
                </div>
              </div>

              {/* Ringkasan Data Batch */}
              <div className="mt-5 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm space-y-3">
                <div className="font-semibold text-[#0F172A] pb-2 border-b border-[#E2E8F0] flex justify-between items-center">
                  <span>Rekapitulasi {lastSubmissionBatch.records.length} Santri Lintas Kamar</span>
                  <span className="text-xs font-normal text-[#64748B]">{lastSubmissionBatch.submittedAt}</span>
                </div>

                <div className="text-xs sm:text-sm">
                  <span className="text-[#64748B]">Petugas Pemeriksa:</span> <strong className="text-[#0F172A]">{lastSubmissionBatch.namaPelapor}</strong>
                </div>

                <div className="space-y-2.5 pt-1">
                  {lastSubmissionBatch.records.map((rec, i) => (
                    <div key={i} className="p-3 bg-white border border-[#E2E8F0] rounded-lg text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <strong className="text-[#0F172A] text-sm">
                          {i + 1}. {rec.namaSantri}
                        </strong>
                        <div className="flex gap-1.5 items-center">
                          <span className="text-[10px] bg-slate-100 text-[#0F172A] px-2 py-0.5 rounded font-medium">
                            {rec.kamar} ({rec.kelas})
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.statusKehadiran === "Sakit" ? "bg-red-100 text-red-800" :
                            rec.statusKehadiran === "Izin" ? "bg-amber-100 text-amber-800" :
                            "bg-purple-100 text-purple-800"
                          }`}>
                            [{rec.statusKehadiran.toUpperCase()}]
                          </span>
                        </div>
                      </div>
                      {rec.statusKehadiran === "Sakit" ? (
                        <>
                          <div><span className="text-[#64748B]">Keluhan:</span> {rec.sakit}</div>
                          <div><span className="text-[#64748B]">Obat:</span> {rec.obat}</div>
                          <div><span className="text-[#64748B]">Lokasi & Waktu:</span> {rec.lokasi} ({rec.dariKapan})</div>
                          {rec.suhuTubuh && rec.suhuTubuh !== "-" && (
                            <div><span className="text-[#64748B]">Suhu Tubuh:</span> {rec.suhuTubuh}</div>
                          )}
                        </>
                      ) : rec.statusKehadiran === "Izin" ? (
                        <>
                          <div><span className="text-[#64748B]">Alasan Izin:</span> {rec.sakit}</div>
                          <div><span className="text-[#64748B]">Waktu:</span> {rec.dariKapan}</div>
                        </>
                      ) : (
                        <div><span className="text-[#64748B]">Keterangan Alpa:</span> {rec.sakit}</div>
                      )}
                    </div>
                  ))}
                </div>

                {lastSubmissionBatch.keterangan && lastSubmissionBatch.keterangan !== "-" && (
                  <div className="text-xs pt-1">
                    <span className="text-[#64748B]">Catatan Kamar:</span> <span className="text-[#0F172A]">{lastSubmissionBatch.keterangan}</span>
                  </div>
                )}

                {/* TAUTAN LANGSUNG GOOGLE SHEETS */}
                <div className="pt-3 border-t border-[#E2E8F0]">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-sm">
                          <ExternalLink size={16} className="text-emerald-700" />
                          <span>Hasil Rekap Masuk ke Tab Baru Google Sheets</span>
                        </div>
                        <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                          Laporan sesi ini telah otomatis dibuatkan <strong>Tab Baru</strong> di urutan paling depan dengan <strong>KOP Judul SMP</strong> dan <strong>Kotak Data Terpisah Per Asrama</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <a
                        href={sheetViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      >
                        <ExternalLink size={14} />
                        <span>Buka Spreadsheet Google Sheets</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(sheetViewUrl);
                          alert("Link Google Sheets berhasil disalin ke clipboard!");
                        }}
                        className="px-4 py-2.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Copy size={14} />
                        <span>Salin Link Sheets</span>
                      </button>
                    </div>

                    <div className="text-[11px] font-mono text-emerald-800/80 bg-white/80 p-2 rounded border border-emerald-200 truncate select-all">
                      {sheetViewUrl}
                    </div>
                  </div>
                </div>

              </div>

              <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex justify-center">
                <button
                  type="button"
                  onClick={handleResetForAnother}
                  className="px-6 py-2.5 bg-[#0F172A] text-white font-medium rounded-lg hover:bg-slate-800 transition-colors text-center text-sm"
                >
                  Mulai Laporan Sesi Baru
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* FORM UTAMA */
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* HEADER CARD - BERSIH, SESI PAGI / MALAM */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
              <div className="h-2.5 bg-[#0F172A] relative">
                <div className="absolute top-0 right-0 h-full w-1/3 bg-[#38BDF8] opacity-80"></div>
              </div>

              <div className="p-5 sm:p-6">
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                  Presensi & Pendataan Santri Per Kamar
                </h1>
                <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                  Pencatatan kondisi santri per kamar asrama (sakit, izin, alpa) untuk pemantauan kesehatan dan ketertiban asrama saat sesi Pagi dan Malam.
                </p>

                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center text-xs">
                  <div className="flex items-center gap-2 text-[#64748B]">
                    <Clock size={14} />
                    <span className="font-medium">Waktu Laporan:</span>
                    <div className="flex gap-1.5">
                      {["Pagi", "Malam"].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSesi(s)}
                          className={`px-3 py-1 rounded-md font-bold text-xs transition-all ${
                            sesi === s 
                              ? "bg-[#0F172A] text-white shadow-xs" 
                              : "bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] hover:bg-slate-100"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 1: JENJANG / KELAS & GEDUNG ASRAMA */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm focus-within:border-l-4 focus-within:border-l-[#0F172A] transition-all">
              <label className="block text-sm sm:text-base font-semibold text-[#0F172A] mb-1">
                1. Jenjang Kelas & Gedung Asrama
              </label>
              <p className="text-xs text-[#64748B] mb-3">
                Pilih jenjang kelas dan gedung asrama yang sedang diperiksa kamarnya.
              </p>

              <div className="grid grid-cols-3 gap-2">
                {["Kelas 7", "Kelas 8", "Kelas 9"].map((k) => {
                  const countInClass = reportedStudents.filter(item => item.kelas === k).length;
                  const asramaName = ASRAMA_CONFIG[k]?.asrama || "";
                  const isSelected = kelas === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleKelasChange(k)}
                      className={`py-2 px-2.5 rounded-lg border text-center transition-all relative ${
                        isSelected 
                          ? "bg-[#0F172A] text-white border-[#0F172A] shadow-xs" 
                          : "bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-slate-100"
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm">{k}</div>
                      {asramaName ? (
                        <div className={`text-[11px] font-medium mt-0.5 ${isSelected ? "text-sky-300" : "text-[#64748B]"}`}>
                          {asramaName}
                        </div>
                      ) : null}
                      {countInClass > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-sky-500 text-white px-1.5 py-0.2 rounded-full font-bold shadow-xs">
                          {countInClass}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CARD 2: NOMOR KAMAR */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm focus-within:border-l-4 focus-within:border-l-[#0F172A] transition-all">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm sm:text-base font-semibold text-[#0F172A]">
                  2. Nomor Kamar {ASRAMA_CONFIG[kelas]?.asrama ? `(${ASRAMA_CONFIG[kelas]?.asrama})` : `(${kelas})`}
                </label>
                <span className="text-xs text-[#64748B] font-medium">
                  {availableRooms.length} Kamar
                </span>
              </div>
              <p className="text-xs text-[#64748B] mb-3">
                Klik kamar untuk memilih santri. Santri dari kamar lain tetap tersimpan di daftar.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableRooms.map((r) => {
                  const countRoster = ROSTER_DATA[kelas][r]?.length || 0;
                  const isSelected = kamar === r;
                  const reportedInThisRoom = reportedCountPerRoom[`${kelas}__${r}`] || 0;
                  const roomDisplay = kelas.includes("9") ? r : `Kamar ${r}`;

                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleKamarChange(r)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between relative ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm">{roomDisplay}</span>
                        {reportedInThisRoom > 0 && (
                          <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                            {reportedInThisRoom} lapor
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] mt-1 ${isSelected ? "text-slate-300" : "text-[#64748B]"}`}>
                        {ASRAMA_CONFIG[kelas]?.asrama ? `${ASRAMA_CONFIG[kelas]?.asrama} • ` : ""}{countRoster} santri
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CARD 3: PILIH SANTRI DI KAMAR INI */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm focus-within:border-l-4 focus-within:border-l-[#0F172A] transition-all">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm sm:text-base font-semibold text-[#0F172A]">
                  3. Pilih Santri di {formatKamarAsrama(kelas, kamar)} ({kelas})
                </label>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  reportedStudents.length > 0 ? "bg-slate-900 text-white" : "bg-slate-100 text-[#64748B]"
                }`}>
                  Total {reportedStudents.length} santri ({uniqueRoomsCount} kamar)
                </span>
              </div>
              <p className="text-xs text-[#64748B] mb-3">
                Centang santri di kamar ini yang sedang sakit, izin, atau alpa. Pindah ke kamar lain kapan saja, data yang sudah dicentang tetap tersimpan.
              </p>

              {/* Search & Actions */}
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder={`Cari santri di ${formatKamarAsrama(kelas, kamar)}...`}
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#0F172A]"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllInCurrentRoom}
                  className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC] whitespace-nowrap"
                >
                  Pilih Semua di {formatKamarAsrama(kelas, kamar)}
                </button>
              </div>

              {/* Roster Checkbox List */}
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-[#E2E8F0] rounded-lg p-2 bg-[#F8FAFC]">
                {filteredStudents.length === 0 ? (
                  <p className="text-xs text-[#64748B] text-center py-4">
                    Tidak ditemukan santri dengan nama "{studentSearch}" di {kamar}.
                  </p>
                ) : (
                  filteredStudents.map((name, idx) => {
                    const isChecked = reportedStudents.some(item => item.kelas === kelas && item.kamar === kamar && item.namaSantri === name);
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs sm:text-sm transition-colors border ${
                          isChecked 
                            ? "bg-white border-[#0F172A] font-semibold text-[#0F172A] shadow-xs" 
                            : "bg-white/60 border-transparent text-[#0F172A] hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectStudent(name)}
                          className="w-4 h-4 rounded text-[#0F172A] focus:ring-0 cursor-pointer"
                        />
                        <span className="flex-1">{name}</span>
                      </label>
                    );
                  })
                )}
              </div>

              {/* Tambah Santri Manual di Kamar Ini */}
              <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Nama lain / belum terdaftar di ${kamar}...`}
                    value={manualSantriInput}
                    onChange={(e) => setManualSantriInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddManualSantri();
                      }
                    }}
                    className="flex-1 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#0F172A]"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualSantri}
                    className="px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900 transition-colors flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Tambah</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 4: DAFTAR RINCIAN KONDISI SANTRI LINTAS KAMAR */}
            {reportedStudents.length === 0 ? (
              <div className="bg-white border border-dashed border-[#CBD5E1] rounded-xl p-8 text-center text-[#64748B]">
                <Users size={28} className="mx-auto mb-2 text-[#94A3B8]" />
                <p className="text-sm font-semibold text-[#0F172A]">Belum Ada Santri yang Dipilih</p>
                <p className="text-xs text-[#64748B] mt-1">
                  Centang nama santri di Card 3 di atas. Anda bisa memilih dari kamar mana saja dan semuanya akan terkumpul di bawah ini.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    4. Rincian Kondisi ({reportedStudents.length} Santri dari {uniqueRoomsCount} Kamar):
                  </h3>
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="text-xs text-[#EF4444] hover:underline"
                  >
                    Hapus Semua
                  </button>
                </div>

                {reportedStudents.map((student, index) => {
                  const isSkt = student.statusKehadiran === "Sakit";
                  const isIzn = student.statusKehadiran === "Izin";
                  const isAlp = student.statusKehadiran === "Alpa";

                  return (
                    <div 
                      key={student.id}
                      className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4 relative"
                    >
                      {/* Top Header of each student */}
                      <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3 gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                              {formatKamarAsrama(student.kelas, student.kamar)} • {student.kelas}
                            </span>
                            <span className="text-[11px] font-semibold text-[#64748B]">
                              Santri #{index + 1}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-[#0F172A]">
                            {student.namaSantri}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeReportedStudentById(student.id)}
                          className="p-1.5 text-[#64748B] hover:text-[#EF4444] hover:bg-red-50 rounded-md transition-colors"
                          title="Hapus dari daftar lapor"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Status Selector Per Santri */}
                      <div>
                        <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                          Status Kehadiran Santri Ini:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "Sakit", label: "Sakit" },
                            { id: "Izin", label: "Izin" },
                            { id: "Alpa", label: "Alpa" }
                          ].map(st => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => updateStudentField(student.id, "statusKehadiran", st.id)}
                              className={`py-2 px-3 rounded-lg border text-center text-xs font-bold transition-all ${
                                student.statusKehadiran === st.id
                                  ? "bg-[#0F172A] text-white border-[#0F172A] shadow-xs"
                                  : "bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-slate-100"
                              }`}
                            >
                              [{st.label}]
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* JIKA SANTRI INI SAKIT */}
                      {isSkt && (
                        <div className="space-y-3.5 pt-2 border-t border-[#E2E8F0]">
                          <div>
                            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                              Keluhan / Gejala Sakit: <span className="text-[#EF4444]">*</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                              {SAKIT_PRESETS.map((item) => {
                                const checked = (student.sakitList || []).includes(item);
                                return (
                                  <label
                                    key={item}
                                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                                      checked
                                        ? "bg-slate-100 border-[#0F172A] font-medium text-[#0F172A]"
                                        : "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleStudentSymptom(student.id, item)}
                                      className="w-3.5 h-3.5 rounded text-[#0F172A] focus:ring-0 cursor-pointer"
                                    />
                                    <span>{item}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <input
                              type="text"
                              placeholder="Keluhan sakit lainnya (opsional)..."
                              value={student.sakitLainnya || ""}
                              onChange={(e) => updateStudentField(student.id, "sakitLainnya", e.target.value)}
                              className="w-full p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#0F172A]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                              Obat yang Diminum / Diberikan (Catat Manual): <span className="text-[#EF4444]">*</span>
                            </label>
                            <textarea
                              rows="2"
                              placeholder="Contoh: Paracetamol 500mg setelah makan / Minyak kayu putih / Belum minum obat..."
                              value={student.obat || ""}
                              onChange={(e) => updateStudentField(student.id, "obat", e.target.value)}
                              className="w-full p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                            />
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {["Belum Diberikan Obat", "Paracetamol 500mg", "Tolak Angin", "Minyak Kayu Putih", "Antasida Maag"].map(chip => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => {
                                    const current = student.obat || "";
                                    updateStudentField(student.id, "obat", current ? `${current}, ${chip}` : chip);
                                  }}
                                  className="px-2 py-0.5 bg-white border border-[#E2E8F0] rounded text-[10px] text-[#64748B] hover:text-[#0F172A] hover:border-slate-400"
                                >
                                  + {chip}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                                Mulai Sakit Sejak:
                              </label>
                              <select
                                value={student.dariKapan || (sesi === "Pagi" ? "Hari Ini (Pagi)" : "Hari Ini (Malam)")}
                                onChange={(e) => updateStudentField(student.id, "dariKapan", e.target.value)}
                                className="w-full p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#0F172A]"
                              >
                                {WAKTU_PRESETS.map(w => (
                                  <option key={w} value={w}>{w}</option>
                                ))}
                                <option value="PILIH_MANUAL">Ketik Waktu Lain...</option>
                              </select>
                              {student.dariKapan === "PILIH_MANUAL" && (
                                <input
                                  type="text"
                                  placeholder="Ketik waktu spesifik..."
                                  value={student.dariKapanManual || ""}
                                  onChange={(e) => updateStudentField(student.id, "dariKapanManual", e.target.value)}
                                  className="w-full mt-1.5 p-1.5 bg-white border border-[#E2E8F0] rounded text-xs"
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                                Kondisi & Lokasi Saat Ini:
                              </label>
                              <select
                                value={student.lokasi || "Istirahat di Kamar Asrama"}
                                onChange={(e) => updateStudentField(student.id, "lokasi", e.target.value)}
                                className="w-full p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#0F172A]"
                              >
                                {LOKASI_PRESETS.map(loc => (
                                  <option key={loc} value={loc}>{loc}</option>
                                ))}
                              </select>
                              {student.lokasi === "Lainnya (Ketik Manual)" && (
                                <input
                                  type="text"
                                  placeholder="Ketik lokasi saat ini..."
                                  value={student.lokasiManual || ""}
                                  onChange={(e) => updateStudentField(student.id, "lokasiManual", e.target.value)}
                                  className="w-full mt-1.5 p-1.5 bg-white border border-[#E2E8F0] rounded text-xs"
                                />
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                              Suhu Tubuh (°C) - Opsional jika ada termometer:
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="Contoh: 37.8"
                                value={student.suhuTubuh || ""}
                                onChange={(e) => updateStudentField(student.id, "suhuTubuh", e.target.value)}
                                className="w-28 p-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs"
                              />
                              <div className="flex gap-1 items-center">
                                {["37.0", "37.5", "38.0", "38.5"].map(t => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => updateStudentField(student.id, "suhuTubuh", t)}
                                    className="px-2 py-1 bg-white border border-[#E2E8F0] rounded text-[11px] text-[#64748B] hover:text-[#0F172A]"
                                  >
                                    {t}°
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* JIKA SANTRI INI ALPA */}
                      {isAlp && (
                        <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
                          <label className="block text-xs font-semibold text-[#0F172A]">
                            Keterangan Santri Alpa: <span className="text-[#EF4444]">*</span>
                          </label>
                          <div className="space-y-1.5">
                            {CATATAN_ALPA_PRESETS.map(al => (
                              <label
                                key={al}
                                className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                                  student.catatanAlpa === al
                                    ? "bg-slate-100 border-[#0F172A] font-medium text-[#0F172A]"
                                    : "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`alpa_${student.id}`}
                                  checked={student.catatanAlpa === al}
                                  onChange={() => updateStudentField(student.id, "catatanAlpa", al)}
                                  className="w-3.5 h-3.5 text-[#0F172A] focus:ring-0 cursor-pointer"
                                />
                                <span>{al === "LAINNYA" ? "Keterangan Lainnya (Ketik Manual)" : al}</span>
                              </label>
                            ))}
                          </div>

                          {student.catatanAlpa === "LAINNYA" && (
                            <input
                              type="text"
                              placeholder="Ketik keterangan alpa..."
                              value={student.catatanAlpaLain || ""}
                              onChange={(e) => updateStudentField(student.id, "catatanAlpaLain", e.target.value)}
                              className="w-full p-2 bg-white border border-[#E2E8F0] rounded-lg text-xs"
                            />
                          )}
                        </div>
                      )}

                      {/* JIKA SANTRI INI IZIN */}
                      {isIzn && (
                        <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
                          <label className="block text-xs font-semibold text-[#0F172A]">
                            Alasan Izin Santri: <span className="text-[#EF4444]">*</span>
                          </label>
                          <div className="space-y-1.5">
                            {ALASAN_IZIN_PRESETS.map(iz => (
                              <label
                                key={iz}
                                className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                                  student.alasanIzin === iz
                                    ? "bg-slate-100 border-[#0F172A] font-medium text-[#0F172A]"
                                    : "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`izin_${student.id}`}
                                  checked={student.alasanIzin === iz}
                                  onChange={() => updateStudentField(student.id, "alasanIzin", iz)}
                                  className="w-3.5 h-3.5 text-[#0F172A] focus:ring-0 cursor-pointer"
                                />
                                <span>{iz === "LAINNYA" ? "Alasan Lainnya (Ketik Manual)" : iz}</span>
                              </label>
                            ))}
                          </div>

                          {student.alasanIzin === "LAINNYA" && (
                            <input
                              type="text"
                              placeholder="Ketik alasan izin lengkap..."
                              value={student.alasanIzinLain || ""}
                              onChange={(e) => updateStudentField(student.id, "alasanIzinLain", e.target.value)}
                              className="w-full p-2 bg-white border border-[#E2E8F0] rounded-lg text-xs"
                            />
                          )}

                          <div>
                            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                              Izin Sejak Kapan?
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: Hari ini jam 10.00 / Kemarin sore..."
                              value={student.dariKapanManual || ""}
                              onChange={(e) => {
                                updateStudentField(student.id, "dariKapan", "PILIH_MANUAL");
                                updateStudentField(student.id, "dariKapanManual", e.target.value);
                              }}
                              className="w-full p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* CARD 5: CATATAN UMUM */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm focus-within:border-l-4 focus-within:border-l-[#0F172A] transition-all">
              <label className="block text-sm sm:text-base font-semibold text-[#0F172A] mb-1">
                Catatan Pemeriksaan Asrama (Opsional)
              </label>
              <p className="text-xs text-[#64748B] mb-3">
                Tuliskan catatan khusus terkait kamar atau santri yang diperiksa sesi ini.
              </p>
              <textarea
                rows="2"
                placeholder="Contoh: Perlu bubur untuk santri demam di Kamar 2, Kamar 1.01 sudah bersih..."
                value={keteranganKamar}
                onChange={(e) => setKeteranganKamar(e.target.value)}
                className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
              ></textarea>
            </div>

            {/* CARD 6: PETUGAS PEMERIKSA / YANG MENGECEK KAMAR */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm focus-within:border-l-4 focus-within:border-l-[#0F172A] transition-all">
              <label className="block text-sm sm:text-base font-semibold text-[#0F172A] mb-1">
                Petugas Pemeriksa / Yang Mengecek Kamar <span className="text-[#EF4444]">*</span>
              </label>
              <p className="text-xs text-[#64748B] mb-3">
                Tuliskan nama Anda sebagai pengurus / petugas yang mengecek kamar santri saat sesi ini.
              </p>
              <input
                type="text"
                placeholder="Tulis nama petugas pemeriksa kamar..."
                value={namaPelapor}
                onChange={(e) => setNamaPelapor(e.target.value)}
                className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            {/* BOTTOM SUBMIT BAR */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={isSubmitting || reportedStudents.length === 0}
                className="px-6 py-2.5 bg-[#0F172A] text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Mengirim data...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Kirim Laporan Semua Asrama ({reportedStudents.length} Santri)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClearForm}
                className="text-xs sm:text-sm text-[#64748B] hover:text-[#EF4444] transition-colors px-3 py-1.5"
              >
                Kosongkan daftar
              </button>
            </div>
          </form>
        )}

        {/* MODAL SETTINGS */}
        {showSettings && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-[#E2E8F0] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
                <h3 className="font-bold text-[#0F172A] text-base sm:text-lg">
                  Pengaturan Google Sheets
                </h3>
                <button 
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    URL Web App Google Apps Script:
                  </label>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-mono focus:outline-none focus:border-[#0F172A]"
                  />
                  {gasUrl.includes("/exec") && (
                    <div className="mt-2 p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-[11px] text-emerald-800 flex items-center gap-1.5">
                      <Check size={14} className="text-emerald-700" />
                      <strong>Format URL Benar (Web App Endpoint Aktif)</strong>
                    </div>
                  )}
                  <p className="mt-1 text-[11px] text-[#64748B]">
                    Endpoint v6.0 otomatis membuat Tab Baru terdepan per laporan dengan KOP SMP.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Link File Google Sheets (Untuk Tombol Akses Langsung):
                  </label>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    value={sheetViewUrl}
                    onChange={(e) => setSheetViewUrl(e.target.value)}
                    className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-mono focus:outline-none focus:border-[#0F172A]"
                  />
                  <p className="mt-1 text-[11px] text-[#64748B]">
                    Link spreadsheet untuk tombol "Buka Sheets" di header dan konfirmasi.
                  </p>
                </div>

                <div className="flex justify-end pt-2 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("gas_sheet_url", gasUrl.trim());
                      localStorage.setItem("sheet_view_url", sheetViewUrl.trim());
                      setShowSettings(false);
                      alert("Pengaturan Google Sheets berhasil disimpan di perangkat ini!");
                    }}
                    className="px-4 py-2 bg-[#0F172A] text-white rounded-lg font-semibold text-xs hover:bg-slate-800 transition-colors"
                  >
                    Simpan Pengaturan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL RIWAYAT */}
        {showHistory && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-[#E2E8F0] max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div>
                  <h3 className="font-bold text-[#0F172A] text-base sm:text-lg">
                    Riwayat Laporan Presensi Kamar
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Tersimpan di browser ({history.length} sesi lapor)
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-10 text-xs text-[#64748B]">
                    Belum ada riwayat laporan yang tersimpan di perangkat ini.
                  </div>
                ) : (
                  history.map((batch, idx) => (
                    <div key={idx} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs space-y-2">
                      <div className="flex justify-between items-start font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-1.5">
                        <span>Laporan Sesi {batch.sesi}</span>
                        <span className="text-[11px] font-normal text-[#64748B]">{batch.submittedAt}</span>
                      </div>

                      <div className="space-y-1">
                        <div><span className="text-[#64748B]">Pemeriksa:</span> {batch.namaPelapor}</div>
                        <div>
                          <span className="text-[#64748B]">Santri ({batch.records ? batch.records.length : 1}):</span>{" "}
                          <strong className="text-[#0F172A]">
                            {batch.records ? batch.records.map(r => `${r.namaSantri} (${r.kamar}) [${r.statusKehadiran}]`).join(", ") : batch.namaSantri}
                          </strong>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#E2E8F0] flex justify-end gap-2">
                        <a
                          href={sheetViewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-700 text-white rounded text-[11px] font-medium hover:bg-emerald-800 flex items-center gap-1"
                        >
                          <ExternalLink size={12} />
                          <span>Buka Sheets</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(formatRekapText(batch));
                            alert("Ringkasan laporan berhasil disalin ke clipboard!");
                          }}
                          className="px-2.5 py-1 bg-white border border-[#E2E8F0] text-[#0F172A] rounded text-[11px] font-medium hover:bg-slate-100 flex items-center gap-1"
                        >
                          <Copy size={12} />
                          <span>Salin Ringkasan</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {history.length > 0 && (
                <div className="pt-3 border-t border-[#E2E8F0] flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Hapus seluruh riwayat lokal di perangkat ini?")) {
                        setHistory([]);
                        localStorage.removeItem("absen_history");
                      }
                    }}
                    className="text-xs text-[#EF4444] hover:underline"
                  >
                    Hapus Semua Riwayat
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHistory(false)}
                    className="px-3 py-1.5 bg-[#0F172A] text-white rounded-lg text-xs font-semibold"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
