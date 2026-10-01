# SIMPEGRS v2.0 — Dummy App (Prototype)

Prototipe aplikasi pegawai rumah sakit multi-cabang yang bisa diklik, dibuat dari backup percakapan
`SIMPEGRS_Backup_2026-10-01` (Ringkasan Kronologis, Decision Log, mockup Visual v2.0).
Semua data **fiktif** dan hanya tersimpan di browser (localStorage).

## Cara menjalankan
Tanpa build. Buka `index.html` di browser, atau:

```bash
cd simpegrs-v2 && python3 -m http.server 8000   # buka http://localhost:8000
```

Kamera untuk live selfie hanya aktif di `localhost`/HTTPS. Tanpa kamera, aplikasi memakai selfie simulasi.

## Cakupan (sesuai Decision Log)
| # | Keputusan | Di prototipe |
|---|-----------|--------------|
| 2 | Navigasi Home — Jadwal — Absen — Inbox — Saya | Bottom nav + tombol Absen di tengah |
| 3 | Home "Hari Ini", task-centric | Shift hari ini, status absen, Perlu Perhatian, jadwal 7 hari |
| 4 | Akses Cepat personal, default berbasis role | Home → Atur: tambah/hapus/urutkan, per persona |
| 5 | Modul **Cuti & Izin** | 7 kategori, detail izin, form, konfirmasi, riwayat, saldo, approval berjenjang |
| 6 | **Trusted Attendance** | Tap → selfie → verifikasi: geofence, device binding, liveness, face match, mock-location, integritas, Wi-Fi, server time, risk engine (Trusted / Need Review / High Risk), audit trail, antrian review |
| 7–8 | e-Office masuk **Inbox** (work queue) | Tab Semua / Approval / Surat / HR / Sistem; Surat: Kotak Masuk, Terkirim, Draft, Arsip |
| 9 | TTE internal RS | PIN/biometrik, timestamp, hash SHA-256, penomoran otomatis, dokumen final terkunci |
| 10 | **AI Asisten Surat** | Tulis seperti chat → 6 tone (default Semi Formal), saran perihal, guardrail tanggal/nomor/pejabat, wajib review |
| 11–14 | Menu Saya — Digital Employee Wallet | Profil, File Kepegawaian + upload/verifikasi HR, Kontrak & SK (expiry, acknowledgment), Riwayat Karier timeline, Slip Gaji, Benefit, Legalitas Nakes, Kredensial, Diklat |
| 16 | Jadwal & Shift = source of truth | Hari/Minggu/Bulan, shift malam lintas tanggal, tukar dinas + eligibility, lembur, Jadwal Tim: coverage, validation engine, cari pengganti, draft → publish, audit |
| 19–20 | Multi-RS & audit trail | Lokasi shift lintas cabang, surat antar-RS, audit absensi/jadwal/surat |

## Mode Demo
Saya → ⚙ Pengaturan → ganti persona:
- **Arief** — Direktur (Direksi, non-shift) — default
- **Siti** — Perawat ICU (Pegawai, shift) — coba Tukar Dinas & Cuti
- **Andi** — Kepala Ruang ICU (Kepala Unit) — approval & Jadwal Tim
- **Rina** — Staf HR — verifikasi dokumen, review absensi, approval HRD

Di layar Absen ada pilihan skenario (normal, di luar geofence, fake GPS, perangkat baru, wajah tidak cocok,
titip absen, root/emulator) untuk melihat reaksi risk engine. PIN TTE demo: `123456`.

## Batasan
Ini dummy front-end. AI Asisten Surat adalah simulasi rule-based (belum memanggil model AI), verifikasi
wajah/lokasi disimulasikan, dan tidak ada backend. Struktur data (`data.js`) dapat dijadikan acuan awal skema.

## File
- `index.html` — shell & panel petunjuk
- `styles.css` — tema hijau Visual v2.0
- `data.js` — master data, seed, ikon, helper tanggal
- `app.js` — router, layar, dan logika alur
