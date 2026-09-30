/* Màn chào. Nạp sau app.js và dùng lại hàm toàn cục của nó (enterSite, showPage, openFic,
   resumeReading, toggleLang, toggleTheme, t, worksData).
   Một bảng mục (ITEMS), hai bộ vẽ:
     A — dàn nhạc (PC: có hover, rộng ≥1024px). Rê chuột vào một bè thì hiện mô tả, bấm MỘT lần là vào.
     B — cây đàn piano (điện thoại, tablet, máy cảm ứng). Chạm phím để chọn (hiện mô tả trên giá nhạc),
         rồi bấm Enter; chạm lại đúng phím đó cũng vào. */
(function () {
  const $ = id => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const nav = p => document.querySelector('.nav-links a[data-page="' + p + '"]');
  const daDangNhap = () => !!window.skDaDangNhap;
  const coDocDo = () => { try { return !!JSON.parse(localStorage.getItem('sk-continue') || 'null'); } catch (e) { return false; } };
  const laPC = () => window.matchMedia('(hover:hover) and (pointer:fine) and (min-width:1024px)').matches;

  function h(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function svgIc(kind, size) {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('class', 'dt-ic'); s.setAttribute('width', size); s.setAttribute('height', size);
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    const u = document.createElementNS(SVGNS, 'use'); u.setAttribute('href', '#ic-' + kind);
    s.append(u); return s;
  }

  // ---- tiếng nốt của piano (WebAudio, chỉ chạy sau một cú chạm/phím) ----
  let ac = null;
  function tone(f) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ac) ac = new AC();
      if (ac.state === 'suspended') ac.resume();
      const o = ac.createOscillator(), g = ac.createGain(), tt = ac.currentTime;
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.14, tt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 1.1);
      o.connect(g); g.connect(ac.destination);
      o.start(tt); o.stop(tt + 1.2);
    } catch (e) {}
  }

  // Đi vào trang chính rồi làm gì đó. enterSite() phải chạy ngay trong cú bấm để mở khoá nhạc.
  const vao = fn => { enterSite(); fn(); };

  // key: phím gõ; f: tần số nốt (piano); at: phím đen nằm trên ranh giới phím trắng thứ mấy;
  // soon: chưa có trang (mờ, "Coming soon") — muốn bật thì bỏ soon và thêm go.
  const ITEMS = [
    { id: 'home',      key: 'a', f: 261.63, go: () => vao(() => showPage('home',  nav('home'))) },
    { id: 'works',     key: 's', f: 293.66, go: () => vao(() => showPage('works', nav('works'))) },
    { id: 'opus',      key: 'd', f: 329.63, go: () => vao(() => showPage('opus',  nav('opus'))) },
    { id: 'notes',     key: 'f', f: 349.23, soon: true },
    { id: 'rehearsal', key: 'g', f: 392.00, go: () => vao(() => showPage('rehearsal', nav('rehearsal'))) },
    { id: 'about',     key: 'h', f: 440.00, go: () => vao(() => showPage('about', nav('about'))) },
    { id: 'comm',      key: 'j', f: 493.88, go: () => { location.href = 'commissions.html'; } },
    { id: 'profile',   key: 'k', f: 523.25,
      go: () => vao(() => daDangNhap() ? showPage('profile', null) : showPage('auth', document.querySelector('.nav-signin'))) },
    { id: 'resume',    key: 'q', f: 277.18, at: 1, off: () => !coDocDo(), go: () => vao(() => resumeReading()) },
    { id: 'members',   key: 'w', f: 311.13, at: 2, off: () => !daDangNhap(), go: () => vao(() => showPage('members', null)) },
    { id: 'lang',      f: 369.99, at: 4, stay: true, go: () => toggleLang() },
    { id: 'theme',     f: 415.30, at: 5, stay: true, go: () => toggleTheme() },
    { id: 'surprise',  key: 'l', f: 466.16, at: 6,
      go: () => {
        const ds = (typeof worksData !== 'undefined' ? worksData : []).filter(w => w.idx != null);
        if (!ds.length) return;
        const w = ds[Math.floor(Math.random() * ds.length)];
        vao(() => openFic(w.idx));
      } }
  ];
  const byId = id => ITEMS.find(i => i.id === id);
  const PHONG = ITEMS.filter(i => i.at === undefined);        // 8 phím trắng
  const DEN = ITEMS.filter(i => i.at !== undefined);          // 5 phím đen
  const BE = ITEMS.filter(i => i.id !== 'lang' && i.id !== 'theme');  // các bè của dàn nhạc

  const tat = it => !!(it.soon || (it.off && it.off()));
  const ten = it => t('wk_n_' + (it.id === 'profile' && !daDangNhap() ? 'signin' : it.id));
  const mota = it => it.soon ? t('wk_soon') : t('wk_d_' + (it.id === 'profile' && !daDangNhap() ? 'signin' : it.id));
  const chuPhim = it => it.key ? it.key.toUpperCase() : '';

  // ---- A: bố cục dàn nhạc (toạ độ trên sân khấu 1440×900, lấy từ bản thiết kế) ----
  // box = [trái, trên, rộng, cao]; sc = tỉ lệ thu của cụm nhạc cụ; ic = [icon, cỡ, [[trái, trên]…]];
  // lab = độ cao của nhãn dưới cụm. Ghế (elip mờ dưới mỗi nhạc cụ) sinh tự động từ cỡ icon.
  const LA = {
    rehearsal: { box: [625, 250, 190, 100], sc: 0.84, ic: ['drum', 68, [[15, 16], [107, 16]]], lab: 106, z: 5 },
    profile:   { box: [165, 330, 130, 130], sc: 0.90, ic: ['harp', 112, [[9, 9]]], lab: 136, z: 5 },
    comm:      { box: [875, 320, 250, 170], sc: 0.90, ic: ['trombone', 70, [[26, 16], [154, 16], [90, 90]]], lab: 176, z: 6 },
    surprise:  { box: [1190, 340, 90, 90], sc: 0.84, ic: ['triangle', 60, [[15, 15]]], lab: 96, z: 5 },
    about:     { box: [405, 420, 170, 100], sc: 0.94, ic: ['flute', 62, [[14, 19], [94, 19]]], lab: 106, z: 6 },
    opus:      { box: [595, 430, 250, 110], sc: 0.97, ic: ['clarinet', 68, [[15, 25], [91, 13], [167, 25]]], lab: 116, z: 6 },
    works:     { box: [185, 550, 290, 200], sc: 1, ic: ['violin', 70, [[20, 21], [110, 11], [200, 21], [20, 109], [110, 99], [200, 109]]], lab: 206, z: 8 },
    notes:     { box: [990, 535, 240, 230], sc: 1, ic: ['cello', 90, [[19, 18], [131, 18], [19, 126], [131, 126]]], lab: 236, z: 8 },
    // Hai bè thêm so với bản thiết kế (Resume, Members): đặt ở hai góc dưới, xa các bè khác.
    resume:    { box: [30, 640, 150, 100], sc: 0.94, ic: ['viola', 62, [[9, 19], [79, 19]]], lab: 106, z: 6 },
    members:   { box: [1260, 640, 150, 100], sc: 0.94, ic: ['tuba', 64, [[8, 17], [78, 17]]], lab: 106, z: 6 },
    home:      { box: [520, 670, 400, 160], lab: 162, z: 9, nmSize: 24 }
  };

  const refs = new Map();      // id -> { btn, nm, desc, cap }
  let mode = null;             // 'A' | 'B'
  let sel = null;              // B: mục đang chọn
  let stageA = null, panelB = null;

  function nhan(it, lab, nmSize) {
    const box = h('span', 'wk-lab'); box.style.top = lab + 'px';
    const row = h('span', 'wk-nmrow');
    const nm = h('span', 'wk-nm'); if (nmSize) nm.style.fontSize = nmSize + 'px';
    const cap = h('span', 'wk-cap', chuPhim(it)); if (!it.key) cap.hidden = true;
    row.append(nm, cap);
    const desc = h('span', 'wk-desc');
    box.append(row, desc);
    return { box, nm, desc, cap };
  }

  function bePod(it) {
    const L = LA.home;
    const b = h('button', 'wk-sec'); b.type = 'button';
    Object.assign(b.style, { left: L.box[0] + 'px', top: L.box[1] + 'px', width: L.box[2] + 'px', height: L.box[3] + 'px', zIndex: L.z });
    b.append(h('span', 'wk-glow'));
    const pod = h('span', 'wka-pod');
    pod.append(h('span', 'wka-pod-base'), h('span', 'wka-pod-ring'), h('span', 'wka-pod-pole'));
    const paper = h('span', 'wka-pod-paper');
    const clef = svgIc('g-clef', 44); clef.style.color = '#2C2318';
    paper.append(clef, h('span', 'wka-pod-staff'));
    pod.append(paper);
    const baton = document.createElementNS(SVGNS, 'svg');
    [['class', 'wka-pod-baton'], ['width', 150], ['height', 130], ['viewBox', '0 0 150 130'], ['aria-hidden', 'true']].forEach(([k, v]) => baton.setAttribute(k, v));
    const ln = document.createElementNS(SVGNS, 'line');
    [['x1', 126], ['y1', 122], ['x2', 44], ['y2', 14], ['stroke-width', 3], ['stroke-linecap', 'round']].forEach(([k, v]) => ln.setAttribute(k, v));
    ln.style.stroke = 'var(--o-ink)';
    const dot = document.createElementNS(SVGNS, 'circle');
    [['cx', 126], ['cy', 122], ['r', 7]].forEach(([k, v]) => dot.setAttribute(k, v));
    dot.style.fill = 'var(--o-gold)';
    baton.append(ln, dot); pod.append(baton);
    b.append(pod);
    const n = nhan(it, L.lab, L.nmSize);
    b.append(n.box);
    return { btn: b, nm: n.nm, desc: n.desc, cap: n.cap };
  }

  function beNhac(it) {
    const L = LA[it.id];
    if (it.id === 'home') return bePod(it);
    const b = h('button', 'wk-sec'); b.type = 'button';
    Object.assign(b.style, { left: L.box[0] + 'px', top: L.box[1] + 'px', width: L.box[2] + 'px', height: L.box[3] + 'px', zIndex: L.z });
    b.append(h('span', 'wk-glow'));
    const inner = h('span', 'wk-inner');
    Object.assign(inner.style, { width: L.box[2] + 'px', height: L.box[3] + 'px', transform: 'scale(' + L.sc + ')' });
    const [kind, size, pos] = L.ic, seatW = size * 0.84;
    pos.forEach(([l, tp]) => {
      const seat = h('span', 'wk-seat');
      Object.assign(seat.style, { left: (l + (size - seatW) / 2) + 'px', top: (tp + size * 0.9) + 'px', width: seatW + 'px' });
      seat.setAttribute('aria-hidden', 'true');
      const ic = h('span', 'wk-ic'); Object.assign(ic.style, { left: l + 'px', top: tp + 'px', width: size + 'px', height: size + 'px' });
      ic.append(svgIc(kind, size));
      inner.append(seat, ic);
    });
    b.append(inner);
    const n = nhan(it, L.lab);
    b.append(n.box);
    return { btn: b, nm: n.nm, desc: n.desc, cap: n.cap };
  }

  function dungA(root) {
    const stage = h('div', 'wka-stage'); stageA = stage;
    stage.append(h('div', 'wka-spot'));
    const arcs = document.createElementNS(SVGNS, 'svg');
    [['class', 'wka-arcs'], ['width', 1440], ['height', 900], ['viewBox', '0 0 1440 900'], ['aria-hidden', 'true']].forEach(([k, v]) => arcs.setAttribute(k, v));
    ['M 420 900 A 300 190 0 0 1 1020 900', 'M 250 900 A 470 300 0 0 1 1190 900', 'M 100 900 A 620 400 0 0 1 1340 900', 'M -50 900 A 770 510 0 0 1 1490 900']
      .forEach(d => { const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke-width', '1.2'); arcs.append(p); });
    stage.append(arcs);
    const head = h('header', 'wka-head');
    const title = h('div', 'wka-title', 'Shosta'); title.append(h('span', '', 'kid'));
    head.append(title, h('div', 'wka-tag'), h('div', 'wka-baton'));
    stage.append(head);
    BE.forEach(it => {
      const r = beNhac(it);
      r.btn.addEventListener('click', () => bam(it));
      refs.set(it.id, r); stage.append(r.btn);
    });
    stage.append(h('div', 'wka-foot'));
    root.append(stage);
  }

  function fitA() {
    if (!stageA) return;
    const root = $('wk-root');
    const s = Math.min(root.clientWidth / 1440, root.clientHeight / 900);
    stageA.style.setProperty('--s', s);
    stageA.style.transform = 'translate(' + (root.clientWidth - 1440 * s) / 2 + 'px,' + (root.clientHeight - 900 * s) / 2 + 'px) scale(' + s + ')';
  }

  // ---- B: cây đàn piano ----
  function dungB(root) {
    const wrap = h('div', 'wkb');
    const head = h('header', 'wkb-head');
    const title = h('div', 'wkb-title', 'Shosta'); title.append(h('span', '', 'kid'));
    head.append(title, h('div', 'wkb-tag'));
    const stand = h('div', 'wkb-stand'); stand.setAttribute('aria-live', 'polite'); panelB = stand;
    const rail = h('div', 'wkb-rail');
    const piano = h('div', 'wkb-piano');
    const brand = h('div', 'wkb-brand', 'Shostakid');
    const keys = h('div', 'wkb-keys');
    PHONG.forEach(it => {
      const b = h('button', 'wkb-w'); b.type = 'button';
      const inner = h('span', 'wkb-w-in');
      const nm = h('span', 'wkb-w-nm');
      inner.append(svgIc(it.id === 'home' ? 'g-clef' : LA[it.id].ic[0], 30), nm);
      b.append(inner);
      b.addEventListener('click', () => chon(it));
      refs.set(it.id, { btn: b, nm, cap: null }); keys.append(b);
    });
    DEN.forEach(it => {
      const b = h('button', 'wkb-b'); b.type = 'button'; b.style.setProperty('--at', it.at);
      const nm = h('span', 'wkb-b-nm');
      b.append(nm);
      b.addEventListener('click', () => chon(it));
      refs.set(it.id, { btn: b, nm, cap: null }); keys.append(b);
    });
    piano.append(brand, h('div', 'wkb-felt'), keys);
    wrap.append(head, stand, rail, piano);
    root.append(wrap);
    panelB = stand;
  }

  function panelVe() {
    const p = panelB; if (!p) return;
    // capNhat() chạy định kỳ; chỉ dựng lại khi nội dung đổi, không thì nút Enter bị thay giữa lúc bấm.
    const sig = [t('wk_press'), sel && sel.id, sel && ten(sel), sel && mota(sel), sel && tat(sel)].join('|');
    if (p.dataset.sig === sig) return;
    p.dataset.sig = sig;
    p.textContent = '';
    p.append(h('span', 'wkb-fold'));
    if (!sel) {
      p.append(h('div', 'n', t('wk_press')), h('div', 'd', t('wk_hintb')));
      return;
    }
    const it = sel;
    p.append(h('div', 'k', (it.at === undefined ? t('wk_room') : t('wk_shortcut')) + '  ·  ' + (it.key && it.at === undefined ? t('wk_key') + ' ' + chuPhim(it) : it.at !== undefined ? t('wk_bkey') : '')),
      h('div', 'n', ten(it)), h('div', 'd', mota(it)));
    const go = h('button', 'wkb-go', tat(it) ? t('wk_soon') : (it.at === undefined ? t('wk_enter') : t('wk_use')) + ' →');
    go.type = 'button';
    if (tat(it)) go.disabled = true;
    go.addEventListener('click', () => bam(it));
    p.append(go);
  }

  function chon(it) {
    tone(it.f);
    if (sel === it && !tat(it)) { bam(it); return; }        // chạm lại đúng phím đang chọn = vào
    sel = it;
    refs.forEach((r, id) => { if (r.btn.classList) r.btn.classList.toggle('on', id === it.id); r.btn.setAttribute('aria-pressed', id === it.id ? 'true' : 'false'); });
    panelVe();
  }

  // ---- hành động chung ----
  function bam(it) {
    if (tat(it)) return;
    if (it.stay) { it.go(); capNhat(); return; }
    setTimeout(it.go, 0);
  }

  // ---- chữ, trạng thái mờ, nút VI/theme ----
  function capNhat() {
    refs.forEach((r, id) => {
      const it = byId(id), off = tat(it), nm = ten(it);
      r.nm.textContent = nm;
      if (r.desc) r.desc.textContent = mota(it);
      r.btn.setAttribute('aria-disabled', off ? 'true' : 'false');
      r.btn.setAttribute('aria-label', nm + (off && it.soon ? ' — ' + t('wk_soon') : ''));
    });
    const root = $('wk-root'); if (!root) return;
    const q = (c, txt) => { const e = root.querySelector(c); if (e) e.textContent = txt; };
    q('.wka-tag', t('intro_sub')); q('.wkb-tag', t('intro_sub'));
    q('.wka-baton', t('wk_baton')); q('.wka-foot', t('wk_typea'));
    if (mode === 'B') panelVe();
    veNut();
  }
  function veNut() {
    const l = $('wk-lang'), th = $('wk-theme');
    if (l) l.textContent = document.documentElement.getAttribute('data-lang') === 'vi' ? 'EN' : 'VI';
    if (th) th.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀' : '☾';
  }
  window.veLaiChao = capNhat;

  function dung() {
    const root = $('wk-root'); if (!root) return;
    root.textContent = ''; refs.clear(); sel = null; stageA = null; panelB = null;
    mode = laPC() ? 'A' : 'B';
    root.className = mode === 'A' ? 'wk-a' : 'wk-b';
    const tools = h('div', 'wk-tools');
    const lb = h('button', 'wk-mini'); lb.type = 'button'; lb.id = 'wk-lang'; lb.setAttribute('aria-label', 'Language');
    const tb = h('button', 'wk-mini'); tb.type = 'button'; tb.id = 'wk-theme'; tb.setAttribute('aria-label', 'Theme');
    lb.addEventListener('click', () => { toggleLang(); capNhat(); });
    tb.addEventListener('click', () => { toggleTheme(); capNhat(); });
    tools.append(lb, tb);
    if (mode === 'A') dungA(root); else dungB(root);
    root.append(tools);
    capNhat(); fitA();
  }

  document.addEventListener('DOMContentLoaded', () => {
    dung();
    const mq = window.matchMedia('(hover:hover) and (pointer:fine) and (min-width:1024px)');
    mq.addEventListener('change', dung);
    window.addEventListener('resize', () => { if (mode === 'A') fitA(); else if (laPC()) dung(); });
    // Phím tắt bàn phím thật (bè: A S D F G H J K, Q W L). Dàn nhạc = vào luôn; piano = chọn phím.
    document.addEventListener('keydown', e => {
      const intro = $('intro');
      if (!intro || intro.classList.contains('fade-out') || intro.style.display === 'none') return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const it = ITEMS.find(k => k.key && k.key === e.key.toLowerCase());
      if (!it) return;
      e.preventDefault();
      if (mode === 'A') bam(it); else chon(it);
    });
    // Trạng thái đăng nhập về muộn (accounts.js nạp async) nên làm tươi định kỳ khi intro còn hiện.
    const chu = setInterval(() => {
      const intro = $('intro');
      if (!intro || intro.style.display === 'none') { clearInterval(chu); return; }
      capNhat();
    }, 800);
  });
})();
