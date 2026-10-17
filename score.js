/* Trang Works trên MÁY TÍNH (≥1280px): "the Score terminal" — theo bản thiết kế Claude Design
   "Works · the Score terminal (cards cover style, status, faint instrument)".
   Dưới 1280px renderWorks() (app.js) vẫn dựng kệ khuông nhạc như cũ — chủ repo chốt bản này chỉ cho PC.

   Mỗi fandom là một "movement" (Movement I, II…). Số La Mã cố định theo fandoms.sort_order (accounts.js
   gọi datThuTuFandom), KHÔNG theo số truyện. Cột trái chọn movement; giữa là đầu movement (số La Mã viền mờ,
   dòng giới thiệu admin sửa được, thống kê, chip ship) và danh sách thẻ; phải là "On the turntable" (dtLiner).
   Không có mục "Tutti" (tất cả fandom) và không có dòng thời gian No. 01… — chủ repo chốt bỏ.

   Dùng lại toàn cục của app.js: WS, TEMPO, khopLoc, sapXepWorks, doDai, phutDoc, dtEl, dtIcon, dtLiner, mauBia,
   nhomCua, nhanNhom, tenNganNhom, iconCua, trangThai, coChuongMoi, chuTron, dtSo, LA_MA, MAU_BIA, soTuNhien,
   moTempo, t, laVi, worksData. Dữ liệu dòng giới thiệu: window.fetchMovementNotes / saveMovementNotes (accounts.js). */
(function () {
  const MQ = window.matchMedia('(min-width:1280px)');
  window.laScorePC = () => MQ.matches;

  // ---- Thứ tự movement ----
  let THU_TU = null;   // { tên fandom: sort_order } từ DB
  window.datThuTuFandom = rows => { THU_TU = {}; (rows || []).forEach(r => { THU_TU[r.name] = r.sort_order; }); };
  function dsMovement() {
    // Dự phòng (fics.json / DB chưa trả lời): MAU_BIA khai đúng thứ tự sort_order hiện có; Others luôn cuối.
    const goc = Object.keys(MAU_BIA);
    const so = f => (THU_TU && f in THU_TU) ? THU_TU[f]
      : f === 'Others' ? 9999 : (goc.indexOf(f) >= 0 ? (goc.indexOf(f) + 1) * 10 : 5000);
    return [...new Set(worksData.map(w => w.fandom))].sort((a, b) => so(a) - so(b) || soTuNhien(a, b));
  }
  const tenMv = f => f === 'Others' ? t('sc_others') : f;

  // ---- Dòng giới thiệu của movement ----
  // Bản mặc định (viết sẵn theo nội dung kho truyện); admin sửa được ngay trên trang, lưu ở site_content.
  const TAG_MAC_DINH = {
    'Figure Skating RPF': { en: 'Rinks, rivalries and the quiet between two programmes: Anna, Sasha and Kamila, told at the length of a free skate.',
                            vi: 'Sân băng, kình địch và khoảng lặng giữa hai bài thi: Anna, Sasha và Kamila, kể dài như một bài tự do.' },
    'Reverse: 1999':      { en: 'Letters, old Europe and a Storm that keeps rewinding: Aleph and Recoleta, Corvus and Pyrrhos, out of time.',
                            vi: 'Thư từ, một châu Âu cũ và cơn Bão cứ quay ngược: Aleph và Recoleta, Corvus và Pyrrhos, lạc khỏi thời gian.' },
    'Honkai: Star Rail':  { en: 'Phainon and Cyrene, again and again: tenderness on a world that keeps on ending.',
                            vi: 'Phainon và Cyrene, hết lần này đến lần khác: dịu dàng trên một thế giới cứ mãi đi tới hồi kết.' },
    'Genshin Impact':     { en: 'The courtroom of Fontaine and what is left after the verdict: Neuvillette and Furina.',
                            vi: 'Phiên toà Fontaine và những gì còn lại sau bản án: Neuvillette và Furina.' },
    'Spider-Verse':       { en: 'One nocturne across the multiverse: Miles and Gwen, counting the beat together.',
                            vi: 'Một khúc dạ khúc xuyên đa vũ trụ: Miles và Gwen, cùng đếm từng nhịp.' },
    'Others':             { en: 'Originals and strays: chessboards, letters, small rooms, music that belongs to no fandom.',
                            vi: 'Truyện gốc và những bản lạc loài: bàn cờ, thư từ, những căn phòng nhỏ, thứ nhạc không thuộc fandom nào.' }
  };
  let TAG = null, tagDangNap = false;          // TAG: bản đã lưu trên DB ({} nếu chưa có), null = chưa nạp
  function napTag() {
    if (TAG || tagDangNap || !window.fetchMovementNotes) return;
    tagDangNap = true;
    window.fetchMovementNotes().then(m => {
      tagDangNap = false;
      if (m === null) return;                  // không gọi được DB: dùng bản mặc định, lần dựng sau thử lại
      TAG = m;
      if (veGiuaHienTai) veGiuaHienTai();
    }).catch(() => { tagDangNap = false; });
  }
  function tagCua(f) {
    const e = TAG && TAG[f];
    if (e) return (laVi() ? (e.vi || e.en) : (e.en || e.vi)) || '';
    const d = TAG_MAC_DINH[f];
    return d ? (laVi() ? d.vi : d.en) : '';
  }

  // ---- Nhịp đọc ----
  const DAI = ['Miniature', 'Chamber', 'Symphonic'];
  const TEN_NHIP = { Miniature: 'Presto', Chamber: 'Andante', Symphonic: 'Largo' };
  function demNhip(ds) { const k = { Miniature: 0, Chamber: 0, Symphonic: 0 }; ds.forEach(w => { const d = doDai(w); if (d) k[d]++; }); return k; }
  function nhipChinh(ds) {
    const k = demNhip(ds), m = Math.max(k.Miniature, k.Chamber, k.Symphonic);
    if (!m) return '';                          // bản dự phòng fics.json không có số chữ
    return m === k.Chamber ? 'Andante' : m === k.Miniature ? 'Presto' : 'Largo';
  }
  // Icon nhạc cụ mờ làm nền thẻ: chỉ nghiêng với bộ dây kéo và bộ hơi (violin, viola, sáo, kèn). Phím đàn, piano,
  // hạc cầm, cello, bộ gõ, khoá nhạc… để thẳng (chủ repo chốt 18/10/2026; bản thiết kế nghiêng tất cả -14°).
  const NGHIENG = new Set(['violin', 'viola', 'flute', 'clarinet', 'trombone', 'tuba']);
  const coLoc = () => WS.len !== 'all' || !!WS.q.trim() || WS.ships.size > 0;
  const ngayCham = d => String(d).slice(0, 10).replace(/-/g, '.');

  // ---- Danh sách dài: chia trang, mỗi trang 6 thẻ ----
  // Bản thiết kế để mọi thẻ nối nhau (Figure Skating ~21 thẻ). Chủ repo đã so hai cách trên server cục bộ
  // và chốt chia trang (18/10/2026); cột movement và bàn xoay thì dính theo khi cuộn (CSS .sc-rail/.sc-tt).
  const MOI_TRANG = 6;
  const SC = { trang: 0, denChon: false, suaTag: null };
  window.scoreDenChon = () => { SC.denChon = true; };   // chonNgauNhien(): lật tới trang có truyện vừa chọn

  let veGiuaHienTai = null;
  window.veLaiScore = () => { if (window.laScorePC() && document.getElementById('dt-works')) window.renderScore(document.getElementById('dt-works')); };

  window.renderScore = function (goc) {
    napTag();
    const mvs = dsMovement();
    goc.textContent = '';
    if (!mvs.length) return;
    if (!mvs.includes(WS.mv)) { WS.mv = mvs[0]; WS.ships.clear(); }
    tuChuyenMv();

    const chip = (nhan, bat, fn) => dtEl('button', { type: 'button', class: 'sc-chip', 'aria-pressed': bat ? 'true' : 'false', onclick: fn }, nhan);

    // ---- Thanh trên: breadcrumb · tìm kiếm · thứ tự ----
    const tim = dtEl('input', { type: 'search', class: 'sc-search', placeholder: t('search_ph'), 'aria-label': t('search_ph'),
      oninput: e => { WS.q = e.target.value; locDoi(); } });
    tim.value = WS.q;
    const thuTu = dtEl('div', { class: 'sc-chips' });
    const veThuTu = () => {
      thuTu.textContent = '';
      ganCon(thuTu, [['new', 'dt_newest'], ['long', 'dt_longest']].map(([k, nhan]) => chip(t(nhan), WS.sort === k, () => {
        WS.sort = k; try { localStorage.setItem('sk-sort', k); } catch (e) {}
        SC.trang = 0; veThuTu(); veGiua(); })));
    };
    veThuTu();
    const tren = dtEl('div', { class: 'sc-top' },
      dtEl('span', { class: 'sc-lab' }, t('sc_crumb')),
      dtEl('div', { class: 'sc-top-r' }, tim, dtEl('span', { class: 'sc-lab sc-lab-o' }, t('dt_order')), thuTu));

    // ---- Đầu trang: "Score" · tổng · nhịp ----
    const nhip = dtEl('div', { class: 'sc-chips' });
    const veNhip = () => {
      nhip.textContent = '';
      ganCon(nhip, [['all', t('dt_any_len')]].concat(DAI.map(k => [k, TEN_NHIP[k]])).map(([k, nhan]) =>
        chip(nhan, WS.len === k, () => { WS.len = k; WS.via = null; veNhip(); locDoi(); })));
    };
    veNhip();
    const dau = dtEl('header', { class: 'sc-head' },
      dtEl('div', { class: 'sc-head-l' },
        dtEl('div', { class: 'sc-head-t' }, dtEl('div', { class: 'sc-lab sc-eyebrow' }, t('dt_works_h1')), dtEl('h1', null, t('sc_h1'))),
        dtEl('div', { class: 'sc-subh' }, t('sc_subh')),
        dtEl('div', { class: 'sc-lab' }, mvs.length + ' ' + t('sc_mov') + ' · ' + worksData.length + ' ' + t('sc_works'))),
      dtEl('div', { class: 'sc-head-r' }, dtEl('span', { class: 'sc-lab' }, t('dt_tempo')), nhip,
        dtEl('button', { type: 'button', class: 'sc-tp-btn', onclick: e => moTempo(e.currentTarget) },
          dtEl('span', { 'aria-hidden': 'true' }, '♩ '), t('dt_tp_btn'))));

    // ---- Thân: cột movement · movement đang mở · bàn xoay ----
    const rail = dtEl('nav', { class: 'sc-rail', 'aria-label': t('sc_subh') });
    const giua = dtEl('section', { class: 'sc-mv', 'aria-labelledby': 'sc-mv-h' });
    const aside = dtEl('aside', { class: 'sc-tt', 'aria-live': 'polite', 'aria-label': t('dt_on_tt') });

    function veRail() {
      rail.textContent = '';
      const loc = coLoc();
      mvs.forEach((f, i) => {
        const tat = worksData.filter(w => w.fandom === f), n = tat.length;
        const khop = loc ? tat.filter(khopLoc).length : n;
        const k = demNhip(tat), tong = k.Miniature + k.Chamber + k.Symphonic, chinh = nhipChinh(tat);
        const dong = [chinh ? t('sc_mostly') + ' ' + chinh : '',
          loc ? t('sc_of').replace('{a}', khop).replace('{b}', n) : n + ' ' + t(n === 1 ? 'sc_work' : 'sc_works')].filter(Boolean).join(' · ');
        rail.append(dtEl('button', { type: 'button', class: 'sc-rail-it' + (loc && !khop ? ' mo' : ''), 'aria-pressed': f === WS.mv ? 'true' : 'false',
            'aria-label': t('sc_movement') + ' ' + LA_MA(i + 1) + ': ' + tenMv(f) + ', ' + dong, onclick: () => chonMv(f) },
          dtEl('span', { class: 'r', 'aria-hidden': 'true' }, LA_MA(i + 1) + '.'),
          dtEl('span', { class: 'b', 'aria-hidden': 'true' },
            dtEl('span', { class: 'n' }, tenMv(f)),
            dtEl('span', { class: 'l' }, dong),
            tong ? dtEl('span', { class: 'bar' }, DAI.map((x, j) => dtEl('span', { class: 'p' + (j + 1), style: { width: (k[x] / tong * 100) + '%' } }))) : null)));
      });
      rail.append(dtEl('div', { class: 'sc-legend', 'aria-hidden': 'true' }, dtEl('span', { class: 'sc-lab' }, t('sc_legend')),
        dtEl('span', { class: 'k' }, DAI.map((x, j) => dtEl('span', null, dtEl('i', { class: 'p' + (j + 1) }), TEN_NHIP[x])))));
    }

    function biaThe(w) {
      const g = nhomCua(w);
      const b = dtEl('span', { class: 'sc-sl', style: mauBia(w) }, dtEl('span', { class: 'tab' }, tenNganNhom(g)));
      const ve = () => b.append(dtEl('span', { class: 'mid' }, dtIcon(iconCua(w)), dtEl('span', { class: 'nm' }, nhanNhom(g))));
      const url = String(w.cover || '').trim();
      if (/^https?:\/\//i.test(url)) {
        const img = dtEl('img', { src: url, alt: '', loading: 'lazy' });
        img.addEventListener('error', () => { img.remove(); ve(); });
        b.append(img);
      } else ve();
      if (coChuongMoi(w)) b.append(dtEl('span', { class: 'dia', title: t('dt_rb_new') }));
      return b;
    }
    function theScore(w) {
      const len = doDai(w), ships = (w.ships || []).filter(s => s !== 'Others'), tt = trangThai(w);
      const meta = [len ? TEN_NHIP[len] : '', phutDoc(w) ? '~' + phutDoc(w) + ' ' + t('sc_min') : '',
        w.words != null ? dtSo(w.words) + ' ' + t('dt_words') : '', w.nch ? w.nch + ' ' + t(w.nch === 1 ? 'sc_mvt' : 'sc_mvts') : ''].filter(Boolean).join(' · ');
      const ic = iconCua(w);
      return dtEl('button', { type: 'button', class: 'sc-card', 'data-idx': w.idx, 'aria-pressed': w.idx === WS.chon ? 'true' : 'false',
          'aria-label': w.title + (w.subtitle ? ': ' + chuTron(w.subtitle) : ''), onclick: () => chonTruyen(w) },
        dtEl('span', { class: 'sc-ghost' + (NGHIENG.has(ic) ? ' nghieng' : ''), 'aria-hidden': 'true' }, dtIcon(ic)),
        dtEl('span', { class: 'sc-ear', 'aria-hidden': 'true' }),
        biaThe(w),
        dtEl('span', { class: 'sc-txt' },
          dtEl('span', { class: 't' }, w.title, w.subtitle ? [dtEl('span', { class: 'c' }, ': '), dtEl('em', null, chuTron(w.subtitle))] : null),
          meta ? dtEl('span', { class: 'm' }, meta) : null,
          ships.length ? dtEl('span', { class: 's' }, ships.join(', ')) : null),
        dtEl('span', { class: 'sc-side' },
          w.date ? dtEl('span', { class: 'd' }, ngayCham(w.date)) : null,
          tt ? dtEl('span', { class: 'sc-st' + (w.complete ? ' done' : '') }, dtEl('span', { 'aria-hidden': 'true' }, w.complete ? '✓' : '◐'), tt) : null,
          coChuongMoi(w) ? dtEl('span', { class: 'sc-tag new' }, t('dt_rb_short')) : null,
          w.restricted ? dtEl('span', { class: 'sc-tag lock' }, t('only_member')) : null,
          w.warning ? dtEl('span', { class: 'sc-tag warn', title: w.warning }, t('dt_cw')) : null));
    }

    function veTag() {
      const f = WS.mv, txt = tagCua(f);
      if (SC.suaTag === f && window.skLaAdmin) return formTag(f);
      if (!txt && !window.skLaAdmin) return null;
      return dtEl('div', { class: 'sc-tagline-w' },
        txt ? dtEl('div', { class: 'sc-tagline' }, txt) : null,
        window.skLaAdmin ? dtEl('button', { type: 'button', class: 'sc-tag-edit', 'aria-label': t('sc_edit_tag'), title: t('sc_edit_tag'),
          onclick: () => { SC.suaTag = f; veGiua(); const o = giua.querySelector('.sc-tag-form input'); if (o) o.focus(); } }, '✎') : null);
    }
    function formTag(f) {
      const cu = (TAG && TAG[f]) || TAG_MAC_DINH[f] || { en: '', vi: '' };
      const en = dtEl('input', { type: 'text', class: 'sc-in', maxlength: '220', 'aria-label': 'Tagline EN' }); en.value = cu.en || '';
      const vi = dtEl('input', { type: 'text', class: 'sc-in', maxlength: '220', 'aria-label': 'Tagline VI' }); vi.value = cu.vi || '';
      const bao = dtEl('span', { class: 'sc-msg', role: 'status' });
      const luu = dtEl('button', { type: 'button', class: 'sc-chip', 'aria-pressed': 'true' }, t('sc_save'));
      luu.addEventListener('click', async () => {
        luu.disabled = true; bao.textContent = t('sc_saving');
        const moi = Object.assign({}, TAG || {}, { [f]: { en: en.value.trim(), vi: vi.value.trim() } });
        const r = window.saveMovementNotes ? await window.saveMovementNotes(moi) : { error: { message: 'offline' } };
        luu.disabled = false;
        if (r.error) { bao.textContent = t('sc_save_err'); return; }
        TAG = moi; SC.suaTag = null; veGiua();
      });
      return dtEl('div', { class: 'sc-tag-form' },
        dtEl('label', null, dtEl('span', { class: 'sc-lab' }, 'EN'), en),
        dtEl('label', null, dtEl('span', { class: 'sc-lab' }, 'VI'), vi),
        dtEl('div', { class: 'sc-tag-acts' }, luu,
          dtEl('button', { type: 'button', class: 'sc-chip', onclick: () => { SC.suaTag = null; veGiua(); } }, t('sc_cancel')),
          dtEl('span', { class: 'sc-hint' }, t('sc_tag_hint')), bao));
    }

    function veGiua() {
      giua.textContent = '';
      const i = mvs.indexOf(WS.mv), tat = worksData.filter(w => w.fandom === WS.mv);
      const ds = sapXepWorks(tat.filter(khopLoc));
      if (!ds.some(w => w.idx === WS.chon)) {
        // Truyện đang trên bàn xoay không còn trong danh sách → lấy truyện đầu danh sách. Bộ lọc làm danh sách
        // rỗng thì giữ truyện cũ nếu nó thuộc movement này, không thì lấy truyện đầu của cả movement.
        const cuConO = worksData.some(w => w.idx === WS.chon && w.fandom === WS.mv);
        const d0 = ds[0] || (cuConO ? null : sapXepWorks(tat.slice())[0]);
        if (d0) WS.chon = d0.idx;
      }
      const chinh = nhipChinh(tat);
      const ngay = tat.map(w => w.date).filter(Boolean).map(d => String(d).slice(0, 7)).sort();
      const thang = d => d.replace('-', '.');
      const khoang = ngay.length ? thang(ngay[0]) + (ngay[0] !== ngay[ngay.length - 1] ? ' – ' + thang(ngay[ngay.length - 1]) : '') : '';
      const tongChu = tat.reduce((a, w) => a + (w.words || 0), 0);
      const ships = [...new Set(tat.flatMap(w => w.ships || []))].filter(s => s !== 'Others').sort(soTuNhien);
      [...WS.ships].forEach(s => { if (!ships.includes(s)) ships.push(s); });

      const soTrang = Math.max(1, Math.ceil(ds.length / MOI_TRANG));
      if (SC.denChon) { const vt = ds.findIndex(w => w.idx === WS.chon); if (vt >= 0) SC.trang = Math.floor(vt / MOI_TRANG); }
      SC.denChon = false;
      SC.trang = Math.min(Math.max(0, SC.trang), soTrang - 1);
      const hien = ds.slice(SC.trang * MOI_TRANG, (SC.trang + 1) * MOI_TRANG);

      ganCon(giua,
        dtEl('div', { class: 'sc-wm', 'aria-hidden': 'true' }, LA_MA(i + 1)),
        dtEl('div', { class: 'sc-mv-head' },
          dtEl('div', { class: 'sc-mv-eyebrow' }, dtEl('span', null, t('sc_movement') + ' ' + LA_MA(i + 1)),
            chinh ? dtEl('span', { class: 'sc-badge' }, t('sc_mostly') + ' ' + chinh) : null),
          dtEl('h2', { id: 'sc-mv-h' }, tenMv(WS.mv)),
          veTag(),
          dtEl('div', { class: 'sc-stats' },
            dtEl('span', null, tat.length + ' ' + t(tat.length === 1 ? 'sc_work' : 'sc_works')),
            tongChu ? dtEl('span', null, dtSo(tongChu) + ' ' + t('dt_words')) : null,
            khoang ? dtEl('span', null, khoang) : null)),
        ships.length > 1 || WS.ships.size ? dtEl('div', { class: 'sc-ships' }, dtEl('span', { class: 'sc-lab' }, t('dt_pairing')),
          ships.map(s => chip(s, WS.ships.has(s), () => { WS.ships.has(s) ? WS.ships.delete(s) : WS.ships.add(s); SC.trang = 0; veRail(); veGiua(); veAside(); }))) : null,
        ds.length ? null : dtEl('p', { class: 'sc-empty' }, t('sc_empty_mv')),
        hien.length ? dtEl('ol', { class: 'sc-list' }, hien.map(w => dtEl('li', null, theScore(w)))) : null,
        soTrang > 1 ? veTrang(soTrang) : null);
    }
    veGiuaHienTai = () => { if (giua.isConnected) veGiua(); };

    function veTrang(n) {
      const den = i => () => { SC.trang = i; veGiua(); cuonLenDau(); };
      const muiTen = (nhan, i, tat, aria) => dtEl('button', { type: 'button', class: 'sc-pg', disabled: tat, 'aria-label': aria, onclick: den(i) }, nhan);
      return dtEl('nav', { class: 'sc-pager', 'aria-label': t('sc_pages') },
        muiTen('‹', SC.trang - 1, SC.trang === 0, t('sc_prev')),
        Array.from({ length: n }, (_, i) => dtEl('button', { type: 'button', class: 'sc-pg' + (i === SC.trang ? ' on' : ''),
          'aria-label': t('sc_page_n').replace('{n}', i + 1), 'aria-current': i === SC.trang ? 'page' : null, onclick: den(i) }, String(i + 1))),
        muiTen('›', SC.trang + 1, SC.trang === n - 1, t('sc_next')),
        dtEl('span', { class: 'sc-lab' }, t('sc_page_of').replace('{a}', SC.trang + 1).replace('{b}', n)));
    }

    function veAside() {
      aside.textContent = '';
      const w = worksData.find(x => x.idx === WS.chon);
      if (!w) return;
      const L = dtLiner(w, 204, { via: true });
      const h = L.querySelector('h2'), i = mvs.indexOf(w.fandom);
      if (h && i >= 0) h.parentNode.prepend(dtEl('div', { class: 'sc-lab sc-mvtag' }, t('sc_movement') + ' ' + LA_MA(i + 1) + ' · ' + tenMv(w.fandom)));
      aside.append(dtEl('div', { class: 'sc-lab sc-tt-lab' }, t('dt_on_tt')), L);
    }

    function chonTruyen(w) {
      if (WS.viaIdx !== w.idx) WS.via = null;     // tự chọn truyện khác thì hết là "chọn cho bạn"
      WS.chon = w.idx;
      giua.querySelectorAll('.sc-card').forEach(c => c.setAttribute('aria-pressed', Number(c.dataset.idx) === w.idx ? 'true' : 'false'));
      veAside();
    }
    function chonMv(f) {
      if (f === WS.mv) return;
      WS.mv = f; WS.ships.clear(); WS.chon = null; SC.trang = 0; SC.suaTag = null;
      veRail(); veGiua(); veAside(); cuonLenDau();
    }
    // Đang cuộn sâu trong danh sách dài mà đổi movement/lật trang: đưa đầu movement về ngay dưới thanh nav.
    function cuonLenDau() {
      const nav = document.querySelector('nav');
      const cao = nav ? nav.getBoundingClientRect().height : 0;
      const y = giua.getBoundingClientRect().top + window.scrollY - cao - 8;
      if (window.scrollY > y) window.scrollTo({ top: y });
    }
    // Đổi bộ lọc (tìm, nhịp): movement đang mở hết truyện khớp mà movement khác còn → tự chuyển sang đó.
    function locDoi() { SC.trang = 0; tuChuyenMv(); veRail(); veGiua(); veAside(); }
    function tuChuyenMv() {
      if (!coLoc()) return;
      const coKhop = f => worksData.some(w => w.fandom === f && khopLoc(w));
      if (coKhop(WS.mv)) return;
      const ships = new Set(WS.ships);
      WS.ships.clear();                         // ship là của movement cũ
      const khac = mvs.find(coKhop);
      if (khac) { WS.mv = khac; WS.chon = null; } else ships.forEach(s => WS.ships.add(s));
    }

    veRail(); veGiua(); veAside();
    goc.append(dtEl('main', { class: 'sc' }, tren, dau,
      dtEl('div', { class: 'sc-body' },
        dtEl('div', { class: 'sc-col sc-col-l' }, rail), giua, dtEl('div', { class: 'sc-col sc-col-r' }, aside))));
  };
})();
