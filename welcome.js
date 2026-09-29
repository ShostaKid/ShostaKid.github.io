/* Màn chào kiểu bàn phím piano (Welcome A). Nạp sau app.js: dùng chung các hàm toàn cục
   của nó (enterSite, showPage, openFic, resumeReading, toggleLang, toggleTheme, t, worksData).
   Bấm MỘT lần là vào. Phím trắng = phòng, phím đen = lối tắt; trên điện thoại phím đen chỉ phát nốt. */
(function () {
  const $ = id => document.getElementById(id);
  const nav = p => document.querySelector('.nav-links a[data-page="' + p + '"]');
  const daDangNhap = () => !!window.skDaDangNhap;
  const coDocDo = () => { try { return !!JSON.parse(localStorage.getItem('sk-continue') || 'null'); } catch (e) { return false; } };
  const dienThoai = () => window.matchMedia('(max-width:700px)').matches;

  // ---- tiếng nốt (WebAudio, chỉ chạy sau một cú bấm/phím) ----
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

  const TRANG = [
    { id: 'home',  note: 'C', f: 261.63, key: 'a', go: () => vao(() => showPage('home',  nav('home'))) },
    { id: 'works', note: 'D', f: 293.66, key: 's', go: () => vao(() => showPage('works', nav('works'))) },
    { id: 'opus',  note: 'E', f: 329.63, key: 'd', go: () => vao(() => showPage('opus',  nav('opus'))) },
    { id: 'notes', note: 'F', f: 349.23, key: 'f', off: () => true },
    { id: 'about', note: 'G', f: 392.00, key: 'g', go: () => vao(() => showPage('about', nav('about'))) },
    { id: 'comm',  note: 'A', f: 440.00, key: 'h', go: () => { location.href = 'commissions.html'; } },
    { id: 'auth',  note: 'B', f: 493.88, key: 'j',
      go: () => vao(() => daDangNhap() ? showPage('profile', null) : showPage('auth', document.querySelector('.nav-signin'))) }
  ];
  const DEN = [
    { id: 'resume',   at: 1, f: 277.18, key: 'w', off: () => !coDocDo(),
      go: () => vao(() => resumeReading()) },
    { id: 'members',  at: 2, f: 311.13, key: 'e', off: () => !daDangNhap(),
      go: () => vao(() => showPage('members', null)) },
    { id: 'lang',     at: 4, f: 369.99, key: 't', stay: true, go: () => toggleLang() },
    { id: 'theme',    at: 5, f: 415.30, key: 'y', stay: true, go: () => { toggleTheme(); veNut(); } },
    { id: 'surprise', at: 6, f: 466.16, key: 'u',
      go: () => {
        const ds = (typeof worksData !== 'undefined' ? worksData : []).filter(w => w.idx != null);
        if (!ds.length) return;
        const w = ds[Math.floor(Math.random() * ds.length)];
        vao(() => openFic(w.idx));
      } }
  ];
  const TAT_CA = TRANG.concat(DEN);

  const ten = it => it.at === undefined
    ? (it.id === 'auth' ? (daDangNhap() ? t('wk_profile') : t('wk_signin')) : t('wk_' + it.id))
    : t('wb_' + it.id);
  const tenNgan = it => it.id === 'comm' ? t('wk_comm_s') : ten(it);
  const mota = it => it.id === 'notes' ? t('wk_notes_soon')
    : it.at === undefined ? t('wd_' + (it.id === 'auth' && daDangNhap() ? 'profile' : it.id)) : t('wbd_' + it.id);
  const tat = it => !!(it.off && it.off());

  const btn = new Map();          // id -> <button>
  const nhan = new Map();         // id -> {ten, ngan}

  function info(it) {
    const box = $('wk-info'); if (!box) return;
    box.textContent = '';
    const mk = (cls, txt) => { const d = document.createElement('div'); d.className = cls; d.textContent = txt; return d; };
    if (!it) { box.append(mk('h', t('wk_press'))); return; }
    box.append(mk('n', tat(it) && it.id === 'notes' ? ten(it) : ten(it)), mk('d', mota(it)));
  }

  function bam(it) {
    if (tat(it)) return;
    tone(it.f);
    if (it.at !== undefined && dienThoai()) return;   // điện thoại: phím đen chỉ phát nốt
    if (it.stay) { it.go(); veLaiChao(); return; }
    setTimeout(it.go, 0);
  }

  function dung() {
    const board = $('wk-board'); if (!board) return;
    board.textContent = '';
    btn.clear(); nhan.clear();
    const rail = document.createElement('div'); rail.className = 'wk-rail';
    const keys = document.createElement('div'); keys.className = 'wk-keys';
    const whites = document.createElement('div'); whites.className = 'wk-whites';
    TRANG.forEach(it => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'wk-white';
      const n = document.createElement('span'); n.className = 'wk-note'; n.textContent = it.note;
      const l = document.createElement('span'); l.className = 'wk-lbl';
      const s = document.createElement('span'); s.className = 'wk-lbl-s';
      const soon = it.id === 'notes' ? document.createElement('span') : null;
      if (soon) soon.className = 'wk-soon';
      b.append(n, l, s); if (soon) b.append(soon);
      wire(b, it); whites.append(b); btn.set(it.id, b); nhan.set(it.id, { l, s, soon });
    });
    keys.append(whites);
    DEN.forEach(it => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'wk-black';
      b.style.setProperty('--at', it.at);
      const l = document.createElement('span'); l.className = 'wk-lbl';
      b.append(l);
      wire(b, it); keys.append(b); btn.set(it.id, b); nhan.set(it.id, { l });
    });
    board.append(rail, keys);
    veLaiChao();
  }

  function wire(b, it) {
    b.addEventListener('click', () => bam(it));
    b.addEventListener('pointerenter', () => info(it));
    b.addEventListener('focus', () => info(it));
    b.addEventListener('pointerleave', () => info(null));
    b.addEventListener('blur', () => info(null));
  }

  // Cập nhật chữ + trạng thái mờ. Gọi lại khi đổi ngôn ngữ, và định kỳ (trạng thái đăng nhập về muộn).
  function veLaiChao() {
    TAT_CA.forEach(it => {
      const b = btn.get(it.id), n = nhan.get(it.id); if (!b) return;
      const nm = ten(it);
      n.l.textContent = nm;
      if (n.s) n.s.textContent = tenNgan(it);
      if (n.soon) n.soon.textContent = t('wk_soon');
      const t2 = tat(it);
      b.setAttribute('aria-disabled', t2 ? 'true' : 'false');
      b.setAttribute('aria-label', nm + (t2 && it.id === 'notes' ? ' — ' + t('wk_soon') : ''));
    });
    const h = $('wk-hint'); if (h) h.textContent = t(dienThoai() ? 'wk_hint_m' : 'wk_hint');
    veNut();
    if (!document.querySelector('.wk-white:hover,.wk-black:hover,.wk-white:focus-visible,.wk-black:focus-visible')) info(null);
  }
  window.veLaiChao = veLaiChao;

  function veNut() {
    const l = $('wk-lang'), th = $('wk-theme');
    if (l) l.textContent = document.documentElement.getAttribute('data-lang') === 'vi' ? 'EN' : 'VI';
    if (th) th.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀' : '☾';
  }

  document.addEventListener('DOMContentLoaded', () => {
    dung();
    $('wk-lang').addEventListener('click', () => { toggleLang(); veNut(); });
    $('wk-theme').addEventListener('click', () => { toggleTheme(); veNut(); });
    // Phím tắt bàn phím thật: A S D F G H J (trắng), W E T Y U (đen).
    document.addEventListener('keydown', e => {
      const intro = $('intro');
      if (!intro || intro.classList.contains('fade-out') || intro.style.display === 'none') return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const it = TAT_CA.find(k => k.key === e.key.toLowerCase());
      if (it) { e.preventDefault(); bam(it); }
    });
    const chu = setInterval(() => {
      const intro = $('intro');
      if (!intro || intro.style.display === 'none') { clearInterval(chu); return; }
      veLaiChao();
    }, 800);
  });
})();
