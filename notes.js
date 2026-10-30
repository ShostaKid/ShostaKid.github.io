// =============================================
// NOTES · THE LISTENING ROOM
// Script cổ điển (nạp sau app.js, dùng lại dtEl / ganCon / dtIcon / t / laVi / dtNgay /
// laDienThoai / openFic / stopMusic của nó). Dữ liệu do module Supabase cấp qua
// window.fetchNotesFromDB. Mọi thứ dựng bằng createElement/textContent — nội dung note
// là văn bản thường, không bao giờ qua innerHTML.
//
// Âm thanh: MỘT <audio> riêng của phòng nghe, tách khỏi trình phát toàn cục của app.js.
// Vào phòng thì app.js đã stopMusic() (showPage); bấm phát thì ta stopMusic() lần nữa cho chắc;
// rời phòng (ntRoi) thì tạm dừng. Nhờ vậy hai bên không bao giờ chồng tiếng.
// Chỉ nguồn mp3 trực tiếp (github / musopen / archive) mới có thanh thời gian + cue.
// SoundCloud là iframe, không seek được từ ngoài → hiện link nghe ngoài, cue không bấm được.
// =============================================
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const NT = {
    notes: [], sel: 0, preview: false, loaded: false, loading: false, failed: false,
    open: false,          // điện thoại: tờ note đang mở
    dur: 0, playing: false
  };
  let A = null;           // <audio> của phòng nghe
  let R = {};             // tham chiếu tới các phần tử cần cập nhật mỗi nhịp (không dựng lại)
  let mini = null;        // thanh phát nhỏ (điện thoại), gắn vào <body>

  const $ = id => document.getElementById(id);
  const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const cur = () => NT.notes[NT.sel] || null;
  const coAmThanh = n => !!n && n.source !== 'soundcloud';

  // ---- dữ liệu: chuẩn hoá hàng từ DB (cues là jsonb do người viết, đừng tin kiểu) ----
  function chuanHoa(r) {
    const cues = (Array.isArray(r.cues) ? r.cues : [])
      .map(c => ({ t: Number(c && c.t), text: String((c && c.text) || '') }))
      .filter(c => isFinite(c.t) && c.t >= 0)
      .sort((a, b) => a.t - b.t);
    const fics = (r.note_works || []).map(x => x && x.works).filter(Boolean).map(w => ({
      idx: /^fic-\d+$/.test(w.legacy_id || '') ? parseInt(w.legacy_id.slice(4), 10) : null,
      title: w.title, sub: w.subtitle || ''
    }));
    return {
      id: r.id, title: r.title, piece: r.piece, composer: r.composer, opus: r.opus || '',
      short: r.short_name || (r.composer || '').split(' ').pop(),
      source: r.source, url: r.url, start: r.start_s || 0, icon: r.icon || 'note', sleeve: /^#[0-9a-f]{6}$/i.test(r.sleeve) ? r.sleeve : '#2B3350',
      paras: String(r.body || '').split(/\n{2,}/).map(s => s.trim()).filter(Boolean),
      quote: r.quote || '', cues, fics, date: r.published_at, draft: r.status !== 'published'
    };
  }

  async function nap(lanSau) {
    if (NT.loading) return;
    NT.loading = true;
    const kq = window.fetchNotesFromDB ? await window.fetchNotesFromDB() : null;
    NT.loading = false;
    if (!kq) {
      if (lanSau && NT.notes.length) return;    // nạp lại nền thất bại: giữ nguyên cái đang có
      NT.failed = true; NT.loaded = true; ve(); return;
    }
    NT.failed = false; NT.loaded = true;
    const truoc = cur() && cur().id;
    NT.notes = kq.rows.map(chuanHoa); NT.preview = kq.preview;
    const i = NT.notes.findIndex(n => n.id === truoc);
    NT.sel = i >= 0 ? i : 0;
    chonBai(NT.sel, { giuMo: true, khongDung: i >= 0 });
  }

  // ---- âm thanh ----
  function amThanh() {
    if (A) return A;
    A = new Audio();
    A.preload = 'metadata';
    A.addEventListener('loadedmetadata', () => {
      NT.dur = isFinite(A.duration) ? A.duration : 0;
      const n = cur();
      // Bắt đầu từ mốc start của note (nhạc dài, đoạn hay nằm giữa file) — chỉ khi chưa tua tay.
      if (n && n.start && A.currentTime < 1 && n.start < NT.dur - 1) { try { A.currentTime = n.start; } catch (_) {} }
      datCue(); capNhatGio();
    });
    A.addEventListener('timeupdate', capNhatGio);
    A.addEventListener('play', () => datDangPhat(true));
    A.addEventListener('pause', () => datDangPhat(false));
    A.addEventListener('ended', () => { datDangPhat(false); try { A.currentTime = 0; } catch (_) {} capNhatGio(); });
    A.addEventListener('error', () => { datDangPhat(false); if (R.loi) R.loi.textContent = t('nt_err_track'); });
    return A;
  }
  function datDangPhat(b) {
    NT.playing = b;
    const root = $('page-notes'); if (root) root.classList.toggle('nt-playing', b);
    if (mini) mini.classList.toggle('nt-playing', b);
    document.querySelectorAll('.nt-play').forEach(x => x.setAttribute('aria-label', t(b ? 'nt_pause' : 'nt_play')));
    if (R.kicker) R.kicker.textContent = t(b ? 'nt_playing_state_on' : 'nt_playing_state_off');
  }
  function nap1(n) {           // gắn bài của note vào <audio>, chưa phát
    const a = amThanh();
    a.pause();
    NT.dur = 0;
    if (R.loi) R.loi.textContent = '';
    datNguonAm(a, coAmThanh(n) ? n.url : null);   // <source type=…>: iOS không phát file Release nếu chỉ có a.src (xem app.js)
    a.load();
    datDangPhat(false);
  }
  function batTat() {
    const n = cur(); if (!coAmThanh(n)) return;
    const a = amThanh();
    if (a.paused) {
      if (typeof stopMusic === 'function') stopMusic();   // tắt nhạc toàn cục, không chồng tiếng
      if (R.loi) R.loi.textContent = '';
      a.play().catch(() => { if (R.loi) R.loi.textContent = t('nt_err_track'); });
    } else a.pause();
  }
  function tuaToi(giay, phat) {
    const n = cur(); if (!coAmThanh(n)) return;
    const a = amThanh();
    try { a.currentTime = giay; } catch (_) {}
    if (phat && a.paused) batTat();
    capNhatGio();
  }
  function tamDung() { if (A && !A.paused) A.pause(); }

  // ---- cập nhật mỗi nhịp (không dựng lại DOM) ----
  function capNhatGio() {
    const n = cur(); if (!n) return;
    const c = A ? A.currentTime : 0, d = NT.dur;
    const pct = d ? Math.min(100, c / d * 100) : 0;
    if (R.fill) R.fill.style.width = pct + '%';
    if (R.knob) R.knob.style.left = pct + '%';
    if (R.pos) R.pos.textContent = fmt(c);
    if (R.len) R.len.textContent = d ? fmt(d) : '–:––';
    if (R.seek && document.activeElement !== R.seek) R.seek.value = d ? Math.round(c / d * 1000) : 0;
    if (mini) {
      mini.querySelector('.nt-mini-fill').style.width = pct + '%';
      mini.querySelector('.nt-mini-time').textContent = fmt(c) + ' / ' + (d ? fmt(d) : '–:––') + ' · ' + n.short;
    }
    let on = -1;
    n.cues.forEach((q, k) => { if (c >= q.t - 0.25) on = k; });
    if (!(c > n.start + 0.5 || NT.playing)) on = -1;
    (R.cueRows || []).forEach((el, k) => el.classList.toggle('on', k === on));
    (R.cueDots || []).forEach((el, k) => el.classList.toggle('on', k === on));
  }
  function datCue() {
    (R.cueDots || []).forEach((el, k) => {
      const q = cur().cues[k];
      el.style.display = NT.dur && q.t <= NT.dur ? '' : 'none';
      el.style.left = NT.dur ? (q.t / NT.dur * 100) + '%' : '0';
    });
  }

  // ---- chọn bài ----
  function chonBai(i, o) {
    o = o || {};
    if (!NT.notes.length) { ve(); return; }
    NT.sel = (i + NT.notes.length) % NT.notes.length;
    if (!o.khongDung) nap1(cur());
    if (!o.giuMo) NT.open = !!o.mo;
    ve();
    if (o.khongDung) { datCue(); capNhatGio(); }
  }

  // ---- dựng giao diện ----
  const E = (tag, cls, ...con) => ganCon(dtEl(tag, cls ? { class: cls } : null), ...con);
  function svg(html, w, h, vb) {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('width', w); s.setAttribute('height', h); s.setAttribute('viewBox', vb);
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.5');
    html.forEach(d => { const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); s.append(p); });
    return s;
  }
  const iPlay = () => { const s = svg(['M7 4v14l12-7z'], 22, 22, '0 0 22 22'); s.setAttribute('fill', 'currentColor'); s.setAttribute('stroke', 'none'); s.setAttribute('class', 'nt-i-play'); return s; };
  const iPause = () => { const s = svg(['M5 4h4v14H5z', 'M13 4h4v14h-4z'], 22, 22, '0 0 22 22'); s.setAttribute('fill', 'currentColor'); s.setAttribute('stroke', 'none'); s.setAttribute('class', 'nt-i-pause'); return s; };
  const nutTronPlayPause = (cls) => {
    const b = dtEl('button', { type: 'button', class: 'nt-play' + (cls ? ' ' + cls : ''), 'aria-label': t('nt_play') });
    ganCon(b, iPlay(), iPause()); b.addEventListener('click', batTat);
    if (!coAmThanh(cur())) b.disabled = true;
    return b;
  };
  const fmtNgay = d => d ? new Date(d).toLocaleDateString(laVi() ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const soFic = n => n.fics.length === 1 ? n.fics[0].title : n.fics.length ? t('nt_n_fics').replace('{n}', n.fics.length) : t('nt_no_fic');
  const moFic = idx => e => {
    if (idx == null) return;
    e.preventDefault(); tamDung();
    if (typeof openFic === 'function') openFic(idx);
  };

  // ---- "Chamber Radio" (giao diện mới, 10/2026) ----
  // Mỗi note là một "đài" trên núm dò: tần số giả rải đều 88.1–105.9 MHz theo thứ tự trên bàn.
  // Note có gắn fic = "Programme notes"; note không gắn fic = "Off the record".
  const tanSo = k => (88.1 + (NT.notes.length > 1 ? k * 17.8 / (NT.notes.length - 1) : 0)).toFixed(1);
  const viTriDial = f => ((f - 87) / 22) * 100;   // thang hiện 87–109

  function ve() {
    const root = $('nt-root'); if (!root) return;
    root.textContent = '';
    R = {};
    const n = cur();
    if (mini) mini.hidden = true;
    const adm = window.skLaAdmin ? E('div', 'nt-adm rd-wrap',
      dtEl('button', { type: 'button', class: 'mini-btn', onclick: () => window.ntAdminMo && window.ntAdminMo(null) }, t('nta_new')),
      dtEl('button', { type: 'button', class: 'mini-btn', onclick: () => showPage('notes-admin', null) }, t('nta_manage'))) : null;
    const dau = E('header', 'cr-head', E('div', 'rd-wrap cr-head-in',
      E('div', null,
        E('div', 'rd-crumb',
          dtEl('button', { type: 'button', onclick: () => showPage('home', document.querySelector('.nav-links a[data-page="home"]')) }, t('nav_home')),
          dtEl('span', { 'aria-hidden': 'true' }, '›'), E('span', null, t('nav_notes')),
          dtEl('span', { 'aria-hidden': 'true' }, '›'), E('span', 'cr-crumb-on', t('cr_onair'))),
        E('h1', 'cr-title', t('cr_title'), E('small', null, 'FM 33.3'))),
      E('p', 'cr-lead', t('cr_lead'))));

    if (!NT.loaded || (NT.loading && !n)) { ganCon(root, dau, E('p', 'nt-empty', t('nt_loading'))); return; }
    if (NT.failed) { ganCon(root, dau, adm, E('p', 'nt-empty', t('nt_failed'))); return; }
    if (!n) { ganCon(root, dau, adm, E('p', 'nt-empty', t('nt_empty'))); return; }

    // -- đang phát sóng: thông tin + điều khiển bên trái, đĩa bên phải --
    const track = E('div', 'nt-track');
    R.fill = E('div', 'nt-track-fill'); R.knob = E('div', 'nt-knob');
    R.seek = dtEl('input', { type: 'range', class: 'nt-seek', min: 0, max: 1000, step: 1, value: 0, 'aria-label': t('nt_seek') });
    R.seek.addEventListener('input', () => { if (NT.dur) tuaToi(R.seek.value / 1000 * NT.dur, false); });
    ganCon(track, E('div', 'nt-track-bg'), R.fill, R.seek);
    R.cueDots = n.cues.map(q => {
      const b = dtEl('button', { type: 'button', class: 'nt-cue-dot', 'aria-label': t('nt_jump') + ' ' + fmt(q.t) });
      b.append(E('span')); b.addEventListener('click', () => tuaToi(q.t, true)); track.append(b); return b;
    });
    track.append(R.knob);
    R.pos = E('span', null, '0:00'); R.len = E('span', null, '–:––');
    const time = E('div', 'cr-time', R.pos, track, R.len);

    const prev = dtEl('button', { type: 'button', class: 'nt-circ', 'aria-label': t('nt_prev') }); prev.append(svg(['M11 3 5 8l6 5', 'M4 3v10'], 16, 16, '0 0 16 16'));
    const next = dtEl('button', { type: 'button', class: 'nt-circ', 'aria-label': t('nt_next') }); next.append(svg(['m5 3 6 5-6 5', 'M12 3v10'], 16, 16, '0 0 16 16'));
    prev.addEventListener('click', () => chonBai(NT.sel - 1)); next.addEventListener('click', () => chonBai(NT.sel + 1));
    const tron = dtEl('button', { type: 'button', class: 'cr-shuffle' }, t('cr_shuffle'));
    tron.addEventListener('click', () => {
      if (NT.notes.length < 2) return;
      let k = NT.sel; while (k === NT.sel) k = Math.floor(Math.random() * NT.notes.length);
      chonBai(k);
    });
    if (NT.notes.length < 2) { prev.disabled = next.disabled = tron.disabled = true; }
    R.loi = E('div', 'nt-src'); R.loi.setAttribute('role', 'status');
    const khuNghe = coAmThanh(n) ? null : dtEl('a', { class: 'nt-ext', href: n.url, target: '_blank', rel: 'noopener noreferrer' }, t('nt_listen_ext'));
    const air = E('section', 'cr-air', E('div', 'rd-wrap cr-air-in',
      E('div', 'cr-air-info',
        E('p', 'cr-kicker', E('i'), t('cr_onair') + ' · FM ' + tanSo(NT.sel) + ' · ' + t(n.fics.length ? 'cr_g_notes' : 'cr_g_off')),
        E('h2', 'cr-piece', n.piece),
        E('p', 'cr-comp', n.composer + (n.opus ? ' · ' + n.opus : '')),
        E('div', 'cr-ctl', prev, nutTronPlayPause('cr-play'), next, tron),
        coAmThanh(n) ? time : khuNghe,
        E('p', 'nt-src', t('nt_source') + ' ' + nguon(n)), R.loi),
      E('div', 'cr-vinyl', E('div', 'cr-vinyl-lab', dtIcon(n.icon)))));
    air.setAttribute('aria-label', t('nt_turntable'));
    air.querySelector('.cr-vinyl').setAttribute('aria-hidden', 'true');

    // -- núm dò đài --
    const dial = E('div', 'cr-dial');
    dial.setAttribute('role', 'group'); dial.setAttribute('aria-label', t('cr_dial'));
    const thang = E('div', 'cr-scale');
    thang.setAttribute('aria-hidden', 'true');
    for (let f = 88; f <= 108; f += 4) { const s = E('span', null, String(f)); s.style.left = viTriDial(f) + '%'; thang.append(s); }
    dial.append(thang);
    NT.notes.forEach((x, k) => {
      const b = dtEl('button', { type: 'button', class: 'cr-st', 'aria-pressed': k === NT.sel ? 'true' : 'false',
        'aria-label': 'FM ' + tanSo(k) + ' · ' + x.piece + ' · ' + x.composer }, E('i'), E('span', null, x.short));
      b.style.left = viTriDial(+tanSo(k)) + '%';
      b.addEventListener('click', () => { if (k !== NT.sel) chonBai(k); });
      dial.append(b);
    });
    const kim = E('div', 'cr-needle'); kim.style.left = viTriDial(+tanSo(NT.sel)) + '%'; kim.setAttribute('aria-hidden', 'true');
    dial.append(kim);

    // -- chương trình tối nay --
    const nhom = (tieuDe, loc) => {
      const ds = NT.notes.map((x, k) => ({ x, k })).filter(o => loc(o.x));
      if (!ds.length) return null;
      return E('div', 'cr-group', E('h3', null, tieuDe), ...ds.map(({ x, k }) => {
        const b = dtEl('button', { type: 'button', class: 'cr-row', 'aria-pressed': k === NT.sel ? 'true' : 'false' },
          E('span', 'cr-fm', 'FM ' + tanSo(k)), E('span', 'cr-row-t', E('b', null, x.piece), E('small', null, x.composer)));
        b.addEventListener('click', () => {
          if (k !== NT.sel) chonBai(k);
          if (laDienThoai()) { const a = document.querySelector('#nt-root .cr-note'); if (a) a.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        });
        return b;
      }));
    };
    const prog = E('aside', 'cr-prog', E('p', 'cr-prog-h', t('nt_programme')),
      nhom(t('cr_g_notes'), x => x.fics.length), nhom(t('cr_g_off'), x => !x.fics.length));
    prog.setAttribute('aria-label', t('nt_programme'));

    // -- ghi chú chương trình --
    const cueRows = n.cues.map(q => {
      const b = dtEl('button', { type: 'button', class: 'nt-cue-row' }, E('span', 'nt-cue-t', fmt(q.t)), E('span', 'nt-cue-x', q.text));
      if (coAmThanh(n)) b.addEventListener('click', () => tuaToi(q.t, true)); else b.disabled = true;
      return b;
    });
    R.cueRows = cueRows;
    const dauTien = n.fics.find(f => f.idx != null);
    const note = E('article', 'cr-note',
      E('p', 'rd-eyebrow', t('cr_note') + (n.date ? ' · ' + fmtNgay(n.date) : '')),
      E('h2', null, n.title),
      n.quote ? E('blockquote', null, n.quote) : null,
      E('div', 'nt-body', ...n.paras.map(p => E('p', null, p))),
      n.cues.length ? E('div', 'nt-cues', E('div', 'nt-cues-h', E('h3', null, t('nt_cues')), E('span', null, t('nt_cues_hint'))), ...cueRows) : null,
      n.fics.length ? E('div', 'cr-plays', E('p', 'rd-eyebrow', t('nt_plays_in')),
        ...n.fics.map(f => dtEl('a', { class: 'cr-plays-t', href: f.idx != null ? '#fic-' + f.idx : null, onclick: moFic(f.idx) },
          f.title, f.sub ? E('em', null, ' ' + f.sub) : null)),
        dauTien ? dtEl('a', { class: 'rd-btn rd-btn-gold rd-btn-sm', href: '#fic-' + dauTien.idx, onclick: moFic(dauTien.idx) }, t('cr_read')) : null) : null,
      window.skLaAdmin ? E('div', 'nt-acts', dtEl('button', { type: 'button', class: 'mini-btn', onclick: () => window.ntAdminMo && window.ntAdminMo(n.id) }, t('nta_edit_this'))) : null);

    ganCon(root, dau, adm, NT.preview ? E('div', 'nt-preview rd-wrap', t('nt_preview')) : null,
      air, E('div', 'rd-wrap cr-dial-wrap', dial), E('div', 'rd-wrap cr-main', note, prog));
    root.classList.toggle('nt-playing', NT.playing);

    veMini(n);
    datCue(); capNhatGio();
  }
  const nguon = n => ({ github: 'GitHub Releases', musopen: 'Musopen', archive: 'archive.org', soundcloud: 'SoundCloud' }[n.source] || n.source);

  // thanh phát nhỏ của điện thoại: gắn vào <body> (ngoài .page để position:fixed không lệch)
  function veMini(n) {
    if (!mini) {
      mini = E('div', 'nt-mini');
      mini.setAttribute('role', 'region');
      document.body.append(mini);
    }
    mini.hidden = false;
    mini.textContent = '';
    mini.classList.toggle('nt-playing', NT.playing);
    const dot = E('span'); dot.style.background = n.sleeve;
    ganCon(mini, E('div', 'nt-mini-fill'), E('div', 'nt-mini-rec', dot),
      E('div', 'nt-mini-t', E('b', null, n.piece), E('small', 'nt-mini-time', '0:00 / –:–– · ' + n.short)),
      nutTronPlayPause());
    mini.setAttribute('aria-label', t('nt_turntable'));
  }

  // ---- tờ note trên điện thoại ----
  function dongBoTo() {
    if (!R.paper) return;
    const phone = laDienThoai();
    R.paper.classList.toggle('open', NT.open);
    R.paper.inert = phone && !NT.open;
    document.documentElement.classList.toggle('nt-lock', phone && NT.open && $('page-notes').classList.contains('active'));
    if (phone && NT.open) { const b = R.paper.querySelector('.nt-back'); if (b && document.activeElement === document.body) b.focus(); }
  }
  function dongTo() { NT.open = false; dongBoTo(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && NT.open) dongTo(); });
  let daLaPhone = laDienThoai();
  window.addEventListener('resize', () => {
    if (!laDienThoai()) NT.open = false;
    if (laDienThoai() !== daLaPhone) { daLaPhone = laDienThoai(); if (NT.loaded && $('nt-root')) ve(); } else dongBoTo();
  });

  // ---- vòng đời trang ----
  window.ntVao = function () {
    document.body.classList.add('nt-on');
    if (!NT.loaded || NT.failed || !NT.notes.length) { NT.loaded = false; NT.failed = false; ve(); nap(); }
    else ve();
  };
  window.ntRoi = function () {
    document.body.classList.remove('nt-on');
    document.documentElement.classList.remove('nt-lock');
    NT.open = false;
    tamDung();
    if (mini) mini.hidden = true;
  };
  // Hồ sơ về muộn / đổi vai: nếu đang ở trang Notes và chưa có gì thì nạp lại (admin thấy bản nháp xem trước).
  window.ntLamMoi = function () {
    const p = $('page-notes');
    if (p && p.classList.contains('active') && (!NT.notes.length || NT.preview)) nap(true);
  };
  // Đổi ngôn ngữ: chữ lấy từ t() lúc dựng nên phải dựng lại.
  window.ntInvalidar = function () { NT.loaded = false; };   // admin vừa lưu/xoá: lần vào sau nạp lại
  window.veLaiNotes = function () { if ($('nt-root') && NT.loaded) ve(); };
})();
