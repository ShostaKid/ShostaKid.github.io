// =============================================
// GIAO DIỆN MỚI (nhánh redesign, 10/2026) — tinh thần wienerphilharmoniker.at
// Nạp SAU app.js. Định nghĩa lại renderHome / renderWorks / chonNgauNhien: khai báo hàm toàn cục
// cùng tên ở script sau đè bản trong app.js, nên showPage/applyLang/veLaiDiaThan gọi thẳng bản này.
// Dùng lại dtEl/ganCon/dtIcon/t/worksData/WS/NHOM/TEMPO… của app.js. Mọi tên mới mang tiền tố rd.
// Dựng 100% bằng createElement; tóm tắt/phụ đề có HTML thì bóc chữ bằng chuTron().
// =============================================

// Màu nền bìa theo fandom — trầm hơn MAU_BIA của bìa đĩa cũ, hợp nền giấy ngà.
const RD_MAU = {
  'Figure Skating RPF': '#2C3A4F', 'Reverse: 1999': '#5C2B27', 'Honkai: Star Rail': '#2D4239',
  'Genshin Impact': '#3A3F5E', 'Spider-Verse': '#3B3431', 'Zootopia': '#5A4A2C', 'Others': '#4F4A42'
};
const rdMau = w => RD_MAU[w.fandom] || '#4A4540';
// "Mới": movement mới trong 14 ngày (coChuongMoi) hoặc truyện vừa ra mắt trong 14 ngày.
const rdMoiRaMat = w => { const x = new Date(w.date).getTime(); return !isNaN(x) && Date.now() - x < NGAY_MOI * 864e5; };
const rdMoi = w => coChuongMoi(w) || rdMoiRaMat(w);
const rdNhanMoi = w => (coChuongMoi(w) ? t('dt_rb_new') : t('rd_new'));
const rdNav = p => document.querySelector('.nav-links a[data-page="' + p + '"]');
const rdBoDau = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

// Bìa = trang bìa bản nhạc in: nền màu fandom, khung chỉ vàng, icon nhạc cụ, nhãn giấy ngà ghi tên + số Op.
// kieu: p = dọc 4:5 · w = toàn cảnh 16:9 · s = nhỏ (thẻ Works) · m = ô vuông chỉ có nhạc cụ.
function rdBia(w, kieu, moi) {
  const g = nhomCua(w);
  const el = dtEl('div', { class: 'rd-cv rd-cv-' + kieu, style: { '--cv': rdMau(w) }, 'aria-hidden': 'true' });
  const ve = () => {
    if (kieu === 'm' || kieu === 's') { el.append(dtIcon(iconCua(w))); return; }
    el.append(dtEl('span', { class: 'rd-cv-top' }, w.fandom), dtIcon(iconCua(w)),
      dtEl('span', { class: 'rd-cv-lab' }, dtEl('b', null, w.title), dtEl('i', null, nhanNhom(g) + ' · ShostaKid')));
  };
  const url = String(w.cover || '').trim();
  if (kieu !== 'm' && /^https?:\/\//i.test(url)) {
    el.classList.add('co-anh');
    const img = dtEl('img', { src: url, alt: '', loading: 'lazy' });
    img.addEventListener('error', () => { img.remove(); el.classList.remove('co-anh'); ve(); });
    el.append(img);
  } else ve();
  if (moi && kieu !== 'm' && kieu !== 's') el.append(dtEl('span', { class: 'rd-flag' }, rdNhanMoi(w)));
  if (w.restricted && kieu !== 'm' && kieu !== 's') el.append(dtEl('span', { class: 'rd-lock' }, t('only_member')));
  return el;
}

const rdXemThem = (chu, fn) => dtEl('button', { type: 'button', class: 'rd-more', onclick: fn }, chu, dtEl('span', { 'aria-hidden': 'true' }, '→'));
const rdDauMuc = (tieuDe, phai) => dtEl('div', { class: 'rd-sec-hd' }, dtEl('h2', { class: 'rd-h2' }, tieuDe), phai);

// =============================================
// HOME
// =============================================
function rdDocDo() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem('sk-continue') || 'null'); } catch (_) {}
  if (!d || Date.now() - d.timestamp > 30 * 24 * 60 * 60 * 1000) return null;
  const w = worksData.find(x => x.idx === d.ficIdx);
  if (!w) return null;
  const ch = (d.chapter || 0) + 1;
  const nhan = w.nch ? t('dt_mv_of').replace('{a}', LA_MA(ch)).replace('{b}', LA_MA(w.nch)) : t('dt_mv_one').replace('{a}', LA_MA(ch));
  return dtEl('button', { type: 'button', class: 'rd-resume', onclick: () => resumeReading() },
    rdBia(w, 'm'),
    dtEl('span', { class: 'rd-resume-t' },
      dtEl('span', { class: 'rd-eyebrow' }, t('dt_left_off') + ' · ' + nhan),
      dtEl('span', { class: 'rd-resume-n' }, w.title),
      w.subtitle ? dtEl('span', { class: 'rd-sub' }, chuTron(w.subtitle)) : null,
      w.nch ? dtEl('span', { class: 'rd-resume-bar', 'aria-hidden': 'true' },
        dtEl('i', { style: { width: Math.min(100, Math.round(ch / w.nch * 100)) + '%' } })) : null),
    dtEl('span', { class: 'rd-resume-go', 'aria-hidden': 'true' }, '→'));
}

function rdManChao(denWorks, denOpus) {
  const khuong = dtEl('span', { class: 'rd-staff', 'aria-hidden': 'true' });
  // Chuỗi SVG cố định (không có dữ liệu người dùng): năm dòng kẻ mảnh của khuông nhạc.
  khuong.innerHTML = '<svg viewBox="0 0 1000 96" preserveAspectRatio="none">'
    + [0.5, 24, 48, 72, 95.5].map(y => '<line x1="0" x2="1000" y1="' + y + '" y2="' + y + '" vector-effect="non-scaling-stroke"/>').join('')
    + '</svg>';
  const khoa = dtIcon('g-clef'); khoa.classList.add('rd-clef');
  khuong.append(khoa);
  return dtEl('section', { class: 'rd-hero', 'aria-labelledby': 'rd-hero-t' },
    dtEl('div', { class: 'rd-hero-in' },
      dtEl('p', { class: 'rd-eyebrow' }, t('rd_eye')),
      dtEl('h1', { class: 'rd-hero-t', id: 'rd-hero-t' }, khuong, dtEl('span', { class: 'tt' }, 'ShostaKid')),
      dtEl('p', { class: 'rd-hero-lead' }, t('rd_lead')),
      // Giữ nguyên chữ "$" — chơi chữ có chủ ý.
      dtEl('p', { class: 'rd-hero-tag' }, t('hero_sub') + '. ' + t('hero_tag') + '.'),
      dtEl('div', { class: 'rd-hero-btns' },
        dtEl('button', { type: 'button', class: 'rd-btn rd-btn-gold', onclick: denWorks }, t('rd_browse')),
        dtEl('button', { type: 'button', class: 'rd-btn rd-btn-pale', onclick: () => denOpus() }, t('dt_open_opus')))),
    dtEl('ol', { class: 'rd-steps' }, ['I', 'II', 'III'].map((so, i) => dtEl('li', { class: 'rd-step' },
      dtEl('b', null, dtEl('span', null, so), t('rd_step' + (i + 1) + '_t')), dtEl('p', null, t('rd_step' + (i + 1) + '_p'))))));
}

function renderHome() {
  const goc = document.getElementById('dt-home');
  if (!goc) return;
  const ds = worksData.filter(w => w.idx != null);
  const theoTim = (a, b) => (b.kudos || 0) - (a.kudos || 0) || theoMoiNhat(a, b);
  const moi = [...ds].sort(theoMoiNhat).slice(0, 3);
  // "Favorite Children": CHỈ truyện tác giả đánh dấu featured, hiện hết một lượt (không trượt, không độn thêm).
  const chon = ds.filter(w => w.featured).sort(theoMoiNhat);
  const thich = [...ds].sort(theoTim).slice(0, 6);
  const denWorks = () => showPage('works', rdNav('works'));
  const denOpus = slug => { if (slug) window.opusChon = slug; showPage('opus', rdNav('opus')); };
  const docDo = rdDocDo();

  const nhomCo = NHOM.filter(g => ds.some(w => nhomCua(w) === g));
  goc.textContent = '';
  goc.append(dtEl('main', { class: 'rd-home' },
    rdManChao(denWorks, denOpus),
    docDo ? dtEl('section', { class: 'rd-sec rd-sec-resume' }, dtEl('div', { class: 'rd-wrap' }, docDo)) : null,
    moi.length ? dtEl('section', { class: 'rd-sec' }, dtEl('div', { class: 'rd-wrap' },
      rdDauMuc(t('rd_latest'), rdXemThem(t('rd_all'), denWorks)),
      dtEl('div', { class: 'rd-grid3' }, moi.map(w => dtEl('button', { type: 'button', class: 'rd-card', onclick: () => openFic(w.idx) },
        rdBia(w, 'p', rdMoi(w)),
        dtEl('span', { class: 'rd-eyebrow' }, w.fandom + ' · ' + tenNganNhom(nhomCua(w))),
        dtEl('span', { class: 'rd-h3' }, w.title),
        w.subtitle ? dtEl('span', { class: 'rd-sub' }, chuTron(w.subtitle)) : null,
        dtEl('span', { class: 'rd-meta' }, coChuongMoi(w)
          ? t('dt_rb_new') + ' ' + LA_MA(w.newMv.pos) + ' · ' + dtNgay(w.newMv.at)
          : t('rd_published') + ' ' + dtNgay(w.date))))))) : null,
    chon.length ? dtEl('section', { class: 'rd-sec' }, dtEl('div', { class: 'rd-wrap' },
      dtEl('div', { class: 'rd-sec-hd' }, dtEl('div', null,
        dtEl('p', { class: 'rd-eyebrow' }, t('rd_fav_eye') + ' · ' + chon.length),
        dtEl('h2', { class: 'rd-h2' }, t('head_fav')))),
      dtEl('div', { class: 'rd-favs' }, chon.map(w => dtEl('button', { type: 'button', class: 'rd-card rd-fav', onclick: () => openFic(w.idx) },
        rdBia(w, 'p', rdMoi(w)),
        dtEl('span', { class: 'rd-eyebrow' }, [w.fandom, tenNganNhom(nhomCua(w))].join(' · ')),
        dtEl('span', { class: 'rd-h3' }, w.title),
        w.subtitle ? dtEl('span', { class: 'rd-sub' }, chuTron(w.subtitle)) : null,
        chuTron(w.summary) ? dtEl('span', { class: 'rd-fav-sum' }, catNgan(chuTron(w.summary), 150)) : null))))) : null,
    nhomCo.length ? dtEl('section', { class: 'rd-band' }, dtEl('div', { class: 'rd-wrap rd-band-grid' },
      dtEl('div', { class: 'rd-band-l' },
        dtIcon('g-clef'),
        dtEl('h2', { class: 'rd-h2' }, 'Opus'),
        dtEl('p', null, t('rd_opus_p')),
        dtEl('button', { type: 'button', class: 'rd-btn rd-btn-gold', onclick: () => denOpus() }, t('dt_open_opus'))),
      dtEl('ul', { class: 'rd-forms' }, nhomCo.map(g => dtEl('li', null,
        dtEl('button', { type: 'button', onclick: () => denOpus(g.slug) },
          dtEl('span', { class: 'op' }, nhanNhom(g)), dtEl('span', { class: 'nm' }, tenNganNhom(g)),
          dtEl('span', { class: 'n' }, ds.filter(w => nhomCua(w) === g).length))))))) : null,
    thich.length ? dtEl('section', { class: 'rd-sec' }, dtEl('div', { class: 'rd-wrap' },
      rdDauMuc(t('rd_loved'), rdXemThem(t('rd_all'), () => { WS.sort = 'loved'; denWorks(); })),
      dtEl('ol', { class: 'rd-loved' }, thich.map((w, i) => dtEl('li', null,
        dtEl('button', { type: 'button', onclick: () => openFic(w.idx) },
          dtEl('span', { class: 'rank' }, i + 1), rdBia(w, 'm'),
          dtEl('span', { class: 'txt' }, dtEl('span', { class: 't' }, w.title),
            dtEl('span', { class: 'f' }, [chuTron(w.subtitle), w.fandom].filter(Boolean).join(' · '))),
          dtEl('span', { class: 'kd' }, '♥ ' + (w.kudos || 0)))))))) : null,
    dtEl('section', { class: 'rd-sec' }, dtEl('div', { class: 'rd-wrap' }, dtEl('div', { class: 'rd-teaser' },
      dtEl('div', null,
        dtEl('p', { class: 'rd-eyebrow' }, t('nav_zone')),
        dtEl('h2', { class: 'rd-h2' }, t('rd_comm_t')),
        dtEl('p', null, t('rd_comm_p')),
        dtEl('a', { class: 'rd-btn rd-btn-line', href: 'commissions.html' }, t('rd_comm_btn'))),
      dtEl('div', { class: 'rd-tiles' }, [['I', 'rd_prices', 'prices-h'], ['II', 'rd_process', 'process-h'],
        ['III', 'rd_terms', 'terms-h'], ['IV', 'rd_samples', 'samples-h']].map(([so, k, id]) =>
        dtEl('a', { class: 'rd-tile', href: 'commissions.html#' + id }, dtEl('span', { class: 'no' }, so), dtEl('b', null, t(k))))))))));
}

// =============================================
// WORKS — danh sách thẻ kiểu AO3 / Ficbook
// =============================================
// WS (app.js) giữ fandom / len / sort / ships / q / chon / via; bản này thêm thể nhạc, trạng thái và số thẻ đang hiện.
const RD_W = { form: '', st: '', n: 12 };
const RD_TRANG = 12;

function rdKhop(w) {
  if (WS.fandom !== 'all' && w.fandom !== WS.fandom) return false;
  if (RD_W.form && (nhomCua(w) || {}).slug !== RD_W.form) return false;
  if (WS.len !== 'all' && doDai(w) !== WS.len) return false;
  if (RD_W.st === 'complete' && w.complete !== true) return false;
  if (RD_W.st === 'progress' && w.complete !== false) return false;
  if ([...WS.ships].some(s => !(w.ships || []).includes(s))) return false;
  const q = rdBoDau(WS.q.trim());
  if (q) {
    const k = rdBoDau([w.title, chuTron(w.subtitle), w.fandom, (w.ships || []).join(' '), (w.music || []).join(' ')].join(' '));
    if (!q.split(/\s+/).every(x => k.includes(x))) return false;
  }
  return true;
}
const rdXep = ds => ds.sort(WS.sort === 'long' ? (a, b) => (b.words || 0) - (a.words || 0) || theoMoiNhat(a, b)
  : WS.sort === 'loved' ? (a, b) => (b.kudos || 0) - (a.kudos || 0) || theoMoiNhat(a, b) : theoMoiNhat);
const rdCoLoc = () => WS.fandom !== 'all' || RD_W.form || WS.len !== 'all' || RD_W.st || WS.ships.size || WS.q.trim();

// Đổi bộ lọc → dựng lại, và kéo người xem về đầu danh sách nếu họ đang ở dưới sâu.
function rdLocLai() {
  RD_W.n = RD_TRANG;
  WS.via = null;
  renderWorks();
  const bar = document.querySelector('#dt-works .rd-filters');
  if (bar && bar.getBoundingClientRect().top < 0) bar.scrollIntoView({ block: 'start' });
}

function rdNutLuu(w) {
  if (!w.uuid) return null;   // bản dự phòng fics.json không có id thật để lưu
  return dtEl('button', { type: 'button', class: 'dt-bm rd-btn rd-btn-line rd-btn-sm', 'data-uuid': w.uuid,
    'aria-pressed': (window.skDaLuu && window.skDaLuu.has(w.uuid)) ? 'true' : 'false',
    onclick: e => { if (window.dtLuuTruyen) window.dtLuuTruyen(w, e.currentTarget); } },
    dtEl('span', { 'aria-hidden': 'true' }, '✦ '), t('dt_bookmark'));
}

function rdThe(w) {
  const g = nhomCua(w);
  const ships = (w.ships || []).filter(s => s !== 'Others');
  const tag = (chu, fn, lop) => dtEl('button', { type: 'button', class: 'rd-tag' + (lop ? ' ' + lop : ''), onclick: fn }, chu);
  const dong = (k, ...v) => dtEl('div', { class: 'rd-row' }, dtEl('dt', null, t(k)), dtEl('dd', null, ...v));
  const tom = chuTron(w.summary);
  const canh = w.warning || (w.warnTags || []).join(', ');
  const doc = e => { if (e) e.preventDefault(); openFic(w.idx); };
  const so = (k, v) => v ? dtEl('span', null, t(k) + ': ', dtEl('b', null, v)) : null;
  return dtEl('article', { class: 'rd-blurb' + (WS.via && WS.viaIdx === w.idx ? ' rd-picked' : ''), 'data-idx': w.idx,
      style: { '--fd': rdMau(w) } },
    WS.via && WS.viaIdx === w.idx ? bangVia() : null,
    dtEl('div', { class: 'rd-bl-head' },
      dtEl('button', { type: 'button', class: 'rd-bl-cv', tabindex: '-1', 'aria-hidden': 'true', onclick: doc }, rdBia(w, 's')),
      dtEl('div', { class: 'rd-bl-tt' },
        dtEl('h2', { class: 'rd-bl-title' }, dtEl('a', { href: '#fic-' + w.idx, onclick: doc }, w.title)),
        w.subtitle ? dtEl('p', { class: 'rd-sub' }, chuTron(w.subtitle)) : null,
        dtEl('p', { class: 'rd-bl-by' }, t('rd_by'))),
      dtEl('p', { class: 'rd-bl-date' },
        dtEl('span', null, w.newMv ? t('rd_updated') : t('rd_published')), dtNgay(w.updated || w.date))),
    dtEl('div', { class: 'rd-badges' },
      rdMoi(w) ? dtEl('span', { class: 'rd-badge solid' }, rdNhanMoi(w)) : null,
      dtEl('span', { class: 'rd-badge form' }, tenDuNhom(g)),
      typeof w.complete === 'boolean' ? dtEl('span', { class: 'rd-badge ' + (w.complete ? 'done' : 'wip') },
        dtEl('i', { 'aria-hidden': 'true' }), trangThai(w)) : null,
      w.restricted ? dtEl('span', { class: 'rd-badge lock' }, t('only_member')) : null,
      canh ? dtEl('span', { class: 'rd-badge warn' }, t('dt_cw')) : null,
      dtEl('span', { class: 'rd-badge kd' }, '♥ ' + (w.kudos || 0))),
    dtEl('dl', { class: 'rd-rows' },
      dong('fandom', tag(fandomLabel(w.fandom), () => { WS.fandom = w.fandom; rdLocLai(); })),
      dong('rd_pairing', ships.length
        ? ships.map(s => tag(s, () => { WS.ships.has(s) ? WS.ships.delete(s) : WS.ships.add(s); rdLocLai(); }, WS.ships.has(s) ? 'on' : ''))
        : dtEl('span', { class: 'rd-muted' }, t('rd_gen'))),
      (w.music || []).length ? dong('rd_music', nhacText(w)) : null,
      (w.words != null || w.nch) ? dong('rd_size', [doDai(w), w.words != null ? dtSo(w.words) + ' ' + t('dt_words') : '',
        w.nch ? soChuong(w.nch) : '', phutDoc(w) ? t('dt_min').replace('{n}', phutDoc(w)) : ''].filter(Boolean).join(' · ')) : null,
      canh ? dong('rd_warn', dtEl('span', { class: 'rd-warn-txt' }, canh)) : null,
      (w.tags || []).length ? dong('rd_tags', w.tags.map(s => dtEl('span', { class: 'rd-tag plain' }, s))) : null),
    tom ? dtEl('p', { class: 'rd-bl-sum' }, tom) : null,
    dtEl('div', { class: 'rd-bl-foot' },
      dtEl('p', { class: 'rd-stats' },
        so('dt_language', w.lang ? (w.lang === 'vi' ? t('rd_lang_vi') : t('rd_lang_en')) : ''),
        so('rd_kudos_l', String(w.kudos || 0)), so('rd_comments_l', w.comments ? String(w.comments) : ''),
        so('rd_bms_l', w.bookmarks ? String(w.bookmarks) : '')),
      dtEl('div', { class: 'rd-bl-btns' },
        rdNutLuu(w),
        dtEl('button', { type: 'button', class: 'rd-btn rd-btn-gold rd-btn-sm', onclick: doc }, t('rd_read'), dtEl('span', { 'aria-hidden': 'true' }, ' →')))));
}

function renderWorks() {
  const goc = document.getElementById('dt-works');
  if (!goc) return;
  // Link #works?ship=Others từ trang Commission: "Others" gần như trùng fandom Others, nên lọc theo fandom
  // (lọc theo ship thì rơi mất truyện Others không gắn ship).
  if (WS.ships.has('Others') && !worksData.some(w => (w.ships || []).includes('Others'))) { WS.ships.delete('Others'); WS.fandom = 'Others'; }
  if (WS.sort !== 'long' && WS.sort !== 'loved') WS.sort = 'new';

  const fandoms = [...Object.keys(MAU_BIA).filter(f => worksData.some(w => w.fandom === f)),
                   ...[...new Set(worksData.map(w => w.fandom))].filter(f => !(f in MAU_BIA))];
  const nhomCo = NHOM.filter(g => worksData.some(w => nhomCua(w) === g));
  const chon = rdChon;
  const tim = dtEl('input', { type: 'search', placeholder: t('rd_search'), 'aria-label': t('rd_search') });
  tim.value = WS.q;

  const ds0 = () => rdXep(worksData.filter(w => w.idx != null && rdKhop(w)));
  const dem = dtEl('p', { class: 'rd-count', 'aria-live': 'polite' });
  const list = dtEl('div', { class: 'rd-list' });
  const trang = dtEl('div', { class: 'rd-pager' });
  const veDs = () => {
    const ds = ds0();
    dem.textContent = '';
    ganCon(dem, ds.length === 1 ? t('rd_n_work') : t('rd_n_works').replace('{n}', dtSo(ds.length)),
      rdCoLoc() ? dtEl('button', { type: 'button', class: 'rd-reset', onclick: () => {
        WS.fandom = 'all'; WS.len = 'all'; WS.ships.clear(); WS.q = ''; RD_W.form = ''; RD_W.st = ''; rdLocLai(); } }, t('rd_reset')) : null);
    list.textContent = '';
    if (!ds.length) list.append(dtEl('p', { class: 'rd-empty' }, t('no_results')));
    ds.slice(0, RD_W.n).forEach(w => list.append(rdThe(w)));
    trang.textContent = '';
    if (ds.length > RD_W.n) trang.append(dtEl('button', { type: 'button', class: 'rd-btn rd-btn-line',
      onclick: () => { RD_W.n += RD_TRANG; veDs(); } }, t('rd_more').replace('{n}', ds.length - RD_W.n)));
  };
  let hen;
  tim.addEventListener('input', () => { clearTimeout(hen); hen = setTimeout(() => { WS.q = tim.value; RD_W.n = RD_TRANG; veDs(); }, 160); });

  const xep = (k, nhan) => dtEl('button', { type: 'button', 'aria-pressed': WS.sort === k ? 'true' : 'false',
    onclick: () => { WS.sort = k; try { localStorage.setItem('sk-sort', k); } catch (e) {} rdLocLai(); } }, nhan);

  goc.textContent = '';
  goc.append(dtEl('main', { class: 'rd-page' }, dtEl('div', { class: 'rd-wrap' },
    dtEl('div', { class: 'rd-crumb', role: 'navigation', 'aria-label': 'Breadcrumb' },
      dtEl('button', { type: 'button', onclick: () => showPage('home', rdNav('home')) }, t('nav_home')),
      dtEl('span', { 'aria-hidden': 'true' }, '›'), dtEl('span', null, t('nav_works'))),
    dtEl('div', { class: 'rd-page-hd' },
      dtEl('h1', { class: 'rd-h1' }, t('nav_works')),
      dtEl('p', null, t('rd_works_intro'))),
    dtEl('div', { class: 'rd-filters' },
      chon(t('rd_f_fandom'), WS.fandom === 'all' ? '' : WS.fandom, fandoms.map(f => [f, f]), v => { WS.fandom = v || 'all'; WS.ships.clear(); }),
      chon(t('rd_f_form'), RD_W.form, nhomCo.map(g => [g.slug, tenDuNhom(g)]), v => { RD_W.form = v; }),
      chon(t('rd_f_len'), WS.len === 'all' ? '' : WS.len,
        [['Miniature', t('rd_len_mini')], ['Chamber', t('rd_len_cham')], ['Symphonic', t('rd_len_sym')]], v => { WS.len = v || 'all'; }),
      chon(t('rd_f_status'), RD_W.st, [['complete', t('dt_complete')], ['progress', t('dt_in_progress')]], v => { RD_W.st = v; }),
      dtEl('label', { class: 'rd-fq' }, dtEl('span', { 'aria-hidden': 'true' }, '⌕'), tim)),
    WS.ships.size ? dtEl('div', { class: 'rd-active' }, [...WS.ships].map(s =>
      dtEl('button', { type: 'button', class: 'rd-tag on', onclick: () => { WS.ships.delete(s); rdLocLai(); } },
        t('rd_pair_on').replace('{s}', s), dtEl('span', { 'aria-hidden': 'true' }, ' ×')))) : null,
    dtEl('div', { class: 'rd-bar2' },
      dem,
      dtEl('div', { class: 'rd-bar2-r' },
        dtEl('button', { type: 'button', class: 'rd-tempo', onclick: e => moTempo(e.currentTarget) },
          dtEl('span', { 'aria-hidden': 'true' }, '♩ '), t('dt_tp_btn')),
        dtEl('div', { class: 'rd-sort', role: 'group', 'aria-label': t('dt_order') },
          xep('new', t('dt_newest')), xep('long', t('dt_longest')), xep('loved', t('rd_sort_loved'))))),
    list, trang)));
  veDs();
}

// "Chọn giúp tôi" (hộp thoại nhịp của app.js): lấy ngẫu nhiên một truyện đúng nhịp, bỏ mọi bộ lọc khác,
// mở đủ trang để thấy thẻ rồi cuộn tới. Loại truyện Members only như bản cũ.
function chonNgauNhien(id, loaiTru) {
  const tp = TEMPO.find(x => x.id === id);
  const pool = worksData.filter(w => doDai(w) === tp.len && !w.restricted && w.idx !== loaiTru);
  if (!pool.length) return false;
  const w = pool[Math.floor(Math.random() * pool.length)];
  WS.len = tp.len; WS.fandom = 'all'; WS.ships.clear(); WS.q = ''; RD_W.form = ''; RD_W.st = '';
  WS.chon = w.idx; WS.via = id; WS.viaIdx = w.idx;
  const vt = rdXep(worksData.filter(rdKhop)).findIndex(x => x.idx === w.idx);
  RD_W.n = Math.max(RD_TRANG, Math.ceil((vt + 1) / RD_TRANG) * RD_TRANG);
  dongTempo(true);
  renderWorks();
  const the = document.querySelector('#dt-works .rd-blurb[data-idx="' + w.idx + '"]');
  if (the) the.scrollIntoView({ block: 'center', behavior: 'smooth' });
  return true;
}

// =============================================
// Ô LỌC TỰ DỰNG — thay <select>: danh sách xổ xuống của hệ điều hành không theo nền tối
// (chữ xám trên nền trắng), lại không đổi được font/khoảng cách cho khớp web.
// =============================================
function rdChon(nhan, giaTri, opts, dat) {
  const ds = [['', t('all')], ...opts];
  const hien = opts.find(o => o[0] === giaTri);
  const wrap = dtEl('div', { class: 'rd-dd' + (giaTri ? ' on' : '') });
  const btn = dtEl('button', { type: 'button', class: 'rd-dd-btn', 'aria-haspopup': 'listbox', 'aria-expanded': 'false',
    'aria-label': nhan + (hien ? ': ' + hien[1] : '') }, dtEl('span', null, hien ? hien[1] : nhan));
  const list = dtEl('div', { class: 'rd-dd-list', role: 'listbox', 'aria-label': nhan });
  const dong = traFocus => { wrap.classList.remove('mo'); btn.setAttribute('aria-expanded', 'false'); if (traFocus) btn.focus(); };
  const mo = () => {
    rdDongHet(wrap);
    wrap.classList.add('mo'); btn.setAttribute('aria-expanded', 'true');
    const s = list.querySelector('[aria-selected="true"]') || list.firstElementChild;
    if (s) s.focus();
  };
  ds.forEach(([v, l]) => list.append(dtEl('button', { type: 'button', role: 'option', 'aria-selected': v === giaTri ? 'true' : 'false',
    onclick: () => { dong(false); if (v !== giaTri) { dat(v); rdLocLai(); } } }, l)));
  btn.addEventListener('click', () => (wrap.classList.contains('mo') ? dong(false) : mo()));
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Escape' && wrap.classList.contains('mo')) { e.preventDefault(); dong(true); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    if (!wrap.classList.contains('mo')) { mo(); return; }
    const ops = [...list.children], i = ops.indexOf(document.activeElement);
    ops[Math.max(0, Math.min(ops.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
  });
  wrap.append(btn, list);
  return wrap;
}
function rdDongHet(tru) {
  document.querySelectorAll('.rd-dd.mo, .rd-navmore.mo').forEach(d => {
    if (d === tru) return;
    d.classList.remove('mo');
    const b = d.querySelector('[aria-expanded]'); if (b) b.setAttribute('aria-expanded', 'false');
  });
}
document.addEventListener('click', e => {
  document.querySelectorAll('.rd-dd.mo, .rd-navmore.mo').forEach(d => { if (!d.contains(e.target)) rdDongHet(null); });
});

// =============================================
// KHUNG CHUNG: đầu trang (More, tìm kiếm) + chân trang mới. Dựng lại mỗi lần đổi ngôn ngữ.
// =============================================
const rdDenTrang = p => () => showPage(p, rdNav(p));
const rdDenHoSo = () => (window.skDaDangNhap ? showPage('profile', null) : showPage('auth', document.querySelector('.nav-signin')));
function rdHuy() {
  const c = document.createElementNS(SVGNS, 'svg');
  c.setAttribute('class', 'rd-crest'); c.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(SVGNS, 'use'); u.setAttribute('href', '#rd-crest');
  c.append(u);
  return c;
}
function rdKhung() {
  const links = document.querySelector('.nav-links');
  if (links) {
    let more = links.querySelector('.rd-navmore');
    if (!more) { more = dtEl('div', { class: 'rd-navmore' }); links.append(more); }
    more.textContent = '';
    const nut = dtEl('button', { type: 'button', class: 'rd-navmore-btn', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, t('rd_more_nav'));
    nut.addEventListener('click', () => {
      const mo = !more.classList.contains('mo');
      rdDongHet(null);
      more.classList.toggle('mo', mo); nut.setAttribute('aria-expanded', String(mo));
    });
    more.append(nut, dtEl('div', { class: 'rd-navmore-menu' },
      dtEl('a', { href: 'commissions.html' }, t('nav_zone')),
      dtEl('button', { type: 'button', onclick: () => { rdDongHet(null); goRequest(); } }, t('rd_request'))));
  }
  const utils = document.querySelector('.nav-utils');
  if (utils && !utils.querySelector('.rd-search-btn')) {
    utils.insertBefore(dtEl('button', { type: 'button', class: 'rd-search-btn', onclick: () => {
      showPage('works', rdNav('works'));
      setTimeout(() => { const i = document.querySelector('#dt-works .rd-fq input'); if (i) i.focus(); }, 30);
    } }), document.getElementById('lang-btn'));
  }
  const s = document.querySelector('.rd-search-btn'); if (s) s.setAttribute('aria-label', t('rd_search_btn'));

  const cot = (tieuDe, ...muc) => dtEl('div', { class: 'rd-ft-col' }, dtEl('p', { class: 'rd-ft-h' }, tieuDe), ...muc);
  const nut = (chu, fn) => dtEl('button', { type: 'button', onclick: fn }, chu);
  document.querySelectorAll('.page footer').forEach(ft => {
    ft.className = 'rd-ft';
    ft.removeAttribute('style');
    ft.textContent = '';
    ft.append(dtEl('div', { class: 'rd-wrap' },
      dtEl('div', { class: 'rd-ft-grid' },
        dtEl('div', { class: 'rd-ft-brand' },
          dtEl('button', { type: 'button', class: 'rd-ft-logo', onclick: rdDenTrang('home'), 'aria-label': 'ShostaKid, Home' },
            rdHuy(), dtEl('span', null, 'ShostaKid')),
          dtEl('button', { type: 'button', class: 'rd-btn rd-btn-gold rd-btn-sm', onclick: () => goRequest() }, t('rd_request'))),
        cot(t('rd_explore'), nut(t('nav_works'), rdDenTrang('works')), nut(t('nav_opus'), rdDenTrang('opus')),
          nut(t('nav_notes'), rdDenTrang('notes')), nut(t('nav_rehearsal'), rdDenTrang('rehearsal'))),
        cot(t('rd_house'), nut(t('nav_about'), rdDenTrang('about')), dtEl('a', { href: 'commissions.html' }, t('nav_zone')),
          nut(t('rd_request'), () => goRequest()), nut(t('rd_profile'), rdDenHoSo)),
        cot(t('rd_else'), dtEl('a', { href: 'https://archiveofourown.org/users/ShostaKid', target: '_blank', rel: 'noopener' }, 'Archive of Our Own'),
          dtEl('a', { href: 'https://x.com/Texas1k6', target: '_blank', rel: 'noopener' }, 'X · @Texas1k6'))),
      dtEl('p', { class: 'rd-ft-line' }, t('footer'))));
  });
  const ft = document.getElementById('float-toggle');
  if (ft) { ft.textContent = 'Aa'; ft.setAttribute('aria-label', t('rd_text_size')); ft.removeAttribute('title'); }
}

// Nút "Aa" nổi ở trang đọc: mở/gập cụm chỉnh cỡ chữ. Mặc định gập (chỉ thấy nút Aa).
function toggleFloatingButtons() {
  floatsTucked = !floatsTucked;
  document.getElementById('font-controls').classList.toggle('tucked', floatsTucked);
  document.getElementById('back-top').classList.toggle('tucked', floatsTucked);
  const ft = document.getElementById('float-toggle');
  ft.textContent = 'Aa';
  ft.setAttribute('aria-expanded', String(!floatsTucked));
}

const rdGocApplyLang = window.applyLang;
window.applyLang = function () {
  rdGocApplyLang.apply(this, arguments);
  rdKhung();
  if (currentPage === 'reading') { rdDauDoc(); rdCuoiDoc(); }
  if (currentPage === 'profile') rdVeHoSo();
};
const rdGocShowPage = window.showPage;
window.showPage = function (id) {
  rdDongHet(null);
  rdGocShowPage.apply(this, arguments);
  if (id === 'profile') rdVeHoSo();
};
document.addEventListener('DOMContentLoaded', () => {
  floatsTucked = false; toggleFloatingButtons();   // bắt đầu ở trạng thái gập
});

// =============================================
// TRANG ĐỌC — đầu trang kiểu bản thiết kế: vụn bánh mì, tên lớn ở giữa, dòng thông tin, thẻ chọn
// movement; cuối chương là thẻ "Next movement". Logic tải chương / nhạc của app.js giữ nguyên:
// chỉ bọc openFic / updateChapterNav để vẽ lại phần đầu và phần cuối.
// =============================================
const rdDemChu = html => {
  const s = chuTron(String(html || '').replace(/<[^>]+>/g, ' '));
  return s ? s.split(/\s+/).filter(Boolean).length : 0;
};
function rdDauDoc() {
  const head = document.getElementById('reading-header');
  if (!head || currentPage !== 'reading') return;
  const i = currentFic, ch = currentChapter;
  const f = ficInfo(i);
  const w = worksData.find(x => x.idx === i) || { idx: i, title: f.title, subtitle: f.subtitle, fandom: 'Others' };
  const g = nhomCua(w);
  const ten = chapterNames(i);
  const rows = (chapterFic === i && Array.isArray(chapterRows)) ? chapterRows : null;
  const nchu = rows && rows[ch] ? rdDemChu(rows[ch].content) : 0;
  const ships = (w.ships || []).filter(s => s !== 'Others');
  const nhieu = ten.length > 1;
  // Khung thông tin kiểu AO3 (Rating / Warning / Category / Fandom / Relationship / Tags / Language / Stats),
  // chỉ những dòng web có dữ liệu. Fandom và cặp đôi bấm được → sang Works đã lọc sẵn.
  const denLoc = fn => () => { fn(); RD_W.n = RD_TRANG; WS.via = null; showPage('works', rdNav('works')); };
  const dongTT = (k, ...v) => dtEl('div', null, dtEl('dt', null, t(k)), dtEl('dd', null, ...v));
  const lienKet = (chu, fn) => dtEl('button', { type: 'button', class: 'rd-ilink', onclick: fn }, chu);
  const canh = f.warning || (w.warnTags || []).join(', ');
  const xong = w.complete === true;
  const ngayCuoi = w.newMv ? w.newMv.at : null;
  const so = (k, v) => v || v === 0 ? dtEl('span', null, t(k) + ': ', dtEl('b', null, v)) : null;
  const khungTT = dtEl('dl', { class: 'rd-ibox' },
    dongTT('rd_i_warn', canh ? dtEl('span', { class: 'rd-warn-txt' }, canh) : dtEl('span', { class: 'rd-muted' }, t('rd_i_nowarn'))),
    g ? dongTT('dt_form', tenDuNhom(g)) : null,
    dongTT('fandom', lienKet(fandomLabel(w.fandom), denLoc(() => { WS.fandom = w.fandom; WS.ships.clear(); }))),
    dongTT('rd_pairing', ships.length
      ? ships.map(s => lienKet(s, denLoc(() => { WS.fandom = 'all'; WS.ships = new Set([s]); })))
      : dtEl('span', { class: 'rd-muted' }, t('rd_gen'))),
    (w.tags || []).length ? dongTT('rd_tags', w.tags.map(s => dtEl('span', null, s))) : null,
    w.lang ? dongTT('dt_language', w.lang === 'vi' ? t('rd_lang_vi') : t('rd_lang_en')) : null,
    (w.music || []).length ? dongTT('rd_music', nhacText(w)) : null,
    dongTT('rd_i_stats', dtEl('span', { class: 'rd-istats' },
      so('rd_published', w.date ? dtNgay(w.date) : ''),
      so(xong ? 'rd_i_completed' : 'rd_updated', ngayCuoi ? dtNgay(ngayCuoi) : (xong && w.date ? dtNgay(w.date) : '')),
      so('rd_i_words', w.words != null ? dtSo(w.words) : ''),
      so('rd_i_mv', w.nch ? w.nch + '/' + (xong ? w.nch : '?') : ''),
      phutDoc(w) ? dtEl('span', null, t('dt_min').replace('{n}', phutDoc(w))) : null,
      so('rd_kudos_l', w.kudos != null ? dtSo(w.kudos) : ''),
      so('rd_comments_l', w.comments ? dtSo(w.comments) : ''),
      so('rd_bms_l', w.bookmarks ? dtSo(w.bookmarks) : ''))));

  head.textContent = '';
  ganCon(head,
    dtEl('div', { class: 'rd-crumb rd-read-crumb', role: 'navigation', 'aria-label': 'Breadcrumb' },
      dtEl('button', { type: 'button', onclick: rdDenTrang('works') }, t('nav_works')),
      dtEl('span', { 'aria-hidden': 'true' }, '›'),
      dtEl('button', { type: 'button', onclick: () => { WS.fandom = w.fandom; WS.ships.clear(); RD_W.n = RD_TRANG; showPage('works', rdNav('works')); } }, w.fandom),
      dtEl('span', { 'aria-hidden': 'true' }, '›'),
      dtEl('span', null, f.title)),
    dtEl('div', { class: 'rd-read-hd' },
      dtEl('p', { class: 'rd-eyebrow' }, [g ? tenNganNhom(g) : '', fandomLabel(w.fandom)].filter(Boolean).join(' · ')),
      dtEl('h1', { class: 'rd-read-t' }, f.title),
      f.subtitle ? dtEl('p', { class: 'rd-read-sub' }, chuTron(f.subtitle)) : null,
      khungTT));
  if (f.cover) {
    const bia = oBia(f.cover, 'reading-bia');
    if (bia.tagName === 'IMG') { if (f.coverCrop) bia.classList.add('cat-219'); head.append(bia); }
  }
  if (nhieu) {
    head.append(dtEl('div', { class: 'rd-mvtabs', role: 'navigation', 'aria-label': t('dt_mvn') }, ten.map((x, k) =>
      dtEl('button', { type: 'button', 'aria-current': k === ch ? 'true' : null, onclick: () => { if (k !== currentChapter) jumpChapter(k); } },
        dtEl('span', null, LA_MA(k + 1)), dtEl('b', null, x)))));
  }
  const nhanMv = [nhieu || nchu ? t('rd_mv_lab').replace('{a}', LA_MA(ch + 1)) : '',
    nchu ? t('dt_min').replace('{n}', Math.max(1, Math.round(nchu / 250))) : ''].filter(Boolean).join(' · ');
  head.append(dtEl('div', { class: 'rd-mvhead' },
    nhanMv ? dtEl('p', { class: 'rd-eyebrow' }, nhanMv) : null,
    nhieu ? dtEl('h2', null, ten[ch] || '') : null));

  // Thanh nhạc: thêm "Movement I of IV" ở bên phải
  const bar = document.getElementById('music-bar');
  if (bar) {
    let mv = document.getElementById('rd-mb-mv');
    if (!mv) { mv = dtEl('span', { id: 'rd-mb-mv' }); bar.insertBefore(mv, bar.querySelector('.music-toggle')); }
    mv.textContent = nhieu ? t('rd_mv_of').replace('{a}', LA_MA(ch + 1)).replace('{b}', LA_MA(ten.length)) : '';
  }
}
function rdCuoiDoc() {
  const body = document.getElementById('reading-body');
  if (!body || currentPage !== 'reading') return;
  let o = document.getElementById('rd-next');
  if (!o) { o = dtEl('div', { id: 'rd-next' }); body.after(o); }
  o.textContent = '';
  const ten = chapterNames(currentFic);
  if (ten.length <= 1 || window.skFicDangKhoa) return;
  const k = currentChapter + 1;
  o.append(k < ten.length
    ? dtEl('div', { class: 'rd-next' },
        dtEl('div', null, dtEl('p', { class: 'rd-eyebrow' }, t('rd_next_mv')), dtEl('p', { class: 'rd-next-t' }, LA_MA(k + 1) + '. ' + ten[k])),
        dtEl('button', { type: 'button', class: 'rd-btn rd-btn-gold rd-btn-sm', onclick: () => nextChapter() }, t('rd_continue')))
    : dtEl('div', { class: 'rd-next' },
        dtEl('div', null, dtEl('p', { class: 'rd-eyebrow' }, t('rd_final')), dtEl('p', { class: 'rd-next-t' }, LA_MA(ten.length) + '. ' + ten[ten.length - 1])),
        dtEl('button', { type: 'button', class: 'rd-btn rd-btn-line rd-btn-sm', onclick: rdDenTrang('works') }, t('rd_back_works'))));
}
const rdGocOpenFic = window.openFic;
// Rời Chamber bằng đường mở truyện (không qua showPage) thì cũng phải tắt phòng nghe và thanh phát nhỏ của nó.
window.openFic = function () { if (window.ntRoi) window.ntRoi(); rdGocOpenFic.apply(this, arguments); rdDauDoc(); rdCuoiDoc(); };
const rdGocNavChuong = window.updateChapterNav;
window.updateChapterNav = function () { rdGocNavChuong.apply(this, arguments); rdDauDoc(); rdCuoiDoc(); };

// =============================================
// LỊCH SỬ ĐỌC (trên máy người đọc, như sk-continue): mỗi truyện một mục {idx, ch, ts}.
// Cấp cho tab "Continue reading" và ô "Works read" của trang hồ sơ.
// =============================================
function rdLichSu() {
  let ds = [];
  try { ds = JSON.parse(localStorage.getItem('sk-history') || '[]'); } catch (_) {}
  if (!Array.isArray(ds)) ds = [];
  if (!ds.length) {   // lần đầu: lấy chỗ đọc dở cũ làm mục đầu tiên
    try {
      const c = JSON.parse(localStorage.getItem('sk-continue') || 'null');
      if (c) ds = [{ idx: c.ficIdx, ch: c.chapter || 0, ts: c.timestamp || Date.now() }];
    } catch (_) {}
  }
  return ds.filter(x => x && typeof x.idx === 'number');
}
const rdGocLuuDoc = window.saveReadingProgress;
window.saveReadingProgress = function () {
  rdGocLuuDoc.apply(this, arguments);
  try {
    const ds = rdLichSu().filter(x => x.idx !== currentFic);
    ds.unshift({ idx: currentFic, ch: currentChapter, ts: Date.now() });
    localStorage.setItem('sk-history', JSON.stringify(ds.slice(0, 60)));
  } catch (_) {}
};

// =============================================
// TRANG HỒ SƠ — thẻ đầu, ba ô số, ba tab (Continue reading / Bookmarks / Kudos given).
// Form sửa hồ sơ cũ giữ nguyên (cùng id, cùng accounts.js), chỉ gập lại sau nút "Account settings".
// =============================================
let rdHoSoTab = 'doc', rdHoSoLuot = 0;
async function rdVeHoSo() {
  const trang = document.getElementById('page-profile');
  if (!trang) return;
  const form = trang.querySelector('.auth-wrap');
  let goc = document.getElementById('rd-prof');
  if (!goc) { goc = dtEl('main', { id: 'rd-prof', class: 'rd-page' }); trang.insertBefore(goc, form); form.classList.add('rd-prof-form'); }
  const luot = ++rdHoSoLuot;
  const d = window.fetchProfileData ? await window.fetchProfileData() : null;
  if (luot !== rdHoSoLuot) return;
  goc.textContent = '';
  if (!d) return;   // chưa đăng nhập: guardProfile() của accounts.js chuyển sang trang đăng nhập
  const p = d.profile || {};
  const ten = p.display_name || p.username || '—';
  const anh = String(p.avatar_url || '').trim();
  const av = dtEl('div', { class: 'rd-prof-av' });
  if (/^https?:\/\//i.test(anh)) {
    const img = dtEl('img', { src: anh, alt: '' });
    img.addEventListener('error', () => { img.remove(); av.textContent = ten.charAt(0).toUpperCase(); });
    av.append(img);
  } else av.textContent = ten.charAt(0).toUpperCase();
  const tuNgay = d.since ? new Date(d.since).toLocaleDateString(laVi() ? 'vi-VN' : 'en-GB', { month: 'long', year: 'numeric' }) : '';
  const tim = id => worksData.find(w => w.uuid === id);
  const lich = rdLichSu().map(x => ({ x, w: worksData.find(w => w.idx === x.idx) })).filter(o => o.w);
  const luu = d.bookmarks.map(b => ({ b, w: tim(b.work_id) })).filter(o => o.w);
  const kd = d.kudos.map(k => ({ k, w: tim(k.work_id) })).filter(o => o.w);

  const hang = (w, phu, tienDo, ...nut) => dtEl('div', { class: 'rd-prow' },
    dtEl('button', { type: 'button', class: 'rd-prow-cv', tabindex: '-1', 'aria-hidden': 'true', onclick: () => openFic(w.idx) }, rdBia(w, 'm')),
    dtEl('div', { class: 'rd-prow-t' },
      dtEl('p', { class: 'rd-eyebrow' }, [tenNganNhom(nhomCua(w)), w.fandom].join(' · ')),
      dtEl('p', { class: 'rd-prow-n' }, w.title, w.subtitle ? dtEl('em', null, ' ' + chuTron(w.subtitle)) : null),
      dtEl('p', { class: 'rd-prow-s' }, phu),
      tienDo != null ? dtEl('span', { class: 'rd-resume-bar', 'aria-hidden': 'true' }, dtEl('i', { style: { width: tienDo + '%' } })) : null),
    dtEl('div', { class: 'rd-prow-b' }, ...nut));
  const docBtn = w => dtEl('button', { type: 'button', class: 'rd-btn rd-btn-gold rd-btn-sm', onclick: () => openFic(w.idx) }, t('rd_read'));
  const rong = k => [dtEl('p', { class: 'rd-empty' }, t(k))];
  const DS = {
    doc: () => lich.length ? lich.map(({ x, w }) => {
      const n = w.nch || 1, c = Math.min(x.ch || 0, n - 1);
      return hang(w, t('rd_mv_of').replace('{a}', c + 1).replace('{b}', n), Math.round((c + 1) / n * 100),
        dtEl('button', { type: 'button', class: 'rd-btn rd-btn-gold rd-btn-sm', onclick: () => openFic(w.idx, c) }, t('rd_resume')));
    }) : rong('rd_empty_doc'),
    luu: () => luu.length ? luu.map(({ b, w }) => hang(w, t('rd_saved').replace('{d}', dtNgay(b.created_at)), null, rdNutLuu(w), docBtn(w))) : rong('rd_empty_luu'),
    kd: () => kd.length ? kd.map(({ k, w }) => hang(w, t('rd_kd_on').replace('{d}', dtNgay(k.created_at)), null, docBtn(w))) : rong('rd_empty_kd')
  };
  const list = dtEl('div', { class: 'rd-plist', role: 'tabpanel' });
  const tabs = dtEl('div', { class: 'rd-ptabs', role: 'tablist' });
  const veTab = () => {
    tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.k === rdHoSoTab)));
    list.textContent = '';
    list.append(...DS[rdHoSoTab]());
  };
  [['doc', 'rd_tab_doc'], ['luu', 'rd_tab_luu'], ['kd', 'rd_tab_kd']].forEach(([k, nhan]) =>
    tabs.append(dtEl('button', { type: 'button', role: 'tab', 'data-k': k, onclick: () => { rdHoSoTab = k; veTab(); } }, t(nhan))));
  const o = (so, nhan) => dtEl('div', { class: 'rd-pstat' }, dtEl('b', null, dtSo(so)), dtEl('span', null, t(nhan)));
  const caiDat = dtEl('button', { type: 'button', class: 'rd-btn rd-btn-line', 'aria-expanded': String(form.classList.contains('mo')) }, t('rd_settings'));
  caiDat.addEventListener('click', () => {
    const mo = !form.classList.contains('mo');
    form.classList.toggle('mo', mo); caiDat.setAttribute('aria-expanded', String(mo));
    if (mo) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  goc.append(dtEl('div', { class: 'rd-wrap' },
    dtEl('div', { class: 'rd-crumb', role: 'navigation', 'aria-label': 'Breadcrumb' },
      dtEl('button', { type: 'button', onclick: rdDenTrang('home') }, t('nav_home')), dtEl('span', { 'aria-hidden': 'true' }, '›'),
      dtEl('span', null, t('rd_profile'))),
    dtEl('section', { class: 'rd-phead' }, av,
      dtEl('div', { class: 'rd-phead-t' },
        dtEl('p', { class: 'rd-eyebrow' }, p.is_admin ? t('rd_admin') : t('rd_member')),
        dtEl('h1', { class: 'rd-h1' }, ten),
        dtEl('p', { class: 'rd-muted' }, (p.username ? '@' + p.username + ' · ' : '') + (tuNgay ? t('rd_since').replace('{d}', tuNgay) : ''))),
      caiDat),
    dtEl('div', { class: 'rd-pstats' }, o(d.bookmarks.length, 'rd_n_bm'), o(d.kudos.length, 'rd_n_kd'), o(lich.length, 'rd_n_read')),
    tabs, list));
  veTab();
}
