/* SIMPEGRS v2.0 — dummy app (vanilla JS, tanpa build). Semua data fiktif & disimpan di browser. */

const STORE_KEY = 'simpegrs-v2-demo';
let S = loadState();
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { const s = JSON.parse(raw); if (s && s.v === 3) return s; }
  } catch (e) { /* storage tidak tersedia */ }
  return buildSeed();
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* abaikan */ } }

const $app = document.getElementById('app');
const me = () => PERSONAS[S.persona];
const isApprover = () => ['kepala_unit', 'hr', 'direksi'].includes(me().role);
const isNakes = () => me().profesi !== 'Non-Nakes';
let nav = { tab: 'home', stack: [{ s: 'home', p: {} }] };
let ui = { sheet: null, toast: null };
const after = [];
const curS = () => nav.stack[nav.stack.length - 1];
const F = () => (curS().f ||= {});

/* ================= Helpers: schedule ================= */
function baseShift(id, k) {
  const m = TEAM.find(t => t.id === id);
  const pola = m?.pola || PERSONAS[id]?.pola || 'office';
  const dt = parseYmd(k);
  if (pola === 'office') return (dt.getDay() === 0 || dt.getDay() === 6) ? 'L' : 'O';
  return CYCLE[((dayNum(dt) + m.off) % 8 + 8) % 8];
}
function shiftOf(id, k) { k = typeof k === 'string' ? k : ymd(k); return S.sched[id]?.[k] ?? baseShift(id, k); }
function setShift(id, k, code) { (S.sched[id] ||= {})[k] = code; }
function teamShift(id, k) { return S.teamDraft[id]?.[k] ?? shiftOf(id, k); }
function shiftLoc(id, k) { return S.schedLoc?.[id]?.[k] || PERSONAS[id]?.rs || 'kwc'; }
function isWork(code) { return WORK_CODES.includes(code); }
function shiftWindow(code, k) {
  const sh = SHIFT[code]; if (!sh?.start) return null;
  const base = parseYmd(k);
  const st = new Date(base); const [h, m] = sh.start.split(':').map(Number); st.setHours(h, m, 0, 0);
  const en = new Date(base); const [h2, m2] = sh.end.split(':').map(Number); en.setHours(h2, m2, 0, 0);
  if (sh.cross || en <= st) en.setDate(en.getDate() + 1);
  return { st, en };
}
function shiftChip(code, extra = '') { const s = SHIFT[code] || SHIFT.L; return `<span class="sc ${extra}" style="background:${s.bg};color:${s.fg}">${code}</span>`; }
function shiftTime(code) { const s = SHIFT[code]; return s?.start ? `${s.start} – ${s.end}${s.cross ? ' (+1)' : ''}` : '—'; }
function findAtt(pid, k, type) { return S.attendance.find(a => a.pid === pid && a.date === k && a.type === type); }
function activeShift(pid) {
  const now = new Date(); const T = today(); const yk = ymd(addDays(T, -1)); const yc = shiftOf(pid, yk);
  if (SHIFT[yc]?.cross) {
    const w = shiftWindow(yc, yk);
    if (now < new Date(w.en.getTime() + 2 * 3600e3) && !findAtt(pid, yk, 'out') && findAtt(pid, yk, 'in')) return { k: yk, code: yc, w };
  }
  const k = ymd(T); const code = shiftOf(pid, k);
  return { k, code, w: shiftWindow(code, k) };
}
function workDaysIn(pid, a, b) { return rangeDays(a, b).filter(k => isWork(shiftOf(pid, k))).length; }

/* ================= Helpers: requests / inbox ================= */
function curStep(r) { return (r.steps || []).find(s => s.status === 'pending'); }
function canActStep(step) {
  if (!step) return false;
  if (step.pid) return step.pid === S.persona;
  if (step.roles) return step.roles.includes(me().role) || me().role === 'direksi';
  return false;
}
function myApprovals() { return S.requests.filter(r => r.status === 'Diproses' && r.requester !== S.persona && canActStep(curStep(r))); }
function myLetterApprovals() { return S.letters.filter(l => l.status === 'Diajukan' && curStep(l)?.pid === S.persona); }
function deliversTo(l, pid) {
  return l.to.some(id => id === 'all' || id === pid || RECIPIENTS.find(r => r.id === id)?.deliver === pid) || (l.dispo || []).some(d => d.deliver === pid);
}
function inboxLetters() { return S.letters.filter(l => ['Terkirim', 'Disetujui'].includes(l.status) && l.from !== S.persona && deliversTo(l, S.persona) && !l.archivedBy.includes(S.persona)); }
function visibleNotifs() { return S.notifs.filter(n => n.to === 'all' || n.to === S.persona || n.to === me().role); }
function notifRead(n) { return !!S.readNotif[S.persona]?.[n.id]; }
function unreadCount() {
  return myApprovals().length + myLetterApprovals().length + visibleNotifs().filter(n => !notifRead(n)).length + inboxLetters().filter(l => !l.readBy.includes(S.persona)).length;
}
function notify(to, cat, title, body, go) { S.notifs.unshift({ id: uid('n'), to, cat, title, body, at: new Date().toISOString(), go }); }
function reqCat(r) { return r.kind === 'leave' ? LEAVE_CATS.find(c => c.id === r.data.cat) : null; }
function reqKind(r) { return { leave: reqCat(r)?.nama, swap: 'Tukar Dinas', overtime: r.data.type || 'Lembur', attendance: 'Absensi', doc: 'Dokumen' }[r.kind]; }
function reqIcon(r) { return r.kind === 'leave' ? [reqCat(r).icon, reqCat(r).c] : { swap: ['swap', 'blue'], overtime: ['moon', 'violet'], attendance: ['shieldok', 'amber'], doc: ['upload', 'teal'] }[r.kind]; }
function reqTitle(r) { return { leave: r.data.sub, swap: 'Pengajuan Tukar Dinas', overtime: 'Pengajuan ' + (r.data.type || 'Lembur'), attendance: 'Review Absensi', doc: 'Verifikasi ' + r.data.doc }[r.kind]; }
function reqSub(r) {
  const d = r.data;
  switch (r.kind) {
    case 'leave': return d.start === d.end ? fDate(d.start) + (d.jam ? ' · ' + d.jam : '') : `${fDate(d.start)} – ${fDate(d.end)} (${d.days} hari)`;
    case 'swap': return `${memberName(d.from)} ↔ ${memberName(d.to)} · ${fDate(d.date)}`;
    case 'overtime': return `${fDate(d.date)} · ${d.start}–${d.end}`;
    case 'attendance': return d.summary;
    case 'doc': return d.file;
  }
}
function statusPill(s) {
  const map = {
    green: ['Disetujui', 'Terverifikasi', 'Lengkap', 'Berlaku', 'Trusted', 'Selesai', 'Aktif', 'Hadir', 'Tepat waktu', 'Saat Ini', 'Published'],
    amber: ['Diproses', 'Diajukan', 'Need Review', 'Perlu Update', 'Perlu Diperbarui', 'Menunggu Verifikasi', 'Segera berakhir', 'Terlambat', 'Perlu Approval', 'Giliran Anda', 'Belum', 'Perlu Acknowledgment', 'Draft jadwal'],
    red: ['Ditolak', 'High Risk', 'Kedaluwarsa', 'Tidak hadir'],
    blue: ['Terkirim', 'Surat Baru', 'Terdaftar', 'Informasi'],
  };
  const c = Object.keys(map).find(k => map[k].includes(s)) || 'gray';
  return `<span class="pill p-${c}">${esc(s)}</span>`;
}
function rolesOk(item) { return !item.roles || item.roles.includes(me().role); }

/* ================= HTML helpers ================= */
const gp = (s, p) => `data-go="${s}"${p ? ` data-p="${esc(JSON.stringify(p))}"` : ''}`;
const act = (a, arg) => `data-act="${a}"${arg !== undefined ? ` data-arg="${esc(arg)}"` : ''}`;
function icoBox(name, c = 'green', sm) { return `<div class="ico ${sm ? 'sm' : ''} c-${c}">${ic(name, sm ? 17 : 20)}</div>`; }
function li({ icon, c, t, s, right = '', attrs = '', chev = true }) {
  return `<div class="li" ${attrs}>${icon ? icoBox(icon, c) : ''}<div class="grow"><div class="t ell">${t}</div>${s ? `<div class="s">${s}</div>` : ''}</div>${right}${chev ? `<span class="chev">${ic('chev', 18)}</span>` : ''}</div>`;
}
function note(kind, html, icon) { return `<div class="note ${kind}">${ic(icon || { info: 'info', warn: 'alert', ok: 'check', err: 'alert' }[kind], 16)}<div>${html}</div></div>`; }
function secT(t, right = '') { return `<div class="sec-t"><h3>${t}</h3>${right}</div>`; }
function fld(label, inner, req) { return `<div class="fld"><label>${label}${req ? ' <span class="req">*</span>' : ''}</label>${inner}</div>`; }
function inp(f, attrs = '') { return `<input class="inp" data-f="${f}" value="${esc(F()[f] ?? '')}" ${attrs}>`; }
function sel(f, opts, attrs = '') {
  return `<select class="inp" data-f="${f}" ${attrs}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(F()[f]) === String(v) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
}
function txt(f, attrs = '') { return `<textarea class="inp" data-f="${f}" ${attrs}>${esc(F()[f] ?? '')}</textarea>`; }
function tabs(items, cur, action) { return `<div class="tabs">${items.map(([v, l, n]) => `<button class="${cur === v ? 'on' : ''}" ${act(action, v)}>${l}${n ? `<span class="n">${n}</span>` : ''}</button>`).join('')}</div>`; }
function seg(items, cur, action) { return `<div class="seg">${items.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" ${act(action, v)}>${l}</button>`).join('')}</div>`; }
function filesBlock(files, f = 'files', label = 'Tambah File', hint = 'JPG/PNG/PDF, maks. 5 MB') {
  return `${(files || []).map((x, i) => `<div class="filechip"><span style="color:var(--red)">${ic('file', 18)}</span><div class="grow"><div class="ell">${esc(x.name)}</div><div class="xs muted">${esc(x.size)}</div></div><button class="ib" style="border:0;background:none" ${act('rmFile', f + ':' + i)}>${ic('x', 16)}</button></div>`).join('')}
  <label class="upload mt">${ic('upload', 20)}<div class="b small">${label}</div><div class="xs">${hint}</div><input type="file" hidden data-file="${f}" multiple></label>`;
}
function timeline(items) {
  return `<div class="tl">${items.map(it => `<div class="it"><div class="dot ${it.st || ''}">${it.st === 'done' ? ic('check', 11, 3) : it.st === 'rej' ? ic('x', 11, 3) : ''}</div><div class="t">${it.t}</div>${it.s ? `<div class="s">${it.s}</div>` : ''}</div>`).join('')}</div>`;
}
function stepsTimeline(r, firstLabel = 'Diajukan') {
  const items = [{ t: firstLabel + ' oleh ' + esc(memberName(r.requester || r.from)), s: fDT(r.created || r.date), st: 'done' }];
  r.steps.forEach(s => {
    const who = s.name || (s.pid ? memberName(s.pid) : '');
    if (s.status === 'done') items.push({ t: `${s.label} — Disetujui`, s: `${esc(who)} · ${fDT(s.at)}${s.note ? '<br>“' + esc(s.note) + '”' : ''}${s.sign ? '<br>TTE internal · ' + s.sign.hash.slice(0, 16) + '…' : ''}`, st: 'done' });
    else if (s.status === 'rejected') items.push({ t: `${s.label} — Ditolak`, s: `${esc(who)} · ${fDT(s.at)}${s.note ? '<br>“' + esc(s.note) + '”' : ''}`, st: 'rej' });
    else if (s.status === 'pending') items.push({ t: `Menunggu ${s.label}`, s: canActStep(s) ? '<b style="color:var(--amber)">Giliran Anda</b>' : esc(who || 'Dalam antrian'), st: 'cur' });
    else items.push({ t: `Menunggu ${s.label}`, s: '—' });
  });
  return timeline(items);
}

/* ================= Router ================= */
const SCREENS = {};
let scrollMemo = {};
function go(s, p = {}) { scrollMemo[nav.stack.length] = document.getElementById('scr')?.scrollTop || 0; nav.stack.push({ s, p }); render(true); }
function back() { if (nav.stack.length > 1) { nav.stack.pop(); render(false, scrollMemo[nav.stack.length]); } }
function tab(t, sub) { if (t === 'absen' && ui.absen?.phase === 'result') ui.absen = { phase: 'idle' }; nav.tab = t; nav.stack = [{ s: t, p: sub ? { tab: sub } : {} }]; render(true); }
function render(resetScroll, restore) {
  const prevTop = document.getElementById('scr')?.scrollTop || 0;
  if (camStream && !(curS().s === 'absen' && ui.absen?.phase === 'selfie')) stopCam();
  const cur = curS();
  const out = SCREENS[cur.s](cur.p || {});
  const hdr = out.noHeader ? '' : `<div class="hdr">${nav.stack.length > 1 ? `<button class="ib" ${act('back')} aria-label="Kembali">${ic('back', 22)}</button>` : '<span class="ph"></span>'}<h1>${out.title || ''}</h1>${out.right || '<span class="ph"></span>'}</div>`;
  $app.innerHTML = `${hdr}<div class="screen ${out.flush ? 'flush' : ''}" id="scr">${out.body}</div>${navBar()}${ui.sheet ? `<div class="ov" ${act('closeSheet')}><div class="sheet" data-stop>${'<div class="grab"></div>' + ui.sheet}</div></div>` : ''}${ui.toast ? `<div class="toast">${ic('check', 16)}${ui.toast}</div>` : ''}`;
  const scr = document.getElementById('scr');
  scr.scrollTop = resetScroll ? 0 : (restore ?? prevTop);
  while (after.length) after.shift()();
}
function navBar() {
  const n = unreadCount();
  const b = (t, label, icon) => `<button class="${nav.tab === t ? 'on' : ''}" data-tab="${t}">${ic(icon, 22)}${label}${t === 'inbox' && n ? `<span class="badge">${n}</span>` : ''}</button>`;
  return `<nav class="nav">${b('home', 'Home', 'home')}${b('jadwal', 'Jadwal', 'calendar')}<button class="${nav.tab === 'absen' ? 'on' : ''}" data-tab="absen"><span class="fab">${ic('scan', 26, 2.2)}</span>Absen</button>${b('inbox', 'Inbox', 'inbox')}${b('saya', 'Saya', 'user')}</nav>`;
}
function toast(msg) { ui.toast = msg; render(); clearTimeout(toast.t); toast.t = setTimeout(() => { ui.toast = null; render(); }, 2200); }
function sheet(html) { ui.sheet = html; render(); }
function closeSheet() { ui.sheet = null; render(); }

/* ================= Events ================= */
const A = {}; // actions
$app.addEventListener('click', e => {
  const el = e.target.closest('[data-go],[data-act],[data-tab]');
  if (!el) return;
  if (el.classList.contains('ov') && e.target.closest('.sheet')) return; // klik di dalam sheet tidak menutup
  if (el.dataset.go) { if (ui.sheet) ui.sheet = null; go(el.dataset.go, el.dataset.p ? JSON.parse(el.dataset.p) : {}); }
  else if (el.dataset.tab) { ui.sheet = null; tab(el.dataset.tab, el.dataset.tp); }
  else if (el.dataset.act) { const fn = A[el.dataset.act]; if (fn) { e.preventDefault(); fn(el.dataset.arg, el, e); } }
});
$app.addEventListener('input', e => {
  const f = e.target.dataset.f; if (!f) return;
  F()[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  if (e.target.dataset.live !== undefined) {
    const id = e.target.id, pos = e.target.selectionStart; render();
    const n = id && document.getElementById(id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { /* */ } }
  }
  if (e.target.dataset.count) { const c = document.getElementById(e.target.dataset.count); if (c) c.textContent = `${e.target.value.length}/500`; }
});
$app.addEventListener('change', e => {
  if (e.target.dataset.file) {
    const key = e.target.dataset.file; const list = (F()[key] ||= []);
    [...e.target.files].forEach(f => list.push({ name: f.name, size: f.size > 1048576 ? (f.size / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB' }));
    render(); return;
  }
  const f = e.target.dataset.f; if (!f) return;
  F()[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  if (e.target.dataset.rr !== undefined) render();
});
A.back = back;
A.closeSheet = () => closeSheet();
A.rmFile = arg => { const [k, i] = arg.split(':'); F()[k].splice(+i, 1); render(); };
A.setP = arg => { const [k, v] = arg.split('='); curS().p[k] = v; render(true); };
A.toast = arg => toast(arg);

/* ================= HOME ================= */
SCREENS.home = () => {
  const p = me(); const T = today(); const h = new Date().getHours();
  const salam = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  const a = activeShift(p.id); const sh = SHIFT[a.code]; const rs = RS[shiftLoc(p.id, a.k)];
  const ain = findAtt(p.id, a.k, 'in'), aout = findAtt(p.id, a.k, 'out');
  const work = isWork(a.code);
  const btnLabel = !ain ? 'Absen Masuk' : !aout ? 'Absen Pulang' : 'Absensi hari ini selesai';
  const unread = unreadCount();

  // Perlu Perhatian (proaktif)
  const attn = [];
  const appr = myApprovals().length + myLetterApprovals().length;
  if (appr) attn.push({ c: 'red', icon: 'check', t: `${appr} Approval`, s: 'Menunggu persetujuan Anda', attrs: `data-tab="inbox" data-tp="approval"` });
  const leg = legalFor(p.id)[0];
  if (leg) { const dd = daysBetween(T, parseYmd(leg.akhir)); attn.push({ c: 'amber', icon: 'shieldok', t: 'STR', s: `<b>${dd} hari lagi</b><br>Berlaku s.d. ${fDate(leg.akhir)}`, attrs: gp('legal') }); }
  attn.push({ c: 'blue', icon: 'cap', t: 'Pelatihan', s: '1 wajib belum selesai<br>K3RS & Bencana', attrs: gp('diklat') });
  const tk = ymd(addDays(T, 1)); const tc = shiftOf(p.id, tk);
  attn.push({ c: 'violet', icon: 'calendar', t: 'Jadwal Besok', s: isWork(tc) ? `${shiftTime(tc)}<br>Shift ${SHIFT[tc].nama}` : SHIFT[tc].nama, attrs: gp('jadwal-d', { k: tk }) });
  const ackPending = kontrakFor(p.id).filter(k => k.ack && !S.ack[p.id + k.id]);
  if (ackPending.length) attn.push({ c: 'teal', icon: 'file', t: 'SK Baru', s: 'Perlu acknowledgment', attrs: gp('kontrak-d', { id: ackPending[0].id }) });
  const myPend = S.requests.filter(r => r.requester === p.id && r.status === 'Diproses').length;
  if (myPend) attn.push({ c: 'green', icon: 'history', t: `${myPend} Pengajuan`, s: 'Sedang diproses', attrs: gp('cuti-riwayat') });

  const quick = quickList();
  const week = [...Array(7)].map((_, i) => addDays(T, i));

  return {
    noHeader: true, flush: true, body: `
    <div class="home-top">
      <div class="row"><div class="grow"><div class="logo">SIMPEGRS<sup>v2.0</sup></div><div class="xs muted">${esc(RS[p.rs].nama)}</div></div>
        <button class="ib" style="position:relative" data-tab="inbox" aria-label="Notifikasi">${ic('bell', 22)}${unread ? `<span class="badge" style="right:-2px;top:-2px">${unread}</span>` : ''}</button>
        <div class="avatar" data-tab="saya" style="cursor:pointer">${p.ini}</div></div>
      <div class="mt"><div class="small muted">${salam},</div><div class="b" style="font-size:18px">${esc(p.nama)}</div><div class="small muted">${fDateLong(new Date())}</div></div>
      <div class="hero">
        <div class="lbl">${ic('calendar', 14)} ${a.k !== ymd(T) ? 'Shift aktif (mulai kemarin)' : 'Shift Hari Ini'} <span style="flex:1"></span><span data-tab="jadwal" style="cursor:pointer;font-weight:600">Lihat Jadwal ›</span></div>
        ${work ? `<div class="big">${shiftTime(a.code)}</div><div class="small" style="opacity:.9">${sh.nama} · ${esc(p.unit)} · ${esc(rs.nama)}</div>`
        : `<div class="big">${sh.nama}</div><div class="small" style="opacity:.9">Tidak ada jadwal kerja hari ini. Selamat beristirahat.</div>`}
        <div class="att"><div>Masuk<b>${ain ? fTime(ain.at) : '—'}</b>${ain ? `<span class="xs">${ain.status}</span>` : ''}</div><div>Pulang<b>${aout ? fTime(aout.at) : '—'}</b>${aout ? `<span class="xs">${aout.status}</span>` : ''}</div></div>
        <button class="btn" data-tab="absen" ${ain && aout ? 'disabled' : ''}>${ic('scan', 18)} ${btnLabel}</button>
      </div>
    </div>
    <div style="padding:0 14px">
      ${secT('Perlu Perhatian', `<a data-tab="inbox">Lihat Semua ›</a>`)}
      <div class="attn">${attn.slice(0, 4).map(x => `<div class="a c-${x.c}" ${x.attrs}>${ic(x.icon, 18)}<div><b>${x.t}</b><span>${x.s}</span></div></div>`).join('')}</div>
      ${secT('Akses Cepat', `<a ${gp('quick-edit')}>Atur ›</a>`)}
      <div class="qa">${quick.map(id => { const q = QUICK[id]; return `<button ${q.tab ? `data-tab="${q.tab}"${q.tabParam ? ` data-tp="${q.tabParam}"` : ''}` : gp(q.go[0], q.go[1])}>${icoBox(q.icon, q.c, true)}${q.nama}</button>`; }).join('')}</div>
      ${secT('Jadwal 7 Hari', `<a data-tab="jadwal">Kalender ›</a>`)}
      <div class="week">${week.map((d, i) => { const k = ymd(d), c = shiftOf(p.id, k); return `<div class="day ${i === 0 ? 'today' : ''}" ${gp('jadwal-d', { k })}><div class="d">${HR3[d.getDay()]}</div><div class="n">${d.getDate()}</div>${shiftChip(c)}</div>`; }).join('')}</div>
      ${secT('Informasi Terbaru')}
      <div class="card row top" ${act('toast', 'Detail informasi (dummy)')} style="cursor:pointer">${icoBox('bell', 'green')}<div class="grow"><div class="b">Informasi SDM</div><div class="small muted">Pembaruan kebijakan cuti bersama akhir tahun & batas pengajuan.</div></div></div>
      <div class="card row top" ${gp('diklat')} style="cursor:pointer">${icoBox('cap', 'blue')}<div class="grow"><div class="b">Informasi Pelatihan</div><div class="small muted">Pelatihan K3RS & Kewaspadaan Bencana dibuka. Kuota 40 peserta per cabang.</div></div></div>
    </div>` };
};
function quickList() {
  const saved = S.quick[S.persona];
  const list = saved || QUICK_DEFAULT[me().role];
  return list.filter(id => QUICK[id] && rolesOk(QUICK[id]));
}

/* Akses Cepat editor */
SCREENS['quick-edit'] = () => {
  const cur = quickList();
  const avail = Object.keys(QUICK).filter(id => !cur.includes(id) && rolesOk(QUICK[id]));
  return {
    title: 'Atur Akses Cepat', body: `
    ${note('info', 'Akses Cepat bersifat personal. Pilih, hapus, dan urutkan sesuai kebutuhan Anda. Default mengikuti peran: <b>' + ROLES[me().role] + '</b>.')}
    <div class="grp-t">DITAMPILKAN (${cur.length}/8)</div>
    <div class="card tight">${cur.map((id, i) => `<div class="li" style="cursor:default">${icoBox(QUICK[id].icon, QUICK[id].c, true)}<div class="grow t">${QUICK[id].nama}</div>
      <button class="btn ghost sm" ${act('qMove', id + ':-1')} ${i === 0 ? 'disabled' : ''}>${ic('up', 14)}</button>
      <button class="btn ghost sm" ${act('qMove', id + ':1')} ${i === cur.length - 1 ? 'disabled' : ''}>${ic('down', 14)}</button>
      <button class="btn danger sm" ${act('qDel', id)}>${ic('x', 14)}</button></div>`).join('')}</div>
    <div class="grp-t">TERSEDIA</div>
    <div class="card tight">${avail.length ? avail.map(id => `<div class="li" ${act('qAdd', id)}>${icoBox(QUICK[id].icon, QUICK[id].c, true)}<div class="grow t">${QUICK[id].nama}</div><span class="pill p-green">${ic('plus', 12)} Tambah</span></div>`).join('') : '<div class="empty">Semua menu sudah ditambahkan</div>'}</div>
    <button class="btn ghost block mt" ${act('qReset')}>${ic('refresh', 16)} Kembalikan ke default peran</button>` };
};
A.qMove = arg => { const [id, d] = arg.split(':'); const l = [...quickList()]; const i = l.indexOf(id); const j = i + Number(d); [l[i], l[j]] = [l[j], l[i]]; S.quick[S.persona] = l; save(); render(); };
A.qDel = id => { S.quick[S.persona] = quickList().filter(x => x !== id); save(); render(); };
A.qAdd = id => { const l = quickList(); if (l.length >= 8) return toast('Maksimal 8 menu. Hapus salah satu terlebih dahulu.'); S.quick[S.persona] = [...l, id]; save(); render(); };
A.qReset = () => { delete S.quick[S.persona]; save(); toast('Akses Cepat dikembalikan ke default'); };

/* ================= JADWAL ================= */
SCREENS.jadwal = p => {
  const pid = S.persona; const mode = p.mode || 'minggu'; const sel = p.sel || ymd(today());
  const selD = parseYmd(sel);
  const canTeam = ['kepala_unit', 'direksi'].includes(me().role);
  let view = '';
  if (mode === 'bulan') {
    const first = new Date(selD.getFullYear(), selD.getMonth(), 1); const start = addDays(first, -first.getDay());
    view = `<div class="row mb"><button class="btn ghost sm" ${act('jadMonth', -1)}>${ic('back', 14)}</button><div class="grow b" style="text-align:center">${BULAN[selD.getMonth()]} ${selD.getFullYear()}</div><button class="btn ghost sm" ${act('jadMonth', 1)}>${ic('chev', 14)}</button></div>
    <div class="month">${HR3.map(x => `<div class="h">${x}</div>`).join('')}${[...Array(42)].map((_, i) => { const d = addDays(start, i), k = ymd(d); return `<div class="c ${d.getMonth() !== selD.getMonth() ? 'out' : ''} ${k === ymd(today()) ? 'today' : ''}" ${act('jadSel', k)}><div class="n">${d.getDate()}</div>${shiftChip(shiftOf(pid, k))}</div>`; }).join('')}</div>
    <div class="chips mt">${['P', 'S', 'M', 'O', 'DL', 'L', 'C', 'I'].map(c => `<span class="row xs" style="gap:4px">${shiftChip(c)} ${SHIFT[c].nama}</span>`).join('')}</div>`;
  } else {
    const ws = addDays(selD, -((selD.getDay() + 6) % 7));
    const days = [...Array(7)].map((_, i) => addDays(ws, i));
    view = `<div class="row mb"><button class="btn ghost sm" ${act('jadWeek', -7)}>${ic('back', 14)}</button><div class="grow b" style="text-align:center">${fDate(days[0])} – ${fDate(days[6])}</div><button class="btn ghost sm" ${act('jadWeek', 7)}>${ic('chev', 14)}</button></div>
    <div class="week">${days.map(d => { const k = ymd(d); return `<div class="day ${k === ymd(today()) ? 'today' : ''} ${k === sel ? 'sel' : ''}" ${act('jadSel', k)}><div class="d">${HR3[d.getDay()]}</div><div class="n">${d.getDate()}</div>${shiftChip(shiftOf(pid, k))}</div>`; }).join('')}</div>
    <div class="mt">${dayDetail(pid, sel, mode === 'hari')}</div>
    ${mode === 'minggu' ? `<div class="card tight">${days.map(d => { const k = ymd(d), c = shiftOf(pid, k); return li({ icon: null, t: `${HARI[d.getDay()]}, ${d.getDate()} ${BLN3[d.getMonth()]}`, s: isWork(c) ? `${SHIFT[c].nama} · ${shiftTime(c)} · ${RS[shiftLoc(pid, k)].nama}` : SHIFT[c].nama, right: shiftChip(c), attrs: gp('jadwal-d', { k }) }); }).join('')}</div>` : ''}`;
  }
  return {
    title: 'Jadwal', right: `<button class="ib" ${gp('jadwal-info')} aria-label="Info">${ic('info', 20)}</button>`, body: `
    <div class="note ok">${ic('check', 16)}<div>Jadwal ${BULAN[today().getMonth()]} <b>Published</b> · ${fDT(S.teamPublishedAt)}. Pola kerja: <b>${me().pola === 'shift' ? 'Shift' : 'Non-shift'}</b>.</div></div>
    ${seg([['hari', 'Hari'], ['minggu', 'Minggu'], ['bulan', 'Bulan']], mode, 'jadMode')}
    ${view}
    <div class="qa mt" style="grid-template-columns:repeat(${canTeam ? 4 : 3},1fr)">
      <button ${gp('tukar')}>${icoBox('swap', 'blue', true)}Tukar Dinas</button>
      <button ${gp('lembur')}>${icoBox('moon', 'violet', true)}Lembur</button>
      <button ${gp('cuti')}>${icoBox('umbrella', 'green', true)}Cuti & Izin</button>
      ${canTeam ? `<button ${gp('team')}>${icoBox('users', 'teal', true)}Jadwal Tim</button>` : ''}
    </div>` };
};
A.jadMode = v => { curS().p.mode = v; render(); };
A.jadSel = k => { curS().p.sel = k; if (curS().p.mode === 'bulan') { go('jadwal-d', { k }); return; } render(); };
A.jadWeek = n => { curS().p.sel = ymd(addDays(parseYmd(curS().p.sel || ymd(today())), +n)); render(); };
A.jadMonth = n => { const d = parseYmd(curS().p.sel || ymd(today())); curS().p.sel = ymd(new Date(d.getFullYear(), d.getMonth() + Number(n), 1)); render(); };

function dayDetail(pid, k, full) {
  const c = shiftOf(pid, k); const sh = SHIFT[c]; const rs = RS[shiftLoc(pid, k)]; const w = shiftWindow(c, k);
  const mates = TEAM.filter(t => t.id !== pid && shiftOf(t.id, k) === c && isWork(c)).map(t => t.nama);
  const ain = findAtt(pid, k, 'in'), aout = findAtt(pid, k, 'out');
  const future = k >= ymd(today());
  return `<div class="card">
    <div class="row">${shiftChip(c)}<div class="grow"><div class="b">${sh.nama}${isWork(c) ? ' · ' + shiftTime(c) : ''}</div><div class="small muted">${fDateLong(parseYmd(k))}</div></div></div>
    ${isWork(c) ? `<div class="kv mt">
      <div class="k">Mulai</div><div class="v">${fDT(w.st)}</div>
      <div class="k">Selesai</div><div class="v">${fDT(w.en)}${sh.cross ? ' <span class="pill p-violet">lintas tanggal</span>' : ''}</div>
      <div class="k">Lokasi</div><div class="v">${esc(rs.nama)}${rs.kode !== RS[me().rs].kode ? ' <span class="pill p-blue">lintas cabang</span>' : ''}</div>
      <div class="k">Unit</div><div class="v">${esc(me().unit)}</div>
      <div class="k">Grace period</div><div class="v">${GRACE_MIN} menit</div>
      ${mates.length ? `<div class="k">Rekan 1 shift</div><div class="v">${mates.slice(0, 4).join(', ')}${mates.length > 4 ? ` +${mates.length - 4}` : ''}</div>` : ''}
      ${me().unit === 'ICU' ? `<div class="k">PIC / Karu</div><div class="v">Ns. Andi Pratama</div>` : ''}
      <div class="k">Absensi</div><div class="v">${ain ? `Masuk ${fTime(ain.at)} ${statusPill(ain.status)}` : '—'}${aout ? `<br>Pulang ${fTime(aout.at)}` : ''}</div>
    </div>` : `<div class="small muted mt">${c === 'L' ? 'Hari libur sesuai jadwal.' : 'Tercatat dari pengajuan Cuti & Izin yang disetujui.'}</div>`}
    ${full || future ? `<div class="btn-row mt">${isWork(c) && future && me().pola === 'shift' ? `<button class="btn sec sm" ${gp('tukar-new', { k })}>${ic('swap', 14)} Tukar Dinas</button>` : ''}${future ? `<button class="btn ghost sm" ${gp('cuti')}>${ic('umbrella', 14)} Ajukan Cuti/Izin</button>` : ''}</div>` : ''}
  </div>`;
}
SCREENS['jadwal-d'] = p => ({ title: 'Detail Jadwal', body: dayDetail(S.persona, p.k, true) + note('info', 'Jadwal adalah <b>source of truth</b>: absensi, cuti/izin, tukar dinas, lembur, dan coverage tenaga membaca data yang sama.') });
SCREENS['jadwal-info'] = () => ({
  title: 'Tentang Jadwal & Shift', body: `<div class="card"><div class="b mb">Master shift ${esc(RS[me().rs].nama)}</div>${['P', 'S', 'M', 'O', 'DL', 'OC'].map(c => `<div class="row" style="padding:6px 0">${shiftChip(c)}<div class="grow">${SHIFT[c].nama}</div><div class="small muted">${shiftTime(c)}</div></div>`).join('')}</div>
  <div class="card small">
    <div class="b mb">Aturan configurable</div>
    <div>• Grace period keterlambatan: ${GRACE_MIN} menit</div>
    <div>• Coverage minimum ICU: Pagi ${COVERAGE_MIN.P}, Siang ${COVERAGE_MIN.S}, Malam ${COVERAGE_MIN.M}</div>
    <div>• Shift malam memakai start_datetime / end_datetime (lintas tanggal)</div>
    <div>• Lifecycle jadwal: Draft → Validasi → Publish → Perubahan (teraudit)</div>
    <div>• Pola kerja: non-shift, shift, jadwal khusus, on-call, dinas luar, extra shift/lembur</div>
  </div>` });

/* Tukar Dinas */
SCREENS.tukar = () => {
  const pid = S.persona;
  const mine = S.requests.filter(r => r.kind === 'swap' && (r.requester === pid || r.data.to === pid));
  return {
    title: 'Tukar Dinas', body: `
    ${me().pola !== 'shift' ? note('info', 'Pola kerja Anda <b>non-shift</b>. Tukar dinas berlaku untuk pegawai shift — ganti persona ke <b>Siti (Perawat ICU)</b> di Pengaturan untuk mencoba.') : ''}
    ${note('ok', 'Jadwal resmi baru berubah setelah semua approval terpenuhi: <b>rekan → kepala unit</b>. Eligibility dicek otomatis.')}
    <button class="btn pri block mb" ${gp('tukar-new')} ${me().pola !== 'shift' ? 'disabled' : ''}>${ic('plus', 18)} Ajukan Tukar Dinas</button>
    ${secT('Riwayat & Permintaan')}
    <div class="card tight">${mine.length ? mine.map(r => li({ icon: 'swap', c: 'blue', t: r.requester === pid ? 'Permintaan saya' : `Permintaan dari ${esc(memberName(r.requester))}`, s: reqSub(r), right: statusPill(r.status === 'Diproses' && canActStep(curStep(r)) ? 'Giliran Anda' : r.status), attrs: gp('req-d', { id: r.id }) })).join('') : '<div class="empty">Belum ada pengajuan tukar dinas</div>'}</div>` };
};
function eligibility(me_, other, k) {
  const myC = teamShift(me_, k), oC = teamShift(other.id, k);
  const prev = ymd(addDays(parseYmd(k), -1)), next = ymd(addDays(parseYmd(k), 1));
  const restOk = (id, newC) => !((shiftOf(id, prev) === 'M' && newC === 'P') || (newC === 'M' && shiftOf(id, next) === 'P'));
  const checks = [
    { t: 'Unit sama (ICU)', ok: true },
    { t: 'Kompetensi setara (ICU Dasar)', ok: other.komp.includes('ICU Dasar') && !other.komp.includes('Orientasi') },
    { t: 'Rekan tidak cuti/izin', ok: !['C', 'I'].includes(oC) },
    { t: 'Shift berbeda', ok: oC !== myC },
    { t: 'Waktu istirahat cukup (tidak Malam → Pagi)', ok: restOk(other.id, myC) && restOk(me_, oC) },
  ];
  return { checks, ok: checks.every(c => c.ok), oC };
}
SCREENS['tukar-new'] = p => {
  const pid = S.persona; const f = F();
  if (!f.k) f.k = p.k || '';
  const opts = [...Array(14)].map((_, i) => ymd(addDays(today(), i + 1))).filter(k => isWork(shiftOf(pid, k)));
  let cand = '';
  if (f.k) {
    const myC = shiftOf(pid, f.k);
    cand = `${secT('Pilih rekan pengganti')}${note('info', `Shift Anda: <b>${SHIFT[myC].nama} ${shiftTime(myC)}</b>. Rekan yang eligible ditampilkan di atas.`)}
    ${TEAM.filter(t => t.id !== pid && !t.kepala).map(t => ({ t, e: eligibility(pid, t, f.k) })).sort((a, b) => b.e.ok - a.e.ok).map(({ t, e }) => `
      <div class="card" style="${f.to === t.id ? 'outline:2px solid var(--g-600)' : ''};${e.ok ? 'cursor:pointer' : 'opacity:.6'}" ${e.ok ? act('pickSwap', t.id) : ''}>
        <div class="row"><div class="avatar">${t.nama.split(' ').map(x => x[0]).join('').slice(0, 2)}</div><div class="grow"><div class="b">${t.nama}</div><div class="small muted">Jadwal: ${SHIFT[e.oC].nama} ${isWork(e.oC) ? shiftTime(e.oC) : ''}</div></div>${e.ok ? '<span class="pill p-green">Eligible</span>' : '<span class="pill p-red">Tidak eligible</span>'}</div>
        <div class="xs mt" style="display:grid;gap:2px">${e.checks.map(c => `<span style="color:${c.ok ? 'var(--g-700)' : 'var(--red)'}">${c.ok ? '✓' : '✗'} ${c.t}</span>`).join('')}</div>
      </div>`).join('')}
    ${f.to ? `${fld('Alasan', txt('reason', 'placeholder="Contoh: ada keperluan keluarga"'), true)}<button class="btn pri block" ${act('submitSwap')}>${ic('send', 16)} Kirim Pengajuan</button>` : ''}`;
  }
  return {
    title: 'Ajukan Tukar Dinas', body: `
    ${fld('Tanggal dinas yang ingin ditukar', sel('k', [['', '— Pilih tanggal —'], ...opts.map(k => [k, `${HARI[parseYmd(k).getDay()]}, ${fDate(k)} · ${SHIFT[shiftOf(pid, k)].nama}`])], 'data-rr'), true)}
    ${cand}` };
};
A.pickSwap = id => { F().to = id; render(); };
A.submitSwap = () => {
  const f = F(); if (!f.reason?.trim()) return toast('Alasan wajib diisi');
  const toPersona = !!PERSONAS[f.to];
  const r = { id: uid('r'), kind: 'swap', requester: S.persona, created: new Date().toISOString(), status: 'Diproses', data: { date: f.k, from: S.persona, to: f.to, reason: f.reason },
    steps: [toPersona ? { label: 'Persetujuan rekan', pid: f.to, status: 'pending' } : { label: 'Persetujuan rekan', name: memberName(f.to), status: 'done', at: new Date().toISOString(), note: 'Disetujui via aplikasi (simulasi)' },
      { label: 'Kepala Unit', roles: ['kepala_unit'], status: toPersona ? 'waiting' : 'pending' }] };
  S.requests.unshift(r); save();
  nav.stack = [{ s: 'jadwal', p: {} }, { s: 'tukar', p: {} }]; nav.tab = 'jadwal';
  go('req-d', { id: r.id }); toast('Pengajuan tukar dinas terkirim');
};

/* Lembur / Extra shift */
SCREENS.lembur = () => {
  const mine = S.requests.filter(r => r.kind === 'overtime' && r.requester === S.persona);
  return {
    title: 'Lembur & Extra Shift', body: `
    ${note('info', 'Lembur/extra shift terhubung ke approval dan <b>Trusted Attendance</b>: absen lembur divalidasi terhadap jam yang disetujui, lalu dikirim ke Payroll sebagai variable pay.')}
    <button class="btn pri block mb" ${gp('lembur-new')}>${ic('plus', 18)} Ajukan Lembur / Extra Shift</button>
    ${secT('Riwayat')}
    <div class="card tight">${mine.length ? mine.map(r => li({ icon: 'moon', c: 'violet', t: reqTitle(r), s: reqSub(r), right: statusPill(r.status), attrs: gp('req-d', { id: r.id }) })).join('') : '<div class="empty">Belum ada pengajuan lembur</div>'}</div>` };
};
SCREENS['lembur-new'] = () => {
  const f = F(); f.type ||= 'Lembur'; f.date ||= ymd(today()); f.start ||= '16:00'; f.end ||= '18:00';
  return {
    title: 'Ajukan Lembur', body: `
    ${fld('Jenis', sel('type', ['Lembur', 'Extra Shift']), true)}
    ${fld('Tanggal', inp('date', 'type="date"'), true)}
    <div class="two">${fld('Mulai', inp('start', 'type="time"'), true)}${fld('Selesai', inp('end', 'type="time"'), true)}</div>
    ${fld('Alasan / uraian pekerjaan', txt('reason', 'placeholder="Contoh: menyelesaikan laporan akreditasi"'), true)}
    <button class="btn pri block" ${act('submitOT')}>${ic('send', 16)} Ajukan</button>` };
};
A.submitOT = () => {
  const f = F(); if (!f.reason?.trim()) return toast('Alasan wajib diisi');
  const step = me().atasan ? { label: 'Atasan Langsung', pid: me().atasan, status: 'pending' } : { label: 'HRD', roles: ['hr'], status: 'pending' };
  const r = { id: uid('r'), kind: 'overtime', requester: S.persona, created: new Date().toISOString(), status: 'Diproses', data: { date: f.date, start: f.start, end: f.end, reason: f.reason, type: f.type }, steps: [me().role === 'pegawai' ? { label: 'Kepala Unit', roles: ['kepala_unit'], status: 'pending' } : step] };
  S.requests.unshift(r); save(); back(); toast('Pengajuan lembur terkirim');
};

/* Jadwal Tim (kepala unit) */
SCREENS.team = p => {
  const w = Number(p.w || 0);
  const ws = addDays(today(), w * 7);
  const days = [...Array(7)].map((_, i) => ymd(addDays(ws, i)));
  const draftN = Object.values(S.teamDraft).reduce((a, o) => a + Object.keys(o).length, 0);
  const cov = days.map(k => { const o = { P: 0, S: 0, M: 0 }; TEAM.forEach(t => { const c = teamShift(t.id, k); if (o[c] !== undefined) o[c]++; }); return o; });
  const { errors, warns } = validateTeam(days);
  return {
    title: 'Jadwal Tim — ICU', body: `
    <div class="card row"><div class="grow"><div class="b">${draftN ? 'Draft perubahan' : 'Jadwal aktif'}</div><div class="small muted">${draftN ? `${draftN} perubahan belum dipublikasikan` : 'Published ' + fDT(S.teamPublishedAt)}</div></div>${draftN ? statusPill('Draft jadwal') : statusPill('Published')}</div>
    <div class="row mb"><button class="btn ghost sm" ${act('teamW', w - 1)}>${ic('back', 14)}</button><div class="grow b" style="text-align:center">${fDate(days[0])} – ${fDate(days[6])}</div><button class="btn ghost sm" ${act('teamW', w + 1)}>${ic('chev', 14)}</button></div>
    <div class="tgrid"><table><thead><tr><th>Pegawai</th>${days.map(k => { const d = parseYmd(k); return `<th class="xs">${HR3[d.getDay()]}<br>${d.getDate()}</th>`; }).join('')}</tr></thead><tbody>
      ${TEAM.map(t => `<tr><td class="small">${t.nama.split(' ')[0]} ${t.nama.split(' ')[1]?.[0] || ''}.${t.kepala ? ' <span class="xs muted">(Karu)</span>' : ''}</td>${days.map(k => `<td><span ${act('teamCell', t.id + '|' + k)}>${shiftChip(teamShift(t.id, k), S.teamDraft[t.id]?.[k] ? 'edited' : '')}</span></td>`).join('')}</tr>`).join('')}
      ${['P', 'S', 'M'].map(c => `<tr class="cov"><td>Coverage ${SHIFT[c].nama} (min ${COVERAGE_MIN[c]})</td>${cov.map(o => `<td style="color:${o[c] < COVERAGE_MIN[c] ? 'var(--red)' : 'var(--g-700)'}">${o[c]}${o[c] < COVERAGE_MIN[c] ? '⚠' : ''}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>
    <div class="xs muted mt">Ketuk sel untuk mengubah shift (masuk ke draft).</div>
    ${secT('Validation Engine')}
    ${errors.length ? errors.map(e => note('err', `<b>Error:</b> ${e}`)).join('') : ''}
    ${warns.length ? warns.map(x => `<div class="note warn">${ic('alert', 16)}<div class="grow"><b>Warning:</b> ${x.msg}</div><button class="btn sec sm" ${act('findSub', x.k + '|' + x.c)}>Cari Pengganti</button></div>`).join('') : ''}
    ${!errors.length && !warns.length ? note('ok', '<b>OK:</b> coverage cukup & tidak ada konflik istirahat.') : ''}
    <div class="btn-row mt"><button class="btn ghost" ${act('teamDiscard')} ${draftN ? '' : 'disabled'}>Buang Draft</button><button class="btn pri" ${act('teamPublish')} ${draftN ? '' : 'disabled'}>${ic('send', 16)} Publish</button></div>
    ${secT('Pengajuan tim menunggu', `<a data-tab="inbox" data-tp="approval">Inbox ›</a>`)}
    <div class="card tight">${S.requests.filter(r => r.status === 'Diproses' && ['swap', 'leave', 'overtime'].includes(r.kind) && TEAM.some(t => t.id === r.requester)).map(r => li({ icon: reqIcon(r)[0], c: reqIcon(r)[1], t: `${reqTitle(r)} — ${esc(memberName(r.requester))}`, s: reqSub(r), attrs: gp('req-d', { id: r.id }) })).join('') || '<div class="empty">Tidak ada</div>'}</div>
    ${secT('Audit perubahan jadwal')}
    <div class="card small">${(S.schedAudit || []).slice(0, 6).map(a => `<div style="padding:4px 0;border-bottom:1px solid var(--line)"><b>${esc(a.by)}</b> · ${fDT(a.at)}<br>${esc(a.msg)}</div>`).join('') || '<span class="muted">Belum ada perubahan sejak publish terakhir.</span>'}</div>` };
};
function validateTeam(days) {
  const errors = [], warns = [];
  days.forEach(k => {
    const o = { P: 0, S: 0, M: 0 }; TEAM.forEach(t => { const c = teamShift(t.id, k); if (o[c] !== undefined) o[c]++; });
    ['P', 'S', 'M'].forEach(c => { if (o[c] < COVERAGE_MIN[c]) warns.push({ k, c, msg: `${HR3[parseYmd(k).getDay()]} ${fDate(k)} shift ${SHIFT[c].nama}: ${o[c]}/${COVERAGE_MIN[c]} tenaga` }); });
    const prev = ymd(addDays(parseYmd(k), -1));
    TEAM.forEach(t => { if (teamShift(t.id, prev) === 'M' && teamShift(t.id, k) === 'P') errors.push(`${t.nama}: Malam ${fDate(prev)} lalu Pagi ${fDate(k)} (istirahat < 11 jam)`); });
  });
  return { errors, warns: warns.slice(0, 5) };
}
A.teamW = w => { curS().p.w = Number(w); render(true); };
A.teamCell = arg => {
  const [id, k] = arg.split('|');
  sheet(`<h3>${esc(TEAM.find(t => t.id === id).nama)} · ${fDate(k)}</h3><div class="small muted mb">Perubahan masuk ke <b>draft</b> dan baru berlaku setelah Publish.</div>
  <div class="chips">${['P', 'S', 'M', 'O', 'OC', 'L'].map(c => `<button class="chip ${teamShift(id, k) === c ? 'on' : ''}" ${act('teamSet', id + '|' + k + '|' + c)}>${shiftChip(c)} ${SHIFT[c].nama}</button>`).join('')}</div>`);
};
A.teamSet = arg => {
  const [id, k, c] = arg.split('|');
  if (c === shiftOf(id, k)) { if (S.teamDraft[id]) delete S.teamDraft[id][k]; } else (S.teamDraft[id] ||= {})[k] = c;
  ui.sheet = null; save(); render();
};
A.findSub = arg => {
  const [k, c] = arg.split('|'); const prev = ymd(addDays(parseYmd(k), -1)), next = ymd(addDays(parseYmd(k), 1));
  const cands = TEAM.filter(t => !t.kepala && teamShift(t.id, k) === 'L' && !(teamShift(t.id, prev) === 'M' && c === 'P') && !(c === 'M' && teamShift(t.id, next) === 'P') && !t.komp.includes('Orientasi'))
    .map(t => ({ t, load: [...Array(7)].filter((_, i) => isWork(teamShift(t.id, ymd(addDays(parseYmd(k), i - 3))))).length })).sort((a, b) => a.load - b.load);
  sheet(`<h3>Cari Pengganti — ${SHIFT[c].nama}, ${fDate(k)}</h3>${note('info', 'Rekomendasi otomatis berdasarkan unit, kompetensi, jadwal kosong, istirahat, dan beban kerja. <b>Keputusan tetap oleh kepala unit.</b>')}
  ${cands.length ? cands.map(({ t, load }, i) => `<div class="li" style="padding:10px 0">${i === 0 ? '<span class="pill p-green">Terbaik</span>' : ''}<div class="grow"><div class="t">${t.nama}</div><div class="s">Libur hari itu · ${load} shift dalam ±3 hari · ${t.komp.join(', ')}</div></div><button class="btn pri sm" ${act('teamSet', t.id + '|' + k + '|' + c)}>Tugaskan</button></div>`).join('') : '<div class="empty">Tidak ada kandidat yang memenuhi aturan. Pertimbangkan extra shift/lembur.</div>'}`);
};
A.teamDiscard = () => { S.teamDraft = {}; save(); toast('Draft dibuang'); };
A.teamPublish = () => {
  const days = Object.values(S.teamDraft).flatMap(o => Object.keys(o));
  const { errors } = validateTeam([...new Set(days)]);
  if (errors.length && !confirm('Ada error validasi. Publish dengan override? Alasan akan dicatat di audit trail.')) return;
  const by = me().nama; const at = new Date().toISOString(); S.schedAudit ||= [];
  Object.entries(S.teamDraft).forEach(([id, o]) => Object.entries(o).forEach(([k, c]) => {
    S.schedAudit.unshift({ by, at, msg: `${memberName(id)} ${fDate(k)}: ${SHIFT[shiftOf(id, k)].nama} → ${SHIFT[c].nama}${errors.length ? ' (override)' : ''}` });
    setShift(id, k, c);
    if (PERSONAS[id]) notify(id, 'sistem', 'Jadwal Anda diperbarui', `${fDate(k)}: ${SHIFT[c].nama} ${shiftTime(c)}`, { screen: 'jadwal-d', p: { k } });
  }));
  S.teamDraft = {}; S.teamPublishedAt = at; save(); toast('Jadwal dipublikasikan & pegawai dinotifikasi');
};

/* ================= ABSEN — Trusted Attendance ================= */
const SCENARIOS = {
  normal: 'Normal — di area RS',
  outside: 'Di luar geofence',
  mock: 'Fake GPS / mock location',
  newdev: 'Perangkat baru (belum terdaftar)',
  face: 'Wajah tidak cocok',
  sharing: 'Titip absen (device sharing)',
  rooted: 'Perangkat root / emulator',
};
let camStream = null;
function stopCam() { try { camStream?.getTracks().forEach(t => t.stop()); } catch (e) { /* */ } camStream = null; }

SCREENS.absen = () => {
  ui.absen ||= { phase: 'idle' };
  const st = ui.absen; const p = me();
  const a = activeShift(p.id); const rs = RS[shiftLoc(p.id, a.k)];
  const ain = findAtt(p.id, a.k, 'in'), aout = findAtt(p.id, a.k, 'out');
  const type = !ain ? 'in' : !aout ? 'out' : null;
  if (st.phase === 'selfie') return absenSelfie(st);
  if (st.phase === 'verify') return absenVerify(st);
  if (st.phase === 'result') return absenResult(st);
  after.push(startClock);
  return {
    title: 'Absensi', right: `<button class="ib" ${gp('rekap')} aria-label="Rekap">${ic('history', 20)}</button>`, body: `
    <div class="card" style="text-align:center">
      <div class="small muted">${fDateLong(new Date())}</div>
      <div class="clock" id="clock">${fTime(new Date())}</div>
      <div class="xs muted">Waktu server (WIB) · jam perangkat tidak dipakai</div>
      <button class="absen-btn" ${act('absenStart', type)} ${type ? '' : 'disabled'}><div>${ic('finger', 46, 1.6)}${type === 'in' ? 'Absen Masuk' : type === 'out' ? 'Absen Pulang' : 'Selesai'}</div></button>
      <div class="small"><b>${isWork(a.code) ? `Shift ${SHIFT[a.code].nama} · ${shiftTime(a.code)}` : 'Tidak ada jadwal kerja hari ini'}</b></div>
      <div class="xs muted">${esc(rs.nama)} · radius ${rs.radius} m</div>
    </div>
    <div class="card"><div class="row"><div class="grow"><div class="small muted">Masuk</div><div class="b">${ain ? fTime(ain.at) : '—'}</div>${ain ? statusPill(ain.status) : ''}</div><div class="grow"><div class="small muted">Pulang</div><div class="b">${aout ? fTime(aout.at) : '—'}</div>${aout ? statusPill(aout.status) : ''}</div>
      ${ain ? `<button class="btn ghost sm" ${gp('att-d', { id: (aout || ain).id })}>Audit</button>` : ''}</div></div>
    <div class="card">
      <div class="row mb">${icoBox('shieldok', 'green', true)}<div class="grow"><div class="b">Trusted Attendance</div><div class="xs muted">Tap → selfie → selesai. Verifikasi berjalan di belakang layar.</div></div></div>
      <div class="chips">${['Geofence GPS', 'Device binding', 'Live selfie', 'Liveness', 'Face match', 'Anti mock-location', 'Integritas perangkat', 'Wi-Fi RS', 'Server time', 'Risk engine'].map(x => `<span class="chip">${x}</span>`).join('')}</div>
    </div>
    <div class="card" style="border:1.5px dashed var(--amber)">
      <div class="b small">Mode Demo — skenario simulasi</div><div class="xs muted mb">Pilih kondisi untuk melihat bagaimana risk engine bereaksi.</div>
      <select class="inp" ${'data-scn'}>${Object.entries(SCENARIOS).map(([k, v]) => `<option value="${k}" ${S.scenario === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      ${ain || aout ? `<button class="btn ghost sm mt" ${act('absenResetToday')}>${ic('refresh', 14)} Hapus absensi hari ini (demo)</button>` : ''}
    </div>` };
};
$app.addEventListener('change', e => { if (e.target.matches('[data-scn]')) { S.scenario = e.target.value; save(); } });
let clockT;
function startClock() {
  clearInterval(clockT);
  clockT = setInterval(() => { const c = document.getElementById('clock'); if (c) c.textContent = fTime(new Date()); else clearInterval(clockT); }, 1000);
}
A.absenStart = type => { ui.absen = { phase: 'selfie', type, scenario: S.scenario }; render(true); };
A.absenResetToday = () => {
  const a = activeShift(S.persona);
  S.attendance = S.attendance.filter(x => !(x.pid === S.persona && x.date === a.k));
  S.requests = S.requests.filter(r => !(r.kind === 'attendance' && r.requester === S.persona && r.data.date === a.k));
  save(); toast('Absensi hari ini dihapus (demo)');
};
function absenSelfie(st) {
  after.push(async () => {
    const v = document.getElementById('cam');
    if (!v || st.camFail) return;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('no cam');
      camStream = camStream || await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 480 }, audio: false });
      v.srcObject = camStream; await v.play();
      const ph = document.getElementById('camph'); if (ph) ph.remove();
    } catch (e) { st.camFail = true; render(); }
  });
  return {
    title: st.type === 'in' ? 'Absen Masuk' : 'Absen Pulang', body: `
    <div style="text-align:center">
      <div class="b">Live selfie</div><div class="small muted">Posisikan wajah di dalam lingkaran, lalu kedipkan mata.</div>
      <div class="selfie">${st.camFail ? `<div class="avatar lg" style="width:120px;height:120px;font-size:40px">${me().ini}</div>` : `<video id="cam" playsinline muted></video><div id="camph" class="avatar lg" style="position:absolute;width:120px;height:120px;font-size:40px">${me().ini}</div>`}<div class="ring"></div></div>
      ${st.camFail ? note('warn', 'Kamera tidak tersedia/ditolak. Prototipe memakai <b>selfie simulasi</b>.') : ''}
      <div class="xs muted mb">Foto diambil langsung dari kamera — tidak bisa memilih dari galeri.</div>
      <button class="btn pri block" ${act('absenCapture')}>${ic('camera', 18)} Ambil Selfie</button>
      <button class="btn ghost block mt" ${act('absenCancel')}>Batal</button>
    </div>` };
}
A.absenCancel = () => { stopCam(); ui.absen = { phase: 'idle' }; render(true); };
A.absenCapture = () => {
  const st = ui.absen; const v = document.getElementById('cam');
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d');
  if (v && v.videoWidth) {
    const s = Math.min(v.videoWidth, v.videoHeight);
    g.translate(160, 0); g.scale(-1, 1);
    g.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, 160, 160);
  } else {
    g.fillStyle = '#dcf3e3'; g.fillRect(0, 0, 160, 160); g.fillStyle = '#16793a'; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(me().ini, 80, 84);
  }
  st.photo = c.toDataURL('image/jpeg', .7);
  stopCam();
  st.phase = 'verify'; st.signals = evaluate(st.scenario, st.type); st.idx = 0;
  render(true);
  const tick = () => { if (ui.absen !== st || st.phase !== 'verify') return; st.idx++; if (st.idx > st.signals.length) { finishAbsen(st); return; } render(); setTimeout(tick, 330); };
  setTimeout(tick, 400);
};
function evaluate(scn, type) {
  const p = me(); const a = activeShift(p.id); const rs = RS[shiftLoc(p.id, a.k)]; const now = new Date();
  const L = []; const add = (label, detail, st, w = 0) => L.push({ label, detail, st, w });
  add('Server timestamp', `${fDT(now)} WIB (NTP tersinkron)`, 'ok');
  if (scn === 'outside') add('Geofence GPS', `230 m dari titik absensi (radius ${rs.radius} m)`, 'bad', 50);
  else add('Geofence GPS', `Di dalam area ${rs.nama} · ${scn === 'mock' ? '0' : '18'} m`, scn === 'mock' ? 'warn' : 'ok');
  add('Deteksi mock location', scn === 'mock' ? 'Aplikasi Fake GPS aktif · akurasi GPS tidak wajar' : 'Tidak terdeteksi', scn === 'mock' ? 'bad' : 'ok', scn === 'mock' ? 60 : 0);
  add('Device binding', scn === 'newdev' ? 'Perangkat belum terdaftar · ganti perangkat 3x dalam 30 hari' : scn === 'sharing' ? 'Perangkat terdaftar atas nama pegawai lain' : 'Perangkat terdaftar · SM-S918B (a1f3…9c)', ['newdev', 'sharing'].includes(scn) ? 'bad' : 'ok', ['newdev', 'sharing'].includes(scn) ? 35 : 0);
  add('Integritas perangkat', scn === 'rooted' ? 'Root/emulator terdeteksi (integrity check gagal)' : 'Lolos integrity check', scn === 'rooted' ? 'bad' : 'ok', scn === 'rooted' ? 40 : 0);
  add('Wi-Fi RS (sinyal pendukung)', scn === 'outside' ? 'Tidak terhubung jaringan RS' : `Terhubung ${rs.ssid}`, scn === 'outside' ? 'warn' : 'ok');
  add('Liveness detection', scn === 'rooted' ? 'Gagal — indikasi foto dari layar' : 'Lolos (kedip & gerak kepala)', scn === 'rooted' ? 'bad' : 'ok', scn === 'rooted' ? 20 : 0);
  add('Face matching', ['face', 'sharing'].includes(scn) ? 'Kemiripan 58% (ambang 80%)' : 'Kemiripan 96% dengan foto master', ['face', 'sharing'].includes(scn) ? 'bad' : 'ok', ['face', 'sharing'].includes(scn) ? 45 : 0);
  if (!isWork(a.code)) add('Kecocokan jadwal', 'Tidak ada jadwal aktif — absen di luar jadwal', 'warn', 25);
  else {
    const w = a.w; let d = '';
    if (type === 'in') { const late = Math.round((now - w.st) / 60000); d = late > GRACE_MIN ? `Terlambat ${late} menit (grace ${GRACE_MIN} mnt)` : late < -120 ? `Terlalu awal (${-late} menit sebelum shift)` : 'Sesuai jam shift'; add('Kecocokan jadwal', `Shift ${SHIFT[a.code].nama} ${shiftTime(a.code)} · ${d}`, late > GRACE_MIN || late < -120 ? 'warn' : 'ok'); }
    else { const early = Math.round((w.en - now) / 60000); add('Kecocokan jadwal', `Shift ${SHIFT[a.code].nama} ${shiftTime(a.code)} · ${early > 0 ? `pulang ${early} menit lebih awal` : 'sesuai jam pulang'}`, early > 0 ? 'warn' : 'ok'); }
  }
  if (scn === 'sharing') add('Anomali pola', 'Perangkat yang sama dipakai 2 akun dalam 5 menit', 'bad', 30);
  return L;
}
function riskOf(signals) { const score = Math.min(100, signals.reduce((a, s) => a + s.w, 0)); return { score, status: score < 25 ? 'Trusted' : score < 60 ? 'Need Review' : 'High Risk' }; }
function absenVerify(st) {
  return {
    title: 'Memverifikasi…', body: `
    <div style="text-align:center"><div class="selfie" style="width:130px;height:130px"><img src="${st.photo}" alt="selfie" style="transform:none"><div class="ring"></div></div></div>
    <div class="card">${st.signals.map((s, i) => `<div class="chk"><span class="st ${i < st.idx ? s.st === 'ok' ? 'ok' : s.st : i === st.idx ? 'run' : 'wait'}">${i < st.idx ? ic(s.st === 'ok' ? 'check' : s.st === 'warn' ? 'alert' : 'x', 13, 3) : ''}</span><div class="grow"><div class="b">${s.label}</div>${i < st.idx ? `<div class="xs muted">${esc(s.detail)}</div>` : ''}</div></div>`).join('')}</div>` };
}
function finishAbsen(st) {
  const p = me(); const a = activeShift(p.id); const now = new Date();
  const { score, status } = riskOf(st.signals);
  const late = st.type === 'in' && a.w ? Math.max(0, Math.round((now - a.w.st) / 60000)) : 0;
  const rec = { id: uid('a'), pid: p.id, date: a.k, type: st.type, at: now.toISOString(), status, score, scenario: st.scenario, rs: shiftLoc(p.id, a.k), device: st.scenario === 'newdev' ? 'Pixel 7 · 0c9d…e2 (baru)' : 'SM-S918B · a1f3…9c', dist: st.scenario === 'outside' ? 230 : 18, late: late > GRACE_MIN ? late : 0, signals: st.signals, photo: st.photo,
    audit: [{ t: 'Selfie & sinyal perangkat dikirim', at: now.toISOString() }, { t: `Risk engine: skor ${score} → ${status}`, at: now.toISOString() }] };
  if (status !== 'Trusted') {
    const r = { id: uid('r'), kind: 'attendance', requester: p.id, created: now.toISOString(), status: 'Diproses', data: { attId: rec.id, date: a.k, summary: `Absen ${st.type === 'in' ? 'masuk' : 'pulang'}: ${st.signals.filter(s => s.st === 'bad').map(s => s.label).join(', ') || 'perlu verifikasi'}`, risk: status, score },
      steps: [{ label: 'Review HR / Kepala Unit', roles: ['hr', 'kepala_unit'], status: 'pending' }] };
    S.requests.unshift(r); rec.audit.push({ t: 'Masuk antrian review HR / Kepala Unit', at: now.toISOString() });
  }
  S.attendance.push(rec); save();
  st.phase = 'result'; st.rec = rec; render(true);
}
function absenResult(st) {
  const r = st.rec; const col = { Trusted: ['var(--g-50)', 'var(--g-700)', 'shieldok'], 'Need Review': ['var(--amber-bg)', 'var(--amber)', 'alert'], 'High Risk': ['var(--red-bg)', 'var(--red)', 'x'] }[r.status];
  const msg = { Trusted: `Absen ${r.type === 'in' ? 'masuk' : 'pulang'} berhasil tercatat.`, 'Need Review': 'Absensi tercatat dan menunggu review HR/Kepala Unit. Anda akan menerima notifikasi.', 'High Risk': 'Absensi <b>ditahan</b> dan tidak dihitung hadir sampai direview. Indikasi kecurangan dicatat di audit trail.' }[r.status];
  return {
    title: 'Hasil Absensi', body: `
    <div class="risk" style="background:${col[0]};color:${col[1]}">${ic(col[2], 40)}<h2>${r.status}</h2><div class="small">${msg}</div>
      <div class="meter"><i style="width:${Math.max(4, r.score)}%;background:${col[1]}"></i></div><div class="xs mt">Skor risiko ${r.score}/100</div></div>
    <div class="card"><div class="kv"><div class="k">Waktu server</div><div class="v">${fDT(r.at)}</div><div class="k">Jenis</div><div class="v">Absen ${r.type === 'in' ? 'Masuk' : 'Pulang'}</div><div class="k">Lokasi</div><div class="v">${esc(RS[r.rs].nama)} · ${r.dist} m</div>${r.late ? `<div class="k">Keterlambatan</div><div class="v" style="color:var(--amber)">${r.late} menit</div>` : ''}</div></div>
    <div class="btn-row"><button class="btn ghost" ${gp('att-d', { id: r.id })}>Lihat Audit</button><button class="btn pri" ${act('absenDone')}>Selesai</button></div>` };
}
A.absenDone = () => { ui.absen = { phase: 'idle' }; tab('home'); };

SCREENS['att-d'] = p => {
  const r = S.attendance.find(a => a.id === p.id); if (!r) return { title: 'Audit', body: '<div class="empty">Data tidak ditemukan</div>' };
  const sig = r.signals?.length ? r.signals : [{ label: 'Geofence GPS', detail: `${r.dist} m dari titik absensi`, st: r.dist > 150 ? 'bad' : 'ok' }, { label: 'Device binding', detail: r.device, st: 'ok' }, { label: 'Face matching', detail: 'Kemiripan 95%', st: 'ok' }];
  return {
    title: 'Audit Absensi', body: `
    <div class="card row">${r.photo ? `<img src="${r.photo}" alt="" style="width:56px;height:56px;border-radius:50%">` : `<div class="avatar lg">${(memberName(r.pid))[0]}</div>`}<div class="grow"><div class="b">${esc(memberName(r.pid))}</div><div class="small muted">Absen ${r.type === 'in' ? 'Masuk' : 'Pulang'} · ${fDT(r.at)}</div></div>${statusPill(r.status)}</div>
    <div class="card"><div class="kv"><div class="k">Skor risiko</div><div class="v">${r.score}/100</div><div class="k">Perangkat</div><div class="v">${esc(r.device)}</div><div class="k">Lokasi</div><div class="v">${esc(RS[r.rs].nama)} · ${r.dist} m</div><div class="k">Tanggal shift</div><div class="v">${fDate(r.date)}</div>${r.review ? `<div class="k">Review</div><div class="v">${esc(r.review)}</div>` : ''}</div></div>
    ${secT('Sinyal verifikasi')}
    <div class="card">${sig.map(s => `<div class="chk"><span class="st ${s.st}">${ic(s.st === 'ok' ? 'check' : s.st === 'warn' ? 'alert' : 'x', 13, 3)}</span><div class="grow"><div class="b">${s.label}</div><div class="xs muted">${esc(s.detail)}</div></div></div>`).join('')}</div>
    ${secT('Audit trail')}
    <div class="card">${timeline((r.audit || [{ t: 'Absensi tercatat', at: r.at }]).map(x => ({ t: esc(x.t), s: fDT(x.at), st: 'done' })))}</div>` };
};

SCREENS.rekap = () => {
  const pid = S.persona; const T = today();
  const recs = S.attendance.filter(a => a.pid === pid).sort((a, b) => b.at.localeCompare(a.at));
  const days = [...new Set(recs.map(r => r.date))];
  const ins = recs.filter(r => r.type === 'in');
  const past = [...Array(14)].map((_, i) => ymd(addDays(T, -i - 1))).filter(k => isWork(shiftOf(pid, k)));
  const absent = past.filter(k => !findAtt(pid, k, 'in')).length;
  return {
    title: 'Rekap Absen', body: `
    <div class="attn mb">
      <div class="a c-green">${ic('check', 18)}<div><b>${ins.filter(r => r.status === 'Trusted').length}</b><span>Hadir (trusted)</span></div></div>
      <div class="a c-amber">${ic('clock', 18)}<div><b>${ins.filter(r => r.late).length}</b><span>Terlambat</span></div></div>
      <div class="a c-blue">${ic('shield', 18)}<div><b>${recs.filter(r => r.status !== 'Trusted').length}</b><span>Perlu review / ditahan</span></div></div>
      <div class="a c-red">${ic('x', 18)}<div><b>${absent}</b><span>Tanpa absen (14 hari)</span></div></div>
    </div>
    <div class="card tight">${days.length ? days.map(k => { const i = findAtt(pid, k, 'in'), o = findAtt(pid, k, 'out'); const s = i?.status !== 'Trusted' ? i?.status : o && o.status !== 'Trusted' ? o.status : i?.late ? 'Terlambat' : 'Tepat waktu'; return li({ icon: 'clock', c: 'green', t: `${HARI[parseYmd(k).getDay()]}, ${fDate(k)}`, s: `Masuk ${i ? fTime(i.at) : '—'} · Pulang ${o ? fTime(o.at) : '—'}${i?.late ? ` · telat ${i.late} mnt` : ''}`, right: statusPill(s), attrs: gp('att-d', { id: (i || o).id }) }); }).join('') : '<div class="empty">Belum ada data absensi</div>'}</div>` };
};

/* ================= INBOX (work queue + e-Office) ================= */
function inboxItems() {
  const items = [];
  myApprovals().forEach(r => items.push({ cat: 'approval', at: r.created, html: approvalCard(r) }));
  myLetterApprovals().forEach(l => items.push({ cat: 'approval', at: l.date, html: letterCard(l, true) }));
  inboxLetters().forEach(l => items.push({ cat: 'surat', at: l.date, html: letterCard(l) }));
  visibleNotifs().forEach(n => items.push({ cat: n.cat === 'sistem' ? 'sistem' : 'hr', at: n.at, html: notifCard(n), text: n.title + ' ' + n.body }));
  return items.sort((a, b) => b.at.localeCompare(a.at));
}
function approvalCard(r) {
  const [icn, c] = reqIcon(r); const who = memberName(r.requester);
  return `<div class="card" style="padding:12px"><div class="row top" ${gp('req-d', { id: r.id })} style="cursor:pointer">${icoBox(icn, c)}<div class="grow"><div class="xs b" style="color:var(--${c === 'gray' ? 'ink-3' : c === 'green' ? 'g-700' : c})">${reqKind(r)}</div><div class="b">${reqTitle(r)}</div><div class="small">${esc(who)}</div><div class="xs muted">${esc(reqSub(r))}</div></div><div class="xs muted">${ago(r.created)}</div></div>
  <div class="btn-row mt"><button class="btn pri sm" ${act('approve', r.id)}>${ic('check', 14)} Setujui</button><button class="btn danger sm" ${act('rejectAsk', r.id)}>${ic('x', 14)} Tolak</button><button class="btn ghost sm" ${gp('req-d', { id: r.id })}>Lihat</button></div></div>`;
}
function letterCard(l, approval) {
  const unread = !l.readBy.includes(S.persona);
  const st = approval ? 'Giliran Anda' : l.status === 'Draft' ? 'Draft' : l.from === S.persona ? l.status : unread ? 'Surat Baru' : (l.dispo?.length ? 'Didisposisi' : 'Dibaca');
  return `<div class="card row top" style="padding:12px;cursor:pointer" ${gp('surat-d', { id: l.id })}>${icoBox(approval ? 'pen' : 'mail', approval ? 'amber' : 'blue')}<div class="grow"><div class="xs b" style="color:var(--blue)">Surat${unread && !approval && l.from !== S.persona ? ' ●' : ''}</div><div class="b">${esc(l.perihal)}</div><div class="xs muted">${l.no ? esc(l.no) : 'Nomor diterbitkan saat final'}</div><div class="xs muted">Dari: ${esc(l.from === 'ext' ? l.fromName : memberName(l.from))}${l.files.length ? ` · ${ic('clip', 11)} ${l.files.length} lampiran` : ''}</div></div><div class="right"><div class="xs muted">${ago(l.date)}</div><div class="mt">${statusPill(st)}</div></div></div>`;
}
function notifCard(n) {
  const unread = !notifRead(n);
  return `<div class="card row top" style="padding:12px;cursor:pointer;${unread ? '' : 'opacity:.75'}" ${act('openNotif', n.id)}>${icoBox(n.cat === 'sistem' ? 'bell' : 'file', n.cat === 'sistem' ? 'gray' : 'green')}<div class="grow"><div class="xs b" style="color:var(--g-700)">${n.cat === 'sistem' ? 'Sistem' : 'HR'}${unread ? ' <span style="color:var(--red)">●</span>' : ''}</div><div class="b">${esc(n.title)}</div><div class="small muted">${esc(n.body)}</div></div><div class="xs muted">${ago(n.at)}</div></div>`;
}
A.openNotif = id => {
  const n = S.notifs.find(x => x.id === id); (S.readNotif[S.persona] ||= {})[id] = true; save();
  if (n.go?.tab) tab(n.go.tab); else if (n.go?.screen) go(n.go.screen, n.go.p || {}); else render();
};
SCREENS.inbox = p => {
  const t = p.tab || 'semua'; const q = (p.q || '').toLowerCase();
  const all = inboxItems();
  const cnt = c => all.filter(i => i.cat === c).length;
  const unreadSurat = inboxLetters().filter(l => !l.readBy.includes(S.persona)).length;
  let body = '';
  if (t === 'surat') {
    const sub = p.sub || 'masuk';
    const lists = {
      masuk: inboxLetters(),
      terkirim: S.letters.filter(l => l.from === S.persona && l.status !== 'Draft'),
      draft: S.letters.filter(l => l.from === S.persona && l.status === 'Draft'),
      arsip: S.letters.filter(l => l.archivedBy.includes(S.persona)),
    };
    const L = lists[sub].filter(l => !q || (l.perihal + ' ' + (l.no || '') + ' ' + (l.fromName || memberName(l.from))).toLowerCase().includes(q)).sort((a, b) => b.date.localeCompare(a.date));
    body = `${seg([['masuk', 'Kotak Masuk'], ['terkirim', 'Terkirim'], ['draft', 'Draft'], ['arsip', 'Arsip']], sub, 'inbSub')}
      ${L.length ? L.map(l => letterCard(l)).join('') : '<div class="empty">Tidak ada surat</div>'}`;
  } else {
    const items = all.filter(i => (t === 'semua' || i.cat === t) && (!q || (i.text || i.html.replace(/<[^>]+>/g, ' ')).toLowerCase().includes(q)));
    body = (t === 'hr' ? `<div class="card tight mb">${li({ icon: 'history', c: 'green', t: 'Status Pengajuan Saya', s: `${S.requests.filter(r => r.requester === S.persona && r.status === 'Diproses').length} sedang diproses`, attrs: gp('cuti-riwayat') })}</div>` : '')
      + (items.length ? items.map(i => i.html).join('') : `<div class="empty">${t === 'approval' ? 'Tidak ada yang menunggu persetujuan Anda 🎉' : 'Tidak ada item'}</div>`);
  }
  return {
    title: 'Inbox', right: `<button class="btn pri sm" ${gp('surat-new')}>${ic('plus', 14)} Surat</button>`, body: `
    <div class="xs muted mb" style="margin-top:-4px">Work queue: approval, surat (e-Office), HR, dan sistem.</div>
    ${tabs([['semua', 'Semua', all.length > 0 ? unreadCount() : 0], ['approval', 'Approval', cnt('approval')], ['surat', 'Surat', unreadSurat], ['hr', 'HR'], ['sistem', 'Sistem']], t, 'inbTab')}
    <div class="row mb"><div class="grow" style="position:relative"><span style="position:absolute;left:10px;top:10px;color:var(--ink-3)">${ic('search', 17)}</span><input class="inp" style="padding-left:34px" placeholder="Cari surat, cuti, nama…" value="${esc(p.q || '')}" data-inbq></div><button class="btn ghost" ${act('toast', 'Filter: Rumah Sakit, Unit, Jenis, Status, Tanggal, Klasifikasi (dummy)')}>${ic('filter', 16)}</button></div>
    ${body}` };
};
$app.addEventListener('input', e => { if (e.target.matches('[data-inbq]')) { curS().p.q = e.target.value; clearTimeout(A._q); A._q = setTimeout(() => { render(); const i = document.querySelector('[data-inbq]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } });
A.noop = () => { };
A.inbTab = v => { curS().p.tab = v; render(true); };
A.inbSub = v => { curS().p.sub = v; render(true); };

/* Approve / reject requests */
function decide(id, ok, noteTxt) {
  const r = S.requests.find(x => x.id === id); const st = curStep(r); const now = new Date().toISOString();
  Object.assign(st, { status: ok ? 'done' : 'rejected', at: now, name: me().nama, note: noteTxt || '' });
  const who = PERSONAS[r.requester] ? r.requester : null;
  if (!ok) {
    r.status = 'Ditolak';
    if (r.kind === 'attendance') { const a = S.attendance.find(x => x.id === r.data.attId); if (a) { a.status = 'Ditolak'; a.review = `Ditolak oleh ${me().nama}${noteTxt ? ': ' + noteTxt : ''}`; (a.audit ||= []).push({ t: `Review: ditolak oleh ${me().nama}`, at: now }); } }
    if (who) notify(who, 'hr', `${reqTitle(r)} ditolak`, `${reqSub(r)}${noteTxt ? ' — ' + noteTxt : ''}`, { screen: 'req-d', p: { id } });
  } else {
    const next = r.steps.find(s => s.status === 'waiting');
    if (next) { next.status = 'pending'; if (who) notify(who, 'hr', `${reqTitle(r)}: disetujui ${st.label}`, `Menunggu ${next.label}`, { screen: 'req-d', p: { id } }); }
    else { r.status = 'Disetujui'; applyEffects(r, now); if (who) notify(who, 'hr', `${reqTitle(r)} disetujui`, reqSub(r), { screen: 'req-d', p: { id } }); }
  }
  save();
}
function applyEffects(r, now) {
  const d = r.data;
  if (r.kind === 'leave') {
    const cat = LEAVE_CATS.find(c => c.id === d.cat);
    if (!cat.jam?.includes(d.sub)) rangeDays(d.start, d.end).forEach(k => { if (isWork(shiftOf(r.requester, k)) || cat.code === 'DL') setShift(r.requester, k, cat.code); });
    if (cat.potong?.includes(d.sub)) S.cutiUsed[r.requester] = (S.cutiUsed[r.requester] || 0) + d.days;
  } else if (r.kind === 'swap') {
    const a = shiftOf(d.from, d.date), b = shiftOf(d.to, d.date);
    setShift(d.from, d.date, b); setShift(d.to, d.date, a);
    (S.schedAudit ||= []).unshift({ by: me().nama, at: now, msg: `Tukar dinas ${fDate(d.date)}: ${memberName(d.from)} (${SHIFT[a].nama}) ↔ ${memberName(d.to)} (${SHIFT[b].nama})` });
    if (PERSONAS[d.to]) notify(d.to, 'sistem', 'Jadwal Anda diperbarui (tukar dinas)', `${fDate(d.date)}: ${SHIFT[a].nama}`, { screen: 'jadwal-d', p: { k: d.date } });
  } else if (r.kind === 'attendance') {
    const a = S.attendance.find(x => x.id === d.attId);
    if (a) { a.status = 'Trusted'; a.review = `Disetujui (koreksi) oleh ${me().nama}`; (a.audit ||= []).push({ t: `Review: disetujui oleh ${me().nama} → dihitung hadir`, at: now }); }
  } else if (r.kind === 'doc') {
    const u = S.docUploads.find(x => x.reqId === r.id); if (u) u.status = 'Terverifikasi';
  }
}
A.approve = id => { decide(id, true); toast('Disetujui'); };
A.rejectAsk = id => {
  curS().f = curS().f || {}; F().rejNote = '';
  sheet(`<h3>Tolak pengajuan?</h3><div class="small muted mb">Alasan penolakan akan dikirim ke pemohon dan dicatat di audit trail.</div>${fld('Alasan', txt('rejNote', 'placeholder="Contoh: coverage shift tidak mencukupi"'), true)}<div class="btn-row"><button class="btn ghost" ${act('closeSheet')}>Batal</button><button class="btn danger" ${act('rejectDo', id)}>Tolak</button></div>`);
};
A.rejectDo = id => { const n = F().rejNote; if (!n?.trim()) return toast('Alasan wajib diisi'); ui.sheet = null; decide(id, false, n); toast('Pengajuan ditolak'); };

SCREENS['req-d'] = p => {
  const r = S.requests.find(x => x.id === p.id); if (!r) return { title: 'Detail', body: '<div class="empty">Tidak ditemukan</div>' };
  const [icn, c] = reqIcon(r); const d = r.data; const can = r.status === 'Diproses' && r.requester !== S.persona && canActStep(curStep(r));
  let kv = '';
  if (r.kind === 'leave') kv = `<div class="k">Jenis</div><div class="v">${esc(reqCat(r).nama)} — ${esc(d.sub)}</div><div class="k">Tanggal</div><div class="v">${reqSub(r)}</div>${d.jam ? `<div class="k">Jam</div><div class="v">${esc(d.jam)}</div>` : ''}<div class="k">Alasan</div><div class="v">${esc(d.reason)}</div><div class="k">Lampiran</div><div class="v">${d.files?.length ? d.files.map(f => esc(f.name)).join('<br>') : '—'}</div>`;
  if (r.kind === 'swap') kv = `<div class="k">Tanggal</div><div class="v">${fDate(d.date)}</div><div class="k">Pemohon</div><div class="v">${esc(memberName(d.from))} (${SHIFT[shiftOf(d.from, d.date)].nama})</div><div class="k">Rekan</div><div class="v">${esc(memberName(d.to))} (${SHIFT[shiftOf(d.to, d.date)].nama})</div><div class="k">Alasan</div><div class="v">${esc(d.reason)}</div>`;
  if (r.kind === 'overtime') kv = `<div class="k">Jenis</div><div class="v">${esc(d.type)}</div><div class="k">Tanggal</div><div class="v">${fDate(d.date)}</div><div class="k">Jam</div><div class="v">${d.start} – ${d.end}</div><div class="k">Alasan</div><div class="v">${esc(d.reason)}</div>`;
  if (r.kind === 'attendance') kv = `<div class="k">Temuan</div><div class="v">${esc(d.summary)}</div><div class="k">Risk</div><div class="v">${statusPill(d.risk)} skor ${d.score}</div>`;
  if (r.kind === 'doc') kv = `<div class="k">Dokumen</div><div class="v">${esc(d.doc)}</div><div class="k">File</div><div class="v">${esc(d.file)} (${esc(d.size)})</div>${d.note ? `<div class="k">Catatan</div><div class="v">${esc(d.note)}</div>` : ''}`;
  let impact = '';
  if (r.kind === 'leave' && !reqCat(r).jam?.includes(d.sub)) {
    const ks = rangeDays(d.start, d.end).filter(k => isWork(baseShift(r.requester, k)) || ['C', 'I', 'DL'].includes(shiftOf(r.requester, k)));
    if (ks.length) impact = `${secT('Dampak ke jadwal')}<div class="card small">${ks.map(k => `<div class="row" style="padding:3px 0">${shiftChip(baseShift(r.requester, k))}<div class="grow">${HARI[parseYmd(k).getDay()]}, ${fDate(k)}</div>${r.status === 'Disetujui' ? shiftChip(shiftOf(r.requester, k)) : ''}</div>`).join('')}
      ${TEAM.some(t => t.id === r.requester) && ['kepala_unit', 'direksi'].includes(me().role) ? `<button class="btn sec sm mt" ${gp('team')}>${ic('users', 14)} Cek coverage & cari pengganti</button>` : '<div class="xs muted mt">Jika disetujui, jadwal otomatis berubah dan kepala unit menerima rekomendasi pengganti.</div>'}</div>`;
  }
  return {
    title: 'Detail Pengajuan', body: `
    <div class="card row">${icoBox(icn, c)}<div class="grow"><div class="b">${reqTitle(r)}</div><div class="small muted">${esc(memberName(r.requester))} · ${fDT(r.created)}</div></div>${statusPill(r.status)}</div>
    <div class="card"><div class="kv">${kv}</div>${r.kind === 'attendance' && d.attId ? `<button class="btn ghost sm mt" ${gp('att-d', { id: d.attId })}>${ic('shield', 14)} Lihat sinyal & audit absensi</button>` : ''}</div>
    ${impact}
    ${secT('Alur Persetujuan')}<div class="card">${stepsTimeline(r)}</div>
    ${can ? `${fld('Catatan (opsional)', txt('apNote', 'placeholder="Catatan untuk pemohon"'))}<div class="btn-row"><button class="btn danger" ${act('reqReject', r.id)}>${ic('x', 16)} Tolak</button><button class="btn pri" ${act('reqApprove', r.id)}>${ic('check', 16)} Setujui</button></div>` : ''}
    ${r.status === 'Diproses' && r.requester === S.persona ? `<button class="btn ghost block mt" ${act('reqCancel', r.id)}>Batalkan Pengajuan</button>` : ''}` };
};
A.reqApprove = id => { decide(id, true, F().apNote); toast('Disetujui — pemohon dinotifikasi'); };
A.reqReject = id => { if (!F().apNote?.trim()) return toast('Isi catatan sebagai alasan penolakan'); decide(id, false, F().apNote); toast('Ditolak — pemohon dinotifikasi'); };
A.reqCancel = id => { const r = S.requests.find(x => x.id === id); r.status = 'Dibatalkan'; r.steps.forEach(s => { if (s.status !== 'done') s.status = 'waiting'; }); save(); toast('Pengajuan dibatalkan'); };

/* ================= SURAT (e-Office di dalam Inbox) ================= */
SCREENS['surat-d'] = p => {
  const l = S.letters.find(x => x.id === p.id); if (!l) return { title: 'Surat', body: '<div class="empty">Tidak ditemukan</div>' };
  if (!l.readBy.includes(S.persona)) { l.readBy.push(S.persona); save(); }
  const view = p.view || 'detail'; const myTurn = l.status === 'Diajukan' && curStep(l)?.pid === S.persona;
  const received = ['Terkirim', 'Disetujui'].includes(l.status) && deliversTo(l, S.persona) && l.from !== S.persona;
  const toNames = l.to.map(id => id === 'all' ? 'Seluruh pegawai' : RECIPIENTS.find(r => r.id === id)?.nama || memberName(id)).join(', ');
  const signed = l.steps.filter(s => s.sign);
  const jenis = JENIS_SURAT.find(j => j.id === l.jenis)?.nama || l.jenis;
  const detail = `
    <div class="card"><div class="kv"><div class="k">Nomor</div><div class="v">${l.no ? esc(l.no) : '<span class="muted">Diterbitkan otomatis saat final</span>'}</div><div class="k">Tanggal</div><div class="v">${fDT(l.date)}</div><div class="k">Dari</div><div class="v">${esc(l.from === 'ext' ? l.fromName : memberName(l.from))}</div><div class="k">Kepada</div><div class="v">${esc(toNames)}</div>${l.cc?.length ? `<div class="k">Tembusan</div><div class="v">${esc(l.cc.map(id => RECIPIENTS.find(r => r.id === id)?.nama).join(', '))}</div>` : ''}<div class="k">Jenis</div><div class="v">${esc(jenis)}</div><div class="k">Klasifikasi</div><div class="v">${esc(l.klas)}</div></div></div>
    ${l.locked ? `<div class="lockbar">${ic('lock', 16)}<div><b>Dokumen final terkunci.</b> Ditandatangani dengan TTE internal RS (bukan TTE tersertifikasi PSrE).</div></div>` : ''}
    ${secT('Isi Surat')}<div class="doc">${esc(l.isi)}</div>
    ${signed.length ? secT('Tanda Tangan Elektronik Internal') + signed.map(s => `<div class="card small"><div class="row">${icoBox('shieldok', 'green', true)}<div class="grow"><div class="b">${esc(s.sign.by)}</div><div class="xs muted">${s.label} · ${fDT(s.sign.at)} · via ${s.sign.method}</div></div></div><div class="hash mt">SHA-256: ${s.sign.hash}</div></div>`).join('') : ''}
    ${secT(`Lampiran (${l.files.length})`)}${l.files.length ? l.files.map(f => `<div class="filechip"><span style="color:var(--red)">${ic('file', 18)}</span><div class="grow"><div class="ell">${esc(f.name)}</div><div class="xs muted">${esc(f.size)}</div></div><button class="btn ghost sm" ${act('toast', 'Mengunduh ' + f.name + ' (dummy)')}>${ic('download', 14)}</button></div>`).join('') : '<div class="small muted">Tidak ada lampiran</div>'}
    ${l.dispo?.length ? secT('Disposisi') + l.dispo.map(d => `<div class="card small"><b>${esc(d.by)}</b> → <b>${esc(d.toName)}</b><br>${esc(d.instr)}${d.note ? ' — ' + esc(d.note) : ''}<div class="xs muted">${fDT(d.at)}</div></div>`).join('') : ''}`;
  const flow = `<div class="card">${timeline([
    ...l.timeline.map(t => ({ t: esc(t.t), s: `${esc(t.s)} · ${fDT(t.at)}`, st: t.rej ? 'rej' : 'done' })),
    ...l.steps.filter(s => s.status === 'pending' || s.status === 'waiting').map(s => ({ t: `${s.label.toUpperCase()}`, s: `${esc(s.pid ? memberName(s.pid) : s.name)} · ${s.status === 'pending' ? (s.pid === S.persona ? '<b style="color:var(--amber)">Giliran Anda</b>' : 'Menunggu') : 'Dalam antrian'}`, st: s.status === 'pending' ? 'cur' : '' })),
  ])}</div>`;
  const actions = [];
  if (myTurn) actions.push(`<button class="btn pri" ${gp('surat-proses', { id: l.id })}>${ic('pen', 16)} Proses Surat</button>`);
  if (received) actions.push(`<button class="btn sec" ${gp('surat-dispo', { id: l.id })}>${ic('send', 16)} Disposisi</button>`);
  if (received) actions.push(`<button class="btn ghost" ${act('archive', l.id)}>${l.archivedBy.includes(S.persona) ? 'Keluarkan dari Arsip' : 'Arsipkan'}</button>`);
  if (l.status === 'Draft' && l.from === S.persona) actions.push(`<button class="btn pri" ${gp('surat-new', { id: l.id })}>${ic('pen', 16)} Lanjutkan Draft</button>`);
  return {
    title: 'Detail Surat', body: `
    <div class="card row">${icoBox('mail', 'blue')}<div class="grow"><div class="b">${esc(l.perihal)}</div><div class="xs muted">${l.no ? esc(l.no) : 'Belum bernomor'}</div></div>${statusPill(myTurn ? 'Giliran Anda' : l.status)}</div>
    ${seg([['detail', 'Detail'], ['alur', 'Riwayat Proses']], view, 'suratView')}
    ${view === 'detail' ? detail : flow}
    ${actions.length ? `<div class="btn-row mt" style="flex-wrap:wrap">${actions.join('')}</div>` : ''}` };
};
A.suratView = v => { curS().p.view = v; render(); };
A.archive = id => { const l = S.letters.find(x => x.id === id); const i = l.archivedBy.indexOf(S.persona); if (i >= 0) l.archivedBy.splice(i, 1); else l.archivedBy.push(S.persona); save(); toast(i >= 0 ? 'Dikeluarkan dari arsip' : 'Surat diarsipkan'); };

SCREENS['surat-proses'] = p => {
  const l = S.letters.find(x => x.id === p.id); const st = curStep(l); const f = F(); f.aksi ||= st.label === 'Mengetahui' ? 'Mengetahui' : 'Setujui';
  return {
    title: 'Proses Surat', body: `
    <div class="card row">${icoBox('mail', 'blue')}<div class="grow"><div class="b">${esc(l.perihal)}</div><div class="xs muted">Dari: ${esc(memberName(l.from))} · ${fDate(l.date)}</div></div>${statusPill('Diajukan')}</div>
    ${fld('Aksi Anda', sel('aksi', ['Mengetahui', 'Setujui', 'Tolak', 'Disposisi'], 'data-rr'), true)}
    ${f.aksi === 'Disposisi' ? `<button class="btn sec block mb" ${gp('surat-dispo', { id: l.id })}>Lanjut ke Disposisi ›</button>` : ''}
    ${fld('Catatan (opsional)', txt('catatan', 'placeholder="Contoh: Disetujui, mohon ditindaklanjuti oleh bagian terkait."'))}
    ${f.aksi !== 'Tolak' && f.aksi !== 'Disposisi' ? `<div class="card" style="background:var(--g-50)"><div class="row">${icoBox('lock', 'green', true)}<div class="grow"><div class="b">Tanda Tangan Internal RS</div><div class="xs muted">Gunakan PIN atau biometrik untuk menandatangani secara internal. Timestamp server, identitas penandatangan, dan hash dokumen akan dicatat.</div></div></div>
      <button class="btn pri block mt" ${act('signAsk', l.id)}>${ic('finger', 18)} Tanda Tangan dengan PIN / Biometrik</button></div>
      <div class="xs muted">TTE internal dikelola admin RS — tidak diklaim sebagai TTE tersertifikasi (PSrE). Arsitektur siap ditambah PSrE kelak.</div>`
      : f.aksi === 'Tolak' ? `<button class="btn danger block" ${act('letterReject', l.id)}>${ic('x', 16)} Tolak Surat</button>` : ''}` };
};
A.signAsk = id => { ui.pin = { v: '', id }; pinSheet(); };
function pinSheet() {
  sheet(`<h3 style="text-align:center">Masukkan PIN TTE</h3><div class="small muted" style="text-align:center">PIN demo: <b>123456</b></div>
  <div class="pin">${[...Array(6)].map((_, i) => `<i class="${i < ui.pin.v.length ? 'f' : ''}"></i>`).join('')}</div>
  ${ui.pin.err ? `<div class="small" style="color:var(--red);text-align:center;margin-bottom:8px">${ui.pin.err}</div>` : ''}
  <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button ${act('pinKey', n)}>${n}</button>`).join('')}<button ${act('pinBio')} title="Biometrik">${ic('finger', 22)}</button><button ${act('pinKey', 0)}>0</button><button ${act('pinKey', 'del')}>⌫</button></div>`);
}
A.pinKey = k => {
  const P = ui.pin; P.err = '';
  if (k === 'del') P.v = P.v.slice(0, -1); else if (P.v.length < 6) P.v += k;
  if (P.v.length === 6) { if (P.v === '123456') { signLetter(P.id, 'PIN'); return; } P.err = 'PIN salah. Percobaan dicatat di audit trail.'; P.v = ''; }
  pinSheet();
};
A.pinBio = () => signLetter(ui.pin.id, 'Biometrik');
async function sha256(s) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { let h = 0x811c9dc5, out = ''; for (let r = 0; r < 8; r++) { for (const ch of s + r) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } out += h.toString(16).padStart(8, '0'); } return out; }
}
async function signLetter(id, method) {
  const l = S.letters.find(x => x.id === id); const st = curStep(l); const now = new Date().toISOString(); const f = F();
  ui.sheet = null; ui.pin = null;
  const last = !l.steps.some(s => s.status === 'waiting');
  if (last && !l.no) {
    const seq = String(40 + S.letters.filter(x => x.no).length).padStart(3, '0'); const T = new Date();
    l.no = `${seq}/RSSA-${RS[me().rs].kode}/${l.jenis}/${ROMAN[T.getMonth()]}/${T.getFullYear()}`;
  }
  const hash = await sha256([l.no, l.perihal, l.isi, me().nama, now].join('|'));
  st.status = 'done'; st.at = now; st.note = f.catatan || ''; st.sign = { by: me().nama, at: now, hash, method };
  l.timeline.push({ t: `${f.aksi === 'Mengetahui' ? 'Mengetahui' : 'Disetujui'} & ditandatangani`, s: `${me().nama} — TTE internal (${method})${f.catatan ? ' · “' + f.catatan + '”' : ''}`, at: now });
  const next = l.steps.find(s => s.status === 'waiting');
  if (next) { next.status = 'pending'; notify(next.pid, 'hr', 'Surat menunggu persetujuan Anda', l.perihal, { screen: 'surat-d', p: { id: l.id } }); }
  else {
    l.status = 'Disetujui'; l.locked = true; l.date = now;
    l.timeline.push({ t: 'Dokumen final dikunci & dikirim', s: `Nomor ${l.no} · hash ${hash.slice(0, 12)}…`, at: now });
    l.readBy = [S.persona];
  }
  if (PERSONAS[l.from]) notify(l.from, 'hr', `Surat "${l.perihal}" ${next ? 'diproses' : 'disetujui'}`, `${me().nama} menandatangani (TTE internal)`, { screen: 'surat-d', p: { id: l.id } });
  save(); nav.stack.pop(); render(true); toast('Surat ditandatangani (TTE internal RS)');
}
A.letterReject = id => {
  const l = S.letters.find(x => x.id === id); const f = F(); if (!f.catatan?.trim()) return toast('Isi catatan sebagai alasan penolakan');
  const st = curStep(l); const now = new Date().toISOString();
  Object.assign(st, { status: 'rejected', at: now, note: f.catatan }); l.status = 'Ditolak';
  l.timeline.push({ t: 'Ditolak', s: `${me().nama} · “${f.catatan}”`, at: now, rej: true });
  if (PERSONAS[l.from]) notify(l.from, 'hr', `Surat "${l.perihal}" ditolak`, f.catatan, { screen: 'surat-d', p: { id } });
  save(); back(); toast('Surat ditolak');
};

SCREENS['surat-dispo'] = p => {
  const l = S.letters.find(x => x.id === p.id); const f = F(); f.instr ||= 'Mohon ditindaklanjuti';
  const opts = RECIPIENTS.filter(r => r.id !== S.persona && r.deliver !== S.persona);
  return {
    title: 'Disposisi Surat', body: `
    <div class="card row">${icoBox('mail', 'blue')}<div class="grow"><div class="b">${esc(l.perihal)}</div><div class="xs muted">${esc(l.no || '')}</div></div></div>
    <div class="fld"><label>Disposisi ke <span class="req">*</span></label><div class="card tight">${opts.map(r => `<label class="li" style="cursor:pointer"><input type="radio" name="dto" data-f="dto" value="${r.id}" ${f.dto === r.id ? 'checked' : ''} style="accent-color:var(--g-600)">${icoBox(r.id.startsWith('p') ? 'user' : 'building', r.id.startsWith('p') ? 'green' : 'blue', true)}<div class="grow"><div class="t">${esc(r.nama)}</div><div class="s">${esc(r.sub)}</div></div></label>`).join('')}</div></div>
    ${fld('Instruksi', `<div class="chips">${['Mohon ditindaklanjuti', 'Pelajari & laporkan', 'Untuk diketahui', 'Koordinasikan', 'Siapkan jawaban'].map(x => `<button class="chip ${f.instr === x ? 'on' : ''}" ${act('dispoInstr', x)}>${x}</button>`).join('')}</div>`)}
    ${fld('Catatan (opsional)', txt('dnote', 'placeholder="Tambahkan catatan disposisi…"'))}
    <button class="btn pri block" ${act('dispoSend', l.id)}>${ic('send', 16)} Kirim Disposisi</button>` };
};
A.dispoInstr = x => { F().instr = x; render(); };
A.dispoSend = id => {
  const l = S.letters.find(x => x.id === id); const f = F(); if (!f.dto) return toast('Pilih tujuan disposisi');
  const r = RECIPIENTS.find(x => x.id === f.dto); const now = new Date().toISOString();
  (l.dispo ||= []).push({ by: me().nama, toName: r.nama, deliver: r.deliver, instr: f.instr, note: f.dnote || '', at: now });
  l.timeline.push({ t: 'Disposisi', s: `${me().nama} → ${r.nama}: ${f.instr}`, at: now });
  if (r.deliver) { l.readBy = l.readBy.filter(x => x !== r.deliver); notify(r.deliver, 'hr', 'Disposisi surat baru', `${l.perihal} — ${f.instr}`, { screen: 'surat-d', p: { id } }); }
  save(); nav.stack = nav.stack.filter(s => s.s !== 'surat-proses'); nav.stack.pop(); render(true); toast('Disposisi terkirim ke ' + r.nama);
};

/* Buat Surat Baru + AI Asisten Surat */
const TONES = ['Semi Formal', 'Formal', 'Ringkas', 'Sopan', 'Lebih Formal', 'Perjelas'];
SCREENS['surat-new'] = p => {
  const f = F();
  if (!f._init) {
    f._init = true; f.tone = 'Semi Formal'; f.to = []; f.cc = []; f.files = []; f.jenis = 'PRM'; f.klas = 'Biasa'; f.flow = me().atasan ? 'atasan' : 'langsung';
    if (p.id) { const l = S.letters.find(x => x.id === p.id); Object.assign(f, { perihal: l.perihal, isi: l.isi, to: [...l.to], cc: [...(l.cc || [])], jenis: l.jenis, klas: l.klas, files: [...l.files], editId: l.id }); }
  }
  const rq = (f.rq || '').toLowerCase();
  const sugg = rq ? RECIPIENTS.filter(r => r.id !== S.persona && !f.to.includes(r.id) && (r.nama + r.sub).toLowerCase().includes(rq)).slice(0, 5) : [];
  const flows = [['langsung', me().role === 'direksi' ? 'Langsung kirim (TTE saya)' : 'Langsung kirim (tanpa approval)']];
  if (me().atasan) flows.push(['atasan', `Atasan langsung (${memberName(me().atasan)})`]);
  if (me().atasan && me().atasan !== 'p1') flows.push(['direktur', 'Atasan langsung → Direktur']);
  return {
    title: 'Buat Surat Baru', right: `<button class="ib" ${act('saveDraft')} aria-label="Simpan draft">${ic('file', 20)}</button>`, body: `
    ${fld('Jenis Surat', sel('jenis', JENIS_SURAT.map(j => [j.id, j.nama])), true)}
    <div class="fld"><label>Tujuan <span class="req">*</span></label>
      <div style="position:relative"><span style="position:absolute;left:10px;top:10px;color:var(--ink-3)">${ic('search', 17)}</span><input class="inp" style="padding-left:34px" placeholder="Cari pegawai, unit, atau RS…" data-f="rq" data-live value="${esc(f.rq || '')}" id="rq"></div>
      ${sugg.length ? `<div class="card tight mt">${sugg.map(r => `<div class="li" ${act('addTo', r.id)}><div class="grow"><div class="t">${esc(r.nama)}</div><div class="s">${esc(r.sub)}</div></div>${ic('plus', 16)}</div>`).join('')}</div>` : ''}
      ${f.to.map(id => { const r = RECIPIENTS.find(x => x.id === id) || { nama: id === 'all' ? 'Seluruh pegawai' : id, sub: '' }; return `<div class="filechip">${icoBox(id.startsWith('p') ? 'user' : 'users', 'green', true)}<div class="grow"><div>${esc(r.nama)}</div><div class="xs muted">${esc(r.sub)}</div></div><button class="ib" style="border:0;background:none" ${act('rmTo', id)}>${ic('x', 16)}</button></div>`; }).join('')}
      <div class="chips mt"><button class="chip" ${act('addTo', 'all')}>+ Seluruh pegawai</button><button class="chip ${f.showCc ? 'on' : ''}" ${act('toggleCc')}>+ Tembusan</button></div>
    </div>
    ${f.showCc ? fld('Tembusan', `<div class="chips">${RECIPIENTS.filter(r => r.id !== S.persona && !f.to.includes(r.id)).slice(0, 8).map(r => `<button class="chip ${f.cc.includes(r.id) ? 'on' : ''}" ${act('toggleCcId', r.id)}>${esc(r.nama)}</button>`).join('')}</div>`) : ''}
    ${fld('Perihal', inp('perihal', 'placeholder="Masukkan perihal surat…"'), true)}
    ${f.perihalSugg && f.perihalSugg !== f.perihal ? `<div class="row mb" style="margin-top:-6px"><span class="xs muted">Saran AI:</span><button class="chip on" ${act('usePerihal')}>${ic('sparkles', 12)} ${esc(f.perihalSugg)}</button></div>` : ''}
    <div class="ai">
      <div class="hd"><div class="ico">${ic('sparkles', 20)}</div><div><div class="b" style="color:var(--g-700)">AI Asisten Surat</div><div class="xs muted">Tulis maksud surat seperti chat. AI merapikannya menjadi minimal semi formal.</div></div></div>
      <textarea class="inp" data-f="raw" data-count="rawc" maxlength="500" placeholder="Contoh: pak saya mau pinjam ruang meeting buat rapat vendor hari rabu jam 10 sampe 12 ya">${esc(f.raw || '')}</textarea>
      <div class="xs muted right" id="rawc">${(f.raw || '').length}/500</div>
      <div class="chips mt">${TONES.map(t => `<button class="chip ${f.tone === t ? 'on' : ''}" ${act('setTone', t)}>${f.tone === t ? ic('check', 12) : ''}${t}</button>`).join('')}</div>
      <button class="btn pri block mt" ${act('aiGen')} ${f.aiBusy ? 'disabled' : ''}>${ic('sparkles', 16)} ${f.aiBusy ? 'Menyusun draft…' : f.aiUsed ? 'Regenerasi Draft' : 'Buat Draft AI'}</button>
      <div class="xs muted mt">Simulasi AI (rule-based) untuk prototipe. AI tidak mengarang tanggal, nomor surat, nama pejabat, atau fakta penting.</div>
    </div>
    ${(f.aiWarn || []).map(w => note('warn', w)).join('')}
    ${fld('Isi Surat (Draft — dapat diedit)', `<textarea class="inp" data-f="isi" id="isi" style="min-height:220px;line-height:1.5">${esc(f.isi || '')}</textarea>`, true)}
    ${fld('Lampiran', filesBlock(f.files, 'files', 'Klik untuk upload lampiran', 'PDF, DOC, DOCX, JPG, PNG (maks. 10 MB)'))}
    <div class="two">${fld('Klasifikasi', sel('klas', ['Biasa', 'Penting', 'Rahasia']))}${fld('Alur Persetujuan', sel('flow', flows), true)}</div>
    <label class="radio note warn" style="align-items:center"><input type="checkbox" data-f="reviewed" ${f.reviewed ? 'checked' : ''}> <span>Saya sudah memeriksa isi surat${f.aiUsed ? ' hasil AI' : ''} sebelum diajukan.</span></label>
    <div class="btn-row"><button class="btn ghost" ${act('saveDraft')}>${ic('file', 16)} Simpan Draft</button><button class="btn pri" ${act('submitLetter')}>${ic('send', 16)} Ajukan Surat</button></div>` };
};
A.addTo = id => { const f = F(); if (!f.to.includes(id)) f.to.push(id); f.rq = ''; render(); };
A.rmTo = id => { F().to = F().to.filter(x => x !== id); render(); };
A.toggleCc = () => { F().showCc = !F().showCc; render(); };
A.toggleCcId = id => { const f = F(); f.cc = f.cc.includes(id) ? f.cc.filter(x => x !== id) : [...f.cc, id]; render(); };
A.setTone = t => { F().tone = t; render(); };
A.usePerihal = () => { F().perihal = F().perihalSugg; render(); };
A.aiGen = () => {
  const f = F(); if (!f.raw?.trim()) return toast('Tulis dulu maksud surat Anda di kotak AI');
  f.aiBusy = true; render();
  setTimeout(() => {
    const out = aiDraft(f.raw, f.tone, f);
    f.aiBusy = false; f.aiUsed = true; f.aiWarn = out.warn; f.perihalSugg = out.perihal; if (!f.perihal) f.perihal = out.perihal; f.isi = ''; f.reviewed = false;
    render();
    const el = document.getElementById('isi'); let i = 0; const full = out.text; el.classList.add('typing');
    const iv = setInterval(() => { i = Math.min(full.length, i + 9); el.value = full.slice(0, i); if (i >= full.length) { clearInterval(iv); f.isi = full; el.classList.remove('typing'); } }, 16);
  }, 700);
};

/* --- AI Asisten Surat (simulasi rule-based) --- */
const SLANG = [
  [/\b(gak|ga|nggak|enggak|ngga|gk|tdk)\b/gi, 'tidak'], [/\b(udah|udh|sdh)\b/gi, 'sudah'], [/\bblm\b/gi, 'belum'], [/\baja\b/gi, 'saja'],
  [/\bgimana\b/gi, 'bagaimana'], [/\b(kalo|klo|kl)\b/gi, 'apabila'], [/\btolong\b/gi, 'mohon'], [/\b(yg)\b/gi, 'yang'], [/\bdgn\b/gi, 'dengan'],
  [/\b(utk|buat)\b/gi, 'untuk'], [/\b(krn|soalnya|karna)\b/gi, 'karena'], [/\bbisa\b/gi, 'dapat'], [/\bkasih\b/gi, 'berikan'], [/\bcepet\b/gi, 'segera'],
  [/\b(banget|bgt)\b/gi, 'sangat'], [/\b(makasih|thx|thanks|trims)\b/gi, 'terima kasih'], [/\b(ok|oke|okay)\b/gi, 'baik'], [/\bsampe\b/gi, 'sampai'],
  [/\b(mau|ingin|pengen) (pinjem|pinjam|minjem|minjam)\b/gi, 'bermaksud mengajukan permohonan peminjaman'],
  [/\bjam\s+(\d)/gi, 'pukul $1'], [/\b(mau|pengen)\b/gi, 'bermaksud'], [/\bpinjem\b/gi, 'meminjam'], [/\bpinjam\b/gi, 'meminjam'], [/\b(pak|bapak)\b/gi, 'Bapak'], [/\b(bu|ibu)\b/gi, 'Ibu'],
  [/\bdi ?acc\b/gi, 'disetujui'], [/\bbesok2\b/gi, 'ke depannya'], [/\bpada\s+hari\b/gi, 'pada hari'], [/\bngadain\b/gi, 'mengadakan'], [/\bbikin\b/gi, 'membuat'],
  [/\b(dong|ya|yah|sih|nih|deh|kok|lho|loh|kak|gan)\b/gi, ''], [/\b(saya|aku|gue|gw)\b/gi, 'kami'], [/\btemen2?\b/gi, 'rekan-rekan'], [/\banak2\b/gi, 'staf'],
];
const RELATIVE = /\b(besok|lusa|kemarin|minggu depan|bulan depan|nanti|secepatnya)\b/gi;
function aiDraft(raw, tone, f) {
  let t = ' ' + raw.trim().replace(/\s+/g, ' ') + ' ';
  SLANG.forEach(([re, rep]) => { t = t.replace(re, rep); });
  t = t.replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim().replace(/[!?.]+$/, '');
  t = t.replace(/^(halo|hai|hi|assalamualaikum|selamat (pagi|siang|sore|malam))[, ]*/i, '').replace(/^(Bapak|Ibu)[, ]+/, '');
  t = t.replace(/[,.\s]*(terima kasih|terimakasih)( banyak)?[.!\s]*$/i, '').trim();
  t = t.replace(/(\d{1,2})\s*(?:-|sampai|s\/d|s\.d\.?)\s*(\d{1,2})(?!\d|[:.]\d)/g, (m, a, b) => `${a}.00–${b}.00 WIB`);
  t = t.replace(/pukul (\d{1,2})(?![\d.:])/g, 'pukul $1.00 WIB');
  const warn = [];
  const rel = t.match(RELATIVE);
  if (rel) { t = t.replace(RELATIVE, m => `${m} [tanggal — mohon dipastikan]`); warn.push(`Anda menulis “${[...new Set(rel.map(x => x.toLowerCase()))].join('”, “')}”. AI <b>tidak mengisi tanggal</b> sendiri — lengkapi tanggal pada bagian yang ditandai.`); }
  if (/\b(rapat|pertemuan|acara|kegiatan)\b/i.test(t) && !/\b(\d{1,2}\s+(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)|senin|selasa|rabu|kamis|jumat|sabtu|minggu|\d{1,2}[/-]\d{1,2})/i.test(t)) warn.push('Hari/tanggal kegiatan belum disebutkan. Tambahkan secara manual — AI tidak akan mengarangnya.');
  if (/\b(direktur|manajer|kepala|ketua)\b/i.test(t)) warn.push('Nama pejabat tidak diisi otomatis. Pastikan nama & jabatan sesuai data resmi.');
  warn.push('Nomor surat diterbitkan otomatis oleh sistem saat surat final. Wajib review draft sebelum diajukan.');
  const body = t.charAt(0).toLowerCase() + t.slice(1);
  const lower = t.toLowerCase();
  const perihal = /meminjam|peminjaman/.test(lower) ? (/ruang|aula/.test(lower) ? 'Permohonan Peminjaman Ruang' + (/meeting|rapat/.test(lower) ? ' Meeting' : '') : 'Permohonan Peminjaman')
    : /\brapat|undang/.test(lower) ? 'Undangan Rapat' : /\bcuti\b/.test(lower) ? 'Permohonan Cuti' : /pengadaan|beli|membeli|alat|alkes/.test(lower) ? 'Permohonan Pengadaan'
    : /jadwal|shift|dinas/.test(lower) ? 'Perubahan Jadwal Dinas' : /laporan|lapor/.test(lower) ? 'Penyampaian Laporan' : /\bizin\b/.test(lower) ? 'Permohonan Izin'
    : /perbaik|rusak|bocor/.test(lower) ? 'Permohonan Perbaikan Fasilitas' : 'Pemberitahuan';
  const sentences = t.split(/(?<=[.!?])\s+|,\s*(?:dan|lalu|terus|trus)\s+/i).map(s => s.trim()).filter(Boolean);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const dot = s => /[.!?]$/.test(s) ? s : s + '.';
  let text;
  switch (tone) {
    case 'Formal': text = `Dengan hormat,\n\nSehubungan dengan ${perihal.toLowerCase()}, bersama ini kami sampaikan bahwa ${dot(body)}\n\nDemikian surat ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.`; break;
    case 'Lebih Formal': text = `Dengan hormat,\n\nMenindaklanjuti kebutuhan operasional unit kami, dengan ini kami bermaksud menyampaikan ${perihal.toLowerCase()}, yakni bahwa ${dot(body)}\n\nBesar harapan kami kiranya Bapak/Ibu berkenan mempertimbangkan dan memberikan persetujuan atas hal tersebut.\n\nDemikian surat ini kami sampaikan. Atas perhatian dan perkenan Bapak/Ibu, kami haturkan terima kasih.`; break;
    case 'Ringkas': text = `Dengan hormat,\n\n${cap(dot(body))}\n\nTerima kasih.`; break;
    case 'Sopan': text = `Dengan hormat,\n\nMohon izin menyampaikan bahwa ${dot(body)} Kami mohon kesediaan Bapak/Ibu untuk dapat membantu menindaklanjuti hal tersebut.\n\nAtas perhatian dan bantuannya, kami ucapkan terima kasih.`; break;
    case 'Perjelas': text = `Dengan hormat,\n\nBersama ini kami sampaikan ${perihal.toLowerCase()} dengan rincian sebagai berikut:\n${(sentences.length > 1 ? sentences : [t]).map((s, i) => `${i + 1}. ${cap(dot(s))}`).join('\n')}\n\nApabila diperlukan informasi tambahan, kami siap memberikan penjelasan lebih lanjut.\n\nDemikian kami sampaikan. Atas perhatiannya, kami ucapkan terima kasih.`; break;
    default: text = `Dengan hormat,\n\nMelalui surat ini, ${/^kami (bermaksud|ingin|mohon|mengajukan)/.test(body) ? '' : 'kami sampaikan bahwa '}${dot(body)}\n\nDemikian disampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.`;
  }
  return { text, perihal, warn };
}

function letterFromForm(status) {
  const f = F(); const now = new Date().toISOString();
  let l = f.editId ? S.letters.find(x => x.id === f.editId) : null;
  if (!l) { l = { id: uid('L'), no: null, from: S.persona, readBy: [], archivedBy: [], steps: [], timeline: [{ t: 'Draft dibuat', s: me().nama, at: now }], dispo: [] }; S.letters.unshift(l); f.editId = l.id; }
  Object.assign(l, { jenis: f.jenis, perihal: f.perihal || '(Tanpa perihal)', isi: f.isi || '', to: f.to, cc: f.cc, klas: f.klas, files: f.files, date: now, status, aiAssisted: !!f.aiUsed });
  return l;
}
A.saveDraft = () => { letterFromForm('Draft'); save(); toast('Draft tersimpan di Inbox › Surat › Draft'); };
A.submitLetter = () => {
  const f = F();
  if (!f.to.length) return toast('Tujuan surat wajib diisi');
  if (!f.perihal?.trim()) return toast('Perihal wajib diisi');
  if (!f.isi?.trim()) return toast('Isi surat wajib diisi');
  if (/\[tanggal — mohon/.test(f.isi)) return toast('Masih ada penanda [tanggal] yang belum Anda lengkapi');
  if (!f.reviewed) return toast('Centang konfirmasi bahwa Anda sudah mereview isi surat');
  const l = letterFromForm('Diajukan'); const now = new Date().toISOString();
  l.timeline.push({ t: 'Diajukan', s: me().nama + (f.aiUsed ? ' · disusun dengan bantuan AI, direview pengguna' : ''), at: now });
  const steps = [];
  if (f.flow === 'atasan' || f.flow === 'direktur') steps.push({ label: 'Menyetujui', pid: me().atasan, status: 'pending' });
  if (f.flow === 'direktur') { steps[0].label = 'Mengetahui'; steps.push({ label: 'Menyetujui', pid: 'p1', status: 'waiting' }); }
  l.steps = steps;
  if (!steps.length) {
    const T = new Date(); l.no = `${String(40 + S.letters.filter(x => x.no).length).padStart(3, '0')}/RSSA-${RS[me().rs].kode}/${l.jenis}/${ROMAN[T.getMonth()]}/${T.getFullYear()}`;
    l.status = 'Terkirim'; l.locked = true; l.timeline.push({ t: 'Dikirim', s: `Nomor ${l.no}`, at: now });
  } else notify(steps[0].pid, 'hr', 'Surat menunggu persetujuan Anda', l.perihal, { screen: 'surat-d', p: { id: l.id } });
  save(); nav.tab = 'inbox'; nav.stack = [{ s: 'inbox', p: { tab: 'surat', sub: 'terkirim' } }]; go('surat-d', { id: l.id }); toast(steps.length ? 'Surat diajukan ke ' + memberName(steps[0].pid) : 'Surat terkirim');
};

/* ================= CUTI & IZIN ================= */
SCREENS.cuti = () => {
  const used = S.cutiUsed[S.persona] || 0;
  return {
    title: 'Cuti & Izin', right: `<button class="ib" ${gp('cuti-riwayat')} aria-label="Riwayat">${ic('history', 20)}</button>`, body: `
    <div class="card row" style="background:var(--g-50)"><div class="ico c-green" style="width:56px;height:56px">${ic('umbrella', 30)}</div><div class="grow"><div class="b" style="color:var(--g-700)">Ajukan cuti atau izin dengan mudah</div><div class="xs muted">Untuk keperluan pribadi, keluarga, kesehatan, ibadah, atau tugas kedinasan.</div></div></div>
    <div class="b mb">Saya ingin mengajukan:</div>
    <div class="two">${LEAVE_CATS.map(c => `<div class="card" style="margin:0;cursor:pointer;padding:12px" ${gp('cuti-form', { cat: c.id })}>${icoBox(c.icon, c.c, true)}<div class="b mt">${c.nama}</div><div class="xs muted">${c.desc}</div></div>`).join('')}</div>
    <div class="card tight mt">
      ${li({ icon: 'history', c: 'blue', t: 'Riwayat Pengajuan', s: 'Lihat status pengajuan Anda', attrs: gp('cuti-riwayat') })}
      ${li({ icon: 'wallet', c: 'amber', t: 'Saldo Cuti Saya', s: `Sisa cuti tahunan ${12 - used} dari 12 hari`, attrs: gp('cuti-saldo') })}
      ${li({ icon: 'calendar', c: 'violet', t: 'Kalender Cuti & Izin', s: 'Lihat di jadwal bulanan', attrs: `data-tab="jadwal"` })}
      ${li({ icon: 'info', c: 'gray', t: 'Panduan & Kebijakan', s: 'Aturan cuti dan izin', attrs: gp('cuti-panduan') })}
    </div>` };
};
SCREENS['cuti-form'] = p => {
  const cat = LEAVE_CATS.find(c => c.id === p.cat); const f = F(); const T = today();
  if (!f._init) { f._init = true; f.sub = p.sub || cat.subs[0]; let s0 = addDays(T, cat.id === 'sakit' ? 0 : 7); for (let i = 0; i < 7 && !isWork(shiftOf(S.persona, s0)); i++) s0 = addDays(s0, 1); f.start = ymd(s0); f.end = f.start; f.files = []; f.jm = '07:00'; f.js = '09:00'; }
  const isJam = cat.jam?.includes(f.sub);
  if (isJam) f.end = f.start;
  const valid = f.start && f.end && f.end >= f.start;
  const cal = valid ? daysBetween(parseYmd(f.start), parseYmd(f.end)) + 1 : 0;
  const kerja = valid ? workDaysIn(S.persona, f.start, f.end) : 0;
  const sisa = 12 - (S.cutiUsed[S.persona] || 0);
  const potong = cat.potong?.includes(f.sub);
  const wajib = cat.wajib ? cat.wajib(f.sub) : false;
  const title = { cuti: 'Pengajuan Cuti', sakit: 'Pengajuan Izin Sakit', izin: 'Pengajuan Izin', umrah: 'Pengajuan ' + f.sub, dinas: 'Pengajuan Dinas Luar', diklat: 'Pengajuan Pendidikan / Diklat', lain: 'Pengajuan Lainnya' }[cat.id];
  const impacted = valid ? rangeDays(f.start, f.end).filter(k => isWork(shiftOf(S.persona, k))) : [];
  const radio = ['sakit', 'umrah'].includes(cat.id);
  return {
    title, body: `
    ${fld('Jenis ' + (cat.id === 'cuti' ? 'Cuti' : cat.id === 'sakit' ? 'Sakit' : cat.id === 'umrah' ? 'Pengajuan' : 'Izin'), radio ? `<div class="${cat.id === 'umrah' ? 'two' : ''}">${cat.subs.map(s => `<label class="radio"><input type="radio" name="sub" data-f="sub" data-rr value="${esc(s)}" ${f.sub === s ? 'checked' : ''}>${esc(s)}</label>`).join('')}</div>` : sel('sub', cat.subs, 'data-rr'), true)}
    ${potong ? `<div class="card row" style="background:var(--g-50)">${icoBox('calendar', 'green', true)}<div class="small">Sisa cuti tahunan Anda<br><b>${sisa} hari</b> dari 12 hari</div></div>` : ''}
    ${isJam ? `${fld('Tanggal', inp('start', 'type="date" data-rr'), true)}<div class="two">${fld('Jam mulai', inp('jm', 'type="time"'), true)}${fld('Jam selesai', inp('js', 'type="time"'), true)}</div>`
      : `<div class="two">${fld('Tanggal mulai', inp('start', 'type="date" data-rr'), true)}${fld('Tanggal selesai', inp('end', `type="date" min="${f.start}" data-rr`), true)}</div>
      ${fld('Lama ' + (cat.id === 'cuti' ? 'Cuti' : 'Pengajuan'), `<div class="inp row" style="background:var(--gray-bg)"><div class="grow">${valid ? (cat.id === 'umrah' ? cal + ' hari kalender' : kerja + ' hari') : '—'}</div><span class="xs muted">${valid ? `(${kerja} hari kerja · ${cal} hari kalender)` : 'Tanggal tidak valid'}</span></div>`)}`}
    ${potong && valid ? note(kerja > sisa ? 'err' : 'info', kerja > sisa ? `Lama pengajuan (${kerja} hari kerja) melebihi sisa cuti Anda (${sisa} hari).` : `Pengajuan ini akan memotong saldo cuti tahunan sesuai kebijakan. Sisa setelah pengajuan: <b>${sisa - kerja} hari</b>.`) : ''}
    ${fld(cat.id === 'sakit' ? 'Keterangan' : 'Alasan', txt('reason', `placeholder="${cat.id === 'sakit' ? 'Contoh: demam dan perlu istirahat sesuai anjuran dokter' : 'Jelaskan keperluan Anda'}"`), true)}
    ${fld(`${cat.lampiranLabel ? 'Upload ' + cat.lampiranLabel : 'Lampiran'} ${wajib ? '(Wajib)' : '(Opsional)'}`, filesBlock(f.files))}
    ${impacted.length ? `<div class="card small"><div class="b mb">Jadwal terdampak (${impacted.length} shift)</div>${impacted.slice(0, 5).map(k => `<div class="row" style="padding:2px 0">${shiftChip(shiftOf(S.persona, k))}<span>${HARI[parseYmd(k).getDay()]}, ${fDate(k)} · ${shiftTime(shiftOf(S.persona, k))}</span></div>`).join('')}${impacted.length > 5 ? `<div class="xs muted">+${impacted.length - 5} lainnya</div>` : ''}<div class="xs muted mt">Jika disetujui, jadwal otomatis berubah & kepala unit mendapat rekomendasi pengganti.</div></div>` : ''}
    <button class="btn pri block" ${act('leaveNext', cat.id)}>Ajukan ${cat.id === 'sakit' ? 'Izin Sakit' : cat.id === 'cuti' ? 'Cuti' : cat.id === 'umrah' ? f.sub : cat.nama}</button>` };
};
A.leaveNext = catId => {
  const cat = LEAVE_CATS.find(c => c.id === catId); const f = F(); const isJam = cat.jam?.includes(f.sub);
  if (!f.start || (!isJam && (!f.end || f.end < f.start))) return toast('Periksa kembali tanggal pengajuan');
  if (!f.reason?.trim()) return toast((cat.id === 'sakit' ? 'Keterangan' : 'Alasan') + ' wajib diisi');
  if (cat.wajib?.(f.sub) && !f.files.length) return toast('Lampiran wajib untuk jenis ini');
  if (f.sub.startsWith('Sakit ringan') && f.end !== f.start) return toast('Sakit ringan tanpa surat dokter maksimal 1 hari');
  const kerja = workDaysIn(S.persona, f.start, isJam ? f.start : f.end);
  if (cat.potong?.includes(f.sub) && kerja > 12 - (S.cutiUsed[S.persona] || 0)) return toast('Saldo cuti tidak mencukupi');
  const data = { cat: cat.id, sub: f.sub, start: f.start, end: isJam ? f.start : f.end, days: cat.id === 'umrah' ? daysBetween(parseYmd(f.start), parseYmd(f.end)) + 1 : Math.max(1, kerja), reason: f.reason, files: f.files, jam: isJam ? `${f.jm} – ${f.js}` : undefined };
  go('cuti-konfirm', { data });
};
function leaveSteps() {
  const p = me();
  if (p.role === 'pegawai') return [{ label: 'Kepala Unit', roles: ['kepala_unit'], status: 'pending' }, { label: 'HRD', roles: ['hr'], status: 'waiting' }];
  if (p.atasan) return [{ label: 'Atasan Langsung', pid: p.atasan, status: 'pending' }, { label: 'HRD', roles: ['hr'], status: 'waiting' }];
  return [{ label: 'HRD', roles: ['hr'], status: 'pending' }];
}
SCREENS['cuti-konfirm'] = p => {
  const d = p.data; const cat = LEAVE_CATS.find(c => c.id === d.cat); const sisa = 12 - (S.cutiUsed[S.persona] || 0); const potong = cat.potong?.includes(d.sub);
  const steps = leaveSteps();
  return {
    title: 'Konfirmasi Pengajuan', body: `
    <div class="card row">${icoBox(cat.icon, cat.c)}<div class="grow"><div class="b">${esc(d.sub)}</div><div class="small muted">${d.start === d.end ? fDate(d.start) : fDate(d.start) + ' – ' + fDate(d.end)}</div></div><span class="pill p-green">${d.days} hari${d.cat !== 'umrah' ? ' kerja' : ''}</span></div>
    <div class="card"><div class="kv">
      <div class="k">Lama</div><div class="v">${d.days} hari${d.jam ? ' · ' + d.jam : ''}</div>
      ${potong ? `<div class="k">Sisa cuti setelah pengajuan</div><div class="v">${sisa - d.days} hari</div>` : ''}
      <div class="k">Alasan</div><div class="v">${esc(d.reason)}</div>
      <div class="k">Lampiran</div><div class="v">${d.files.length ? d.files.map(f => esc(f.name)).join('<br>') : '—'}</div>
    </div></div>
    ${note('warn', `Pengajuan akan dikirim ke:<br>${steps.map((s, i) => `${i + 1}. ${s.label}${s.pid ? ' (' + esc(memberName(s.pid)) + ')' : ''}`).join('<br>')}<br>Anda akan mendapatkan notifikasi setelah ada keputusan.`)}
    <div class="btn-row"><button class="btn sec" ${act('back')}>Kembali</button><button class="btn pri" ${act('leaveSubmit')}>Kirim Pengajuan</button></div>` };
};
A.leaveSubmit = () => {
  const d = curS().p.data;
  const r = { id: uid('r'), kind: 'leave', requester: S.persona, created: new Date().toISOString(), status: 'Diproses', data: d, steps: leaveSteps() };
  S.requests.unshift(r); save();
  nav.stack = [nav.stack[0], { s: 'cuti', p: {} }, { s: 'cuti-riwayat', p: {} }].filter((x, i, a) => i === 0 || x.s !== a[0].s);
  go('req-d', { id: r.id }); toast('Pengajuan terkirim');
};
SCREENS['cuti-riwayat'] = p => {
  const t = p.tab || 'Semua';
  const mine = S.requests.filter(r => r.requester === S.persona && ['leave', 'overtime', 'swap'].includes(r.kind)).sort((a, b) => b.created.localeCompare(a.created));
  const L = mine.filter(r => t === 'Semua' || r.status === t);
  return {
    title: 'Riwayat Pengajuan', body: `
    ${tabs(['Semua', 'Diproses', 'Disetujui', 'Ditolak'].map(x => [x, x, x === 'Semua' ? 0 : 0]), t, 'rwTab')}
    <div class="card tight">${L.length ? L.map(r => { const [icn, c] = reqIcon(r); return li({ icon: icn, c, t: reqTitle(r), s: `${reqSub(r)}<br>Diajukan ${fDate(r.created)}`, right: statusPill(r.status), attrs: gp('req-d', { id: r.id }) }); }).join('') : '<div class="empty">Belum ada pengajuan</div>'}</div>` };
};
A.rwTab = v => { curS().p.tab = v; render(); };
SCREENS['cuti-saldo'] = () => {
  const used = S.cutiUsed[S.persona] || 0; const masa = Math.floor(daysBetween(parseYmd(me().masuk), today()) / 365);
  return {
    title: 'Saldo Cuti', body: `
    <div class="card"><div class="row"><div class="grow"><div class="small muted">Cuti Tahunan ${today().getFullYear()}</div><div style="font-size:30px;font-weight:750">${12 - used} <span class="small muted">/ 12 hari</span></div></div>${icoBox('umbrella', 'green')}</div>
      <div class="meter"><i style="width:${(12 - used) / 12 * 100}%;background:var(--g-600)"></i></div><div class="xs muted mt">Terpakai ${used} hari · termasuk potongan umrah/cuti bersama sesuai kebijakan</div></div>
    <div class="card tight">
      ${li({ icon: 'award', c: 'violet', t: 'Cuti Besar', s: masa >= 6 ? 'Eligible — masa kerja ' + masa + ' tahun' : `Belum eligible (masa kerja ${masa} dari 6 tahun)`, chev: false })}
      ${li({ icon: 'calendar', c: 'blue', t: 'Cuti Bersama', s: '3 hari dijadwalkan perusahaan (memotong cuti tahunan)', chev: false })}
      ${li({ icon: 'medkit', c: 'red', t: 'Izin Sakit', s: 'Tidak memotong saldo cuti (dengan surat dokter)', chev: false })}
    </div>` };
};
SCREENS['cuti-panduan'] = () => ({
  title: 'Panduan & Kebijakan', body: `<div class="card small" style="line-height:1.7">
  <div class="b">Ketentuan umum (contoh dummy)</div>
  • Cuti tahunan 12 hari kerja/tahun setelah masa kerja 12 bulan.<br>• Pengajuan cuti paling lambat 7 hari sebelumnya, kecuali darurat.<br>• Sakit lebih dari 1 hari wajib melampirkan surat dokter.<br>• Umrah memotong saldo cuti tahunan; haji diberikan sesuai kebijakan RS.<br>• Izin terlambat/pulang awal/keluar sementara dicatat per jam dan terhubung ke absensi.<br>• Pengajuan disetujui berjenjang: Kepala Unit → HRD. Jadwal & coverage otomatis diperbarui.<br>• Seluruh perubahan & approval tercatat di audit trail.</div>` });

/* ================= SAYA — Digital Employee Wallet ================= */
SCREENS.saya = () => {
  const p = me();
  const grp = (t, items) => `<div class="grp-t">${t}</div><div class="card tight">${items.map(([icn, c, label, scr, sub]) => li({ icon: icn, c, t: label, s: sub, attrs: scr.startsWith('tab:') ? `data-tab="${scr.slice(4)}"` : gp(scr) })).join('')}</div>`;
  return {
    title: 'Profil Saya', right: `<button class="ib" ${gp('settings')} aria-label="Pengaturan">${ic('gear', 20)}</button>`, body: `
    <div class="card row" ${gp('biodata')} style="cursor:pointer"><div class="avatar lg">${p.ini}</div><div class="grow"><div class="b">${esc(p.nama)}</div><div class="small muted">NIK ${p.nik}</div><div class="small">${esc(p.jabatan)}</div><div class="xs muted">${esc(RS[p.rs].nama)} · ${ROLES[p.role]}</div></div>${ic('chev', 18)}</div>
    ${grp('PROFIL', [['user', 'blue', 'Biodata Saya', 'biodata'], ['id', 'blue', 'Status Kepegawaian', 'status']])}
    ${grp('DOKUMEN & KARIER', [['layers', 'amber', 'File Kepegawaian', 'files'], ['file', 'red', 'Kontrak & SK', 'kontrak'], ['trend', 'violet', 'Riwayat Karier', 'karier']])}
    ${grp('KOMPENSASI', [['wallet', 'blue', 'Slip Gaji', 'slip'], ['gift', 'amber', 'Benefit', 'benefit']])}
    ${grp('KEHADIRAN', [['clock', 'red', 'Rekap Absen', 'rekap'], ['umbrella', 'amber', 'Cuti & Izin', 'cuti'], ['swap', 'violet', 'Tukar Dinas', 'tukar'], ['moon', 'amber', 'Lembur', 'lembur']])}
    ${grp('PROFESIONAL', [['shieldok', 'green', 'Legalitas Nakes', 'legal'], ['award', 'blue', 'Kredensial', 'kredensial'], ['cap', 'amber', 'Diklat & Sertifikat', 'diklat']])}
    <div class="xs muted" style="text-align:center;margin-top:16px">SIMPEGRS v2.0 · prototype · data fiktif</div>` };
};
SCREENS.biodata = () => {
  const p = me();
  return {
    title: 'Biodata Saya', body: `
    <div class="card"><div class="b mb">Data Pribadi</div><div class="kv"><div class="k">Nama lengkap</div><div class="v">${esc(p.nama)}</div><div class="k">NIK Pegawai</div><div class="v">${p.nik}</div><div class="k">Tempat, tgl lahir</div><div class="v">Tangerang, 12 Mei 1985</div><div class="k">Jenis kelamin</div><div class="v">${['p2', 'p4'].includes(p.id) ? 'Perempuan' : 'Laki-laki'}</div><div class="k">Agama</div><div class="v">Islam</div><div class="k">Status nikah</div><div class="v">Menikah</div><div class="k">Golongan darah</div><div class="v">O</div></div></div>
    <div class="card"><div class="b mb">Kontak & Alamat</div><div class="kv"><div class="k">Email</div><div class="v">${p.short.toLowerCase()}@rssariasih.example</div><div class="k">No. HP</div><div class="v">0812-xxxx-${p.nik.slice(-4)}</div><div class="k">Alamat</div><div class="v">Jl. Contoh No. ${p.nik.slice(-2)}, Karawaci, Kota Tangerang</div><div class="k">Kontak darurat</div><div class="v">Pasangan · 0813-xxxx-1122</div></div></div>
    ${note('info', 'Perubahan data diajukan ke HR untuk diverifikasi. Data resmi tidak berubah sebelum disetujui.')}
    <button class="btn sec block" ${act('toast', 'Permintaan perubahan data dikirim ke HR (dummy)')}>${ic('pen', 16)} Ajukan Perubahan Data</button>` };
};
SCREENS.status = () => {
  const p = me(); const masa = daysBetween(parseYmd(p.masuk), today()); const th = Math.floor(masa / 365), bl = Math.floor((masa % 365) / 30);
  return {
    title: 'Status Kepegawaian', body: `<div class="card"><div class="row mb">${statusPill('Aktif')}<span class="small muted">${esc(p.status)}</span></div><div class="kv">
    <div class="k">Jabatan</div><div class="v">${esc(p.jabatan)}</div><div class="k">Unit</div><div class="v">${esc(p.unit)}</div><div class="k">Rumah Sakit</div><div class="v">${esc(RS[p.rs].nama)}</div><div class="k">Kelompok</div><div class="v">${esc(p.profesi)}</div>
    <div class="k">Tanggal masuk</div><div class="v">${fDate(p.masuk)}</div><div class="k">Masa kerja</div><div class="v">${th} tahun ${bl} bulan</div><div class="k">Pola kerja</div><div class="v">${p.pola === 'shift' ? 'Shift' : 'Non-shift'}</div>
    <div class="k">Atasan langsung</div><div class="v">${p.atasan ? esc(memberName(p.atasan)) : '—'}</div><div class="k">Peran sistem</div><div class="v">${ROLES[p.role]}</div></div></div>` };
};
SCREENS.files = p => {
  const q = (p.q || '').toLowerCase();
  return {
    title: 'File Kepegawaian', body: `
    ${note('info', 'Digital personnel file. Anda dapat mengunggah/memperbarui dokumen tertentu — <b>HR yang memverifikasi</b>. Legalitas Nakes dikelola terpisah.')}
    <div class="card tight">${FILE_CATS.filter(c => !q || c.nama.toLowerCase().includes(q)).map(c => li({ icon: c.icon, c: c.c, t: c.nama, s: `${c.desc}<br>${c.docs.length} dokumen`, right: statusPill(c.status), attrs: gp('filecat', { id: c.id }) })).join('')}</div>
    ${S.docUploads.filter(u => u.pid === S.persona).length ? secT('Riwayat Unggahan') + `<div class="card tight">${S.docUploads.filter(u => u.pid === S.persona).map(u => li({ icon: 'upload', c: 'teal', t: u.doc, s: `${esc(u.file)} · ${fDate(u.at)}`, right: statusPill(u.status), attrs: gp('req-d', { id: u.reqId }) })).join('')}</div>` : ''}` };
};
SCREENS.filecat = p => {
  const c = FILE_CATS.find(x => x.id === p.id); const ok = c.docs.filter(d => d.s === 'Terverifikasi').length;
  return {
    title: c.nama, body: `
    <div class="card row">${icoBox(c.icon, c.c)}<div class="grow"><div class="b">${c.nama}</div><div class="xs muted">${c.desc}</div></div><span class="pill p-green">${ok} dari ${c.docs.length} terverifikasi</span></div>
    ${c.docs.map(d => { const up = S.docUploads.find(u => u.pid === S.persona && u.doc === d.nama && u.status !== 'Terverifikasi'); return `<div class="card">
      <div class="row"><div class="ico c-gray" style="width:56px;height:40px">${ic('id', 22)}</div><div class="grow"><div class="b">${esc(d.nama)}</div><div class="xs muted">${esc(d.no)}</div>${d.exp ? `<div class="xs muted">${esc(d.exp)}</div>` : ''}</div>${statusPill(up ? 'Menunggu Verifikasi' : d.s)}</div>
      <div class="btn-row mt"><button class="btn ghost sm" ${act('previewDoc', d.nama)}>${ic('eye', 14)} Lihat</button><button class="btn ghost sm" ${act('toast', 'Mengunduh ' + d.nama + ' (dummy)')}>${ic('download', 14)} Download</button><button class="btn sec sm" ${gp('upload', { doc: d.nama })}>${ic('upload', 14)} Upload Baru</button></div></div>`; }).join('')}` };
};
A.previewDoc = n => sheet(`<h3>${esc(n)}</h3><div class="preview"></div><div class="xs muted">Pratinjau dokumen (dummy). Dokumen resmi hanya dapat dilihat & diunduh oleh pemilik dan HR.</div>`);
SCREENS.upload = p => {
  const f = F(); f.files ||= []; f.doc ||= p.doc || 'KTP';
  const hist = S.docUploads.filter(u => u.pid === S.persona && u.doc === f.doc);
  return {
    title: 'Upload Dokumen', body: `
    <div class="card row">${icoBox('id', 'blue')}<div class="grow"><div class="b">${esc(f.doc)}</div><div class="xs muted">Unggah versi terbaru dengan format JPG, PNG atau PDF. Maksimal 5 MB.</div></div></div>
    ${fld('Pilih File', filesBlock(f.files, 'files', 'Pilih file'), true)}
    ${fld('Jenis Dokumen', sel('doc', [...new Set([f.doc, ...FILE_CATS.flatMap(c => c.docs.map(d => d.nama)), 'STR', 'SIP'])]))}
    ${fld('Catatan (opsional)', txt('note', 'maxlength="200" placeholder="Contoh: mengganti versi terbaru karena masa berlaku akan berakhir"'))}
    <button class="btn pri block" ${act('uploadDoc')}>Ajukan Pembaruan</button>
    ${note('info', 'Setelah diajukan, dokumen akan diverifikasi oleh tim HR. Anda akan mendapatkan notifikasi hasil verifikasi melalui Inbox.')}
    ${secT('Riwayat Verifikasi')}
    <div class="card">${timeline([...hist.map(u => ({ t: `${statusPill(u.status)} ${esc(u.file)}`, s: fDT(u.at), st: u.status === 'Terverifikasi' ? 'done' : u.status === 'Ditolak' ? 'rej' : 'cur' })), { t: statusPill('Disetujui') + ' Versi sebelumnya', s: 'Dokumen diverifikasi tim HR · Catatan: data sesuai', st: 'done' }])}</div>` };
};
A.uploadDoc = () => {
  const f = F(); if (!f.files.length) return toast('Pilih file terlebih dahulu');
  const now = new Date().toISOString(); const file = f.files[0];
  const r = { id: uid('r'), kind: 'doc', requester: S.persona, created: now, status: 'Diproses', data: { doc: f.doc, file: file.name, size: file.size, note: f.note }, steps: [{ label: 'Verifikasi HR', roles: ['hr'], status: 'pending' }] };
  S.requests.unshift(r); S.docUploads.unshift({ pid: S.persona, doc: f.doc, file: file.name, at: now, status: 'Menunggu Verifikasi', reqId: r.id });
  save(); back(); toast('Dokumen diajukan untuk verifikasi HR');
};
S.requests.forEach(r => { if (r.kind === 'doc' && r.status !== 'Diproses') { const u = S.docUploads.find(x => x.reqId === r.id); if (u) u.status = r.status === 'Disetujui' ? 'Terverifikasi' : 'Ditolak'; } });

SCREENS.kontrak = p => {
  const t = p.tab || 'semua'; const all = kontrakFor(S.persona);
  const L = all.filter(k => t === 'semua' || (t === 'aktif' ? k.status === 'Berlaku' : k.status !== 'Berlaku'));
  const exp = all.find(k => k.akhir && k.status === 'Berlaku' && daysBetween(today(), parseYmd(k.akhir)) < 120);
  return {
    title: 'Kontrak & SK', body: `
    ${exp ? note('warn', `<b>${esc(exp.nama)}</b> berakhir dalam ${daysBetween(today(), parseYmd(exp.akhir))} hari (${fDate(exp.akhir)}). HR telah dinotifikasi untuk proses perpanjangan.`) : ''}
    ${tabs([['semua', `Semua (${all.length})`], ['aktif', `Aktif (${all.filter(k => k.status === 'Berlaku').length})`], ['riwayat', `Riwayat (${all.filter(k => k.status !== 'Berlaku').length})`]], t, 'kTab')}
    <div class="card tight">${L.map(k => li({ icon: 'file', c: k.jenis === 'Kontrak Kerja' ? 'red' : k.status === 'Berlaku' ? 'blue' : 'violet', t: esc(k.nama), s: `No. ${esc(k.no)}<br>Tanggal ${fDate(k.terbit)}`, right: k.ack && !S.ack[S.persona + k.id] ? statusPill('Perlu Acknowledgment') : statusPill(k.status), attrs: gp('kontrak-d', { id: k.id }) })).join('')}</div>` };
};
A.kTab = v => { curS().p.tab = v; render(); };
SCREENS['kontrak-d'] = p => {
  const k = kontrakFor(S.persona).find(x => x.id === p.id); const acked = S.ack[S.persona + k.id];
  return {
    title: 'Detail Kontrak / SK', body: `
    <div class="card row">${icoBox('file', 'blue')}<div class="grow"><div class="b">${esc(k.nama)}</div><div class="xs muted">No. ${esc(k.no)}</div></div>${statusPill(k.status)}</div>
    <div class="preview"></div>
    <div class="card"><div class="kv"><div class="k">Jenis Dokumen</div><div class="v">${esc(k.jenis)}</div><div class="k">Status</div><div class="v">${statusPill(k.status)}</div><div class="k">Tanggal Terbit</div><div class="v">${fDate(k.terbit)}</div><div class="k">Tanggal Berakhir</div><div class="v">${k.akhir ? fDate(k.akhir) : '—'}</div><div class="k">Dikeluarkan oleh</div><div class="v">Direktur<br>${esc(RS[me().rs].nama)}</div>${k.ket ? `<div class="k">Keterangan</div><div class="v">${esc(k.ket)}</div>` : ''}</div></div>
    <div class="lockbar">${ic('lock', 16)}<div>Dokumen resmi — <b>tidak dapat diedit</b> oleh pegawai. Versi & audit trail dikelola HR.</div></div>
    ${k.ack ? acked ? note('ok', `Anda telah menyatakan membaca & memahami dokumen ini pada ${fDT(acked)}.`) : `<button class="btn sec block mb" ${act('ack', k.id)}>${ic('check', 16)} Saya telah membaca & memahami</button>` : ''}
    <button class="btn pri block" ${act('toast', 'Mengunduh dokumen (dummy)')}>${ic('download', 16)} Download Dokumen</button>` };
};
A.ack = id => { S.ack[S.persona + id] = new Date().toISOString(); save(); toast('Acknowledgment tercatat di audit trail'); };
SCREENS.karier = () => ({
  title: 'Riwayat Karier', body: `<div class="card"><div class="tl">${karierFor(S.persona).map(k => `<div class="it"><div class="dot ${k.now ? 'done' : 'done'}">${ic('trend', 10, 3)}</div><div class="row top"><div style="width:62px"><div class="b">${k.y}</div><div class="xs muted">${k.d}</div></div><div class="grow"><div class="t">${k.t}</div><div class="s">${k.j}<br>${esc(RS[me().rs].nama)}</div></div>${k.now ? statusPill('Saat Ini') : ''}</div></div>`).join('')}</div></div>` });
SCREENS.slip = () => {
  const T = today(); const months = [...Array(6)].map((_, i) => new Date(T.getFullYear(), T.getMonth() - i - (T.getDate() < 25 ? 1 : 0), 1));
  const net = slipCalc(0).net;
  return {
    title: 'Slip Gaji', right: `<button class="ib" ${act('toggleMoney')} aria-label="Sembunyikan nominal">${ic(S.hideMoney ? 'eyeoff' : 'eye', 20)}</button>`, body: `
    <div class="hero" style="margin-top:0"><div class="lbl">${ic('wallet', 14)} Gaji bersih terakhir · ${BULAN[months[0].getMonth()]} ${months[0].getFullYear()}</div><div class="big money">${S.hideMoney ? 'Rp ••••••••' : rupiah(net)}</div><div class="small" style="opacity:.85">Ditransfer ke Bank Mandiri ****7890</div></div>
    ${secT('Riwayat Slip')}
    <div class="card tight">${months.map((m, i) => li({ icon: 'file', c: 'green', t: `${BULAN[m.getMonth()]} ${m.getFullYear()}`, s: `Dibayar 25 ${BLN3[m.getMonth()]} ${m.getFullYear()}`, right: `<span class="small b money">${S.hideMoney ? '••••••' : rupiah(slipCalc(i).net)}</span>`, attrs: gp('slip-d', { i, label: `${BULAN[m.getMonth()]} ${m.getFullYear()}` }) })).join('')}</div>
    ${note('info', 'Slip dilindungi PIN saat diunduh. Komponen berasal dari Payroll (jadwal, lembur, absensi, dan payroll events).')}` };
};
A.toggleMoney = () => { S.hideMoney = !S.hideMoney; save(); render(); };
function slipCalc(i) {
  const g = me().gaji; const v = [1, .97, 1.02, 1, .99, 1.01][i] || 1;
  const pend = [['Gaji Pokok', g * .55], ['Tunjangan Jabatan', g * .15], ['Tunjangan Profesi', g * .1], ['Jasa Pelayanan', g * .15 * v], ['Lembur', me().pola === 'shift' ? 450000 * v : 0], ['Tunjangan Shift Malam', me().pola === 'shift' ? 320000 : 0]].filter(x => x[1]);
  const gross = pend.reduce((a, x) => a + x[1], 0);
  const pot = [['BPJS Kesehatan (1%)', g * .01], ['BPJS Ketenagakerjaan (3%)', g * .03], ['PPh 21', gross * (g > 20e6 ? .12 : .03)], ['Koperasi', 150000]];
  const tp = pot.reduce((a, x) => a + x[1], 0);
  return { pend, pot, gross, tp, net: gross - tp };
}
SCREENS['slip-d'] = p => {
  const s = slipCalc(p.i); const m = v => S.hideMoney ? '••••••' : rupiah(v);
  return {
    title: 'Slip ' + p.label, right: `<button class="ib" ${act('toggleMoney')}>${ic(S.hideMoney ? 'eyeoff' : 'eye', 20)}</button>`, body: `
    <div class="card"><div class="b mb">Pendapatan</div>${s.pend.map(([k, v]) => `<div class="row small" style="padding:4px 0"><div class="grow">${k}</div><div class="money">${m(v)}</div></div>`).join('')}<div class="row b" style="border-top:1px solid var(--line);padding-top:6px;margin-top:4px"><div class="grow">Total Pendapatan</div><div class="money">${m(s.gross)}</div></div></div>
    <div class="card"><div class="b mb">Potongan</div>${s.pot.map(([k, v]) => `<div class="row small" style="padding:4px 0"><div class="grow">${k}</div><div class="money" style="color:var(--red)">-${m(v)}</div></div>`).join('')}<div class="row b" style="border-top:1px solid var(--line);padding-top:6px;margin-top:4px"><div class="grow">Total Potongan</div><div class="money">-${m(s.tp)}</div></div></div>
    <div class="card row" style="background:var(--g-50)"><div class="grow b">Gaji Bersih (Take Home Pay)</div><div class="b money" style="font-size:18px;color:var(--g-700)">${m(s.net)}</div></div>
    <button class="btn pri block" ${act('toast', 'Slip PDF terproteksi PIN diunduh (dummy)')}>${ic('download', 16)} Unduh PDF</button>` };
};
SCREENS.benefit = () => ({
  title: 'Benefit', body: `<div class="card tight">
  ${li({ icon: 'shield', c: 'green', t: 'BPJS Kesehatan', s: 'Kelas 1 · Aktif · 4 tanggungan', right: statusPill('Aktif'), chev: false })}
  ${li({ icon: 'briefcase', c: 'blue', t: 'BPJS Ketenagakerjaan', s: 'JHT, JKK, JKM, JP · Aktif', right: statusPill('Aktif'), chev: false })}
  ${li({ icon: 'heart', c: 'red', t: 'Fasilitas Berobat Pegawai & Keluarga', s: 'Plafon rawat jalan Rp 5.000.000/thn · terpakai 32%', chev: false })}
  ${li({ icon: 'gift', c: 'amber', t: 'Tunjangan Hari Raya', s: '1x gaji pokok · dibayarkan H-14', chev: false })}
  ${li({ icon: 'cap', c: 'violet', t: 'Dukungan Pendidikan', s: 'Beasiswa internal & ikatan dinas', chev: false })}</div>
  <div class="card"><div class="b">Plafon berobat</div><div class="meter"><i style="width:32%;background:var(--g-600)"></i></div><div class="xs muted mt">${S.hideMoney ? 'Rp ••••' : 'Rp 1.600.000'} terpakai dari ${S.hideMoney ? 'Rp ••••' : 'Rp 5.000.000'}</div></div>` });
SCREENS.legal = () => {
  const L = legalFor(S.persona);
  if (!L.length) return { title: 'Legalitas Nakes', body: '<div class="empty">Anda tercatat sebagai tenaga non-kesehatan. Legalitas nakes tidak diperlukan.</div>' };
  return {
    title: 'Legalitas Nakes', body: `
    ${note('info', 'Legalitas dipisah dari File Kepegawaian dan dimonitor otomatis. Pengingat dikirim 90, 60, 30, dan 7 hari sebelum berakhir.')}
    ${L.map(l => { const dd = daysBetween(today(), parseYmd(l.akhir)); const pct = Math.max(4, Math.min(100, dd / 365 * 100)); const c = dd < 60 ? 'var(--amber)' : 'var(--g-600)'; return `<div class="card"><div class="row">${icoBox('shieldok', dd < 60 ? 'amber' : 'green')}<div class="grow"><div class="b">${l.nama}</div><div class="xs muted">${esc(l.no)}</div></div>${statusPill(l.status)}</div>
      <div class="meter"><i style="width:${pct}%;background:${c}"></i></div><div class="row xs mt"><div class="grow muted">Berlaku s.d. ${fDate(l.akhir)}</div><b style="color:${c}">${dd} hari lagi</b></div>
      ${dd < 60 ? `<button class="btn sec sm mt" ${gp('upload', { doc: l.nama.split(' ')[0] })}>${ic('upload', 14)} Unggah Dokumen Pembaruan</button>` : ''}</div>`; }).join('')}` };
};
SCREENS.kredensial = () => ({
  title: 'Kredensial', body: isNakes() ? `
  <div class="card"><div class="row">${icoBox('award', 'blue')}<div class="grow"><div class="b">Surat Penugasan Klinis (SPK)</div><div class="xs muted">Komite ${me().profesi === 'Dokter' ? 'Medik' : 'Keperawatan'} · ${esc(RS[me().rs].nama)}</div></div>${statusPill('Berlaku')}</div><div class="xs muted mt">Berlaku s.d. ${fDate(addDays(today(), 520))}</div></div>
  <div class="card"><div class="row">${icoBox('file', 'violet')}<div class="grow"><div class="b">Rincian Kewenangan Klinis (RKK)</div><div class="xs muted">${me().profesi === 'Perawat' ? 'Perawat Klinik III — ICU' : 'Kewenangan klinis sesuai kompetensi'}</div></div>${statusPill('Berlaku')}</div></div>
  <div class="card"><div class="row">${icoBox('history', 'amber')}<div class="grow"><div class="b">Rekredensial berikutnya</div><div class="xs muted">Dijadwalkan ${fDate(addDays(today(), 430))}</div></div></div></div>` : '<div class="empty">Kredensial klinis hanya untuk tenaga kesehatan.</div>' });
SCREENS.diklat = () => {
  const jpl = DIKLAT.filter(d => d.status === 'Selesai').reduce((a, d) => a + d.jpl, 0);
  return {
    title: 'Diklat & Sertifikat', body: `
    <div class="card"><div class="row"><div class="grow"><div class="small muted">Jam pelatihan tahun ini</div><div style="font-size:26px;font-weight:750">${jpl} <span class="small muted">/ 20 JPL</span></div></div>${icoBox('cap', 'blue')}</div><div class="meter"><i style="width:${jpl / 20 * 100}%;background:var(--blue)"></i></div></div>
    <div class="card tight">${DIKLAT.map(d => li({ icon: d.sert ? 'award' : 'cap', c: d.status === 'Selesai' ? 'green' : d.status === 'Belum' ? 'amber' : 'blue', t: esc(d.nama), s: `${d.wajib ? '<b>Wajib</b> · ' : ''}${d.jpl} JPL · ${d.tgl}`, right: statusPill(d.status), attrs: d.sert ? act('previewDoc', 'Sertifikat ' + d.nama) : act('toast', 'Pendaftaran pelatihan (dummy)') })).join('')}</div>` };
};

/* ================= Pengaturan / Mode demo ================= */
SCREENS.settings = () => ({
  title: 'Pengaturan', body: `
  <div class="grp-t">MODE DEMO — GANTI PERSONA</div>
  <div class="card tight">${Object.values(PERSONAS).map(p => `<div class="li" ${act('persona', p.id)}><div class="avatar">${p.ini}</div><div class="grow"><div class="t">${esc(p.nama)}</div><div class="s">${esc(p.jabatan)} · ${ROLES[p.role]} · ${p.pola === 'shift' ? 'Shift' : 'Non-shift'}</div></div>${S.persona === p.id ? '<span class="pill p-green">Aktif</span>' : ''}</div>`).join('')}</div>
  <div class="grp-t">PERSONALISASI</div>
  <div class="card tight">${li({ icon: 'grid', c: 'green', t: 'Atur Akses Cepat', s: 'Pilih & urutkan menu di Home', attrs: gp('quick-edit') })}</div>
  <div class="grp-t">KEAMANAN</div>
  <div class="card tight">
    ${li({ icon: 'phone', c: 'blue', t: 'Perangkat terdaftar', s: 'SM-S918B · a1f3…9c · terikat sejak 8 hari lalu', chev: false, right: statusPill('Aktif') })}
    ${li({ icon: 'lock', c: 'amber', t: 'PIN Tanda Tangan Internal', s: 'Demo PIN: 123456', chev: false })}
    ${li({ icon: 'finger', c: 'violet', t: 'Biometrik', s: 'Untuk login & TTE internal', chev: false, right: '<label class="switch"><input type="checkbox" checked><span></span></label>' })}
  </div>
  <div class="grp-t">TENTANG PROTOTIPE</div>
  <div class="card small" style="line-height:1.6">Dibuat dari Decision Log SIMPEGRS v2.0: navigasi Home–Jadwal–Absen–Inbox–Saya, Home "Hari Ini", Akses Cepat personal, Cuti & Izin, Trusted Attendance, e-Office di Inbox, TTE internal RS, AI Asisten Surat, Digital Employee Wallet, dan Jadwal & Shift sebagai source of truth.</div>
  <button class="btn danger block mt" ${act('resetAll')}>${ic('refresh', 16)} Reset semua data demo</button>` });
A.persona = id => { S.persona = id; ui.absen = null; save(); nav = { tab: 'home', stack: [{ s: 'home', p: {} }] }; render(true); toast('Masuk sebagai ' + PERSONAS[id].short + ' (' + ROLES[PERSONAS[id].role] + ')'); };
A.resetAll = () => { if (!confirm('Reset semua data demo ke kondisi awal?')) return; S = buildSeed(); save(); ui = { sheet: null, toast: null }; nav = { tab: 'home', stack: [{ s: 'home', p: {} }] }; render(true); toast('Data demo direset'); };

/* ================= Boot ================= */
function tickStatus() { const el = document.getElementById('sb-time'); if (el) el.textContent = fTime(new Date()); }
tickStatus(); setInterval(tickStatus, 15000);
render(true);
