/* SIMPEGRS v2.0 — master data, seed data, helpers (semua data fiktif) */

/* ---------- Date helpers ---------- */
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HR3 = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function ymd(d) { d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function dayNum(d) { d = new Date(d); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
function fDate(d) { d = typeof d === 'string' && d.length === 10 ? parseYmd(d) : new Date(d); return `${d.getDate()} ${BLN3[d.getMonth()]} ${d.getFullYear()}`; }
function fDateLong(d) { d = new Date(d); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; }
function fTime(d) { d = new Date(d); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function fDT(d) { return `${fDate(d)}, ${fTime(d)}`; }
function ago(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 172800) return 'Kemarin';
  return fDate(d);
}
function daysBetween(a, b) { return dayNum(b) - dayNum(a); }
function rangeDays(a, b) { const out = []; for (let d = parseYmd(a); d <= parseYmd(b); d = addDays(d, 1)) out.push(ymd(d)); return out; }
function rupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uid(p = 'x') { return p + Math.random().toString(36).slice(2, 9); }
function hoursAgo(h) { return new Date(Date.now() - h * 3600e3).toISOString(); }

/* ---------- Icons (inline SVG line icons) ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3.2"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  umbrella: '<path d="M22 12a10 10 0 0 0-20 0z"/><path d="M12 12v7a2 2 0 0 0 4 0M12 2v1"/>',
  medkit: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M12 10v7M8.5 13.5h7"/>',
  swap: '<path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
  wallet: '<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.2"/><path d="M6 12.5h.01M18 12.5h.01"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  shieldok: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  sparkles: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 3v4M17 5h4M19 16v4M17 18h4"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
  id: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.2"/><path d="M14 10h4M14 14h4"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  wifi: '<path d="M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M2 8.8a15 15 0 0 1 20 0M12 20h.01"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  clip: '<path d="m21.4 11-9.2 9.2a6 6 0 0 1-8.5-8.5l8.6-8.6A4 4 0 1 1 18 8.8l-8.6 8.6a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
  kaaba: '<path d="M3 7l9-4 9 4v11l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v11M3 11l9 4 9-4"/>',
  dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  finger: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4M14 13.12c0 2.38 0 6.38-1 8.88M17.29 21.02c.12-.6.43-2.3.5-3.02M2 12a10 10 0 0 1 18-6M2 16h.01M21.8 16c.2-2 .131-5.354 0-6M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2M8.65 22c.21-.66.45-1.32.57-2M9 6.8a6 6 0 0 1 9 5.2v2"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
};
function ic(name, size = 20, sw = 1.9) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* ---------- Master data ---------- */
const RS = {
  kwc: { kode: 'KWC', nama: 'RS Sari Asih Karawaci', lat: -6.2066, lng: 106.6118, radius: 150, ssid: 'RSSA-KWC-STAFF' },
  srg: { kode: 'SRG', nama: 'RS Sari Asih Serang', lat: -6.1201, lng: 106.1503, radius: 150, ssid: 'RSSA-SRG-STAFF' },
  cpd: { kode: 'CPD', nama: 'RS Sari Asih Cipondoh', lat: -6.1867, lng: 106.6956, radius: 150, ssid: 'RSSA-CPD-STAFF' },
  cld: { kode: 'CLD', nama: 'RS Sari Asih Ciledug', lat: -6.2343, lng: 106.7110, radius: 150, ssid: 'RSSA-CLD-STAFF' },
};

const ROLES = { pegawai: 'Pegawai', kepala_unit: 'Kepala Unit', hr: 'HR RS', direksi: 'Direksi / Manajemen' };

const PERSONAS = {
  p1: { id: 'p1', nama: 'Dr. Ir. H. Arief R. Wismansyah', short: 'Arief', ini: 'AW', nik: '12345678', jabatan: 'Direktur', unit: 'Direksi', rs: 'kwc', role: 'direksi', profesi: 'Dokter', pola: 'office', atasan: null, gaji: 38500000, status: 'Pegawai Tetap', masuk: '2016-03-01' },
  p2: { id: 'p2', nama: 'Siti Nurhaliza, S.Kep., Ners', short: 'Siti', ini: 'SN', nik: '20190412', jabatan: 'Perawat Pelaksana', unit: 'ICU', rs: 'kwc', role: 'pegawai', profesi: 'Perawat', pola: 'shift', atasan: 'p3', gaji: 6200000, status: 'PKWT (Kontrak)', masuk: '2019-04-15' },
  p3: { id: 'p3', nama: 'Ns. Andi Pratama, S.Kep.', short: 'Andi', ini: 'AP', nik: '20150721', jabatan: 'Kepala Ruang ICU', unit: 'ICU', rs: 'kwc', role: 'kepala_unit', profesi: 'Perawat', pola: 'office', atasan: 'p1', gaji: 11800000, status: 'Pegawai Tetap', masuk: '2015-07-01' },
  p4: { id: 'p4', nama: 'Rina Marlina, S.Psi.', short: 'Rina', ini: 'RM', nik: '20180203', jabatan: 'Staf HR', unit: 'Sub Bagian SDM', rs: 'kwc', role: 'hr', profesi: 'Non-Nakes', pola: 'office', atasan: 'p1', gaji: 7400000, status: 'Pegawai Tetap', masuk: '2018-02-01' },
};

/* Shift master (configurable per RS/unit — di sini satu set untuk demo) */
const SHIFT = {
  P: { nama: 'Pagi', start: '07:00', end: '14:00', fg: '#15803d', bg: '#dcfce7' },
  S: { nama: 'Siang', start: '14:00', end: '21:00', fg: '#b45309', bg: '#fef3c7' },
  M: { nama: 'Malam', start: '21:00', end: '07:00', cross: true, fg: '#4338ca', bg: '#e0e7ff' },
  O: { nama: 'Office', start: '08:00', end: '16:00', fg: '#1d5fd1', bg: '#e3edfc' },
  DL: { nama: 'Dinas Luar', start: '08:00', end: '16:00', fg: '#0e7c86', bg: '#dcf4f5' },
  OC: { nama: 'On-call', start: '16:00', end: '07:00', cross: true, fg: '#6d3fd1', bg: '#ede6fc' },
  L: { nama: 'Libur', fg: '#6b7a71', bg: '#eef1ef' },
  C: { nama: 'Cuti', fg: '#c62828', bg: '#fde8e8' },
  I: { nama: 'Izin/Sakit', fg: '#c62828', bg: '#fde8e8' },
};
const WORK_CODES = ['P', 'S', 'M', 'O', 'DL', 'OC'];
const GRACE_MIN = 10; // grace period keterlambatan (configurable)
const COVERAGE_MIN = { P: 3, S: 3, M: 2 };
const CYCLE = ['P', 'P', 'S', 'S', 'M', 'M', 'L', 'L'];

/* Tim ICU — RS Sari Asih Karawaci */
const TEAM = [
  { id: 'p3', nama: 'Andi Pratama', pola: 'office', komp: ['ICU Dasar', 'BTCLS'], kepala: true },
  { id: 'p2', nama: 'Siti Nurhaliza', pola: 'shift', off: 0, komp: ['ICU Dasar', 'BTCLS'] },
  { id: 'm1', nama: 'Budi Santoso', pola: 'shift', off: 2, komp: ['ICU Dasar', 'BTCLS'] },
  { id: 'm2', nama: 'Dewi Lestari', pola: 'shift', off: 4, komp: ['ICU Dasar'] },
  { id: 'm3', nama: 'Rizky Hidayat', pola: 'shift', off: 6, komp: ['ICU Dasar', 'BTCLS'] },
  { id: 'm4', nama: 'Maya Sari', pola: 'shift', off: 1, komp: ['ICU Dasar', 'BTCLS'] },
  { id: 'm5', nama: 'Fajar Nugroho', pola: 'shift', off: 3, komp: ['ICU Dasar'] },
  { id: 'm6', nama: 'Lina Kurnia', pola: 'shift', off: 5, komp: ['ICU Dasar', 'BTCLS'] },
  { id: 'm7', nama: 'Hendra Wijaya', pola: 'shift', off: 7, komp: ['ICU Dasar'] },
  { id: 'm8', nama: 'Nur Aini', pola: 'shift', off: 0, komp: ['ICU Dasar', 'BTCLS'] },
  { id: 'm9', nama: 'Yoga Pratama', pola: 'shift', off: 4, komp: ['Orientasi'] },
];
function memberName(id) { return PERSONAS[id]?.nama.replace(/,.*$/, '') || TEAM.find(t => t.id === id)?.nama || id; }

/* Cuti & Izin */
const LEAVE_CATS = [
  { id: 'cuti', nama: 'Cuti', desc: 'Cuti tahunan, cuti besar, dll', icon: 'umbrella', c: 'green', code: 'C', subs: ['Cuti Tahunan', 'Cuti Besar', 'Cuti Melahirkan', 'Cuti Bersama'], potong: ['Cuti Tahunan'] },
  { id: 'sakit', nama: 'Sakit', desc: 'Sakit, rawat inap, kontrol dokter', icon: 'medkit', c: 'red', code: 'I', subs: ['Sakit (dengan surat dokter)', 'Sakit ringan (tanpa surat dokter, maks. 1 hari)', 'Rawat inap', 'Kontrol / Pengobatan', 'Kecelakaan'], wajib: s => !s.startsWith('Sakit ringan'), lampiranLabel: 'Surat Dokter' },
  { id: 'izin', nama: 'Izin', desc: 'Keperluan keluarga, terlambat, pulang awal, keluar sementara', icon: 'file', c: 'blue', code: 'I', subs: ['Keperluan Keluarga', 'Keluarga Sakit', 'Keluarga Meninggal', 'Menikah', 'Menikahkan Anak', 'Khitan / Baptis Anak', 'Istri Melahirkan / Keguguran', 'Terlambat', 'Pulang Lebih Awal', 'Keluar Sementara', 'Kondisi Darurat', 'Lainnya'], jam: ['Terlambat', 'Pulang Lebih Awal', 'Keluar Sementara'] },
  { id: 'umrah', nama: 'Umrah / Haji', desc: 'Ibadah umrah atau haji', icon: 'kaaba', c: 'amber', code: 'C', subs: ['Umrah', 'Haji'], potong: ['Umrah'], wajib: () => true, lampiranLabel: 'Itinerary / Tiket' },
  { id: 'dinas', nama: 'Dinas Luar', desc: 'Tugas dinas luar, seminar, kunjungan antar-RS', icon: 'briefcase', c: 'violet', code: 'DL', subs: ['Tugas Dinas Luar Kota', 'Seminar / Workshop', 'Kunjungan Antar-RS'] },
  { id: 'diklat', nama: 'Pendidikan / Diklat', desc: 'Ujian, pendidikan formal, diklat', icon: 'cap', c: 'teal', code: 'DL', subs: ['Ujian', 'Pendidikan Formal', 'Diklat / Pelatihan'] },
  { id: 'lain', nama: 'Lainnya', desc: 'Kondisi khusus lainnya', icon: 'dots', c: 'gray', code: 'I', subs: ['Kondisi Khusus Lainnya'] },
];

/* Akses Cepat — katalog (personal, bisa diubah & diurutkan; default berbasis role) */
const QUICK = {
  cuti: { nama: 'Cuti & Izin', icon: 'umbrella', c: 'green', go: ['cuti'] },
  slip: { nama: 'Slip Gaji', icon: 'wallet', c: 'green', go: ['slip'] },
  tukar: { nama: 'Tukar Dinas', icon: 'swap', c: 'blue', go: ['tukar'] },
  jadwal: { nama: 'Jadwal', icon: 'calendar', c: 'violet', tab: 'jadwal' },
  legal: { nama: 'Legalitas', icon: 'shieldok', c: 'amber', go: ['legal'] },
  diklat: { nama: 'Diklat', icon: 'cap', c: 'blue', go: ['diklat'] },
  surat: { nama: 'Buat Surat', icon: 'pen', c: 'teal', go: ['surat-new'] },
  lembur: { nama: 'Lembur', icon: 'moon', c: 'violet', go: ['lembur'] },
  rekap: { nama: 'Rekap Absen', icon: 'clock', c: 'green', go: ['rekap'] },
  file: { nama: 'File Pegawai', icon: 'layers', c: 'amber', go: ['files'] },
  kontrak: { nama: 'Kontrak & SK', icon: 'file', c: 'red', go: ['kontrak'] },
  tim: { nama: 'Jadwal Tim', icon: 'users', c: 'teal', go: ['team'], roles: ['kepala_unit', 'direksi'] },
  approval: { nama: 'Approval', icon: 'check', c: 'red', tab: 'inbox', tabParam: 'approval', roles: ['kepala_unit', 'hr', 'direksi'] },
  karier: { nama: 'Karier', icon: 'trend', c: 'blue', go: ['karier'] },
};
const QUICK_DEFAULT = {
  pegawai: ['cuti', 'jadwal', 'tukar', 'slip', 'rekap', 'legal', 'diklat', 'lembur'],
  kepala_unit: ['approval', 'tim', 'cuti', 'jadwal', 'surat', 'slip', 'legal', 'rekap'],
  hr: ['approval', 'cuti', 'surat', 'file', 'slip', 'rekap', 'kontrak', 'diklat'],
  direksi: ['cuti', 'slip', 'tukar', 'jadwal', 'approval', 'surat', 'tim', 'legal'],
};

/* Penerima surat (antar-pegawai, antar-unit, antar-RS) */
const RECIPIENTS = [
  { id: 'p1', nama: 'Dr. Ir. H. Arief R. Wismansyah', sub: 'Direktur · RS Sari Asih Karawaci', deliver: 'p1' },
  { id: 'p3', nama: 'Ns. Andi Pratama', sub: 'Kepala Ruang ICU · RS Sari Asih Karawaci', deliver: 'p3' },
  { id: 'p4', nama: 'Rina Marlina', sub: 'Staf HR · RS Sari Asih Karawaci', deliver: 'p4' },
  { id: 'p2', nama: 'Siti Nurhaliza', sub: 'Perawat Pelaksana ICU · RS Sari Asih Karawaci', deliver: 'p2' },
  { id: 'u-sdm', nama: 'Sub Bagian SDM', sub: 'Unit · RS Sari Asih Karawaci', deliver: 'p4' },
  { id: 'u-icu', nama: 'Instalasi ICU', sub: 'Unit · RS Sari Asih Karawaci', deliver: 'p3' },
  { id: 'u-sarpras', nama: 'Unit Sarana dan Prasarana', sub: 'Unit · RS Sari Asih Karawaci', deliver: null },
  { id: 'u-keu', nama: 'Bagian Keuangan', sub: 'Unit · RS Sari Asih Karawaci', deliver: null },
  { id: 'r-srg', nama: 'Direksi RS Sari Asih Serang', sub: 'Antar-RS', deliver: null },
  { id: 'r-cpd', nama: 'Direksi RS Sari Asih Cipondoh', sub: 'Antar-RS', deliver: null },
  { id: 'r-hrg', nama: 'HR Group Sari Asih', sub: 'Lintas cabang', deliver: 'p4' },
];
const JENIS_SURAT = [
  { id: 'ND', nama: 'Nota Dinas' }, { id: 'PRM', nama: 'Permohonan Internal' }, { id: 'UND', nama: 'Surat Undangan' },
  { id: 'SE', nama: 'Surat Edaran' }, { id: 'LAP', nama: 'Penyampaian Laporan' }, { id: 'MEMO', nama: 'Memo' },
];

/* ---------- Seed (dibuat relatif terhadap tanggal hari ini) ---------- */
function buildSeed() {
  const T = today();
  const d = n => ymd(addDays(T, n));
  const iso = (n, hh = 9, mm = 0) => { const x = addDays(T, n); x.setHours(hh, mm, 0, 0); return x.toISOString(); };

  const sched = { p1: {}, p2: {}, p3: {}, p4: {} };
  sched.p1[d(3)] = 'DL'; // dinas luar ke RS cabang Serang (kasus lintas cabang)
  const schedLoc = { p1: { [d(3)]: 'srg' } };

  const requests = [
    { id: 'r1', kind: 'leave', requester: 'p2', created: iso(0, 7, 20), status: 'Diproses',
      data: { cat: 'cuti', sub: 'Cuti Tahunan', start: d(9), end: d(13), days: 5, reason: 'Keperluan keluarga di kampung halaman', files: [] },
      steps: [{ label: 'Kepala Unit', roles: ['kepala_unit'], status: 'pending' }, { label: 'HRD', roles: ['hr'], status: 'waiting' }] },
    { id: 'r2', kind: 'swap', requester: 'm1', created: iso(0, 6, 5), status: 'Diproses',
      data: { date: d(5), from: 'm1', to: 'p2', reason: 'Ada acara wisuda adik' },
      steps: [{ label: 'Persetujuan rekan', pid: 'p2', status: 'pending' }, { label: 'Kepala Unit', roles: ['kepala_unit'], status: 'waiting' }] },
    { id: 'r3', kind: 'swap', requester: 'm2', created: iso(-1, 15, 30), status: 'Diproses',
      data: { date: d(4), from: 'm2', to: 'm3', reason: 'Kontrol kehamilan' },
      steps: [{ label: 'Persetujuan rekan', name: 'Rizky Hidayat', status: 'done', at: iso(-1, 17, 2) }, { label: 'Kepala Unit', roles: ['kepala_unit'], status: 'pending' }] },
    { id: 'r4', kind: 'overtime', requester: 'm3', created: iso(-1, 22, 10), status: 'Diproses',
      data: { date: d(-1), start: '21:00', end: '23:30', reason: 'Pasien kritis bertambah, handover tertunda', type: 'Lembur' },
      steps: [{ label: 'Kepala Unit', roles: ['kepala_unit'], status: 'pending' }] },
    { id: 'r5', kind: 'attendance', requester: 'm5', created: iso(0, 6, 58), status: 'Diproses',
      data: { attId: 'a-seed1', summary: 'Absen masuk di luar geofence (230 m dari titik absensi)', risk: 'Need Review', score: 50 },
      steps: [{ label: 'Review HR / Kepala Unit', roles: ['hr', 'kepala_unit'], status: 'pending' }] },
    { id: 'r6', kind: 'doc', requester: 'm4', created: iso(-1, 10, 0), status: 'Diproses',
      data: { doc: 'STR (pembaruan)', file: 'STR_MayaSari_2026.pdf', size: '412 KB' },
      steps: [{ label: 'Verifikasi HR', roles: ['hr'], status: 'pending' }] },
    // Riwayat milik p1 & p2
    { id: 'r7', kind: 'leave', requester: 'p1', created: iso(-19, 9, 15), status: 'Disetujui',
      data: { cat: 'izin', sub: 'Keperluan Keluarga', start: d(-17), end: d(-17), days: 1, reason: 'Mendampingi orang tua kontrol ke rumah sakit', files: [] },
      steps: [{ label: 'HRD', roles: ['hr'], status: 'done', name: 'Rina Marlina', at: iso(-19, 11, 0) }] },
    { id: 'r8', kind: 'leave', requester: 'p1', created: iso(-26, 8, 0), status: 'Ditolak',
      data: { cat: 'izin', sub: 'Terlambat', start: d(-26), end: d(-26), days: 1, jam: '08:00 – 09:00', reason: 'Kendala transportasi', files: [] },
      steps: [{ label: 'HRD', roles: ['hr'], status: 'rejected', name: 'Rina Marlina', at: iso(-26, 10, 0), note: 'Pengajuan melewati batas waktu' }] },
    { id: 'r9', kind: 'leave', requester: 'p2', created: iso(-12, 8, 0), status: 'Disetujui',
      data: { cat: 'sakit', sub: 'Sakit (dengan surat dokter)', start: d(-11), end: d(-10), days: 2, reason: 'Demam, istirahat sesuai anjuran dokter', files: [{ name: 'Surat_dokter.pdf', size: '245 KB' }] },
      steps: [{ label: 'Kepala Unit', roles: ['kepala_unit'], status: 'done', name: 'Andi Pratama', at: iso(-12, 9, 0) }, { label: 'HRD', roles: ['hr'], status: 'done', name: 'Rina Marlina', at: iso(-12, 13, 0) }] },
  ];

  const letters = [
    { id: 'L1', no: '005/RSSA-KWC/UND/' + ROMAN[T.getMonth()] + '/' + T.getFullYear(), jenis: 'UND', perihal: 'Undangan Rapat Koordinasi Mutu & Keselamatan Pasien', from: 'ext', fromName: 'Sekretariat Direksi', to: ['all'], date: iso(0, 7, 45), klas: 'Biasa', status: 'Terkirim', readBy: [], archivedBy: [],
      isi: 'Dengan hormat,\n\nSehubungan dengan evaluasi indikator mutu triwulan III, kami mengundang Bapak/Ibu untuk hadir pada Rapat Koordinasi Mutu & Keselamatan Pasien yang akan dilaksanakan pada:\n\nHari/Tanggal : ' + fDateLong(addDays(T, 6)) + '\nPukul : 13.00 WIB – selesai\nTempat : Ruang Rapat Lt. 3\n\nDemikian undangan ini kami sampaikan. Atas perhatian dan kehadirannya, kami ucapkan terima kasih.',
      files: [{ name: 'Agenda_rapat_mutu.pdf', size: '182 KB' }], steps: [], timeline: [{ t: 'Surat dikirim', s: 'Sekretariat Direksi', at: iso(0, 7, 45) }], dispo: [] },
    { id: 'L2', no: null, jenis: 'PRM', perihal: 'Permohonan Pengadaan Ventilator ICU', from: 'p3', to: ['p1'], date: iso(-1, 14, 10), klas: 'Penting', status: 'Diajukan', readBy: [], archivedBy: [],
      isi: 'Dengan hormat,\n\nSehubungan dengan meningkatnya jumlah pasien dengan kebutuhan bantuan napas di ICU dalam tiga bulan terakhir, bersama ini kami mengajukan permohonan pengadaan 2 (dua) unit ventilator untuk Instalasi ICU.\n\nRincian kebutuhan dan perbandingan penawaran vendor kami lampirkan bersama surat ini.\n\nDemikian permohonan ini kami sampaikan. Atas perhatian dan persetujuan Bapak, kami ucapkan terima kasih.',
      files: [{ name: 'Analisa_kebutuhan_ventilator.pdf', size: '1,2 MB' }, { name: 'Penawaran_vendor.xlsx', size: '86 KB' }],
      steps: [{ label: 'Mengetahui', name: 'Manajer Keperawatan', status: 'done', at: iso(-1, 16, 0) }, { label: 'Menyetujui', pid: 'p1', status: 'pending' }],
      timeline: [{ t: 'Draft dibuat', s: 'Ns. Andi Pratama', at: iso(-1, 13, 40) }, { t: 'Diajukan', s: 'Ns. Andi Pratama', at: iso(-1, 14, 10) }, { t: 'Mengetahui', s: 'Manajer Keperawatan — TTE internal', at: iso(-1, 16, 0) }], dispo: [] },
    { id: 'L3', no: '012/RSSA-SRG/PRM/' + ROMAN[T.getMonth()] + '/' + T.getFullYear(), jenis: 'PRM', perihal: 'Permohonan Bantuan Tenaga Perawat ICU (Antar-RS)', from: 'ext', fromName: 'Direksi RS Sari Asih Serang', to: ['p1'], date: iso(-2, 10, 5), klas: 'Penting', status: 'Terkirim', readBy: [], archivedBy: [],
      isi: 'Dengan hormat,\n\nMenindaklanjuti peningkatan okupansi ICU di RS Sari Asih Serang, kami memohon bantuan penugasan sementara 2 (dua) orang perawat ICU dari RS Sari Asih Karawaci selama 2 (dua) minggu.\n\nDemikian permohonan ini kami sampaikan. Atas kerja samanya kami ucapkan terima kasih.',
      files: [], steps: [], timeline: [{ t: 'Surat dikirim antar-RS', s: 'Direksi RS Sari Asih Serang', at: iso(-2, 10, 5) }], dispo: [] },
    { id: 'L4', no: '031/RSSA-KWC/LAP/' + ROMAN[T.getMonth()] + '/' + T.getFullYear(), jenis: 'LAP', perihal: 'Laporan Kinerja SDM Triwulan III', from: 'p4', to: ['p1'], date: iso(-6, 9, 0), klas: 'Biasa', status: 'Disetujui', readBy: ['p1'], archivedBy: [],
      isi: 'Dengan hormat,\n\nBersama ini kami sampaikan Laporan Kinerja SDM Triwulan III yang mencakup rekap kehadiran, turnover, pemenuhan diklat wajib, dan status legalitas tenaga kesehatan.\n\nDemikian laporan ini kami sampaikan. Terima kasih.',
      files: [{ name: 'Laporan_SDM_TW3.pdf', size: '2,1 MB' }],
      steps: [{ label: 'Menyetujui', pid: 'p1', status: 'done', at: iso(-6, 15, 20), sign: { by: 'Dr. Ir. H. Arief R. Wismansyah', at: iso(-6, 15, 20), hash: '9f2c1b7e4a0d38c6e15b72f0a9d4c3e8b1f6a2d7c0e95b4f3a8d1c6e2b7f0a94', method: 'PIN' } }],
      timeline: [{ t: 'Draft dibuat', s: 'Rina Marlina', at: iso(-7, 16, 0) }, { t: 'Diajukan', s: 'Rina Marlina', at: iso(-6, 9, 0) }, { t: 'Disetujui & ditandatangani', s: 'Dr. Ir. H. Arief R. Wismansyah — TTE internal RS', at: iso(-6, 15, 20) }], dispo: [], locked: true },
    { id: 'L5', no: null, jenis: 'SE', perihal: 'Edaran Jadwal Pelayanan Libur Nasional', from: 'p1', to: ['all'], date: iso(-1, 20, 0), klas: 'Biasa', status: 'Draft', readBy: [], archivedBy: [],
      isi: 'Dengan hormat,\n\nSehubungan dengan libur nasional mendatang, disampaikan bahwa pelayanan IGD, ICU, dan rawat inap tetap berjalan 24 jam, sedangkan poliklinik rawat jalan mengikuti jadwal khusus [tanggal — mohon diisi].\n\nDemikian edaran ini disampaikan untuk menjadi perhatian.',
      files: [], steps: [], timeline: [{ t: 'Draft dibuat', s: 'Dr. Ir. H. Arief R. Wismansyah', at: iso(-1, 20, 0) }], dispo: [] },
  ];

  const notifs = [
    { id: 'n1', to: 'all', cat: 'sistem', title: 'Jadwal ' + BULAN[T.getMonth()] + ' dipublikasikan', body: 'Jadwal dinas bulan ini sudah final. Cek Jadwal Saya.', at: iso(-2, 18, 0), go: { tab: 'jadwal' } },
    { id: 'n2', to: 'all', cat: 'hr', title: 'Dokumen KTP Disetujui', body: 'Dokumen KTP Anda telah diverifikasi oleh tim HR.', at: iso(0, 9, 15), go: { screen: 'files' } },
    { id: 'n3', to: 'all', cat: 'hr', title: 'Permintaan Revisi Pas Foto', body: 'Mohon unggah ulang pas foto dengan kualitas yang lebih baik.', at: iso(-1, 11, 0), go: { screen: 'filecat', p: { id: 'identitas' } } },
    { id: 'n4', to: 'all', cat: 'hr', title: 'Pengingat Legalitas: STR', body: 'STR Anda akan berakhir dalam 43 hari. Segera perbarui.', at: iso(-1, 7, 0), go: { screen: 'legal' } },
    { id: 'n5', to: 'all', cat: 'hr', title: 'SK Penugasan Tim Mutu terbit', body: 'Mohon baca dan berikan acknowledgment.', at: iso(-3, 10, 0), go: { screen: 'kontrak-d', p: { id: 'k5' } } },
    { id: 'n6', to: 'all', cat: 'sistem', title: 'Perangkat terdaftar', body: 'Perangkat ini terikat (device binding) ke akun Anda untuk Trusted Attendance.', at: iso(-8, 8, 0) },
    { id: 'n7', to: 'all', cat: 'hr', title: 'Pelatihan wajib belum selesai', body: 'K3RS & Kewaspadaan Bencana — tenggat 14 hari lagi.', at: iso(-2, 8, 0), go: { screen: 'diklat' } },
  ];

  // Riwayat absensi (7 hari terakhir) untuk rekap
  const attendance = [];
  for (let i = 1; i <= 12; i++) {
    const day = addDays(T, -i);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const late = i === 4;
    const inAt = new Date(day); inAt.setHours(late ? 8 : 7, late ? 22 : 48 - (i % 5) * 3);
    const outAt = new Date(day); outAt.setHours(16, 5 + i * 2);
    const base = { pid: 'p1', date: ymd(day), status: 'Trusted', score: 4, scenario: 'normal', rs: 'kwc', device: 'SM-S918B · a1f3…9c', dist: 18 + i, signals: [] };
    attendance.push({ ...base, id: uid('a'), type: 'in', at: inAt.toISOString(), late: late ? 12 : 0 });
    attendance.push({ ...base, id: uid('a'), type: 'out', at: outAt.toISOString(), late: 0 });
  }
  attendance.push({ id: 'a-seed1', pid: 'm5', date: d(0), type: 'in', at: iso(0, 6, 57), status: 'Need Review', score: 50, scenario: 'outside', rs: 'kwc', device: 'Redmi Note 12 · 7be2…41', dist: 230, late: 0, signals: [] });

  return {
    v: 3, persona: 'p1', quick: {}, sched, schedLoc, teamDraft: {}, teamPublishedAt: iso(-2, 18, 0),
    requests, letters, notifs, attendance, readNotif: {}, ack: {}, cutiUsed: { p1: 4, p2: 4, p3: 2, p4: 6 },
    docUploads: [], scenario: 'normal', hideMoney: true, overtime: [],
  };
}

/* ---------- Digital Employee Wallet — data statis per persona ---------- */
const FILE_CATS = [
  { id: 'identitas', nama: 'Identitas', desc: 'KTP, KK, NPWP, Pas Foto', icon: 'id', c: 'blue', status: 'Lengkap',
    docs: [{ nama: 'KTP', no: '3273010101910001', s: 'Terverifikasi', exp: 'Berlaku seumur hidup' }, { nama: 'NPWP', no: '12.345.678.9-012.000', s: 'Terverifikasi' }, { nama: 'Kartu Keluarga', no: '3273010101910001', s: 'Terverifikasi' }, { nama: 'Pas Foto', no: 'Diunggah 15 Nov 2024', s: 'Perlu Diperbarui' }] },
  { id: 'pendidikan', nama: 'Pendidikan', desc: 'Ijazah, Transkrip', icon: 'cap', c: 'green', status: 'Lengkap',
    docs: [{ nama: 'Ijazah S2', no: 'Universitas Indonesia', s: 'Terverifikasi' }, { nama: 'Transkrip S2', no: 'IPK 3,71', s: 'Terverifikasi' }, { nama: 'Ijazah S1', no: 'Institut Teknologi Bandung', s: 'Terverifikasi' }] },
  { id: 'bank', nama: 'Perbankan & Pajak', desc: 'Rekening gaji, NPWP, formulir pajak', icon: 'building', c: 'amber', status: 'Perlu Update',
    docs: [{ nama: 'Buku Rekening Gaji', no: 'Bank Mandiri · 123-00-0456789-0', s: 'Terverifikasi' }, { nama: 'Formulir 1721-A1', no: 'Tahun pajak sebelumnya', s: 'Perlu Update' }] },
  { id: 'keluarga', nama: 'Keluarga', desc: 'Pasangan, anak, tanggungan', icon: 'users', c: 'green', status: 'Lengkap',
    docs: [{ nama: 'Akta Nikah', no: 'No. 123/45/VI/2005', s: 'Terverifikasi' }, { nama: 'Akta Kelahiran Anak (2)', no: '2 dokumen', s: 'Terverifikasi' }] },
  { id: 'bpjs', nama: 'BPJS & Benefit', desc: 'BPJS Kesehatan, BPJS TK', icon: 'shield', c: 'teal', status: 'Menunggu Verifikasi',
    docs: [{ nama: 'Kartu BPJS Kesehatan', no: '0001234567890', s: 'Terverifikasi' }, { nama: 'Kartu BPJS Ketenagakerjaan', no: '19012345678', s: 'Menunggu Verifikasi' }] },
  { id: 'pelatihan', nama: 'Pelatihan', desc: 'Sertifikat pelatihan, workshop', icon: 'award', c: 'violet', status: 'Lengkap',
    docs: [{ nama: 'Sertifikat BHD/BLS', no: 'Berlaku s.d. Mar 2028', s: 'Terverifikasi' }, { nama: 'Sertifikat PPI Dasar', no: '2025', s: 'Terverifikasi' }] },
  { id: 'lain', nama: 'Dokumen Lain', desc: 'Surat keterangan, dll', icon: 'file', c: 'gray', status: 'Perlu Update',
    docs: [{ nama: 'Surat Keterangan Sehat', no: 'Kedaluwarsa', s: 'Perlu Update' }, { nama: 'SKCK', no: '2024', s: 'Terverifikasi' }] },
];

function kontrakFor(pid) {
  const T = today();
  if (pid === 'p2') return [
    { id: 'k1', jenis: 'Kontrak Kerja', nama: 'Perjanjian Kerja Waktu Tertentu (PKWT) ke-3', no: '088/PKWT/RSSA-KWC/X/2025', terbit: '2025-10-15', akhir: ymd(addDays(T, 75)), status: 'Berlaku', ket: 'Perawat Pelaksana ICU' },
    { id: 'k2', jenis: 'Surat Keputusan', nama: 'SK Rotasi Unit ke ICU', no: '041/SK/RSSA-KWC/III/2023', terbit: '2023-03-01', status: 'Berlaku', ket: 'Rotasi dari Rawat Inap Lt. 5 ke ICU' },
    { id: 'k3', jenis: 'Kontrak Kerja', nama: 'PKWT ke-2', no: '102/PKWT/RSSA-KWC/X/2023', terbit: '2023-10-15', akhir: '2025-10-14', status: 'Selesai' },
    { id: 'k5', jenis: 'Surat Keputusan', nama: 'SK Penugasan Tim Mutu 2026', no: '119/SK/RSSA-KWC/IX/2026', terbit: ymd(addDays(T, -3)), status: 'Berlaku', ack: true, ket: 'Anggota Tim Peningkatan Mutu & Keselamatan Pasien' },
  ];
  return [
    { id: 'k1', jenis: 'Surat Keputusan', nama: 'SK Pengangkatan Pegawai Tetap', no: '001/SK/RS SAK/I/2020', terbit: '2020-01-10', status: 'Berlaku', ket: 'Pengangkatan sebagai Pegawai Tetap' },
    { id: 'k2', jenis: 'Kontrak Kerja', nama: 'Perpanjangan Kontrak Kerja', no: '012/PK/RS SAK/I/2023', terbit: '2023-01-15', status: 'Berlaku' },
    { id: 'k3', jenis: 'Surat Keputusan', nama: 'SK Kenaikan Jabatan', no: '023/SK/RS SAK/V/2022', terbit: '2022-05-01', status: 'Selesai' },
    { id: 'k4', jenis: 'Surat Keputusan', nama: 'SK Penugasan', no: '045/SK/RS SAK/III/2021', terbit: '2021-03-01', status: 'Selesai' },
    { id: 'k5', jenis: 'Surat Keputusan', nama: 'SK Penugasan Tim Mutu 2026', no: '119/SK/RSSA-KWC/IX/2026', terbit: ymd(addDays(T, -3)), status: 'Berlaku', ack: true, ket: 'Ketua Pengarah Tim Peningkatan Mutu & Keselamatan Pasien' },
  ];
}

function karierFor(pid) {
  if (pid === 'p2') return [
    { y: '2023', d: '01 Mar 2023', t: 'Rotasi Unit', j: 'Perawat Pelaksana ICU', now: true },
    { y: '2021', d: '15 Okt 2021', t: 'Perpanjangan Kontrak', j: 'Perawat Pelaksana Rawat Inap' },
    { y: '2019', d: '15 Apr 2019', t: 'Kontrak Awal', j: 'Perawat Pelaksana Rawat Inap' },
  ];
  return [
    { y: '2024', d: '01 Mar 2024', t: 'Promosi', j: 'Direktur', now: true },
    { y: '2022', d: '01 Apr 2022', t: 'Kenaikan Jabatan', j: 'Wakil Direktur' },
    { y: '2020', d: '10 Jan 2020', t: 'Pengangkatan Pegawai Tetap', j: 'Staf Medis' },
    { y: '2018', d: '01 Mar 2018', t: 'Perpanjangan Kontrak', j: 'Staf Medis' },
    { y: '2016', d: '01 Mar 2016', t: 'Kontrak Awal', j: 'Staf Medis' },
  ];
}

function legalFor(pid) {
  const T = today();
  if (PERSONAS[pid].profesi === 'Non-Nakes') return [];
  return [
    { nama: 'STR (Surat Tanda Registrasi)', no: 'STR-' + PERSONAS[pid].nik + '-KKI', akhir: ymd(addDays(T, 43)), status: 'Segera berakhir' },
    { nama: 'SIP (Surat Izin Praktik)', no: 'SIP/503/0' + PERSONAS[pid].nik.slice(-4) + '/DPMPTSP/2024', akhir: ymd(addDays(T, 410)), status: 'Aktif' },
    { nama: 'Sertifikat Kompetensi', no: 'SERKOM-' + PERSONAS[pid].nik.slice(-5), akhir: ymd(addDays(T, 700)), status: 'Aktif' },
  ];
}

const DIKLAT = [
  { nama: 'Bantuan Hidup Dasar (BHD/BLS)', wajib: true, status: 'Selesai', jpl: 8, tgl: 'Mar 2026', sert: true },
  { nama: 'Pencegahan & Pengendalian Infeksi (PPI)', wajib: true, status: 'Selesai', jpl: 6, tgl: 'Feb 2026', sert: true },
  { nama: 'Patient Safety & Sasaran Keselamatan Pasien', wajib: true, status: 'Selesai', jpl: 4, tgl: 'Jan 2026', sert: true },
  { nama: 'K3RS & Kewaspadaan Bencana', wajib: true, status: 'Belum', jpl: 4, tgl: 'Tenggat 14 hari lagi' },
  { nama: 'Komunikasi Efektif (SBAR)', wajib: false, status: 'Terdaftar', jpl: 3, tgl: 'Bulan depan' },
];
