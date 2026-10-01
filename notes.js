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
    if (coAmThanh(n)) { a.src = n.url; a.load(); } else { a.removeAttribute('src'); a.load(); }
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

  function ve() {
    const root = $('nt-root'); if (!root) return;
    root.textContent = '';
    R = {};
    const n = cur();
    if (mini) mini.hidden = true;

    if (!NT.loaded || (NT.loading && !n)) { root.append(E('p', 'nt-empty', t('nt_loading'))); return; }
    if (NT.failed) { root.append(E('p', 'nt-empty', t('nt_failed'))); return; }
    if (!n) { root.append(E('p', 'nt-empty', t('nt_empty'))); return; }

    // -- bàn xoay --
    const arm = E('div', 'nt-arm'); arm.setAttribute('aria-hidden', 'true');
    const label = E('div', 'nt-label', dtIcon(n.icon), E('span', null, n.short));
    label.style.background = n.sleeve;
    const plat = E('div', 'nt-plat',
      E('div', 'nt-mat'),
      E('div', 'nt-rec', E('div', 'nt-sheen'), label, E('div', 'nt-spindle')),
      E('div', 'nt-pivot'), arm);
    plat.setAttribute('aria-hidden', 'true');

    const ficLinks = n.fics.map(f => {
      const a = dtEl('a', { href: f.idx != null ? '#fic-' + f.idx : null, onclick: moFic(f.idx) }, f.title);
      if (f.sub) a.append(E('i', null, ' — ' + f.sub));
      return a;
    });
    const plays = n.fics.length ? E('div', 'nt-plays', E('span', null, t('nt_plays_in')), ...ficLinks) : E('div', 'nt-plays');

    // thanh thời gian + cue
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
    const gioRow = E('div', 'nt-time-row', R.pos, E('span', null, n.cues.length ? t('nt_cue_legend') : ''), R.len);
    const time = E('div', 'nt-time', track, gioRow);

    const prev = dtEl('button', { type: 'button', class: 'nt-circ', 'aria-label': t('nt_prev') }); prev.append(svg(['M11 3 5 8l6 5', 'M4 3v10'], 16, 16, '0 0 16 16'));
    const next = dtEl('button', { type: 'button', class: 'nt-circ', 'aria-label': t('nt_next') }); next.append(svg(['m5 3 6 5-6 5', 'M12 3v10'], 16, 16, '0 0 16 16'));
    prev.addEventListener('click', () => chonBai(NT.sel - 1)); next.addEventListener('click', () => chonBai(NT.sel + 1));
    if (NT.notes.length < 2) { prev.disabled = next.disabled = true; }
    const ctl = E('div', 'nt-ctl', prev, nutTronPlayPause(), next, E('span', 'nt-src', t('nt_source') + ' ' + nguon(n)));
    R.loi = E('div', 'nt-src'); R.loi.setAttribute('role', 'status');
    let khuNghe = null;
    if (!coAmThanh(n)) {
      khuNghe = dtEl('a', { class: 'nt-ext', href: n.url, target: '_blank', rel: 'noopener noreferrer' }, t('nt_listen_ext'));
    }
    const info = E('div', 'nt-info',
      E('div', 'nt-kicker', t('nt_playing_state_' + (NT.playing ? 'on' : 'off'))),
      E('div', null, E('div', 'nt-piece', n.piece), E('div', 'nt-comp', n.composer + (n.opus ? ' · ' + n.opus : ''))),
      plays,
      coAmThanh(n) ? time : khuNghe,
      ctl, R.loi);
    R.kicker = info.firstChild;
    const deck = E('section', 'nt-deck', plat, info); deck.setAttribute('aria-label', t('nt_turntable'));

    // -- danh sách "Tonight's programme" --
    const prog = E('aside', 'nt-prog',
      E('div', 'nt-prog-h', E('h2', null, t('nt_programme')), E('span', null, t('nt_count').replace('{n}', NT.notes.length))));
    prog.setAttribute('aria-label', t('nt_programme'));
    NT.notes.forEach((x, k) => {
      const sl = E('span', 'nt-sleeve', dtIcon(x.icon)); sl.style.background = x.sleeve;
      const b = dtEl('button', { type: 'button', class: 'nt-pick', 'aria-pressed': k === NT.sel ? 'true' : 'false' });
      ganCon(b, E('span', 'nt-pick-n', String(k + 1).padStart(2, '0')), sl,
        E('span', 'nt-pick-t', E('b', null, x.piece), E('small', null, x.composer + ' · ' + t('nt_for') + ' ' + soFic(x))),
        E('span', 'nt-pick-go', '›'));
      b.addEventListener('click', () => {
        if (k === NT.sel) { if (laDienThoai()) { NT.open = true; ve(); } return; }
        chonBai(k, { mo: laDienThoai() });
      });
      prog.append(b);
    });

    // -- tờ note --
    const dong = n.paras.map(p => E('p', null, p));
    const cueRows = n.cues.map(q => {
      const b = dtEl('button', { type: 'button', class: 'nt-cue-row' }, E('span', 'nt-cue-t', fmt(q.t)), E('span', 'nt-cue-x', q.text));
      if (coAmThanh(n)) b.addEventListener('click', () => tuaToi(q.t, true)); else b.disabled = true;
      return b;
    });
    R.cueRows = cueRows;
    const dauTien = n.fics.find(f => f.idx != null);
    const back = dtEl('button', { type: 'button', class: 'nt-back', 'aria-label': t('nt_back') }); back.append(svg(['M11 3 5 9l6 6'], 18, 18, '0 0 18 18'));
    back.addEventListener('click', dongTo);
    const chips = E('div', 'nt-chips', ...n.fics.map(f => dtEl('a', { href: f.idx != null ? '#fic-' + f.idx : null, onclick: moFic(f.idx) }, f.title)));
    const paperIn = E('div', 'nt-paper-in',
      E('div', 'nt-meta', E('span', null, t('nt_note_no') + ' ' + (NT.sel + 1)), E('span', null, fmtNgay(n.date))),
      E('div', null, E('h2', null, n.title), E('div', 'nt-on-line', t('nt_on') + ' ' + n.composer + ', ' + n.piece + (laDienThoai() && n.date ? ' · ' + fmtNgay(n.date) : ''))),
      E('div', 'nt-rule'),
      n.fics.length ? chips : null,
      E('div', 'nt-body', ...dong),
      n.quote ? E('blockquote', null, n.quote) : null,
      n.cues.length ? E('div', 'nt-cues', E('div', 'nt-cues-h', E('h3', null, t('nt_cues')), E('span', null, t('nt_cues_hint'))), ...cueRows) : null,
      dauTien ? E('div', 'nt-acts', dtEl('a', { class: 'nt-readfic', href: '#fic-' + dauTien.idx, onclick: moFic(dauTien.idx) }, t('nt_read_fic'))) : null);
    const paper = E('article', 'nt-paper' + (NT.open ? ' open' : ''),
      E('div', 'nt-paper-ring'),
      E('div', 'nt-sheet-top', back, E('span', null, t('nt_note_no') + ' ' + (NT.sel + 1))),
      paperIn);
    paper.setAttribute('role', 'dialog'); paper.setAttribute('aria-label', t('nt_note_no'));
    R.paper = paper;

    // -- ghép --
    const stage = E('div', 'nt-stage',
      E('div', 'nt-wall', ...['panels', 'lines', 'rail', 'fade', 'glow', 'cord', 'shade'].map(c => { const d = E('div', 'nt-w-' + c); return d; })),
      E('div', 'nt-hero', E('div', 'nt-eyebrow', t('nt_eyebrow')), E('h1', null, t('nt_title')), E('p', 'nt-lead', t('nt_lead'))),
      NT.preview ? E('div', 'nt-preview', t('nt_preview')) : null,
      deck,
      E('div', 'nt-lower', prog, paper));
    stage.querySelector('.nt-wall').setAttribute('aria-hidden', 'true');
    root.append(stage);
    root.classList.toggle('nt-playing', NT.playing);

    veMini(n);
    dongBoTo();
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
  window.veLaiNotes = function () { if ($('nt-root') && NT.loaded) ve(); };
})();
