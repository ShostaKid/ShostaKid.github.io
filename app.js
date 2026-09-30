  
const aboutMusic = {
  source: 'github',     
  url: 'https://github.com/ShostaKid/ShostaKid.github.io/releases/download/music-v1/Schostakowitsch_.14.Sinfonie.hr-Sinfonieorchester.Varela.Kares.Klaus.Makela_1493_1673.mp3',   
  start: 0,
  name: 'Shostakovich - Symphony no.14'
};
  
let fics = [];

async function loadFicsData() {
  try {
    const res = await fetch('fics.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('fics.json not found');
    fics = await res.json();
  } catch (e) {
    console.error('Không tải được fics.json:', e);
    fics = [];
  }
}

// =============================================
// ENGINE
// =============================================
let currentPage='home', prevPage='home', musicPlaying=false;
let currentFic=0, currentChapter=0;
// Bài nhạc đang phát {source,url,start} — để biết khi nào KHÔNG cần dựng lại player.
let nhacDangPhat = null;
const REPO = 'https://raw.githubusercontent.com/lavaknight2017-rgb/ShostaKid.github.io/main/';

// --- Scroll progress bar ---
window.addEventListener('scroll', () => {
  const bar = document.getElementById('progress-bar');
  if (currentPage !== 'reading') { bar.style.width = '0%'; return; }
  const total = document.documentElement.scrollHeight - window.innerHeight;
  const pct = total > 0 ? (window.scrollY / total * 100) : 0;
  bar.style.width = pct + '%';
});

// Bộ lọc sidebar/accordion/pill cũ đã thay bằng dải chip của trang Works
// trong giao diện đĩa than — xem renderWorks().

// --- Home page: auto-render từ fics[] ---
// =============================================
// DỮ LIỆU THẺ TRUYỆN
// Nguồn chuẩn là Supabase. fics.json chỉ còn là phương án dự phòng khi
// không gọi được DB (gói Free có thể cho project ngủ) — khi đó trang vẫn
// hiện đủ danh sách thay vì trắng trơn.
// =============================================

// Khoá kỹ thuật của fandom = đúng tên trong bảng `fandoms`.
// Riêng Reverse hiển thị kèm chữ Hán như site vẫn hiện từ trước.
const FANDOM_DISPLAY = { 'Reverse: 1999': '重返未来：1999 · Reverse: 1999' };
const fandomLabel = (name) => FANDOM_DISPLAY[name] || name;

// fics.json ghi fandom theo kiểu '重返未来：1999 · Reverse: 1999';
// cắt phần trước dấu '·' để ra đúng khoá của DB.
function fandomKeyFromYaml(raw) {
  const s = (raw || 'Others').trim();
  const dot = s.indexOf('·');
  return dot >= 0 ? s.slice(dot + 1).trim() : s;
}

let worksData = [];      // mảng thẻ đang hiển thị
let worksFromDB = false; // đang dùng dữ liệu DB hay bản dự phòng

function worksFromFics() {
  return fics.map((f, i) => ({
    idx: i,
    title: f.title || '',
    subtitle: f.subtitle || '',
    fandom: fandomKeyFromYaml(f.fandom),
    warning: f.warning || '',
    summary: f.summary || '',
    ships: f.tags || [],
    featured: !!f.featured,
    date: f.date || '',
    kudos: null, comments: null,     // bản dự phòng không có số đếm
    // Các trường của giao diện đĩa than. fics.json không biết nhóm Opus, số chữ
    // hay ngôn ngữ — bìa sẽ hiện "Overture" và dòng số chữ tự ẩn.
    uuid: null, lang: null, words: null, groupSlug: null, cover: '',
    nch: (f.chapters || []).length || null,
    music: [].concat(f.musicName || []).filter(Boolean)
      .map(s => String(s).replace(/\s+-\s+/g, ' — '))
      .filter((s, k, a) => a.indexOf(s) === k)
  }));
}

// Thông tin truyện cho trang đọc. Ưu tiên worksData (từ DB) vì truyện đăng qua
// form KHÔNG có trong fics.json — chỉ lùi về fics.json khi DB không gọi được.
function ficInfo(i) {
  const d = worksData.find(x => x.idx === i);
  const f = fics[i];
  if (d) return { title:d.title, subtitle:d.subtitle, fandom:fandomLabel(d.fandom), warning:d.warning,
                  cover:d.cover||'', coverCrop:!!d.coverCrop, restricted:!!d.restricted };
  if (f) return { title:f.title||'', subtitle:f.subtitle||'', fandom:f.fandom||'', warning:f.warning||'',
                  cover:'', coverCrop:false, restricted:false };
  return { title:'', subtitle:'', fandom:'', warning:'', cover:'', coverCrop:false, restricted:false };
}

// Tên các chương. Dùng dữ liệu DB của truyện đang mở nếu đã tải xong,
// vì fics.json không biết gì về truyện mới.
function chapterNames(i) {
  if (chapterFic === i && Array.isArray(chapterRows) && chapterRows.length) {
    return chapterRows.map((r, n) => r.title || ('Chapter ' + (n + 1)));
  }
  return (fics[i] && fics[i].chapters) || [];
}

// Dựng bằng DOM. Riêng tiêu đề phụ và tóm tắt cho phép HTML vì đó là nội dung
// do chính chủ repo viết trong YAML (<em>, <br>) — chỉ admin ghi được bảng works.
// Tên ship và fandom thì luôn dùng textContent.
// Ô bìa dùng chung cho thẻ truyện và form đăng bài.
// Dựng bằng DOM chứ không ghép chuỗi HTML: cover_url là dữ liệu nhập vào.
// Chỉ nhận http(s) — chặn javascript:, data: và mọi thứ khác lọt vào src.
function oBia(url, lop) {
  const sach = String(url || '').trim();
  if (/^https?:\/\//i.test(sach)) {
    const img = document.createElement('img');
    img.className = lop;
    img.src = sach;
    img.alt = '';
    img.loading = 'lazy';
    return img;
  }
  const trong = document.createElement('div');
  trong.className = lop + ' bia-trong';
  trong.textContent = '♩';
  return trong;
}

// Thẻ truyện kiểu cũ (makeCardEl) đã gỡ: Home / Works / Opus / Bookmark đều dựng
// bìa đĩa bằng dtThe(). oBia() ở trên vẫn giữ — form Post dùng để xem trước ảnh bìa.

// =============================================
// GIAO DIỆN ĐĨA THAN — Home / Works / Opus
// Bản thiết kế Claude Design (09/2026). Mỗi truyện là một bìa đĩa; thông tin
// truyện là "liner notes"; Opus là bàn xoay chọn thể nhạc.
// Dựng 100% bằng createElement: tên/tóm tắt là dữ liệu nhập vào.
// =============================================

// Màu bìa theo fandom. Fandom mới chưa có ở đây thì lấy màu Spider-Verse.
const MAU_BIA = {
  'Figure Skating RPF': '#1F2A3A', 'Reverse: 1999': '#5A2320', 'Honkai: Star Rail': '#23352F',
  'Genshin Impact': '#2B3350', 'Spider-Verse': '#2A2522', 'Others': '#EFE7D4'
};
const BIA_KEM = '#EFE7D4';

// Icon của từng nhóm Opus, theo slug. Nhóm không có ở đây (kể cả nhóm tạo sau
// bằng form) lần lượt lấy ký hiệu nhạc trong ICON_DU_PHONG — bộ nhạc cụ đã dùng
// hết cho 13 nhóm, không còn nhạc cụ trống để chia.
const ICON_NHOM = {
  'opus-concerto': 'violin', 'opus-prelude-fugue': 'piano-keys', 'opus-sonata': 'flute',
  'opus-chamber-trio': 'cello', 'opus-nocturne': 'grand-piano', 'opus-impromptu': 'upright-piano',
  'opus-rhapsody': 'clarinet', 'opus-fantasia': 'accordion', 'opus-symphony': 'trombone',
  'opus-suite-1': 'xylophone', 'opus-suite-2': 'tuba', 'opus-suite-3': 'harp',
  'suite-iv-scherzo': 'triangle'
};
const ICON_DU_PHONG = ['f-clef', 'c-clef', 'note', 'g-clef'];

const LA_MA = n => { let s = '', x = n;
  [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]
    .forEach(([v, k]) => { while (x >= v) { s += k; x -= v; } });
  return s; };
const GIA_TRI_LA_MA = s => { const m = {I:1,V:5,X:10,L:50,C:100}; let t0 = 0;
  for (let i = 0; i < s.length; i++) { const a = m[s[i]] || 0, b = m[s[i+1]] || 0; t0 += a < b ? -a : a; } return t0; };
const soTuNhien = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare;

// ---- Nhóm Opus ----
// Module Supabase nạp bảng tags rồi gọi datNhomOpus(). Suite nhận ra bằng TÊN
// ("Suite IV · Scherzo"), không bằng slug: nhóm tạo từ form có slug kiểu
// "suite-iv-scherzo", không theo khuôn opus-suite-N.
// Số "Op." là vị trí trong các nhóm KHÔNG phải suite — thêm một thể mới xen giữa
// thì số của các thể sau nó dời theo.
let NHOM = [];
window.datNhomOpus = function (tags) {
  let op = 0, duPhong = 0;
  NHOM = (tags || []).map(t0 => {
    const m = /^Suite\s+([IVXLC]+)\s*·\s*(.+)$/.exec(t0.name || '');
    const mVi = /·\s*(.+)$/.exec(t0.name_vi || '');
    return { id: t0.id, slug: t0.slug, name: t0.name, name_vi: t0.name_vi || '', mo_ta: t0.mo_ta || '',
      mo_ta_vi: t0.mo_ta_vi || '', thu_tu: t0.thu_tu, suite: !!m, num: m ? m[1] : null,
      ngan: m ? m[2] : t0.name,
      nganVi: m ? (mVi ? mVi[1] : m[2]) : (t0.name_vi || t0.name) };
  }).sort((a, b) => (a.thu_tu - b.thu_tu)
      || (a.suite && b.suite ? GIA_TRI_LA_MA(a.num) - GIA_TRI_LA_MA(b.num) : soTuNhien(a.name, b.name)));
  NHOM.forEach(g => {
    if (!g.suite) g.num = String(++op);
    g.icon = ICON_NHOM[g.slug] || ICON_DU_PHONG[duPhong++ % ICON_DU_PHONG.length];
  });
  window.opusNhom = NHOM;
};
const nhomCua = w => (w.groupSlug && NHOM.find(g => g.slug === w.groupSlug)) || null;
const laVi = () => currentLang === 'vi';
function nhanNhom(g)    { return g ? (g.suite ? t('dt_suite') + ' ' + g.num : 'Op. ' + g.num) : t('dt_overture'); }
function tenNganNhom(g) { return g ? (laVi() ? g.nganVi : g.ngan) : t('dt_no_opus'); }
function tenDuNhom(g)   { return g ? nhanNhom(g) + ' · ' + tenNganNhom(g) : t('dt_overture_long'); }

// Icon trên bìa. Riêng nhóm Concerto: nhận nhạc cụ trong tên truyện (4 nhạc cụ
// chủ repo chốt), vì cùng một nhóm có cả piano, violin, viola, cello concerto.
// Viola phải xét TRƯỚC violin. Mọi nhóm khác lấy icon của nhóm.
function iconCua(w) {
  const g = nhomCua(w);
  if (g && g.slug === 'opus-concerto') {
    const ten = (w.title || '').toLowerCase();
    if (/\bviola\b/.test(ten))  return 'viola';
    if (/\bviolin\b/.test(ten)) return 'violin';
    if (/\bcello\b/.test(ten))  return 'cello';
    if (/\bpiano\b/.test(ten))  return 'grand-piano';
  }
  return g ? g.icon : 'g-clef';
}

// ---- Tiện ích dựng DOM ----
const SVGNS = 'http://www.w3.org/2000/svg';
function dtEl(tag, props, ...con) {
  const el = document.createElement(tag);
  if (props) Object.entries(props).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.entries(v).forEach(([p, gt]) => el.style.setProperty(p, gt));
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  });
  ganCon(el, ...con);
  return el;
}
// Gắn con vào một phần tử có sẵn, BỎ QUA null/undefined/false.
// Đừng gọi el.append(a, dieuKien ? b : null) trực tiếp: append() đổi null thành
// chữ "null" và in thẳng ra trang (đã dính ở hàng lọc Works và khung liner Home).
function ganCon(el, ...con) {
  con.flat(Infinity).forEach(c => {
    if (c === null || c === undefined || c === false) return;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  });
  return el;
}
function dtIcon(ten) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('class', 'dt-ic'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
  const u = document.createElementNS(SVGNS, 'use'); u.setAttribute('href', '#ic-' + ten);
  s.append(u);
  return s;
}
// Tóm tắt / phụ đề có thể chứa HTML do chủ repo viết (<em>, <br>). Bóc ra chữ
// trơn bằng DOMParser — không chạy script, không tải ảnh như gán innerHTML.
function chuTron(s) {
  if (!s || !/[<&]/.test(s)) return (s || '').trim();
  return (new DOMParser().parseFromString(String(s), 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
}
const catNgan = (s, n) => s.length > n ? s.slice(0, n - 2).replace(/\s+\S*$/, '') + '…' : s;
const dtSo = n => Number(n).toLocaleString(laVi() ? 'vi-VN' : 'en-US');
const dtNgay = d => { if (!d) return ''; const x = new Date(d); if (isNaN(x)) return '';
  return laVi() ? x.toLocaleDateString('vi-VN') : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
const laDienThoai = () => window.matchMedia('(max-width:768px)').matches;
const doDai = w => w.words == null ? null : w.words < 2000 ? 'Miniature' : w.words <= 5000 ? 'Chamber' : 'Symphonic';
const soChuong = n => n + ' ' + (n === 1 ? t('dt_mv1') : t('dt_mvn'));
const nhacText = w => (w.music || []).length > 2
  ? w.music.slice(0, 2).join(' / ') + ' (+' + (w.music.length - 2) + ')' : (w.music || []).join(' / ');
const theoMoiNhat = (a, b) => {
  const x = a.date ? new Date(a.date).getTime() : 0, y = b.date ? new Date(b.date).getTime() : 0;
  return (y - x) || (b.idx - a.idx);
};
function mauBia(w) {
  const nen = MAU_BIA[w.fandom] || '#2A2522', kem = nen === BIA_KEM;
  // #7A5F14 thay cho #836717 của bản thiết kế: #836717 trên nền kem chỉ đạt 4.35.
  return { '--sleeve': nen, '--s-ink': kem ? '#7A5F14' : '#D4B86A',
    '--s-ink2': kem ? '#5C4F3A' : 'rgba(232,223,200,.72)',
    '--s-frame': kem ? 'rgba(131,103,23,.55)' : 'rgba(212,184,106,.55)' };
}

// ---- Bìa đĩa ----
function dtBia(w) {
  const g = nhomCua(w);
  const s = dtEl('div', { class: 'dt-sl', style: mauBia(w) });
  const ve = () => s.prepend(dtEl('span', { class: 'dt-sl-lab' }, nhanNhom(g)), dtIcon(iconCua(w)),
                             dtEl('span', { class: 'dt-sl-name' }, tenNganNhom(g)));
  // Có ảnh bìa riêng thì ảnh phủ kín ô vuông thay cho phần vẽ; ảnh hỏng thì lùi
  // về vẽ. Chỉ nhận http(s), giống oBia().
  const url = String(w.cover || '').trim();
  if (/^https?:\/\//i.test(url)) {
    const img = dtEl('img', { src: url, alt: '', loading: 'lazy' });
    img.addEventListener('error', () => { img.remove(); ve(); });
    s.append(img);
  } else ve();
  if (w.restricted) s.append(dtEl('span', { class: 'dt-sl-lock' }, t('only_member')));
  return s;
}
function dtThe(w, chon, coDongNho) {
  return dtEl('button', { type: 'button', class: 'dt-card', 'aria-pressed': 'false', 'data-idx': w.idx,
      onclick: e => chon(w, e.currentTarget) },
    dtEl('div', { class: 'dt-slw' }, dtEl('div', { class: 'dt-rec', 'aria-hidden': 'true' }), dtBia(w)),
    dtEl('div', { class: 'dt-card-meta' },
      dtEl('div', { class: 'dt-title' }, w.title),
      w.subtitle ? dtEl('div', { class: 'dt-sub' }, chuTron(w.subtitle)) : null,
      coDongNho ? dtEl('div', { class: 'dt-card-small' },
        [w.fandom === 'Others' ? '' : w.fandom, w.words != null ? dtSo(w.words) + ' ' + t('dt_words') : '']
          .filter(Boolean).join(' · ')) : null));
}
function danhDauChon(khung, idx) {
  khung.querySelectorAll('.dt-card').forEach(c => {
    const on = Number(c.dataset.idx) === idx;
    c.classList.toggle('dt-on', on);
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

// ---- Liner notes ----
function dtMoTruyen(idx) { dongBangTruot(true); openFic(idx); }
function nutLuu(w) {
  if (!w.uuid) return null;   // bản dự phòng fics.json không có id thật để lưu
  const b = dtEl('button', { type: 'button', class: 'dt-bm', 'aria-label': t('dt_bookmark'), title: t('dt_bookmark'),
    'aria-pressed': (window.skDaLuu && window.skDaLuu.has(w.uuid)) ? 'true' : 'false', 'data-uuid': w.uuid,
    onclick: e => { if (window.dtLuuTruyen) window.dtLuuTruyen(w, e.currentTarget); } }, '✦');
  return b;
}
// Module gọi hàm này khi danh sách "đã lưu" đổi (đăng nhập/xuất, vừa lưu ở trang đọc).
window.dtVeLaiNutLuu = function () {
  document.querySelectorAll('.dt-bm[data-uuid]').forEach(b =>
    b.setAttribute('aria-pressed', (window.skDaLuu && window.skDaLuu.has(b.dataset.uuid)) ? 'true' : 'false'));
};
function dtLiner(w, co) {
  const g = nhomCua(w);
  const tt = dtEl('div', { class: 'dt-tt', 'aria-hidden': 'true', style: { '--tt-s': co + 'px' } },
    dtEl('div', { class: 'dt-tt-rec' }), dtBia(w));
  const tom = catNgan(chuTron(w.summary), 260);
  return dtEl('div', { class: 'dt-liner' },
    tt,
    dtEl('div', null, dtEl('h2', null, w.title), w.subtitle ? dtEl('div', { class: 'dt-sub big' }, chuTron(w.subtitle)) : null),
    tom ? dtEl('blockquote', null, tom) : null,
    dtEl('dl', null,
      dtEl('dt', null, t('dt_form')), dtEl('dd', null, tenDuNhom(g)),
      dtEl('dt', null, t('fandom')), dtEl('dd', null, fandomLabel(w.fandom)),
      (w.ships || []).filter(s => s !== 'Others').length
        ? [dtEl('dt', null, t('dt_pairing')), dtEl('dd', null, w.ships.filter(s => s !== 'Others').join(', '))] : null,
      (w.words != null || w.nch) ? [dtEl('dt', null, t('dt_length')), dtEl('dd', null,
        [w.words != null ? dtSo(w.words) + ' ' + t('dt_words') : '', w.nch ? soChuong(w.nch) : ''].filter(Boolean).join(' · '))] : null,
      w.lang ? [dtEl('dt', null, t('dt_language')), dtEl('dd', null, w.lang === 'vi' ? 'Tiếng Việt' : 'English')] : null,
      (w.music || []).length ? [dtEl('dt', null, t('dt_played')), dtEl('dd', { class: 'music' }, nhacText(w))] : null),
    dtEl('div', { class: 'dt-flags' },
      w.restricted ? dtEl('span', { class: 'dt-flag lock' }, t('only_member')) : null,
      w.warning ? dtEl('span', { class: 'dt-flag warn', title: w.warning }, t('dt_cw')) : null,
      w.kudos > 0 ? dtEl('span', { class: 'dt-flag' }, '♥ ' + w.kudos + ' kudos') : null),
    dtEl('div', { class: 'dt-liner-btns' },
      dtEl('button', { type: 'button', class: 'dt-btn', onclick: () => dtMoTruyen(w.idx) },
        co > 200 ? t('dt_play_first') : t('dt_play')),
      nutLuu(w)));
}

// ---- Bảng trượt (điện thoại) ----
let bangTruotVe = null;
function moBangTruot(w, tu) {
  const sheet = document.getElementById('dt-sheet');
  bangTruotVe = tu || document.activeElement;
  const than = document.getElementById('dt-sheet-body');
  than.textContent = '';
  than.append(dtLiner(w, 150));
  document.getElementById('dt-sheet-x').setAttribute('aria-label', t('dt_close'));
  sheet.classList.add('on');
  document.getElementById('dt-scrim').classList.add('on');
  document.body.style.overflow = 'hidden';
  sheet.scrollTop = 0;
  setTimeout(() => sheet.focus(), 30);
}
// khongTraFocus: khi đóng để mở truyện thì đừng kéo focus về bìa (trang đã đổi).
function dongBangTruot(khongTraFocus) {
  const sheet = document.getElementById('dt-sheet');
  if (!sheet || !sheet.classList.contains('on')) return;
  sheet.classList.remove('on');
  document.getElementById('dt-scrim').classList.remove('on');
  document.body.style.overflow = '';
  if (!khongTraFocus && bangTruotVe && bangTruotVe.focus) bangTruotVe.focus();
  bangTruotVe = null;
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dt-scrim').addEventListener('click', () => dongBangTruot());
  document.getElementById('dt-sheet-x').addEventListener('click', () => dongBangTruot());
});
document.addEventListener('keydown', e => {
  const sheet = document.getElementById('dt-sheet');
  if (!sheet || !sheet.classList.contains('on')) return;
  if (e.key === 'Escape') { e.preventDefault(); dongBangTruot(); return; }
  if (e.key === 'Tab') {   // giữ focus trong bảng khi đang mở
    const ds = [...sheet.querySelectorAll('button,[href],input')].filter(x => x.offsetParent !== null);
    if (!ds.length) return;
    const dau = ds[0], cuoi = ds[ds.length - 1];
    if (e.shiftKey && (document.activeElement === dau || document.activeElement === sheet)) { e.preventDefault(); cuoi.focus(); }
    else if (!e.shiftKey && document.activeElement === cuoi) { e.preventDefault(); dau.focus(); }
  }
});

// =============================================
// HOME — "Tonight's programme"
// =============================================
let homeChon = null;   // idx đang nằm trên khung liner notes của New arrivals

function theDocDo() {
  // Đọc dở: sk-continue do saveReadingProgress() ghi. Quá 30 ngày thì thôi.
  let d = null;
  try { d = JSON.parse(localStorage.getItem('sk-continue') || 'null'); } catch (_) {}
  if (!d || Date.now() - d.timestamp > 30 * 24 * 60 * 60 * 1000) return null;
  const w = worksData.find(x => x.idx === d.ficIdx);
  if (!w) return null;
  const ch = (d.chapter || 0) + 1;
  const nhan = w.nch
    ? t('dt_mv_of').replace('{a}', LA_MA(ch)).replace('{b}', LA_MA(w.nch))
    : t('dt_mv_one').replace('{a}', LA_MA(ch));
  const bia = dtEl('span', { class: 's' });
  const url = String(w.cover || '').trim();
  if (/^https?:\/\//i.test(url)) bia.append(dtEl('img', { src: url, alt: '' })); else bia.append(dtIcon(iconCua(w)));
  return dtEl('button', { type: 'button', class: 'dt-cont', style: mauBia(w), onclick: () => resumeReading() },
    dtEl('span', { class: 'dt-cont-art', 'aria-hidden': 'true' }, dtEl('span', { class: 'r' }), bia),
    dtEl('span', { class: 'dt-cont-txt' },
      dtEl('span', { class: 'dt-eyebrow' }, t('dt_paused') + ' · ' + nhan),
      dtEl('span', { class: 'dt-title' }, w.title),
      w.subtitle ? dtEl('span', { class: 'dt-sub' }, chuTron(w.subtitle)) : null,
      w.nch ? dtEl('span', { class: 'dt-bar', 'aria-hidden': 'true' },
        dtEl('i', { style: { width: Math.min(100, Math.round(ch / w.nch * 100)) + '%' } })) : null),
    dtEl('span', { class: 'dt-cont-play', 'aria-hidden': 'true' }, '▶'));
}

function renderHome() {
  const goc = document.getElementById('dt-home');
  if (!goc) return;
  const moi = [...worksData].sort(theoMoiNhat).slice(0, 6);
  const thich = worksData.filter(w => w.featured);
  if (!moi.some(w => w.idx === homeChon) && !thich.some(w => w.idx === homeChon)) homeChon = moi[0] ? moi[0].idx : null;

  const khungLiner = dtEl('div', { class: 'dt-home-liner', 'aria-live': 'polite' });
  const veLiner = () => {
    khungLiner.textContent = '';
    const w = worksData.find(x => x.idx === homeChon);
    if (!w) return;
    const tom = catNgan(chuTron(w.summary), 260);
    ganCon(khungLiner,
      dtEl('div', { class: 'dt-eyebrow' }, [tenDuNhom(nhomCua(w)), dtNgay(w.date)].filter(Boolean).join('  ·  ')),
      dtEl('div', { class: 'dt-title' }, w.title),
      w.subtitle ? dtEl('div', { class: 'dt-sub' }, chuTron(w.subtitle)) : null,
      tom ? dtEl('p', null, tom) : null,
      dtEl('div', { class: 'small' }, [fandomLabel(w.fandom), w.words != null ? dtSo(w.words) + ' ' + t('dt_words') : '',
        w.nch ? soChuong(w.nch) : ''].filter(Boolean).join('  ·  ')),
      (w.music || []).length ? dtEl('div', { class: 'music' }, dtEl('b', null, t('dt_played')), dtEl('em', null, nhacText(w))) : null,
      dtEl('button', { type: 'button', class: 'dt-btn', onclick: () => dtMoTruyen(w.idx) }, t('dt_play')));
  };
  const keMoi = dtEl('div', { class: 'dt-grid3' });
  const keThich = dtEl('div', { class: 'dt-grid4' });
  const chon = (w, el) => {
    homeChon = w.idx; danhDauChon(keMoi, w.idx); danhDauChon(keThich, w.idx); veLiner();
    if (laDienThoai()) moBangTruot(w, el);
    else if (el && keThich.contains(el)) khungLiner.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  moi.forEach(w => keMoi.append(dtThe(w, chon, false)));
  thich.forEach(w => keThich.append(dtThe(w, chon, false)));
  danhDauChon(keMoi, homeChon); danhDauChon(keThich, homeChon); veLiner();

  const docDo = theDocDo();
  const denWorks = () => showPage('works', document.querySelector('.nav-links a[data-page="works"]'));
  const denOpus  = slug => { if (slug) window.opusChon = slug; showPage('opus', document.querySelector('.nav-links a[data-page="opus"]')); };

  goc.textContent = '';
  goc.append(dtEl('main', { class: 'dt-main' },
    dtEl('section', { class: 'dt-hero dt-px' + (docDo ? '' : ' dt-mot-cot') },
      dtEl('div', { class: 'dt-hero-left' },
        dtEl('div', { class: 'dt-eyebrow' }, t('dt_programme')),
        dtEl('h1', null, 'ShostaKid'),
        // Giữ nguyên chữ "$" — chơi chữ có chủ ý.
        dtEl('p', null, t('hero_sub') + '.', dtEl('br'), t('hero_tag') + '.'),
        dtEl('div', { class: 'dt-hero-btns' },
          dtEl('button', { type: 'button', class: 'dt-btn', onclick: denWorks }, t('dt_browse')),
          dtEl('button', { type: 'button', class: 'dt-btn-line', onclick: () => denOpus() }, t('dt_open_opus')))),
      docDo ? dtEl('div', { class: 'dt-hero-right' }, dtEl('div', { class: 'dt-eyebrow' }, t('dt_left_off')), docDo) : null),
    moi.length ? dtEl('section', { class: 'dt-sec dt-px' },
      dtEl('div', { class: 'dt-sec-head' }, dtEl('div', null, dtEl('div', { class: 'dt-eyebrow' }, t('dt_latest')), dtEl('h2', null, t('dt_new_arrivals')))),
      dtEl('div', { class: 'dt-shelf2' }, keMoi, khungLiner)) : null,
    thich.length ? dtEl('section', { class: 'dt-sec dt-px' },
      dtEl('div', { class: 'dt-sec-head' },
        dtEl('div', null, dtEl('div', { class: 'dt-eyebrow' }, t('dt_chosen')), dtEl('h2', null, t('head_fav'))),
        dtEl('button', { type: 'button', class: 'dt-link-btn dt-desk', onclick: denWorks }, t('view_all'))),
      keThich) : null,
    dtEl('button', { type: 'button', class: 'dt-btn-line dt-view-all', onclick: denWorks }, t('view_all')),
    NHOM.length ? dtEl('section', { class: 'dt-sec' },
      dtEl('div', { class: 'dt-sec-head dt-px' }, dtEl('div', null, dtEl('div', { class: 'dt-eyebrow' }, 'Opus'), dtEl('h2', null, t('dt_by_form')))),
      dtEl('div', { class: 'dt-forms' }, NHOM.map(g => dtEl('button', { type: 'button', class: 'dt-form-tile', onclick: () => denOpus(g.slug) },
        dtIcon(g.icon), dtEl('span', { class: 'lab' }, nhanNhom(g)), dtEl('span', { class: 'nm' }, tenNganNhom(g)))))) : null));
}

// =============================================
// WORKS — kệ đĩa
// =============================================
// Thứ tự: 'new' (mới nhất) hoặc 'long' (dài nhất), nhớ ở localStorage. Giá trị
// 'old' của bản cũ không còn — gặp thì coi như 'new'.
const WS = { fandom: 'all', len: 'all', sort: 'new', ships: new Set(), q: '', xemHet: false, chon: null };
try { const s0 = localStorage.getItem('sk-sort'); if (s0 === 'long') WS.sort = 'long'; } catch (e) {}

function locWorks() {
  const q = WS.q.trim().toLowerCase();
  return worksData.filter(w =>
      (WS.fandom === 'all' || w.fandom === WS.fandom)
      && (WS.len === 'all' || doDai(w) === WS.len)
      && (!q || (w.title + ' ' + chuTron(w.subtitle)).toLowerCase().includes(q))
      && [...WS.ships].every(s => (w.ships || []).includes(s)))
    .sort(WS.sort === 'long' ? ((a, b) => (b.words || 0) - (a.words || 0) || theoMoiNhat(a, b)) : theoMoiNhat);
}

function renderWorks() {
  const goc = document.getElementById('dt-works');
  if (!goc) return;
  const fandoms = ['all', ...Object.keys(MAU_BIA).filter(f => worksData.some(w => w.fandom === f)),
                   ...[...new Set(worksData.map(w => w.fandom))].filter(f => !(f in MAU_BIA))];
  const aside = dtEl('aside', { class: 'dt-aside', 'aria-live': 'polite', 'aria-label': t('dt_on_tt') });
  const ke = dtEl('section', { class: 'dt-shelf', 'aria-label': t('dt_works_h1') });
  const boLoc = dtEl('div', { class: 'dt-filters' });
  const chip = (nhan, bat, fn, so) => dtEl('button', { type: 'button', class: 'dt-chip', 'aria-pressed': bat ? 'true' : 'false', onclick: fn },
    nhan, so !== undefined ? dtEl('small', null, so) : null);

  const veAside = ds => {
    aside.textContent = '';
    const w = ds.find(x => x.idx === WS.chon);
    if (w) aside.append(dtEl('div', { class: 'dt-eyebrow', style: { 'margin-bottom': '22px' } }, t('dt_on_tt')), dtLiner(w, 230));
  };
  const veKe = () => {
    const ds = locWorks();
    if (!ds.some(w => w.idx === WS.chon)) WS.chon = ds[0] ? ds[0].idx : null;
    const gioiHan = laDienThoai() ? 10 : 12;
    const hien = WS.xemHet ? ds : ds.slice(0, gioiHan);
    ke.textContent = '';
    ke.append(dtEl('div', { class: 'dt-eyebrow' }, t('dt_on_shelf').replace('{n}', ds.length) + (laDienThoai() ? ' · ' + t('dt_tap') : '')));
    if (!ds.length) ke.append(dtEl('p', { class: 'dt-empty' }, t('no_results')));
    const luoi = dtEl('div', { class: 'dt-grid-shelf' });
    const chon = (w, el) => { WS.chon = w.idx; danhDauChon(luoi, w.idx); veAside(ds); if (laDienThoai()) moBangTruot(w, el); };
    hien.forEach(w => luoi.append(dtThe(w, chon, true)));
    danhDauChon(luoi, WS.chon);
    ke.append(luoi);
    if (!WS.xemHet && ds.length > gioiHan)
      ke.append(dtEl('button', { type: 'button', class: 'dt-btn-line dt-more', onclick: () => { WS.xemHet = true; veKe(); } },
        t('dt_show_all').replace('{n}', ds.length)));
    veAside(ds);
  };
  const veBoLoc = () => {
    // Giữ vị trí cuộn ngang của các dải chip (điện thoại) khi vẽ lại.
    const cuon = [...boLoc.querySelectorAll('.dt-f-row')].map(r => r.scrollLeft);
    boLoc.textContent = '';
    const tim = dtEl('input', { id: 'dt-q', class: 'dt-search', type: 'search', placeholder: t('search_ph'), 'aria-label': t('search_ph'),
      oninput: e => { WS.q = e.target.value; WS.xemHet = false; veKe(); } });
    tim.value = WS.q;
    const ships = WS.fandom === 'all' ? []
      : [...new Set(worksData.filter(w => w.fandom === WS.fandom).flatMap(w => w.ships || []))].filter(s => s !== 'Others').sort(soTuNhien);
    // Ship đang lọc nhưng không nằm trong danh sách (vd "Others" từ link Commission)
    // vẫn phải hiện thành chip, không thì người xem không biết vì sao kệ bị lọc, cũng không bỏ lọc được.
    [...WS.ships].forEach(s => { if (!ships.includes(s)) ships.push(s); });
    const daiNgan = laDienThoai();
    ganCon(boLoc,
      dtEl('div', { class: 'dt-f-row' }, dtEl('label', { class: 'dt-f-lab', for: 'dt-q' }, t('dt_search')), tim),
      dtEl('div', { class: 'dt-f-row' }, dtEl('div', { class: 'dt-f-lab' }, t('fandom')),
        dtEl('div', { class: 'dt-chips' }, fandoms.map(f => chip(f === 'all' ? t('all') : f, WS.fandom === f,
          () => { WS.fandom = f; WS.ships.clear(); WS.xemHet = false; ve(); },
          f === 'all' ? worksData.length : worksData.filter(w => w.fandom === f).length)))),
      // Lọc theo ship: bản thiết kế không vẽ nhưng dặn giữ. Chỉ hiện sau khi đã
      // chọn fandom, để hàng chip không dài bất tận.
      ships.length ? dtEl('div', { class: 'dt-f-row' }, dtEl('div', { class: 'dt-f-lab' }, t('dt_pairing')),
        dtEl('div', { class: 'dt-chips' }, ships.map(s => chip(s, WS.ships.has(s),
          () => { WS.ships.has(s) ? WS.ships.delete(s) : WS.ships.add(s); WS.xemHet = false; ve(); })))) : null,
      dtEl('div', { class: 'dt-f-row len' }, dtEl('div', { class: 'dt-f-lab' }, t('dt_length')),
        dtEl('div', { class: 'dt-chips' }, [['all', 'dt_any_len'], ['Miniature', daiNgan ? 'dt_mini' : 'dt_mini_l'],
          ['Chamber', daiNgan ? 'dt_chamber' : 'dt_chamber_l'], ['Symphonic', daiNgan ? 'dt_symph' : 'dt_symph_l']]
          .map(([k, nhan]) => chip(t(nhan), WS.len === k, () => { WS.len = k; WS.xemHet = false; ve(); }))),
        dtEl('div', { class: 'dt-order' }, dtEl('span', { class: 'dt-f-lab', style: { 'margin-right': '6px' } }, t('dt_order')),
          chip(t('dt_newest'), WS.sort === 'new', () => doiThuTu('new')),
          chip(t('dt_longest'), WS.sort === 'long', () => doiThuTu('long')))));
    [...boLoc.querySelectorAll('.dt-f-row')].forEach((r, i) => { r.scrollLeft = cuon[i] || 0; });
  };
  const doiThuTu = k => { WS.sort = k; try { localStorage.setItem('sk-sort', k); } catch (e) {} ve(); };
  function ve() { veBoLoc(); veKe(); }
  ve();

  goc.textContent = '';
  goc.append(dtEl('main', { class: 'dt-main' },
    dtEl('header', { class: 'dt-w-head dt-px' },
      dtEl('div', null, dtEl('div', { class: 'dt-eyebrow' }, t('dt_shelf_of').replace('{n}', worksData.length)),
        dtEl('h1', null, t('dt_works_h1'))),
      dtEl('p', null, t('dt_shelf_intro'))),
    boLoc,
    dtEl('div', { class: 'dt-w-body' }, ke, aside)));
}

// =============================================
// OPUS — bàn xoay
// =============================================
const KIM = -35;                       // góc kim đọc, độ
const OPUS = { chon: 0, rot: KIM };
// Xoay tới thể i theo đường NGẮN NHẤT từ góc hiện tại; rot tích luỹ, không reset.
function xoayToi(i) {
  const buoc = 360 / NHOM.length;
  const dich = KIM - i * buoc;
  const d = ((((dich - OPUS.rot) % 360) + 540) % 360) - 180;
  OPUS.rot += d; OPUS.chon = i;
}
let opusVe = null;   // hàm vẽ lại phần phụ thuộc lựa chọn của lần dựng gần nhất

function renderOpus() {
  const goc = document.getElementById('dt-opus');
  if (!goc) return;
  goc.textContent = '';
  if (!NHOM.length) return;            // chưa nạp được bảng tags (DB ngủ)
  if (window.opusChon) {
    const i = NHOM.findIndex(g => g.slug === window.opusChon);
    if (i >= 0) xoayToi(i);
    window.opusChon = null;
  }
  if (OPUS.chon >= NHOM.length) { OPUS.chon = 0; OPUS.rot = KIM; }
  const buoc = 360 / NHOM.length;

  const rotor = dtEl('div', { class: 'dt-rotor' });
  const oTrenDia = NHOM.map((g, i) => {
    const b = dtEl('button', { type: 'button', 'aria-label': nhanNhom(g) + ', ' + tenNganNhom(g), 'aria-pressed': 'false',
      onclick: () => { xoayToi(i); opusVe(); } }, dtIcon(g.icon));
    const o = dtEl('div', { class: 'dt-slot' }, b);
    rotor.append(o);
    return o;
  });
  const nhanGiua = dtEl('div', { class: 'dt-label' });
  // Kim đọc tô bằng biến CSS qua thuộc tính style (thuộc tính fill= của SVG không
  // nhận var()), nên đổi theme là màu tự đổi — không cần dựng lại.
  const kim = document.createElementNS(SVGNS, 'svg');
  [['class', 'dt-tonearm'], ['width', '640'], ['height', '600'], ['viewBox', '0 0 640 600'], ['aria-hidden', 'true']]
    .forEach(([k, v]) => kim.setAttribute(k, v));
  [['circle', { cx: 596, cy: 52, r: 30, style: 'fill:var(--cream2);stroke:var(--gold);stroke-width:2' }],
   ['circle', { cx: 596, cy: 52, r: 9, style: 'fill:var(--gold)' }],
   ['path', { d: 'M596 52 L626 20', style: 'stroke:var(--gold-dark);stroke-width:10;stroke-linecap:round' }],
   ['path', { d: 'M596 52 L560 140 L505 158', style: 'fill:none;stroke:var(--gold-dark);stroke-width:6;stroke-linecap:round;stroke-linejoin:round' }],
   ['rect', { x: 478, y: 146, width: 34, height: 20, rx: 3, style: 'fill:var(--gold)', transform: 'rotate(-18 495 156)' }]]
    .forEach(([tag, at]) => { const e = document.createElementNS(SVGNS, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); kim.append(e); });
  const hop = dtEl('div', { class: 'dt-tt-box' }, dtEl('div', { class: 'dt-tt-scale' }, dtEl('div', { class: 'dt-platter' }, rotor, nhanGiua), kim));

  const truoc = dtEl('button', { type: 'button', onclick: () => { xoayToi((OPUS.chon - 1 + NHOM.length) % NHOM.length); opusVe(); } });
  const sau   = dtEl('button', { type: 'button', onclick: () => { xoayToi((OPUS.chon + 1) % NHOM.length); opusVe(); } });
  const nhanM = dtEl('div', { class: 'dt-eyebrow' });
  const dieuHuongM = dtEl('div', { class: 'dt-o-nav-m' },
    dtEl('button', { type: 'button', 'aria-label': t('dt_prev'), onclick: () => truoc.click() }, '↺'), nhanM,
    dtEl('button', { type: 'button', 'aria-label': t('dt_next'), onclick: () => sau.click() }, '↻'));
  const ds = dtEl('section', { class: 'dt-o-list', 'aria-live': 'polite' });

  opusVe = () => {
    const g = NHOM[OPUS.chon];
    oTrenDia.forEach((o, i) => {
      const a = i * buoc;
      o.style.transform = 'rotate(' + a + 'deg) translate(236px) rotate(' + (-(a + OPUS.rot)) + 'deg)';   // icon luôn đứng thẳng
      o.firstChild.setAttribute('aria-pressed', i === OPUS.chon ? 'true' : 'false');
    });
    rotor.style.transform = 'rotate(' + OPUS.rot + 'deg)';
    nhanGiua.textContent = '';
    nhanGiua.append(dtIcon(g.icon), dtEl('div', { class: 'dt-eyebrow' }, nhanNhom(g)), dtEl('div', { class: 'nm' }, tenNganNhom(g)), dtEl('div', { class: 'dot' }));
    const p = NHOM[(OPUS.chon - 1 + NHOM.length) % NHOM.length], n = NHOM[(OPUS.chon + 1) % NHOM.length];
    truoc.textContent = ''; truoc.append(dtEl('span', { class: 'dt-eyebrow' }, '↺ ' + t('dt_prev')), dtEl('span', { class: 'nm' }, tenDuNhom(p)));
    sau.textContent = '';   sau.append(dtEl('span', { class: 'dt-eyebrow' }, t('dt_next') + ' ↻'), dtEl('span', { class: 'nm' }, tenDuNhom(n)));
    nhanM.textContent = nhanNhom(g);

    const truyen = worksData.filter(w => w.groupSlug === g.slug).sort((a, b) => soTuNhien(a.title, b.title));
    const soKhoa = truyen.filter(w => w.restricted).length, soCanh = truyen.filter(w => w.warning).length;
    const manh = [truyen.length + ' ' + (truyen.length === 1 ? t('dt_work1') : t('dt_workn'))];
    if (soKhoa) manh.push(t('dt_locked_n').replace('{n}', soKhoa));
    if (soCanh) manh.push(t('dt_warn_n').replace('{n}', soCanh));
    const moTa = laVi() ? (g.mo_ta_vi || g.mo_ta) : g.mo_ta;
    ds.textContent = '';
    ganCon(ds,
      dtEl('div', null,
        dtEl('div', { class: 'dt-eyebrow' }, (g.suite ? '' : 'Op. ' + g.num + '  ·  ') + manh.join('  ·  ')),
        // Riêng tổ khúc: tiêu đề đầy đủ "Suite I · Danse Macabre".
        dtEl('h2', null, g.suite ? tenDuNhom(g) : tenNganNhom(g)),
        moTa ? dtEl('p', { class: 'desc' }, moTa) : null),
      truyen.length
        ? dtEl('ol', null, truyen.map((w, k) => {
            const meta = [w.fandom === 'Others' ? '' : fandomLabel(w.fandom), (w.ships || []).filter(s => s !== 'Others').join(', '),
              w.words != null ? dtSo(w.words) + ' ' + t('dt_words') : ''].filter(Boolean).join('  ·  ');
            return dtEl('li', null, dtEl('button', { type: 'button', class: 'dt-o-row', onclick: () => openFic(w.idx) },
              dtEl('span', { class: 'dt-o-num' }, LA_MA(k + 1) + '.'),
              dtEl('span', { class: 'dt-o-txt' },
                dtEl('span', { class: 'dt-o-t' }, dtEl('span', { class: 'dt-title' }, w.title),
                  w.subtitle ? [dtEl('span', { class: 'sep' }, ':  '), dtEl('em', null, chuTron(w.subtitle))] : null),
                meta ? dtEl('span', { class: 'dt-o-meta' }, meta) : null,
                (w.music || []).length ? dtEl('span', { class: 'dt-o-mu' }, dtEl('b', null, t('dt_played')), ' ', dtEl('i', null, nhacText(w))) : null,
                (w.restricted || w.warning) ? dtEl('span', { class: 'dt-flags' },
                  w.restricted ? dtEl('span', { class: 'dt-flag lock' }, t('only_member')) : null,
                  w.warning ? dtEl('span', { class: 'dt-flag warn' }, t('dt_cw')) : null) : null)));
          }))
        : dtEl('div', { class: 'dt-o-empty' }, t('opus_nhom_trong')),
      dtEl('div', { class: 'dt-credit' }, t('dt_credit')));
    // Nút ✎ sửa nhóm — chỉ admin; module Supabase dựng và tự kiểm quyền.
    if (window.dtNutSuaNhom) window.dtNutSuaNhom(ds, g, truyen.length);
  };

  goc.append(dtEl('main', { class: 'dt-main' },
    dtEl('header', { class: 'dt-o-head dt-px' },
      dtEl('div', null, dtEl('div', { class: 'dt-eyebrow' }, t('dt_catalogue')), dtEl('h1', null, 'Opus')),
      dtEl('p', null, t('opus_dan'))),
    dtEl('div', { class: 'dt-rule' }),
    dtEl('div', { class: 'dt-o-body' },
      dtEl('div', { class: 'dt-o-left' }, hop, dtEl('div', { class: 'dt-o-nav' }, truoc, sau), dieuHuongM),
      ds)));
  opusVe();
  vuaBanXoay();
}
// Thu bàn xoay cho vừa bề ngang. Trên điện thoại icon được phóng to TRƯỚC khi
// thu (--dm) để sau khi thu vẫn còn >= 46px bấm được.
function vuaBanXoay() {
  const hop = document.querySelector('#dt-opus .dt-tt-box');
  if (!hop || !hop.parentElement.clientWidth) return;
  const rong = laDienThoai() ? document.documentElement.clientWidth - 19 : Math.min(640, hop.parentElement.clientWidth);
  const k = Math.min(1, rong / 640);
  hop.style.setProperty('--k', k.toFixed(4));
  hop.style.setProperty('--dm', Math.max(76, Math.ceil(46 / k)) + 'px');
}

// =============================================
// BOOKMARK — kệ đĩa riêng của người đọc, cùng kiểu với Works
// =============================================
// Module nạp danh sách rồi gọi hàm này. rows = [{ id, created_at, idx, w }]
// (w là bản rút gọn từ truy vấn bookmark, dùng khi worksData chưa có truyện đó);
// thongBao = chữ thay cho kệ khi đang tải / trống / lỗi / chưa đăng nhập.
// boLuu(idBookmark, nut) do module cấp — nút Bỏ lưu dưới mỗi bìa.
let bmChon = null;
let bmLanCuoi = null;   // để dựng lại khi đổi ngôn ngữ / xoay máy mà không nạp lại
window.dtVeBookmark = function (rows, thongBao, boLuu) {
  bmLanCuoi = { rows, thongBao, boLuu };
  const goc = document.getElementById('bm-list');
  if (!goc) return;
  // Ưu tiên bản đầy đủ trong worksData (có nhóm Opus, số chữ, nhạc…).
  const ds = (rows || []).map(r => ({ w: worksData.find(x => x.idx === r.idx) || r.w, bmId: r.id, luuLuc: r.created_at }))
                         .filter(x => x.w);
  if (!ds.some(x => x.w.idx === bmChon)) bmChon = ds[0] ? ds[0].w.idx : null;

  const aside = dtEl('aside', { class: 'dt-aside', 'aria-live': 'polite', 'aria-label': t('dt_on_tt') });
  const veAside = () => {
    aside.textContent = '';
    const x = ds.find(y => y.w.idx === bmChon);
    if (x) aside.append(dtEl('div', { class: 'dt-eyebrow', style: { 'margin-bottom': '22px' } }, t('dt_on_tt')), dtLiner(x.w, 230));
  };
  const luoi = dtEl('div', { class: 'dt-grid-shelf' });
  const chon = (w, el) => { bmChon = w.idx; danhDauChon(luoi, w.idx); veAside(); if (laDienThoai()) moBangTruot(w, el); };
  ds.forEach(x => luoi.append(dtEl('div', { class: 'dt-bm-item' },
    dtThe(x.w, chon, true),
    dtEl('div', { class: 'dt-bm-foot' },
      dtEl('span', null, t('bm_saved_on') + ' · ' + dtNgay(x.luuLuc)),
      boLuu ? dtEl('button', { type: 'button', class: 'comment-del', onclick: e => boLuu(x.bmId, e.currentTarget) }, t('bm_remove')) : null))));
  danhDauChon(luoi, bmChon);
  veAside();

  goc.textContent = '';
  goc.append(dtEl('main', { class: 'dt-main' },
    dtEl('header', { class: 'dt-w-head dt-px' },
      dtEl('div', null,
        dtEl('div', { class: 'dt-eyebrow' }, t('dt_bm_eyebrow').replace('{n}', ds.length)),
        dtEl('h1', null, t('dt_bm_h1'))),
      dtEl('p', null, t('dt_bm_intro'))),
    thongBao
      ? dtEl('p', { class: 'dt-empty dt-px' }, thongBao)
      : dtEl('div', { class: 'dt-w-body' },
          dtEl('section', { class: 'dt-shelf', 'aria-label': t('dt_bm_h1') }, luoi), aside)));
};
function veLaiBookmark() {
  if (bmLanCuoi) window.dtVeBookmark(bmLanCuoi.rows, bmLanCuoi.thongBao, bmLanCuoi.boLuu);
}

// Vẽ lại cả ba trang: đổi ngôn ngữ, đổi theme (màu kim đĩa đọc từ biến CSS),
// đổi dữ liệu, hoặc xoay máy qua mốc điện thoại/máy tính.
function veLaiDiaThan() {
  renderHome(); renderWorks(); renderOpus(); veLaiBookmark();
  // Ô đếm "Works" ở trang About. renderWorks() cũ tự cập nhật ô này; bản đĩa
  // than viết lại mà quên, nên trang About đứng mãi ở "—".
  const soTruyen = document.getElementById('stat-works');
  if (soTruyen) soTruyen.textContent = worksData.length;
}
window.veLaiDiaThan = veLaiDiaThan;
let dangLaDienThoai = laDienThoai();
window.addEventListener('resize', () => {
  vuaBanXoay();
  if (laDienThoai() !== dangLaDienThoai) { dangLaDienThoai = laDienThoai(); dongBangTruot(true); veLaiDiaThan(); }
});

// Module Supabase gọi hàm này sau khi đăng/sửa truyện để danh sách cập nhật ngay.
window.applyWorksData = function (rows) { worksData = rows; worksFromDB = true; renderAllWorks(); };

function renderAllWorks() {
  // Module Supabase (trang Bookmark) đọc worksData qua đây vì biến khai bằng
  // `let` không nằm trên window.
  window.worksDataCuaSite = worksData;
  // Dữ liệu vừa đổi (thường là từ bản dự phòng fics.json sang DB): chọn lại đĩa
  // mới nhất, đừng giữ lựa chọn của bản dự phòng — bên đó thứ tự ngày khác.
  WS.chon = null; homeChon = null;
  applyLang();   // applyLang() tự vẽ lại ba trang đĩa than
}
// fandomLabel cũng nằm ở script cổ điển; trang Opus cần để hiện tên fandom
// đúng như trên thẻ truyện (riêng Reverse có bản hai thứ tiếng).
window.fandomLabel = fandomLabel;

function txtToHtml(text) {
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    if (/^-{3,}$/.test(p)) return '<div class="scene-break">✦ ✦ ✦</div>';
    const lines = p.split('\n').map(l => l.trim()).join('<br>');
    return `<p>${lines}</p>`;
  }).join('');
}

// --- Per-chapter music helper ---
function getMusicData(ficIdx, chapterIdx) {
  // Truyện đăng qua form chỉ có nhạc trong chapters.music, không có trong
  // fics.json — nên ưu tiên DB, chỉ lùi về fics.json khi DB không có.
  if (chapterFic === ficIdx && Array.isArray(chapterRows) && chapterRows[chapterIdx]
      && chapterRows[chapterIdx].music) {
    const mm = chapterRows[chapterIdx].music;
    return { m: mm, name: mm.name || '' };
  }
  const f = fics[ficIdx] || {};
  const m = Array.isArray(f.music) ? (f.music[chapterIdx] || f.music[0]) : f.music;
  const name = Array.isArray(f.musicName) ? (f.musicName[chapterIdx] || f.musicName[0]) : f.musicName;
  return { m, name };
}

// Chương của truyện đang mở, tải một lần rồi giữ lại — lật chương không gọi mạng nữa.
// Giữ nguyên cái PROMISE chứ không phải kết quả: resumeReading() gọi openFic()
// rồi gọi loadChapter() ngay sau đó, tức hai lượt cùng lúc cho cùng một truyện.
// Nếu lượt sau huỷ lượt trước thì lượt trước tưởng "không gọi được DB" và đi lấy
// file .txt — vừa thừa, vừa lách mất is_restricted.
// chapterRows giữ bản ĐÃ giải quyết của chapterPromise, để chapterNames() và
// getMusicData() đọc được đồng bộ (chúng bị gọi từ code không await được).
let chapterFic = -1, chapterPromise = null, chapterRows = null;

// Sau khi đăng/sửa truyện phải gọi hàm này, không thì trang đọc vẫn lấy
// bản chương cũ trong bộ nhớ đệm.
window.invalidateChapters = function () { chapterFic = -1; chapterPromise = null; chapterRows = null; };

function ensureChapters(ficIdx) {
  if (chapterFic !== ficIdx || !chapterPromise) {
    chapterFic = ficIdx;
    chapterRows = null;
    chapterPromise = (window.fetchChapters
      ? window.fetchChapters(ficIdx)
      : Promise.resolve(null)
    ).then(rows => { if (chapterFic === ficIdx) chapterRows = rows; return rows; });
  }
  return chapterPromise;   // cùng truyện -> dùng chung một lượt gọi
}

// Đăng nhập / đăng xuất ngay khi đang đứng ở trang đọc thì vẽ lại chương, không
// để nội dung kẹt ở trạng thái cũ (đang khoá mà vừa đăng nhập xong, hoặc ngược lại).
window.veLaiKhiDoiDangNhap = function () {
  if (currentPage === 'reading' && currentFic !== null && currentFic !== undefined) {
    // giuCho = true: đây là vẽ lại tại chỗ, không phải mở trang mới, nên tuyệt
    // đối không kéo người đọc về đầu trang.
    loadChapter(currentFic, currentChapter, true);
  }
};

// Bảng thay cho nội dung khi truyện khoá. Dựng bằng DOM, không ghép chuỗi.
function veHopKhoa(body) {
  body.textContent = '';
  const hop = document.createElement('div');
  hop.className = 'khoa-hop';

  const bieu = document.createElement('div');
  bieu.className = 'khoa-bieu';
  bieu.textContent = '✦';

  const h = document.createElement('h3');
  h.dataset.i18n = 'only_member';
  h.textContent = t('only_member');

  const p = document.createElement('p');
  p.dataset.i18n = 'khoa_loi';
  p.textContent = t('khoa_loi');

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.className = 'ao3-link';
  nut.style.marginTop = '0';
  nut.dataset.i18n = 'khoa_nut';
  nut.textContent = t('khoa_nut');
  nut.addEventListener('click', () => {
    // Nhớ truyện đang mở để đăng nhập xong quay lại đúng chỗ.
    try { sessionStorage.setItem('sk-return-fic', String(currentFic)); } catch (_) {}
    showPage('auth', document.querySelector('.nav-signin'));
  });

  hop.append(bieu, h, p, nut);
  body.append(hop);
}

// giuCho = true khi chỉ vẽ lại nội dung tại chỗ (ví dụ vừa đăng nhập, hoặc dữ
// liệu database về muộn). Lúc đó phải giữ nguyên chỗ người ta đang đọc — với
// truyện dài mà nhảy về đầu trang là mất dấu hẳn.
async function loadChapter(ficIdx, chapterIdx, giuCho) {
  const fic = fics[ficIdx];
  const body = document.getElementById('reading-body');
  const footer = document.getElementById('reading-footer');
  const show = (html) => { body.innerHTML = `<div class="fic-body">${html}</div>`; applyFontSize(); };

  body.innerHTML = `<div class="loading">${t('loading')}</div>`;
  footer.style.display = 'none';

  // Truyện chỉ dành cho thành viên. Phải kiểm HAI LẦN, trước và sau khi đợi
  // chương, vì cờ restricted chỉ có trong dữ liệu database — mở bằng link #fic-N
  // thì lượt vẽ đầu còn đang dùng fics.json, mà fics.json không biết gì về cờ này.
  // Kiểm mỗi lần đầu là truyện khoá hiện ra chữ "Coming soon" thay vì lời mời
  // đăng nhập. (Nội dung không lọt trong cả hai trường hợp — database vẫn chặn —
  // nhưng người đọc phải hiểu vì sao mình không đọc được.)
  const khoaLai = () => ficInfo(ficIdx).restricted && !window.skDaDangNhap;
  const veKhoa = () => {
    window.skFicDangKhoa = true;
    veHopKhoa(body);
    footer.style.display = 'none';
    const kbl = document.getElementById('comments-wrap');
    if (kbl) kbl.style.display = 'none';
    updateChapterNav(ficIdx, chapterIdx);
    if (!giuCho) window.scrollTo(0, 0);
  };

  if (khoaLai()) { veKhoa(); return; }

  const rows = await ensureChapters(ficIdx);
  if (khoaLai()) { veKhoa(); return; }

  // Mở khoá lại: loadComments() chạy ngay sau openFic() trong khi hàm này còn
  // đang đợi chương, nên nó có thể đã ẩn khu bình luận theo cờ của TRUYỆN TRƯỚC.
  // Bật lại ở đây, không thì lật từ truyện khoá sang truyện thường là mất bình luận.
  window.skFicDangKhoa = false;
  const kbl2 = document.getElementById('comments-wrap');
  if (kbl2) kbl2.style.display = 'block';

  // Đợi xong mà người đọc đã lật sang truyện khác thì bỏ, đừng vẽ đè nội dung cũ.
  if (chapterFic !== ficIdx) return;

  if (rows === null) {
    // Không gọi được database -> lùi về file .txt như site cũ.
    if (!fic.files || !fic.files[chapterIdx]) {
      show(`<p><em>${t('soon')}</em></p>`);
    } else {
      try {
        const res = await fetch(REPO + encodeURIComponent(fic.files[chapterIdx]));
        if (!res.ok) throw new Error('Not found');
        show(txtToHtml(await res.text()));
      } catch (e) {
        show(`<p><em>${t('ch_err')}</em></p>`);
      }
    }
  } else {
    // Database trả lời được. Không có chương ở vị trí này nghĩa là chưa đăng
    // hoặc không được phép đọc — KHÔNG lùi về .txt, vì làm vậy là mở lại đúng
    // cái cửa mà is_restricted vừa đóng.
    const row = rows[chapterIdx];
    show(row ? txtToHtml(row.content) : `<p><em>${t('soon')}</em></p>`);
  }

  footer.style.display = 'block';
  updateChapterNav(ficIdx, chapterIdx);
  // Nhạc vẫn lấy từ fics.json: cột chapters.music chưa dùng tới, để dành cho
  // bước chuyển nhạc sang Supabase Storage.
  // Truyện mới không có trong fics.json; nhạc theo chương thì getMusicData()
  // đã tự ưu tiên chapters.music rồi, ở đây chỉ cần đừng lỗi khi thiếu fics[i].
  if (!fics[ficIdx] || Array.isArray(fics[ficIdx].music)) playMusic(ficIdx, chapterIdx);
  if (!giuCho) window.scrollTo(0,0);
}

function updateChapterNav(ficIdx, chapterIdx) {
  const ten = chapterNames(ficIdx);
  const navTop = document.getElementById('chapter-nav-top');
  const navBot = document.getElementById('chapter-nav-bot');

  if (ten.length <= 1) {
    if (navTop) navTop.style.display = 'none';
    if (navBot) navBot.style.display = 'none';
    return;
  }

  const label = ten[chapterIdx] || `Chapter ${chapterIdx+1}`;
  const isFirst = chapterIdx === 0;
  const isLast  = chapterIdx >= ten.length - 1;

  // Top nav — with dropdown select
  if (navTop) {
    navTop.style.display = 'flex';
    const options = ten.map((ch, i) =>
      `<option value="${i}" ${i === chapterIdx ? 'selected' : ''}>${ch}</option>`
    ).join('');
    navTop.innerHTML = `
      <button id="ch-prev-top" onclick="prevChapter()" ${isFirst ? 'disabled' : ''}>${t('prev')}</button>
      <select id="ch-select" onchange="jumpChapter(this.value)" style="font-family:var(--font-ui);font-size:0.72rem;letter-spacing:1px;text-transform:uppercase;color:var(--ink2);background:var(--cream);border:1px solid var(--border);padding:6px 12px;cursor:pointer;">
        ${options}
      </select>
      <button id="ch-next-top" onclick="nextChapter()" ${isLast ? 'disabled' : ''}>${t('next')}</button>`;
  }

  // Bottom nav — simple prev/label/next
  if (navBot) {
    navBot.style.display = 'flex';
    document.getElementById('ch-label-bot').textContent = label;
    document.getElementById('ch-prev-bot').disabled = isFirst;
    document.getElementById('ch-next-bot').disabled = isLast;
  }
}

function prevChapter() {
  if (currentChapter > 0) { currentChapter--; loadChapter(currentFic, currentChapter); }
}
function nextChapter() {
  if (currentChapter < chapterNames(currentFic).length - 1) { currentChapter++; loadChapter(currentFic, currentChapter); }
}

function jumpChapter(idx) {
  currentChapter = parseInt(idx);
  loadChapter(currentFic, currentChapter);
  playMusic(currentFic, currentChapter);
}

function openFic(i) {
  history.pushState({page: 'reading', fic: i}, '', '#fic-' + i);
  prevPage = currentPage;
  currentFic = i;
  currentChapter = 0;
  const f = ficInfo(i);
  // Chốt sớm để loadComments() bên dưới quyết đúng ngay từ đầu; loadChapter()
  // sẽ sửa lại sau khi biết chắc (dữ liệu database có thể về muộn hơn).
  window.skFicDangKhoa = !!f.restricted && !window.skDaDangNhap;
  // Lúc này chương chưa tải xong nên tên chương còn lấy tạm từ fics.json;
  // updateChapterNav() sẽ dựng lại bằng dữ liệu DB ngay sau khi loadChapter xong.
  const ten = chapterNames(i);

  const chapterNavHtml = ten.length > 1 ? `
    <div class="chapter-nav" id="chapter-nav-top">
      <button id="ch-prev-top" onclick="prevChapter()">${t('prev')}</button>
      <span class="chapter-label" id="ch-label-top">${ten[0]}</span>
      <button id="ch-next-top" onclick="nextChapter()">${t('next')}</button>
    </div>`
    // Nhánh này chạy khi chưa biết số chương — truyện đăng qua form chưa có
    // trong fics.json nên lúc mở luôn rơi vào đây. Class `chapter-nav` PHẢI có
    // sẵn: updateChapterNav() chỉ bật display và đổ nội dung, không gán class,
    // nên thiếu nó là khung điều hướng hiện thô không viền không nút.
    : '<div class="chapter-nav" id="chapter-nav-top" style="display:none"></div>';

  document.getElementById('reading-header').innerHTML = `
    <div class="reading-fandom">${f.fandom}</div>
    <div class="reading-title">${f.title}${f.subtitle ? `: <em class="reading-sub">${f.subtitle}</em>` : ''}</div>
    ${f.warning ? `<div class="reading-warning">⚠ ${f.warning}</div>` : ''}
    <div class="reading-divider">✦ ✦ ✦</div>
    ${chapterNavHtml}`;

  // Bìa chèn bằng DOM sau khi dựng khung, KHÔNG ghép vào chuỗi innerHTML ở trên:
  // cover_url là dữ liệu nhập vào, phải đi qua oBia() để lọc giao thức.
  // Truyện chưa có bìa thì không chèn gì cả — trang đọc không cần ô trống.
  if (f.cover) {
    const bia = oBia(f.cover, 'reading-bia');
    if (bia.tagName === 'IMG') {
      if (f.coverCrop) bia.classList.add('cat-219');
      const vach = document.querySelector('#reading-header .reading-divider');
      if (vach) vach.parentNode.insertBefore(bia, vach);
    }
  }

  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-reading').classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a=>a.classList.remove('active'));
  currentPage = 'reading';
  document.getElementById('progress-bar').classList.add('visible');
  document.getElementById('font-controls').classList.add('visible');
  document.getElementById('float-toggle').classList.add('visible');
  window.scrollTo(0,0);
  loadChapter(i, 0);
  playMusic(i, 0);
  // Kudos / bookmark / comment — module Supabase ở cuối file gắn các hàm này lên window.
  if (window.loadWorkActions) window.loadWorkActions(i);
  if (window.loadComments)    window.loadComments(i);
}

// ---- Nhạc chờ cú bấm đầu tiên ----
// Trình duyệt chặn audio.play() khi trang chưa nhận thao tác nào của người dùng.
// Duyệt bình thường thì không sao: mọi lần bật nhạc đều đi sau một cú bấm (bấm
// thẻ truyện, bấm nút chương, bấm mục About). Nhưng mở bằng link #fic-N thì
// openFic() chạy thẳng từ lúc tải trang, chưa có cú bấm nào — play() bị chặn,
// lỗi bị .catch() nuốt, mà thanh nhạc vẫn hiện chữ "Pause" như đang phát.
// Nên: chưa bấm intro thì cất yêu cầu lại, để enterSite() phát đúng lúc bấm.
let daVaoSite = false;
let nhacChoBam = null;

function enterSite() {
  const intro = document.getElementById('intro');
  intro.style.pointerEvents = 'none';
  intro.classList.add('fade-out');

  // Đặt cờ và phát nhạc NGAY trong hàm xử lý cú bấm — đây chính là thao tác
  // người dùng mà trình duyệt đòi. Nhét vào setTimeout bên dưới là mất hiệu lực.
  daVaoSite = true;
  if (nhacChoBam) {
    const cho = nhacChoBam;
    nhacChoBam = null;
    if (cho.loai === 'fic') playMusic(cho.ficIdx, cho.chapterIdx);
    else playMusicDirect.apply(null, cho.thamSo);
  }

  setTimeout(()=>{intro.style.display='none';document.getElementById('site').classList.add('visible');},800);
}

document.addEventListener('DOMContentLoaded', async () => {
  const intro = document.getElementById('intro');
  // Chỉ cửa "đọc" mới vào trang chính. Bấm chỗ khác trên màn chào, hay gõ phím, không làm gì
  // — cửa commission là link thật và tự đi. (Nút là <button> nên Enter/Space vẫn dùng được.)

  // Từ trang Commission bấm "Read" (?vao=1): bỏ qua màn chào. Không có cú bấm nào trên
  // trang này nên nhạc chưa được phép phát — giữ daVaoSite=false để yêu cầu nhạc được cất
  // lại, rồi mở khoá ở cú bấm/phím đầu tiên (pha capture: chạy trước onclick của mục nav).
  if (new URLSearchParams(location.search).has('vao')) {
    intro.style.display = 'none';
    // Không hiệu ứng mờ dần 0.8s như khi vào từ màn chào: người đọc vừa bấm "Read" nên phải thấy ngay.
    const site = document.getElementById('site');
    site.style.transition = 'none';
    site.classList.add('visible');
    history.replaceState(null, '', location.pathname + location.hash);
    const moKhoa = () => {
      ['pointerdown', 'keydown'].forEach(k => document.removeEventListener(k, moKhoa, true));
      daVaoSite = true;
      if (nhacChoBam) {
        const cho = nhacChoBam; nhacChoBam = null;
        if (cho.loai === 'fic') playMusic(cho.ficIdx, cho.chapterIdx);
        else playMusicDirect.apply(null, cho.thamSo);
      }
    };
    ['pointerdown', 'keydown'].forEach(k => document.addEventListener(k, moKhoa, true));
  }

  // fics.json vẫn phải tải: trình đọc cần files/chapters/music từ đây.
  await loadFicsData();

  // Vẽ ngay bằng dữ liệu tĩnh để trang không trống trong lúc đợi DB.
  // (Thẻ "đọc dở" nằm luôn trong renderHome(), không còn banner riêng.)
  worksData = worksFromFics();
  window.worksDataCuaSite = worksData;
  initFontSize();
  applyLang();       // applyLang() vẽ ba trang đĩa than

  // Rồi thay bằng dữ liệu thật từ Supabase (có số kudos/bình luận, và
  // truyện is_restricted tự biến mất với khách chưa đăng nhập).
  // Gọi hỏng thì giữ nguyên bản tĩnh ở trên, không để trắng trang.
  if (window.fetchWorksFromDB) {
    window.fetchWorksFromDB().then(rows => {
      if (!rows || !rows.length) return;
      worksData = rows;
      worksFromDB = true;
      renderAllWorks();
      // Đang đứng ở trang đọc lúc dữ liệu thật về: vẽ lại chương, vì bây giờ
      // mới biết truyện này có bị khoá hay không.
      if (window.veLaiKhiDoiDangNhap) window.veLaiKhiDoiDangNhap();

      // Truyện đăng qua form chỉ có trong database, nên lúc kiểm hash ở trên nó
      // còn chưa tồn tại. Thử lại đúng một lần, và chỉ khi người đọc vẫn đang
      // đứng yên ở trang chủ với đúng cái link ban đầu — họ mà tự bấm đi đâu rồi
      // thì đừng giật họ về.
      if (!daMoTheoHash && currentPage === 'home' && window.location.hash === hashBanDau) {
        daMoTheoHash = moTheoHash();
        if (!daMoTheoHash && hashBanDau.startsWith('#fic-')) baoLinkHong();
      }
    }).catch(() => {});
  }

  // Mở đúng trang mà URL trỏ tới (link chia sẻ, bookmark, F5).
  hashBanDau = window.location.hash;
  daMoTheoHash = moTheoHash();
});

// ---- Link sâu ----
// Phạm vi cố ý gói gọn: #fic-N, #home, #works, #about. Các trang cá nhân
// (#profile, #bookmarks, #post, #auth) KHÔNG mở theo hash — chúng cần đăng nhập
// và quyền, để guardProfile() lo, không nhân đôi logic ở đây.
let hashBanDau = '';
let daMoTheoHash = false;

function moTheoHash() {
  const h = window.location.hash;

  if (h.startsWith('#fic-')) {
    const idx = parseInt(h.slice(5), 10);
    if (isNaN(idx)) return false;
    // Truyện đăng qua form chỉ nằm trong database, fics.json không có.
    if (fics[idx] || worksData.some(w => w.idx === idx)) { openFic(idx); return true; }
    return false;          // chưa thấy -> để lượt gọi sau khi DB trả lời thử lại
  }

  // Link từ trang Commission: kệ truyện đã lọc sẵn theo ship (vd #works?ship=Others).
  if (h.startsWith('#works?ship=')) {
    const ship = decodeURIComponent(h.slice(12));
    WS.fandom = 'all'; WS.ships = new Set(ship ? [ship] : []); WS.xemHet = false;
    renderWorks();
    showPage('works', document.querySelector('.nav-links a[data-page="works"]'));
    return true;
  }

  if (h === '#home' || h === '#works' || h === '#about' || h === '#opus') {
    const ten = h.slice(1);
    showPage(ten, document.querySelector('.nav-links a[data-page="' + ten + '"]'));
    return true;
  }

  return false;
}

// Báo cho người mở link hỏng biết, thay vì lẳng lặng thả họ về trang chủ.
function baoLinkHong() {
  const o = document.getElementById('link-hong');
  if (!o) return;
  o.textContent = t('link_hong');
  o.style.display = 'block';
  setTimeout(() => { o.style.display = 'none'; }, 12000);
}

// =============================================
// CONTINUE READING (localStorage)
// =============================================
function saveReadingProgress() {
  // ficInfo() ưu tiên DB nên nhớ được cả truyện đăng qua form.
  const fic = ficInfo(currentFic);
  if (!fic.title) return;
  const data = {
    ficIdx: currentFic,
    chapter: currentChapter,
    scrollY: window.scrollY,
    title: fic.title + (fic.subtitle ? ': ' + fic.subtitle : ''),
    timestamp: Date.now()
  };
  localStorage.setItem('sk-continue', JSON.stringify(data));
}

// Banner "Continue reading" cũ đã thay bằng thẻ "Where you left off" trong
// renderHome() → theDocDo().

function resumeReading() {
  const raw = localStorage.getItem('sk-continue');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    openFic(data.ficIdx);
    if (data.chapter > 0) {
      currentChapter = data.chapter;
      loadChapter(data.ficIdx, data.chapter);
    }
    // Restore scroll position after content loads
    setTimeout(() => window.scrollTo(0, data.scrollY || 0), 600);
  } catch(e) {}
}

// Save progress periodically while reading
let saveTimer = null;
window.addEventListener('scroll', () => {
  if (currentPage !== 'reading') return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveReadingProgress, 500);

  // Back to top button visibility
  const btn = document.getElementById('back-top');
  if (btn) btn.classList.toggle('visible', window.scrollY > 600);
});

// =============================================
// FONT SIZE TOGGLE
// =============================================
let currentFontStep = 0; // -2 to +3
const FONT_SIZES = [0.92, 1.0, 1.12, 1.22, 1.32, 1.44]; // rem
const BASE_STEP = 2; // index 2 = 1.12rem (default)

function initFontSize() {
  const saved = localStorage.getItem('sk-fontsize');
  if (saved !== null) {
    currentFontStep = parseInt(saved);
    applyFontSize();
  }
}

function changeFontSize(delta) {
  currentFontStep = Math.max(-2, Math.min(3, currentFontStep + delta));
  localStorage.setItem('sk-fontsize', currentFontStep);
  applyFontSize();
}

function applyFontSize() {
  const size = FONT_SIZES[currentFontStep + BASE_STEP] || 1.12;
  document.querySelectorAll('.fic-body').forEach(el => {
    el.style.fontSize = size + 'rem';
  });
}

// Toggle floating buttons visibility
let floatsTucked = false;
function toggleFloatingButtons() {
  floatsTucked = !floatsTucked;
  document.getElementById('font-controls').classList.toggle('tucked', floatsTucked);
  document.getElementById('back-top').classList.toggle('tucked', floatsTucked);
  document.getElementById('float-toggle').textContent = floatsTucked ? '○' : '●';
}

// =============================================
// KEYBOARD SHORTCUTS
// =============================================
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (currentPage === 'reading') {
    if (e.key === 'ArrowLeft') prevChapter();
    else if (e.key === 'ArrowRight') nextChapter();
    else if (e.key === 'Escape') goBack();
  }
});

// =============================================
// LANGUAGE (UI only — nội dung fic giữ nguyên)
// =============================================
const i18n = {
  en: {
    nav_home:'Home', nav_works:'Works', nav_about:'About',
    nav_opus:'Opus',
    opus_head:'Opus', opus_ban:'works', opus_the_loai:'forms', opus_truyen:'works',
    opus_dan:'Every work here is named after a musical form, and the name is not decorative. This is the whole archive laid out by form — a catalogue of works.',
    opus_mo_het:'Open all', opus_dong_het:'Close all',
    opus_nhom_trong:'Nothing in this group yet.',
    opus_sua:'Edit this group', opus_luu:'Save', opus_xoa:'Delete group',
    opus_f_ten:'Name (English)', opus_f_ten_vi:'Name (Vietnamese)',
    opus_f_mo:'Description (English)', opus_f_mo_vi:'Description (Vietnamese)',
    opus_f_thu_tu:'Order (smaller comes first)',
    opus_can_ten:'The group needs a name.',
    opus_da_luu:'Saved ♪', opus_da_xoa:'Group deleted.',
    opus_xoa_hoi:'Delete the group “%s”? The %d works in it are NOT deleted — they just stop being grouped.',
    intro_sub:"Don't ask. Just read:)", intro_cta:'Click anywhere to enter',
    nav_zone:'Commissions',
    wk_n_home:'Home', wk_n_works:'Works', wk_n_opus:'Opus', wk_n_notes:'Notes', wk_n_rehearsal:'In rehearsal', wk_n_about:'About', wk_n_comm:'Commissions',
    wk_n_profile:'Profile', wk_n_signin:'Sign in', wk_n_resume:'Resume', wk_n_members:'Members', wk_n_surprise:'Surprise', wk_n_lang:'EN / VI', wk_n_theme:'Theme',
    wk_d_home:'Where you left off, and what is new', wk_d_works:'Every fic, on the shelf', wk_d_opus:'Fics by musical form', wk_d_notes:'The music behind the fics',
    wk_d_rehearsal:'Works still being written', wk_d_about:'Programme notes on the author', wk_d_comm:'Writing, made to order', wk_d_profile:'Your bookmarks and kudos',
    wk_d_signin:'Sign in for kudos and bookmarks', wk_d_resume:'Back to where you stopped reading', wk_d_members:'Readers who have an account (sign in first)',
    wk_d_surprise:'A random fic', wk_d_lang:'Switch the language', wk_d_theme:'Light or dark',
    wk_soon:'Coming soon', wk_room:'Room', wk_shortcut:'Shortcut', wk_key:'key', wk_bkey:'Black key', wk_enter:'Enter', wk_use:'Use shortcut',
    wk_baton:'Take the podium. Point your baton at a section to enter.', wk_typea:'Click a section, or type A S D F G H J K.',
    wk_press:'Press a key to enter.', wk_hintb:'White keys open rooms. Black keys are shortcuts.',
    hero_sub:'I blend classical music with my thoughts',
    hero_tag:"Take a $ip y'all and enjoy",
    continue:'Continue reading:',
    head_latest:'Latest Works', head_fav:'Favorite Children',
    view_all:'View All Works →',
    // ---- giao diện đĩa than (Home / Works / Opus) ----
    dt_programme:"Tonight's programme", dt_browse:'Browse the shelf', dt_open_opus:'Open the Opus',
    dt_left_off:'Where you left off', dt_paused:'Paused',
    dt_mv_of:'Movement {a} of {b}', dt_mv_one:'Movement {a}',
    dt_latest:'Latest works', dt_new_arrivals:'New arrivals', dt_chosen:'Chosen by the author', dt_by_form:'Browse by form',
    dt_works_h1:'Works', dt_shelf_of:'The record shelf · {n} works',
    dt_shelf_intro:'Every work is a record in its own sleeve. Pick one from the shelf and it goes on the turntable, with its liner notes beside it.',
    dt_search:'Search', dt_length:'Length', dt_order:'Order', dt_pairing:'Pairing',
    dt_any_len:'Any length', dt_mini:'Miniature', dt_chamber:'Chamber', dt_symph:'Symphonic',
    dt_mini_l:'Miniature · under 2k', dt_chamber_l:'Chamber · 2k–5k', dt_symph_l:'Symphonic · 5k+',
    dt_newest:'Newest', dt_longest:'Longest',
    dt_on_shelf:'{n} on the shelf', dt_tap:'tap a sleeve', dt_show_all:'Show the whole shelf ({n})',
    dt_on_tt:'On the turntable', dt_form:'Form', dt_language:'Language', dt_played:'Played with',
    dt_words:'words', dt_mv1:'movement', dt_mvn:'movements', dt_cw:'Content warning',
    dt_play:'Play · Read', dt_play_first:'Play · Read from the first movement',
    dt_bookmark:'Bookmark', dt_close:'Close',
    dt_overture:'Overture', dt_no_opus:'No Opus yet', dt_overture_long:'Overture · not yet in an Opus',
    dt_catalogue:'Catalogue of works', dt_prev:'Previous', dt_next:'Next', dt_suite:'Suite',
    dt_work1:'work', dt_workn:'works', dt_locked_n:'{n} members only', dt_warn_n:'{n} content warning',
    dt_credit:'Instrument icons by Lorc, Delapouite & contributors, game-icons.net, licensed under CC BY 3.0.',
    dt_bm_h1:'Bookmarks', dt_bm_eyebrow:'Your own shelf · {n} saved',
    dt_bm_intro:'The records you set aside. Pick one to see its liner notes, or remove it from your shelf.',
    post_lang_vi:'Written in Vietnamese',
    post_lang_vi_hint:'Leave unticked for English. Shown as the Language line in the work’s liner notes.',
    browse:'Browse', all:'All', filter:'Filter', fandom:'Fandom', ship:'Ship',
    head_all:'All Works', no_results:'No works found for this filter.',
    sort_new:'Newest first', sort_old:'Oldest first',
    search_ph:'Search by title...',
    back:'← Back', prev:'← Prev', next:'Next →',
    read_ao3:'Read the work on AO3', cont_ao3:'Continue on AO3 →',
    about_head:'About the Author', stat_works:'Works',
    my_ao3:'My AO3 →', my_x:'My X →',
    footer:'ShostaKid · Have a great day:)',
    cmt_show:'Show Comments', cmt_hide:'Hide Comments',
    cmt_name_ph:'Name (optional)', cmt_body_ph:'Leave a comment...',
    cmt_post:'Post Comment →', cmt_posting:'Posting…',
    cmt_loading:'Loading…', cmt_empty:'No comments yet. Be the first ♪',
    cmt_err:'Could not load comments.', cmt_post_err:'Could not post comment. Please try again.',
    cmt_as:'Commenting as', cmt_author:'Author', cmt_guest_default:'Guest',
    cmt_delete:'Delete', cmt_deleting:'Deleting…', cmt_confirm_del:'Delete this comment?',
    cmt_deleted:'Comment deleted.', cmt_del_err:'Could not delete that comment.',
    cmt_posted:'Comment posted ♪', cmt_empty_body:'Please write something first.',
    cmt_too_fast:'You are posting too quickly. Please wait a few minutes.',
    cmt_reply:'Reply', cmt_cancel:'Cancel', cmt_replying_to:'Replying to',
    cmt_reply_ph:'Write a reply…', cmt_replied:'Reply posted ♪',
    anon:'Anonymous',
    loading:'Loading', ch_err:'Could not load chapter. Please check back later.',
    soon:'Coming soon.', pause:'Pause', play:'Play',
    about_p1:"Welcome. I write under the name <strong>ShostaKid</strong>, so you can say that I'm a child of Dmitry Dmitrievich Shostakovich (kind of lol)",
    about_p2:"My works, most of the time, are random thoughts that live inside my head. I write what I want here, so don't question me and enjoy as much as you can:).",
    about_p3:'I write primarily for the <em>Reverse: 1999</em>, <em>Figure Skating RPF</em>, <em>Honkai: Star Rail</em> and sometimes <em>Genshin Impact</em> fandoms. There will be more, but right now those are my primary',
    about_p4:'I hope you have a great time here. Thank you for stopping by.',
    nav_signin:'Sign In', nav_profile:'My Profile', nav_bookmarks:'My Bookmarks', nav_post:'Post',
    nav_logout:'Log Out',
    rq_moi_nhan:'New',
    link_hong:'That link points to a work that no longer exists — or one you need to be signed in to read.',
    nav_requests:'Request a Fic',
    nav_members:'Members',
    mb_head:'Members',
    mb_need_signin:'The member list is for signed-in readers. Sign in to see who else is here.',
    mb_back:'← Members',
    mb_tham_gia:'joined',
    mb_chua_co_bio:'Hasn’t written a bio yet.',
    only_member:'Members only',
    khoa_loi:'This one is for signed-in readers. An account is free and takes a moment — then this page will open right up.',
    khoa_nut:'Sign in →',
    rq_head:'Request a Fic',
    rq_need_signin_head:'Members only',
    rq_need_signin:'Requests come with a name attached, so you’ll need an account. It takes a moment.',
    rq_body_label:'What would you like to read?',
    rq_body_ph:'The ship, the mood, an idea — whatever you have.',
    rq_dem_hint:'/ 200 words',
    rq_feedback_label:'Anything you’d like to say about the site?',
    rq_feedback_ph:'Optional.',
    rq_x_truoc:'If you’d rather talk it through, come find me on',
    rq_send:'Send request →', rq_dang_gui:'Sending…',
    rq_mine:'My requests', rq_all:'All requests',
    rq_trong:'Nothing here yet.',
    rq_gop_nhan:'On the site:',
    rq_moi:'Like this fic? Request your own here!',
    rq_moi_about:'Want to read something I haven’t written yet? Tell me.',
    rq_moi_nut:'Request a fic →',
    rq_can_noi_dung:'Write something first.',
    rq_qua_dai:'That’s over 200 words — trim it a little.',
    rq_gop_qua_dai:'The site feedback is over 200 words — trim it a little.',
    rq_da_gui:'Sent. Thank you — I read every one.',
    rq_s_new:'New', rq_s_seen:'Seen', rq_s_writing:'Writing', rq_s_done:'Done', rq_s_declined:'Declined',
    rq_xoa:'Delete', rq_xoa_hoi:'Delete this request?',
    post_head:'Post a Work', post_edit_head:'Edit Work', post_title:'Title', post_subtitle:'Subtitle',
    post_summary:'Summary', post_warning:'Content warning', post_fandom:'Fandom', post_ships:'Ships',
    post_status:'Status', post_published:'Published', post_draft:'Draft', post_featured:'Show in My Favorite Children',
    post_chapters:'Chapters', post_add_ch:'+ Add chapter', post_del_ch:'Remove chapter', post_ch_title:'Chapter title',
    post_ch_body:'Chapter text', post_add_img:'Insert image', post_uploading:'Uploading…',
    post_save:'Save Work →', post_saving:'Saving…', post_saved:'Saved ♪',
    post_html_hint:'Simple HTML is allowed: <em>, <br>', post_ships_hint:'Hold Ctrl (or Cmd) to pick more than one.',
    post_need_title:'Please enter a title.', post_need_ch:'Add at least one chapter with some text.',
    post_err:'Could not save. Please try again.', post_img_err:'Could not upload that image.',
    post_img_first:'Save the work once before adding images.',
    post_add_img_url:'Image from a link',
    post_img_url_ask:'Paste the image link (GitHub release, or anywhere else):',
    post_img_url_bad:'That link has to start with http:// or https://',
    post_cover_or:'…or paste a link to an image hosted elsewhere',
    post_cover_url_ph:'https://github.com/.../releases/download/...',
    post_cover_url_hint:'Same idea as the music: upload the file to a GitHub release, then paste its link here. Nothing is stored on Supabase this way.',
    post_img_where:'Where should this image go?',
    post_img_top:'At the very top', post_img_after:'After paragraph {n}', post_img_end:'At the very end',
    post_img_cancel:'Cancel — don’t insert', post_img_done:'Image inserted.',
    post_restricted:'Members only — hide from readers who aren’t signed in',
    post_restricted_hint:'The work disappears from the listing and its chapters cannot be fetched at all unless the reader is signed in. This is enforced by the database, not by hiding it on the page.',
    post_cover:'Cover image',
    post_cover_hint:'One image for the whole work. Shown as the record sleeve on the shelf (cropped square), and above the text when the work is opened.',
    post_cover_pick:'Choose cover', post_cover_del:'Remove',
    post_cover_crop:'Crop to a 21:9 band at the top of the reading page',
    post_cover_crop_hint:'Leave off to show the image whole. Turn on for tall images that would otherwise fill the screen before the first line of text.',
    post_add_fandom:'+ New fandom', post_add_ship:'+ New ship',
    ab_edit:'✎ Edit this page', ab_body_en:'Bio — English', ab_body_vi:'Bio — Vietnamese',
    ab_save:'Save →', ab_saving:'Saving…', ab_saved:'About page updated ♪',
    ab_err:'Could not save the About page.',
    post_new_fandom:'Name of the new fandom:', post_new_ship:'Name of the new ship:',
    post_opus:'Opus', post_add_opus:'+ New group',
    post_opus_hint:'Which musical form this belongs to. Shown on the Opus page. Leave as “—” if you haven’t decided.',
    post_new_opus:'Name of the new Opus group (e.g. Suite IV · Nocturnal):',
    post_confirm_new_opus:'Create the group “%s”? You can write its description and set its order later on the Opus page.',
    post_confirm_new:'Create \"%s\"? It cannot be renamed or removed from this form.',
    post_created:'Created and selected ♪', post_already_there:'That one already exists — selected it for you.',
    post_name_bad:'That name cannot be used.',
    post_music:'Music', post_music_hint:'Applies to every chapter. A chapter can override it below.',
    post_m_url:'Audio link (GitHub Releases, archive.org…)', post_m_name:'Track name shown to readers',
    post_m_start:'Start (seconds)', post_ch_music:'Music for this chapter only',
    post_ch_music_hint:'Leave empty to use the work’s music.',
    bm_head:'My Bookmarks', bm_empty:'You have not bookmarked anything yet.',
    bm_loading:'Loading…', bm_err:'Could not load your bookmarks.',
    bm_remove:'Remove', bm_removing:'Removing…', bm_removed:'Removed from your bookmarks.',
    bm_remove_err:'Could not remove that bookmark.', bm_saved_on:'Saved',
    auth_head:'Account', auth_signin:'Sign In', auth_signup:'Sign Up',
    auth_email:'Email', auth_password:'Password', auth_username:'Username',
    auth_username_hint:'3–30 characters. Letters, numbers and underscore only.',
    auth_password_hint:'At least 6 characters.',
    auth_signin_btn:'Sign In →', auth_signup_btn:'Create Account →',
    auth_signing_in:'Signing in…', auth_signing_up:'Creating…',
    auth_forgot_q:'Forgot your password?', auth_forgot_btn:'Send reset link',
    auth_reset_need_email:'Enter your email above first, then press this again.',
    auth_reset_sent:'If that email has an account, a reset link is on its way.',
    auth_confirm_email:'Almost there — check your inbox and confirm your email, then sign in.',
    auth_welcome:'Welcome back ♪',
    auth_user_taken:'That username is already taken.',
    auth_user_bad:'Username must be 3–30 characters: letters, numbers and underscore only.',
    auth_err:'Something went wrong. Please try again.',
    prof_head:'My Profile', prof_username:'Username', prof_display:'Display name',
    prof_bio:'Bio', prof_avatar:'Avatar', prof_ao3:'AO3 profile',
    prof_avatar_ph:'https://...',
    prof_avatar_hint:'Paste a link, then press Save Changes below.',
    prof_avatar_pick:'Choose image →', prof_avatar_clear:'Remove',
    prof_avatar_upload_hint:'JPG, PNG or WebP · up to 2 MB. Saved as soon as it finishes uploading.',
    prof_avatar_or:'…or use an image hosted somewhere else',
    prof_avatar_uploading:'Uploading…',
    prof_avatar_done:'Avatar updated ♪',
    prof_avatar_removed:'Avatar removed.',
    prof_avatar_too_big:'That image is over 2 MB. Please pick a smaller one.',
    prof_avatar_bad_type:'Only JPG, PNG and WebP images are accepted.',
    prof_avatar_up_err:'Could not upload that image.',
    prof_save:'Save Changes →', prof_saving:'Saving…', prof_saved:'Saved ♪',
    prof_signout:'Sign Out', prof_admin:'Admin',
    prof_load_err:'Could not load your profile.',
    prof_need_signin:'Please sign in first.',
    wa_kudos:'Kudos', wa_kudos_guest:'Leave kudos as guest', wa_kudos_done:'Kudos left',
    wa_bookmark:'Bookmark', wa_bookmarked:'Bookmarked',
    wa_kudos_thanks:'Thank you for the kudos ♪',
    wa_kudos_guest_thanks:'Thank you — kudos left as a guest ♪',
    wa_kudos_already:'You have already left kudos for this work.',
    wa_kudos_removed:'Kudos withdrawn.',
    wa_bm_added:'Saved to your bookmarks ♪', wa_bm_removed:'Removed from your bookmarks.',
    wa_bm_signin:'Please sign in to bookmark this work.',
    wa_edit:'Edit work',
    wa_err:'Something went wrong. Please try again.'
  },
  vi: {
    nav_home:'Trang chủ', nav_works:'Các đầu truyện', nav_about:'Về Web',
    nav_opus:'Opus',
    opus_head:'Opus', opus_ban:'bản', opus_the_loai:'thể loại', opus_truyen:'truyện',
    opus_dan:'Mỗi truyện ở đây mang tên một thể nhạc, và tên đó không phải đặt cho vui. Dưới đây là toàn bộ kho truyện xếp lại theo đúng thể của chúng — như một danh mục tác phẩm.',
    opus_mo_het:'Mở tất cả', opus_dong_het:'Đóng tất cả',
    opus_nhom_trong:'Nhóm này chưa có truyện nào.',
    opus_sua:'Sửa nhóm này', opus_luu:'Lưu', opus_xoa:'Xoá nhóm',
    opus_f_ten:'Tên (tiếng Anh)', opus_f_ten_vi:'Tên (tiếng Việt)',
    opus_f_mo:'Mô tả (tiếng Anh)', opus_f_mo_vi:'Mô tả (tiếng Việt)',
    opus_f_thu_tu:'Thứ tự (số nhỏ đứng trước)',
    opus_can_ten:'Nhóm phải có tên.',
    opus_da_luu:'Đã lưu ♪', opus_da_xoa:'Đã xoá nhóm.',
    opus_xoa_hoi:'Xoá nhóm “%s”? %d truyện trong đó KHÔNG bị xoá — chúng chỉ mất chỗ xếp.',
    intro_sub:'Viết là tự nhiên', intro_cta:'Bấm vào bất cứ đâu để vào',
    nav_zone:'Commission',
    wk_n_home:'Trang chủ', wk_n_works:'Truyện', wk_n_opus:'Opus', wk_n_notes:'Notes', wk_n_rehearsal:'Đang tập', wk_n_about:'Giới thiệu', wk_n_comm:'Commission',
    wk_n_profile:'Hồ sơ', wk_n_signin:'Đăng nhập', wk_n_resume:'Đọc tiếp', wk_n_members:'Thành viên', wk_n_surprise:'Bất ngờ', wk_n_lang:'EN / VI', wk_n_theme:'Giao diện',
    wk_d_home:'Chỗ bạn đọc dở, và truyện mới', wk_d_works:'Mọi fic, trên kệ', wk_d_opus:'Fic theo thể nhạc', wk_d_notes:'Âm nhạc đằng sau các fic',
    wk_d_rehearsal:'Những truyện còn đang viết', wk_d_about:'Ghi chú chương trình về tác giả', wk_d_comm:'Viết theo yêu cầu', wk_d_profile:'Truyện đã lưu và kudos của bạn',
    wk_d_signin:'Đăng nhập để thả tim và lưu truyện', wk_d_resume:'Về chỗ bạn đang đọc dở', wk_d_members:'Các độc giả có tài khoản (cần đăng nhập)',
    wk_d_surprise:'Một fic ngẫu nhiên', wk_d_lang:'Đổi ngôn ngữ', wk_d_theme:'Sáng hoặc tối',
    wk_soon:'Sắp có', wk_room:'Phòng', wk_shortcut:'Lối tắt', wk_key:'phím', wk_bkey:'Phím đen', wk_enter:'Vào', wk_use:'Dùng lối tắt',
    wk_baton:'Lên bục chỉ huy. Chỉ đũa vào một bè để vào.', wk_typea:'Bấm vào một bè, hoặc gõ A S D F G H J K.',
    wk_press:'Bấm một phím để vào.', wk_hintb:'Phím trắng mở phòng. Phím đen là lối tắt.',
    hero_sub:'Tôi trộn nhạc cổ điển với những suy nghĩ của mình',
    hero_tag:'Take a $ip y\'all',
    continue:'Đang đọc dở:',
    head_latest:'Truyện mới nhất trên Web', head_fav:'Những đứa con tôi thích nhất',
    view_all:'Xem tất cả truyện →',
    // ---- giao diện đĩa than (Home / Works / Opus) ----
    dt_programme:'Chương trình tối nay', dt_browse:'Xem kệ đĩa', dt_open_opus:'Mở Opus',
    dt_left_off:'Bạn đang đọc dở', dt_paused:'Tạm dừng',
    dt_mv_of:'Chương {a} / {b}', dt_mv_one:'Chương {a}',
    dt_latest:'Truyện mới', dt_new_arrivals:'Mới lên kệ', dt_chosen:'Tác giả chọn', dt_by_form:'Duyệt theo thể nhạc',
    dt_works_h1:'Truyện', dt_shelf_of:'Kệ đĩa · {n} truyện',
    dt_shelf_intro:'Mỗi truyện là một đĩa than trong bìa của nó. Chọn một đĩa trên kệ, đĩa sẽ lên bàn xoay kèm lời giới thiệu bên cạnh.',
    dt_search:'Tìm', dt_length:'Độ dài', dt_order:'Sắp xếp', dt_pairing:'Ship',
    dt_any_len:'Mọi độ dài', dt_mini:'Miniature', dt_chamber:'Chamber', dt_symph:'Symphonic',
    dt_mini_l:'Miniature · dưới 2k', dt_chamber_l:'Chamber · 2k–5k', dt_symph_l:'Symphonic · trên 5k',
    dt_newest:'Mới nhất', dt_longest:'Dài nhất',
    dt_on_shelf:'{n} đĩa trên kệ', dt_tap:'chạm vào một bìa', dt_show_all:'Xem cả kệ ({n})',
    dt_on_tt:'Trên bàn xoay', dt_form:'Thể', dt_language:'Ngôn ngữ', dt_played:'Nhạc đi kèm',
    dt_words:'chữ', dt_mv1:'chương', dt_mvn:'chương', dt_cw:'Có cảnh báo',
    dt_play:'Phát · Đọc', dt_play_first:'Phát · Đọc từ chương đầu',
    dt_bookmark:'Lưu truyện', dt_close:'Đóng',
    dt_overture:'Overture', dt_no_opus:'Chưa vào Opus', dt_overture_long:'Overture · chưa thuộc Opus nào',
    dt_catalogue:'Danh mục tác phẩm', dt_prev:'Trước', dt_next:'Sau', dt_suite:'Tổ khúc',
    dt_work1:'bản', dt_workn:'bản', dt_locked_n:'{n} chỉ thành viên', dt_warn_n:'{n} có cảnh báo',
    dt_credit:'Icon nhạc cụ: Lorc, Delapouite & cộng sự, game-icons.net, giấy phép CC BY 3.0.',
    dt_bm_h1:'Đã lưu', dt_bm_eyebrow:'Kệ riêng của bạn · {n} truyện',
    dt_bm_intro:'Những đĩa bạn để dành. Chọn một đĩa để xem lời giới thiệu, hoặc bỏ nó khỏi kệ.',
    post_lang_vi:'Truyện viết bằng tiếng Việt',
    post_lang_vi_hint:'Để trống nếu là tiếng Anh. Hiện ở dòng Ngôn ngữ trong khung giới thiệu truyện.',
    browse:'Duyệt', all:'Tất cả', filter:'Lọc', fandom:'Fandom', ship:'Ship',
    head_all:'Tất cả truyện', no_results:'Không tìm thấy truyện nào với bộ lọc này.',
    sort_new:'Mới nhất trước', sort_old:'Cũ nhất trước',
    search_ph:'Tìm theo tên truyện...',
    back:'← Quay lại', prev:'← Trước', next:'Tiếp →',
    read_ao3:'Đọc bản đầy đủ trên AO3', cont_ao3:'Đọc trên AO3 →',
    about_head:'Giới thiệu', stat_works:'Truyện',
    my_ao3:'Link AO3 →', my_x:'Link X →',
    footer:'ShostaKid · Chúc bạn một ngày tốt lành:)',
    cmt_show:'Hiện bình luận', cmt_hide:'Ẩn bình luận',
    cmt_name_ph:'Tên (không bắt buộc)', cmt_body_ph:'Để lại bình luận...',
    cmt_post:'Gửi bình luận →', cmt_posting:'Đang gửi…',
    cmt_loading:'Đang tải…', cmt_empty:'Chưa có bình luận nào. Bạn là người đầu tiên ♪',
    cmt_err:'Không thể tải bình luận.', cmt_post_err:'Không thể gửi bình luận. Vui lòng thử lại.',
    cmt_as:'Bình luận với tên', cmt_author:'Tác giả', cmt_guest_default:'Khách',
    cmt_delete:'Xoá', cmt_deleting:'Đang xoá…', cmt_confirm_del:'Xoá bình luận này?',
    cmt_deleted:'Đã xoá bình luận.', cmt_del_err:'Không xoá được bình luận.',
    cmt_posted:'Đã gửi bình luận ♪', cmt_empty_body:'Bạn hãy viết gì đó đã.',
    cmt_too_fast:'Bạn đang gửi bình luận quá nhanh. Vui lòng đợi vài phút.',
    cmt_reply:'Trả lời', cmt_cancel:'Huỷ', cmt_replying_to:'Đang trả lời',
    cmt_reply_ph:'Viết trả lời…', cmt_replied:'Đã gửi trả lời ♪',
    anon:'Ẩn danh',
    loading:'Đang tải', ch_err:'Không thể tải chương. Vui lòng thử lại sau.',
    soon:'Sắp ra mắt.', pause:'Dừng', play:'Phát',
    about_p1:'Xin chào, tôi viết dưới cái tên <strong>ShostaKid</strong>, nên có thể nói tôi là một đứa con của Dmitry Dmitrievich Shostakovich (kiểu vậy lol)',
    about_p2:'Các tác phẩm của tôi, phần lớn thời gian, là những suy nghĩ vẩn vơ sống trong đầu tôi. Tôi viết những gì tôi thích ở đây, nên đừng hỏi tại sao, cứ đọc và tận hưởng thôi:).',
    about_p3:'Tôi chủ yếu viết cho các fandom <em>Reverse: 1999</em>, <em>Figure Skating RPF</em>, <em>Honkai: Star Rail</em> và đôi khi cả <em>Genshin Impact</em>. Sau này sẽ có thêm, nhưng hiện tại đó là những fandom chính.',
    about_p4:'Hy vọng bạn có khoảng thời gian vui vẻ ở đây. Cảm ơn vì đã ghé qua.',
    nav_signin:'Đăng nhập', nav_profile:'Hồ sơ của tôi', nav_bookmarks:'Truyện đã lưu', nav_post:'Đăng truyện',
    nav_logout:'Đăng xuất',
    rq_moi_nhan:'Mới',
    link_hong:'Link này trỏ tới một truyện không còn tồn tại — hoặc truyện phải đăng nhập mới đọc được.',
    nav_requests:'Gửi yêu cầu',
    nav_members:'Thành viên',
    mb_head:'Thành viên',
    mb_need_signin:'Danh sách thành viên dành cho người đã đăng nhập. Đăng nhập để xem ai đang ở đây cùng bạn.',
    mb_back:'← Thành viên',
    mb_tham_gia:'tham gia',
    mb_chua_co_bio:'Chưa viết giới thiệu.',
    only_member:'Chỉ thành viên',
    khoa_loi:'Truyện này dành cho bạn đọc đã đăng nhập. Tạo tài khoản không mất gì và chỉ tốn một lát — xong là đọc được ngay.',
    khoa_nut:'Đăng nhập →',
    rq_head:'Gửi yêu cầu',
    rq_need_signin_head:'Chỉ thành viên',
    rq_need_signin:'Yêu cầu có gắn tên người gửi, nên bạn cần một tài khoản. Chỉ tốn một lát thôi.',
    rq_body_label:'Bạn muốn đọc gì?',
    rq_body_ph:'Ship nào, không khí ra sao, một ý tưởng — có gì cứ viết nấy.',
    rq_dem_hint:'/ 200 từ',
    rq_feedback_label:'Bạn có muốn góp ý gì cho web không?',
    rq_feedback_ph:'Không bắt buộc.',
    rq_x_truoc:'Nếu muốn, bạn có thể trao đổi thêm với tôi ở',
    rq_send:'Gửi yêu cầu →', rq_dang_gui:'Đang gửi…',
    rq_mine:'Yêu cầu của tôi', rq_all:'Tất cả yêu cầu',
    rq_trong:'Chưa có gì ở đây.',
    rq_gop_nhan:'Góp ý cho web:',
    rq_moi:'Thích truyện này? Gửi yêu cầu của riêng bạn!',
    rq_moi_about:'Muốn đọc thứ tôi chưa viết? Cứ nói với tôi.',
    rq_moi_nut:'Gửi yêu cầu →',
    rq_can_noi_dung:'Viết vài dòng đã nhé.',
    rq_qua_dai:'Dài quá 200 từ rồi — bạn rút bớt giúp.',
    rq_gop_qua_dai:'Phần góp ý dài quá 200 từ — bạn rút bớt giúp.',
    rq_da_gui:'Đã gửi. Cảm ơn bạn — tôi đọc hết đấy.',
    rq_s_new:'Mới', rq_s_seen:'Đã xem', rq_s_writing:'Đang viết', rq_s_done:'Xong', rq_s_declined:'Từ chối',
    rq_xoa:'Xoá', rq_xoa_hoi:'Xoá yêu cầu này?',
    post_head:'Đăng truyện', post_edit_head:'Sửa truyện', post_title:'Tiêu đề', post_subtitle:'Phụ đề',
    post_summary:'Tóm tắt', post_warning:'Cảnh báo nội dung', post_fandom:'Fandom', post_ships:'Ship',
    post_status:'Trạng thái', post_published:'Đã đăng', post_draft:'Bản nháp', post_featured:'Hiện ở mục truyện tâm đắc',
    post_chapters:'Các chương', post_add_ch:'+ Thêm chương', post_del_ch:'Xoá chương', post_ch_title:'Tên chương',
    post_ch_body:'Nội dung chương', post_add_img:'Chèn ảnh', post_uploading:'Đang tải lên…',
    post_save:'Lưu truyện →', post_saving:'Đang lưu…', post_saved:'Đã lưu ♪',
    post_html_hint:'Dùng được HTML đơn giản: <em>, <br>', post_ships_hint:'Giữ Ctrl (hoặc Cmd) để chọn nhiều.',
    post_need_title:'Bạn cần nhập tiêu đề.', post_need_ch:'Cần ít nhất một chương có nội dung.',
    post_err:'Không lưu được. Bạn thử lại nhé.', post_img_err:'Không tải được ảnh lên.',
    post_img_first:'Lưu truyện một lần trước khi chèn ảnh.',
    post_add_img_url:'Ảnh từ link',
    post_img_url_ask:'Dán link ảnh (GitHub release, hoặc bất cứ đâu):',
    post_img_url_bad:'Link phải bắt đầu bằng http:// hoặc https://',
    post_cover_or:'…hoặc dán link ảnh đang để ở nơi khác',
    post_cover_url_ph:'https://github.com/.../releases/download/...',
    post_cover_url_hint:'Giống hệt cách làm với nhạc: tải tệp lên một release trên GitHub rồi dán link vào đây. Cách này không tốn dung lượng Supabase.',
    post_img_where:'Đặt ảnh này vào đâu?',
    post_img_top:'Ngay đầu chương', post_img_after:'Sau đoạn {n}', post_img_end:'Cuối chương',
    post_img_cancel:'Huỷ — không chèn nữa', post_img_done:'Đã chèn ảnh.',
    post_restricted:'Chỉ thành viên — ẩn với người chưa đăng nhập',
    post_restricted_hint:'Truyện biến mất khỏi danh sách và không thể lấy nội dung chương nếu chưa đăng nhập. Đây là khoá ở tầng database, không phải chỉ ẩn trên giao diện.',
    post_cover:'Ảnh bìa',
    post_cover_hint:'Một ảnh cho cả truyện. Hiện làm bìa đĩa trên kệ (cắt vuông), và ở đầu trang đọc.',
    post_cover_pick:'Chọn ảnh bìa', post_cover_del:'Xoá bìa',
    post_cover_crop:'Cắt về dải ngang 21:9 ở đầu trang đọc',
    post_cover_crop_hint:'Để tắt thì ảnh hiện nguyên vẹn. Bật cho những ảnh cao, không thì nó chiếm hết màn hình trước dòng chữ đầu tiên.',
    post_add_fandom:'+ Thêm fandom', post_add_ship:'+ Thêm ship',
    ab_edit:'✎ Sửa trang này', ab_body_en:'Giới thiệu — Tiếng Anh', ab_body_vi:'Giới thiệu — Tiếng Việt',
    ab_save:'Lưu →', ab_saving:'Đang lưu…', ab_saved:'Đã cập nhật trang giới thiệu ♪',
    ab_err:'Không lưu được trang giới thiệu.',
    post_new_fandom:'Tên fandom mới:', post_new_ship:'Tên ship mới:',
    post_confirm_new:'Tạo \"%s\"? Form này không sửa hay xoá lại được.',
    post_created:'Đã tạo và chọn ♪', post_already_there:'Đã có sẵn — t chọn giúp rồi.',
    post_opus:'Opus', post_add_opus:'+ Nhóm mới',
    post_opus_hint:'Truyện này thuộc thể nhạc nào. Hiện trên trang Opus. Chưa quyết thì cứ để “—”.',
    post_new_opus:'Tên nhóm Opus mới (ví dụ: Suite IV · Nocturnal):',
    post_confirm_new_opus:'Tạo nhóm “%s”? Mô tả và thứ tự hiện thì viết sau trên trang Opus.',
    post_name_bad:'Tên này không dùng được.',
    post_music:'Nhạc nền', post_music_hint:'Dùng cho mọi chương. Từng chương có thể ghi đè bên dưới.',
    post_m_url:'Link nhạc (GitHub Releases, archive.org…)', post_m_name:'Tên bản nhạc hiện cho người đọc',
    post_m_start:'Bắt đầu từ giây', post_ch_music:'Nhạc riêng cho chương này',
    post_ch_music_hint:'Để trống thì dùng nhạc chung của truyện.',
    bm_head:'Truyện đã lưu', bm_empty:'Bạn chưa lưu truyện nào.',
    bm_loading:'Đang tải…', bm_err:'Không tải được danh sách đã lưu.',
    bm_remove:'Bỏ lưu', bm_removing:'Đang bỏ…', bm_removed:'Đã bỏ khỏi danh sách.',
    bm_remove_err:'Không bỏ lưu được.', bm_saved_on:'Đã lưu',
    auth_head:'Tài khoản', auth_signin:'Đăng nhập', auth_signup:'Đăng ký',
    auth_email:'Email', auth_password:'Mật khẩu', auth_username:'Tên đăng nhập',
    auth_username_hint:'3–30 ký tự. Chỉ chữ cái, chữ số và dấu gạch dưới.',
    auth_password_hint:'Ít nhất 6 ký tự.',
    auth_signin_btn:'Đăng nhập →', auth_signup_btn:'Tạo tài khoản →',
    auth_signing_in:'Đang đăng nhập…', auth_signing_up:'Đang tạo…',
    auth_forgot_q:'Quên mật khẩu?', auth_forgot_btn:'Gửi link đặt lại',
    auth_reset_need_email:'Nhập email ở trên trước đã, rồi bấm lại nút này.',
    auth_reset_sent:'Nếu email đó có tài khoản, link đặt lại đang trên đường tới.',
    auth_confirm_email:'Gần xong rồi — kiểm tra hộp thư và xác nhận email, sau đó đăng nhập.',
    auth_welcome:'Chào mừng quay lại ♪',
    auth_user_taken:'Tên đăng nhập này đã có người dùng.',
    auth_user_bad:'Tên đăng nhập phải 3–30 ký tự: chỉ chữ cái, chữ số và dấu gạch dưới.',
    auth_err:'Có lỗi xảy ra. Vui lòng thử lại.',
    prof_head:'Hồ sơ của tôi', prof_username:'Tên đăng nhập', prof_display:'Tên hiển thị',
    prof_bio:'Giới thiệu', prof_avatar:'Ảnh đại diện', prof_ao3:'Trang AO3',
    prof_avatar_ph:'https://...',
    prof_avatar_hint:'Dán link rồi bấm Lưu thay đổi bên dưới.',
    prof_avatar_pick:'Chọn ảnh từ máy →', prof_avatar_clear:'Gỡ ảnh',
    prof_avatar_upload_hint:'JPG, PNG hoặc WebP · tối đa 2 MB. Tải lên xong là tự lưu.',
    prof_avatar_or:'…hoặc dùng ảnh ở nơi khác',
    prof_avatar_uploading:'Đang tải lên…',
    prof_avatar_done:'Đã cập nhật ảnh đại diện ♪',
    prof_avatar_removed:'Đã gỡ ảnh đại diện.',
    prof_avatar_too_big:'Ảnh vượt quá 2 MB. Chọn ảnh nhỏ hơn nhé.',
    prof_avatar_bad_type:'Chỉ nhận ảnh JPG, PNG và WebP.',
    prof_avatar_up_err:'Không tải được ảnh lên.',
    prof_save:'Lưu thay đổi →', prof_saving:'Đang lưu…', prof_saved:'Đã lưu ♪',
    prof_signout:'Đăng xuất', prof_admin:'Quản trị',
    prof_load_err:'Không tải được hồ sơ của bạn.',
    prof_need_signin:'Vui lòng đăng nhập trước.',
    wa_kudos:'Thả tim', wa_kudos_guest:'Thả tim với tư cách khách', wa_kudos_done:'Đã thả tim',
    wa_bookmark:'Lưu truyện', wa_bookmarked:'Đã lưu',
    wa_kudos_thanks:'Cảm ơn bạn đã thả tim ♪',
    wa_kudos_guest_thanks:'Cảm ơn bạn — đã thả tim với tư cách khách ♪',
    wa_kudos_already:'Bạn đã thả tim cho truyện này rồi.',
    wa_kudos_removed:'Đã rút lại tim.',
    wa_bm_added:'Đã lưu vào danh sách của bạn ♪', wa_bm_removed:'Đã bỏ khỏi danh sách đã lưu.',
    wa_bm_signin:'Vui lòng đăng nhập để lưu truyện này.',
    wa_edit:'Sửa truyện',
    wa_err:'Có lỗi xảy ra. Bạn thử lại nhé.'
  }
};

let currentLang = localStorage.getItem('sk-lang') || 'en';
function t(key) { return (i18n[currentLang] && i18n[currentLang][key]) || i18n.en[key] || ''; }

function applyLang() {
  document.documentElement.setAttribute('data-lang', currentLang);
  document.documentElement.setAttribute('lang', currentLang);

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t(el.dataset.i18n);
    if (v) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const v = t(el.dataset.i18nHtml);
    if (v) el.innerHTML = v;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const v = t(el.dataset.i18nPh);
    if (v) el.placeholder = v;
  });

  // Nút chuyển: hiện ngôn ngữ sẽ đổi sang
  const lb = document.getElementById('lang-btn');
  if (lb) lb.textContent = currentLang === 'en' ? 'VI' : 'EN';

  // Các phần render động
  const cmtLabel = document.getElementById('comments-label');
  if (cmtLabel) {
    const body = document.getElementById('comments-body');
    const open = body && body.style.display !== 'none';
    cmtLabel.textContent = open ? t('cmt_hide') : t('cmt_show');
  }
  const cmtSubmit = document.getElementById('comment-submit');
  if (cmtSubmit && !cmtSubmit.disabled) cmtSubmit.textContent = t('cmt_post');
  // Danh sách bình luận dựng động nên phải vẽ lại (ngày tháng, badge, nút xoá).
  if (window.repaintComments) window.repaintComments();
  if (window.repaintAbout) window.repaintAbout();
  // Home / Works / Opus dựng bằng DOM với chữ lấy từ t() lúc dựng, nên đổi
  // ngôn ngữ là phải dựng lại (kể cả name_vi / mo_ta_vi của nhóm Opus).
  veLaiDiaThan();
  if (window.veLaiChao) window.veLaiChao();

  const mt = document.querySelector('.music-toggle');
  if (mt) mt.textContent = musicPlaying ? t('pause') : t('play');

  if (currentPage === 'reading') updateChapterNav(currentFic, currentChapter);
}

function toggleLang() {
  currentLang = currentLang === 'en' ? 'vi' : 'en';
  localStorage.setItem('sk-lang', currentLang);
  applyLang();
}

// =============================================
// THEME
// =============================================
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sk-theme', next);
  document.getElementById('theme-btn').textContent = next === 'dark' ? '☀' : '☾';
}
// Áp dụng theme đã lưu ngay khi load
(function(){
  const saved = localStorage.getItem('sk-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = saved === 'dark' ? '☀' : '☾';
  });
})();

// =============================================
// MUSIC — hỗ trợ 3 nguồn: musopen / soundcloud / youtube
// =============================================
function playMusicDirect(source, url, id, start, end, name) {
  // Chưa bấm intro thì hoãn lại, đừng dựng player để rồi bị chặn im lặng.
  if (!daVaoSite) { nhacChoBam = { loai: 'truc', thamSo: [source, url, id, start, end, name] }; return; }
  stopMusic();
  const m = { source, url, id, start, end };

  if (source === 'musopen' || source === 'archive' || source === 'github') {
    const audio = document.createElement('audio');
    audio.id = 'audio-player';
    audio.loop = true;
    audio.style.display = 'none';
    audio.src = url;
    audio.volume = 1;
    document.body.appendChild(audio);
    audio.play().catch(()=>{});  // ← gọi NGAY, vẫn trong user gesture
    audio.addEventListener('canplay', () => {
  if (m.start) audio.currentTime = m.start;  // ← chỉ seek sau khi ready
      }, { once: true });

  } else if (source === 'soundcloud') {
    const iframe = document.createElement('iframe');
    iframe.id = 'sc-player';
    iframe.style.cssText = 'position:fixed;width:1px;height:1px;bottom:-10px;left:-10px;opacity:0;pointer-events:none;';
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&hide_related=true&show_comments=false&show_user=false&start_time=${(start||0)*1000}`;
    iframe.allow = 'autoplay';
    document.body.appendChild(iframe);

  } else {
    const iframe = document.createElement('iframe');
    iframe.id = 'yt-player';
    iframe.style.cssText = 'position:fixed;width:1px;height:1px;bottom:-10px;left:-10px;opacity:0;pointer-events:none;';
    iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&start=${start||0}${end?'&end='+end:''}&loop=1&playlist=${id}`;
    iframe.allow = 'autoplay; encrypted-media';
    iframe.frameBorder = '0';
    document.body.appendChild(iframe);
  }
  nhacDangPhat = { source, url, start: start || 0 };
  musicPlaying = true;
  document.getElementById('music-bar').classList.remove('hidden');
  document.getElementById('music-title').textContent = name;
  document.getElementById('musicBars').classList.remove('paused');
  document.querySelector('.music-toggle').textContent = t('pause');
}
  
  function playMusic(ficIdx, chapterIdx) {
  const { m, name } = getMusicData(ficIdx, chapterIdx);
  // Truyện mới chưa có trong fics.json, và lúc openFic() gọi hàm này thì chương
  // (kèm chapters.music) còn chưa tải xong — cứ im lặng, loadChapter() sẽ gọi lại.
  if (!m) return;

  // Vào bằng link #fic-N: hoãn tới lúc bấm intro (xem ghi chú ở enterSite).
  if (!daVaoSite) { nhacChoBam = { loai: 'fic', ficIdx, chapterIdx }; return; }

  // ---- Giữ nhạc liền mạch giữa các chương ----
  // Trước đây việc này chạy được là do TÌNH CỜ: loadChapter() chỉ gọi playMusic()
  // khi `music` khai dạng mảng, nên fic khai một object đơn không bao giờ bị dựng
  // lại player. Fic khai mảng (21, 22, 26, 29) thì restart dù mọi mục cùng một
  // bài, và truyện đăng qua form thì luôn restart. Giờ so thẳng bài đang phát.
  const nguon = m.source || 'youtube';
  const mocMoi = m.start || 0;
  const audio  = document.getElementById('audio-player');
  const cungBai = nhacDangPhat && nhacDangPhat.url === m.url && nhacDangPhat.source === nguon;

  if (cungBai) {
    if (audio) {
      // Cùng bài: không dựng lại player. Khác mốc thì nhảy tới mốc mới.
      if (mocMoi !== nhacDangPhat.start) { try { audio.currentTime = mocMoi; } catch (_) {} }
      nhacDangPhat.start = mocMoi;
      document.getElementById('music-title').textContent = name || '';
      return;
    }
    // iframe (YouTube/SoundCloud) không seek được từ ngoài; cùng mốc thì để yên,
    // khác mốc thì đành dựng lại.
    if (mocMoi === nhacDangPhat.start) return;
  }

  stopMusic();

  const source = m.source || 'youtube';

  if (source === 'musopen' || source === 'archive' || source === 'github') {
    // HTML5 audio — direct MP3 link từ musopen.org hoặc archive.org
    const audio = document.createElement('audio');
    audio.id = 'audio-player';
    audio.loop = true;
    audio.style.display = 'none';
    audio.src = m.url;
    audio.volume = 1;
    document.body.appendChild(audio);
    audio.play().catch(()=>{});  // ← gọi NGAY, vẫn trong user gesture
    audio.addEventListener('canplay', () => {
      if (m.start) audio.currentTime = m.start;  // ← chỉ seek sau khi ready
    }, { once: true });

  } else if (source === 'soundcloud') {
    // SoundCloud Widget iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'sc-player';
    iframe.style.cssText = 'position:fixed;width:1px;height:1px;bottom:-10px;left:-10px;opacity:0;pointer-events:none;';
    const startMs = (m.start || 0) * 1000;
    const encodedUrl = encodeURIComponent(m.url);
    iframe.src = `https://w.soundcloud.com/player/?url=${encodedUrl}&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&start_time=${startMs}`;
    iframe.allow = 'autoplay';
    document.body.appendChild(iframe);

  } else {
    // YouTube (fallback)
    const iframe = document.createElement('iframe');
    iframe.id = 'yt-player';
    iframe.style.cssText = 'position:fixed;width:1px;height:1px;bottom:-10px;left:-10px;opacity:0;pointer-events:none;';
    const end = m.end ? `&end=${m.end}` : '';
    iframe.src = `https://www.youtube.com/embed/${m.id}?autoplay=1&start=${m.start||0}${end}&loop=1&playlist=${m.id}&enablejsapi=1`;
    iframe.allow = 'autoplay; encrypted-media';
    iframe.frameBorder = '0';
    document.body.appendChild(iframe);
  }

  nhacDangPhat = { source: nguon, url: m.url, start: mocMoi };
  musicPlaying = true;
  document.getElementById('music-bar').classList.remove('hidden');
  document.getElementById('music-title').textContent = name;
  document.getElementById('musicBars').classList.remove('paused');
  document.querySelector('.music-toggle').textContent = t('pause');
}

function stopMusic() {
  ['yt-player', 'sc-player', 'audio-player'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  nhacDangPhat = null;   // dựng lại từ đầu cho lần sau
  nhacChoBam = null;     // bỏ luôn bài đang chờ, không để nó phát nhầm sau này
  musicPlaying = false;
  document.getElementById('music-bar').classList.add('hidden');
}

function toggleMusic() {
  const audio = document.getElementById('audio-player');
  const yt    = document.getElementById('yt-player');
  const sc    = document.getElementById('sc-player');

  if (audio) {
    if (musicPlaying) { audio.pause(); } else { audio.play().catch(()=>{}); }
  } else if (yt) {
    yt.src = yt.src.replace(musicPlaying ? 'autoplay=1' : 'autoplay=0',
                            musicPlaying ? 'autoplay=0' : 'autoplay=1');
  } else if (sc) {
    // SoundCloud không pause được qua iframe thuần, reload với auto_play ngược lại
    sc.src = sc.src.replace('auto_play=true','auto_play=false');
  }
  musicPlaying = !musicPlaying;
  document.getElementById('musicBars').classList.toggle('paused', !musicPlaying);
  document.querySelector('.music-toggle').textContent = musicPlaying ? t('pause') : t('play');
}

function showPage(id, el) {
  history.pushState({page: id}, '', '#' + id);
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  // .nav-signin nằm ngoài .nav-links nhưng cũng nhận .active, nên phải xoá cùng
  // — không thì nó sáng mãi sau khi rời trang đăng nhập.
  document.querySelectorAll('.nav-links a, .nav-signin').forEach(a=>a.classList.remove('active'));
  if (el) el.classList.add('active');
  if (window.closeNavMenu) window.closeNavMenu();
  dongBangTruot(true);
  prevPage = currentPage; currentPage = id;
  // Về trang chủ thì dựng lại để thẻ "Where you left off" lấy đúng chỗ vừa đọc.
  if (id === 'home') renderHome();
  // Bàn xoay đo bề ngang lúc dựng; trang đang ẩn thì đo ra 0, nên đo lại khi hiện.
  if (id === 'opus') vuaBanXoay();
  // Trang "Truyện đã lưu" nạp lại mỗi lần mở, vì người dùng có thể vừa bỏ lưu
  // ở trang đọc xong quay lại đây.
  if (id === 'bookmarks' && window.loadBookmarks) window.loadBookmarks();
  if (id === 'requests'  && window.loadRequests)  window.loadRequests();
  if (id === 'opus'      && window.loadOpus)      window.loadOpus();
  if (id === 'members'   && window.loadMembers)   window.loadMembers();
  if (id === 'member'    && window.loadMember)    window.loadMember();
  if (id === 'post' && window.loadPostForm) {
    // __pwEditIdx do nút Sửa truyện đặt; không có thì mở form trống để đăng mới.
    const idx = window.__pwEditIdx;
    window.__pwEditIdx = undefined;
    window.loadPostForm(idx);
  }
  if (id === 'about') {
  // Ưu tiên nhạc lưu trong site_content; aboutMusic viết cứng chỉ còn là dự phòng.
  const am = window.aboutMusicHienTai || aboutMusic;
  playMusicDirect(am.source, am.url, am.id || null, am.start, am.end || null, am.name);
} else if (id !== 'reading') {
  stopMusic();  // home, works → tắt nhạc
}
  window.scrollTo(0,0);
}
// Nút "Request a fic" ở cuối truyện và trên About. Chưa đăng nhập thì dẫn sang
// trang đăng nhập; đăng nhập rồi thì vào thẳng form.
function goRequest() {
  if (window.skDaDangNhap) { showPage('requests'); return; }
  showPage('auth', document.querySelector('.nav-signin'));
}

function goBack() {
  stopMusic();
  document.getElementById('progress-bar').classList.remove('visible');
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('font-controls').classList.remove('visible');
  document.getElementById('font-controls').classList.remove('tucked');
  document.getElementById('back-top').classList.remove('visible');
  document.getElementById('back-top').classList.remove('tucked');
  document.getElementById('float-toggle').classList.remove('visible');
  // Phải chốt đích TRƯỚC khi gọi showPage: showPage() gán lại prevPage = currentPage
  // (lúc đó là 'reading'), nên đọc prevPage sau đó thì luôn rơi về 'home'.
  // Trang Opus cũng mở được truyện (bấm dòng trong danh sách), nên cũng là đích quay về.
  const veLai = (prevPage === 'works' || prevPage === 'opus') ? prevPage : 'home';
  showPage(prevPage, null);
  document.querySelector('.nav-links a[data-page="' + veLai + '"]').classList.add('active');
}

window.addEventListener('popstate', (e) => {
  if (!e.state) { showPage('home', document.querySelector('.nav-links a[data-page="home"]')); return; }
  if (e.state.page === 'reading') { openFic(e.state.fic); return; }
  // Các trang cá nhân (profile/bookmarks/post) không còn mục nào trên thanh nav
  // để làm sáng — el = null là đúng, chỉ riêng auth thì sáng nút Sign In.
  const el = document.querySelector(`.nav-links a[data-page="${e.state.page}"]`)
          || (e.state.page === 'auth' ? document.querySelector('.nav-signin') : null);
  showPage(e.state.page, el);
});

// (Xử lý mở fic từ #fic-N đã gộp vào DOMContentLoaded ở trên,
// vì cần đợi fics.json load xong trước khi có thể openFic)
