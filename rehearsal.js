/* Trang "In rehearsal — the composer's desk": danh sách truyện đang viết (chỉ tên/ý tưởng, không có nội dung).
   Nạp sau app.js, dùng hàm toàn cục của nó (dtEl, dtIcon, ganCon, t, NHOM, ICON_NHOM, MAU_BIA, tenNganNhom, tenDuNhom,
   worksData, dtNgay). Dữ liệu nằm ở site_content khoá 'rehearsal' = { items: [...] }, đọc/ghi qua
   window.fetchRehearsal / window.saveRehearsal do accounts.js gắn lên. Chỉ admin thấy nút Edit; quyền ghi thật do RLS chặn ở DB.
   Chữ do chủ web nhập (tên, tên làm việc, dòng giới thiệu, fandom) hiển thị nguyên văn, KHÔNG dịch. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const GIAI_DOAN = [
    { n: 1, ten: 'rh_s1', mo: 'rh_d1' }, { n: 2, ten: 'rh_s2', mo: 'rh_d2' },
    { n: 3, ten: 'rh_s3', mo: 'rh_d3' }, { n: 4, ten: 'rh_s4', mo: 'rh_d4' }
  ];
  const LA_MA = ['I', 'II', 'III', 'IV'];
  const RH = { items: null, loi: false, stage: 0, sua: false, ban: [], thongBao: null };

  const cat = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  function chuanHoa(ds) {
    return (Array.isArray(ds) ? ds : []).filter(x => x && typeof x === 'object').map((x, i) => ({
      id: cat(x.id, 60) || 'r' + i + '-' + Date.now(),
      form: cat(x.form, 80), title: cat(x.title, 120), working: cat(x.working, 120), hook: cat(x.hook, 240),
      fandom: cat(x.fandom, 60),
      stage: Math.min(4, Math.max(1, parseInt(x.stage, 10) || 1)),
      premiere: /^\d{4}-\d{2}-\d{2}$/.test(String(x.premiere || '')) ? x.premiere : ''
    }));
  }
  const moiId = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'r' + Date.now() + Math.random().toString(16).slice(2, 6);
  const nhomCuaForm = slug => slug && typeof NHOM !== 'undefined' ? NHOM.find(g => g.slug === slug) : null;
  const iconCuaForm = slug => { const g = nhomCuaForm(slug); return g ? g.icon : ((typeof ICON_NHOM !== 'undefined' && ICON_NHOM[slug]) || 'g-clef'); };
  const tenForm = slug => { const g = nhomCuaForm(slug); return g ? tenNganNhom(g) : ''; };
  const sxep = ds => ds.map((x, i) => [x, i]).sort((a, b) => (b[0].stage - a[0].stage) || (a[1] - b[1])).map(p => p[0]);

  // ---- khuông nhạc: 5 dòng kẻ, khoá Sol, 4 ô nhịp, mỗi ô hai nốt; ô nào đã qua thì nốt đặc ----
  const NOTE = [[106, 18, 94, 43], [164, 10, 152, 35], [245, 2, 233, 27], [303, 12, 291, 37],
                [384, 22, 372, 47], [442, 8, 430, 33], [523, -2, 511, 23], [581, 6, 569, 31]];   // [thân x, y, đầu x, y]
  function khuong(stage) {
    const s = document.createElementNS(NS, 'svg');
    [['class', 'dt-rh-staff'], ['viewBox', '0 -6 660 86'], ['aria-hidden', 'true'], ['focusable', 'false']].forEach(([k, v]) => s.setAttribute(k, v));
    const them = (tag, at, st) => { const e = document.createElementNS(NS, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); if (st) e.setAttribute('style', st); s.append(e); return e; };
    [14, 26, 38, 50, 62].forEach(y => them('line', { x1: 0, y1: y, x2: 660, y2: y, stroke: '#2C2318', 'stroke-width': 1 }));
    them('use', { href: '#ic-g-clef', x: 0, y: 2, width: 66, height: 66 }, 'color:#2C2318;fill:#2C2318');
    [64, 203, 342, 481, 620].forEach(x => them('rect', { x, y: 14, width: 1.5, height: 49, fill: '#2C2318' }));
    them('rect', { x: 626, y: 14, width: 5, height: 49, fill: stage === 4 ? '#B8972A' : '#2C2318' });
    NOTE.forEach(([sx, sy, hx, hy], i) => {
      const dam = Math.floor(i / 2) < stage;
      them('rect', { x: sx, y: sy, width: 1.5, height: 30, fill: dam ? '#2C2318' : '#C9B98C' });
      them('ellipse', { cx: hx + 7, cy: hy + 5, rx: 6.3, ry: 4.3, transform: 'rotate(-20 ' + (hx + 7) + ' ' + (hy + 5) + ')',
        fill: dam ? '#2C2318' : 'transparent', stroke: dam ? '#2C2318' : '#B9A878', 'stroke-width': 1.5 });
    });
    return s;
  }

  function hang(it) {
    const gd = GIAI_DOAN[it.stage - 1];
    const ten = tenForm(it.form);
    return dtEl('li', { class: 'dt-rh-row' },
      dtEl('div', { class: 'dt-rh-form' }, dtIcon(iconCuaForm(it.form)),
        dtEl('div', null, ten ? dtEl('span', { class: 'f' }, ten) : null,
          dtEl('span', { class: 'st' }, LA_MA[it.stage - 1] + '. ' + t(gd.ten)))),
      khuong(it.stage),
      dtEl('div', { class: 'dt-rh-text' },
        dtEl('div', { class: 't' }, it.title || (ten || '…')),
        it.working ? dtEl('div', { class: 'w' }, it.working) : null,
        it.hook ? dtEl('div', { class: 'h' }, it.hook) : null,
        it.fandom ? dtEl('div', { class: 'fd' }, it.fandom) : null));
  }

  // Buổi ra mắt gần nhất: trong các mục giai đoạn IV, ưu tiên mục có ngày sớm nhất từ hôm nay trở đi.
  function tieuDiem(ds) {
    const iv = ds.filter(x => x.stage === 4);
    if (!iv.length) return null;
    const homNay = new Date().toISOString().slice(0, 10);
    const cod = iv.filter(x => x.premiere).sort((a, b) => a.premiere.localeCompare(b.premiere));
    return cod.find(x => x.premiere >= homNay) || cod[cod.length - 1] || iv[0];
  }

  // ---- bộ soạn (chỉ admin) ----
  function truong(nhan, node) { return dtEl('label', { class: 'dt-rh-fld' }, dtEl('span', null, nhan), node); }
  function soan(root) {
    const ban = RH.ban;
    const ed = dtEl('section', { class: 'dt-rh-ed', 'aria-label': t('rh_edit') });
    const loi = dtEl('div', { class: 'auth-msg', id: 'rh-msg', role: 'status' });
    if (RH.thongBao) { loi.className = 'auth-msg show err'; loi.textContent = RH.thongBao; }
    const ds = dtEl('div', { class: 'dt-rh-eds' });
    const lamLai = () => { RH.thongBao = null; renderRehearsal(); };
    const dsFandom = [...new Set([...Object.keys(typeof MAU_BIA !== 'undefined' ? MAU_BIA : {}),
      ...(typeof worksData !== 'undefined' ? worksData.map(w => w.fandom).filter(Boolean) : [])])];
    const dl = dtEl('datalist', { id: 'rh-fandoms' }, dsFandom.map(f => dtEl('option', { value: f })));

    ban.forEach((it, i) => {
      const inp = (k, ml, ph, kieu) => { const e = dtEl('input', { type: kieu || 'text', maxlength: ml, placeholder: ph || '' }); e.value = it[k]; e.addEventListener('input', () => { it[k] = e.value; }); return e; };
      const chonForm = dtEl('select', null, dtEl('option', { value: '' }, '—'),
        (typeof NHOM !== 'undefined' ? NHOM : []).map(g => dtEl('option', { value: g.slug }, tenDuNhom(g))));
      chonForm.value = it.form; chonForm.addEventListener('change', () => { it.form = chonForm.value; });
      const chonGd = dtEl('select', null, GIAI_DOAN.map(g => dtEl('option', { value: g.n }, LA_MA[g.n - 1] + '. ' + t(g.ten))));
      chonGd.value = String(it.stage); chonGd.addEventListener('change', () => { it.stage = parseInt(chonGd.value, 10); });
      const fd = inp('fandom', 60, 'Fandom'); fd.setAttribute('list', 'rh-fandoms');
      const nut = (nhan, aria, fn, dis) => { const b = dtEl('button', { type: 'button', class: 'dt-rh-mini', 'aria-label': aria, onclick: fn }, nhan); if (dis) b.disabled = true; return b; };
      ds.append(dtEl('div', { class: 'dt-rh-ed-row' },
        dtEl('div', { class: 'dt-rh-ed-grid' },
          truong(t('rh_f_form'), chonForm), truong(t('rh_f_title'), inp('title', 120, 'Nocturne in C sharp minor')),
          truong(t('rh_f_working'), inp('working', 120)), truong(t('rh_f_stage'), chonGd),
          truong(t('rh_f_hook'), inp('hook', 240)), truong(t('rh_f_fandom'), fd),
          truong(t('rh_f_premiere'), inp('premiere', 10, '', 'date'))),
        dtEl('div', { class: 'dt-rh-ed-btns' },
          nut('↑', t('rh_up'), () => { [ban[i - 1], ban[i]] = [ban[i], ban[i - 1]]; lamLai(); }, i === 0),
          nut('↓', t('rh_down'), () => { [ban[i + 1], ban[i]] = [ban[i], ban[i + 1]]; lamLai(); }, i === ban.length - 1),
          nut('×', t('rh_del'), () => { ban.splice(i, 1); lamLai(); }))));
    });

    const luu = dtEl('button', { type: 'button', class: 'dt-btn', onclick: async e => {
      const b = e.currentTarget;
      const sach = chuanHoa(ban);
      if (sach.some(x => !x.title)) { RH.thongBao = t('rh_need_title'); renderRehearsal(); return; }
      b.disabled = true; b.textContent = t('rh_saving');
      const r = window.saveRehearsal ? await window.saveRehearsal(sach) : { error: { message: 'offline' } };
      if (r.error) { RH.thongBao = r.error.message === 'signin' ? t('prof_need_signin') : String(r.error.message || t('wa_err')); renderRehearsal(); return; }
      RH.items = sach; RH.sua = false; RH.thongBao = null; renderRehearsal();
    } }, t('rh_save'));
    const huy = dtEl('button', { type: 'button', class: 'dt-btn-line', onclick: () => { RH.sua = false; RH.thongBao = null; renderRehearsal(); } }, t('rh_cancel'));
    const them = dtEl('button', { type: 'button', class: 'dt-btn-line', onclick: () => {
      ban.push({ id: moiId(), form: '', title: '', working: '', hook: '', fandom: '', stage: 1, premiere: '' }); RH.thongBao = null; renderRehearsal();
    } }, '+ ' + t('rh_add'));
    ed.append(dtEl('div', { class: 'dt-rh-ed-h' }, t('rh_edit')), loi, dl, ds, dtEl('div', { class: 'dt-rh-ed-act' }, them, dtEl('span', { class: 'sp' }), huy, luu));
    root.append(ed);
  }

  window.renderRehearsal = function renderRehearsal() {
    const goc = document.getElementById('dt-rehearsal');
    if (!goc) return;
    goc.textContent = '';
    if (RH.items === null) return;
    const ds = RH.items;
    const admin = !!window.skLaAdmin;
    if (RH.sua && !admin) RH.sua = false;
    const loc = sxep(ds).filter(x => RH.stage === 0 || x.stage === RH.stage);

    const chips = [{ n: 0, ten: t('rh_all') }].concat(GIAI_DOAN.map(g => ({ n: g.n, ten: t(g.ten) }))).map(g => {
      const so = g.n === 0 ? ds.length : ds.filter(x => x.stage === g.n).length;
      return dtEl('button', { type: 'button', class: 'dt-chip', 'aria-pressed': RH.stage === g.n ? 'true' : 'false',
        onclick: () => { RH.stage = g.n; renderRehearsal(); } }, g.ten, dtEl('small', null, so));
    });

    const td = tieuDiem(ds);
    const hero = td ? dtEl('div', { class: 'dt-rh-hero' }, dtIcon(iconCuaForm(td.form)),
      dtEl('div', { class: 'mid' },
        dtEl('div', { class: 'k' }, t('rh_next') + (td.premiere ? '  ·  ' + dtNgay(td.premiere) : '')),
        dtEl('div', { class: 'tt' }, td.title, td.working ? dtEl('span', null, '  ' + td.working) : null)),
      td.hook ? dtEl('div', { class: 'tz' }, td.hook) : null) : null;

    const dau = dtEl('div', { class: 'dt-rh-stagehead' },
      dtEl('span', { class: 'lb' }, t('rh_work')),
      dtEl('div', { class: 'stg' }, GIAI_DOAN.map(g => dtEl('div', { class: 'gd', style: { left: (64 + (g.n - 1) * 139) / 660 * 100 + '%' } },
        dtEl('span', { class: 'r' }, LA_MA[g.n - 1] + '.'), dtEl('span', { class: 'n' }, t(g.ten)), dtEl('span', { class: 'd' }, t(g.mo))))),
      dtEl('span', { class: 'lb' }, t('rh_title_teaser')));

    const giay = dtEl('section', { class: 'dt-rh-paper' },
      dtEl('div', { class: 'dt-rh-bar' }, dtEl('span', null, t('rh_manu')), dtEl('span', { class: 'i' }, 'Allegro non troppo, ma già in prova')),
      RH.sua ? null : hero,
      RH.sua ? null : dau,
      RH.sua ? null : (loc.length ? dtEl('ol', { class: 'dt-rh-list' }, loc.map(hang))
        : dtEl('p', { class: 'dt-rh-empty' }, ds.length ? t('rh_none_stage') : (RH.loi ? t('rh_err') : t('rh_none')))),
      RH.sua ? null : dtEl('div', { class: 'dt-rh-note' }, t('rh_note')));
    if (RH.sua) soan(giay);

    const but = admin && !RH.sua ? dtEl('button', { type: 'button', class: 'dt-btn-line dt-rh-editbtn', onclick: () => {
      RH.ban = ds.map(x => Object.assign({}, x)); RH.sua = true; RH.thongBao = null; renderRehearsal(); } }, '✎ ' + t('rh_edit')) : null;

    const pencil = document.createElementNS(NS, 'svg');
    [['class', 'dt-rh-pencil'], ['width', 270], ['height', 44], ['viewBox', '0 0 270 44'], ['aria-hidden', 'true']].forEach(([k, v]) => pencil.setAttribute(k, v));
    [['polygon', { points: '0,22 34,8 34,36', fill: '#E8C98B' }], ['polygon', { points: '0,22 11,18 11,26', fill: '#2C2318' }],
     ['rect', { x: 34, y: 8, width: 180, height: 28, fill: '#B8972A' }], ['rect', { x: 34, y: 8, width: 180, height: 7, fill: '#D9BE68' }],
     ['rect', { x: 214, y: 8, width: 16, height: 28, fill: '#8A8A86' }], ['rect', { x: 230, y: 8, width: 26, height: 28, rx: 5, fill: '#5A2320' }]]
      .forEach(([tag, at]) => { const e = document.createElementNS(NS, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); pencil.append(e); });
    giay.append(pencil);

    goc.append(dtEl('main', { class: 'dt-rh' },
      dtEl('header', { class: 'dt-rh-head' },
        dtEl('div', null, dtEl('div', { class: 'dt-rh-eyebrow' }, t('rh_eyebrow').replace('{n}', ds.length)),
          dtEl('h1', null, t('rh_h1'))),
        dtEl('div', { class: 'r' }, dtEl('p', null, t('rh_intro')), but)),
      RH.sua ? null : dtEl('div', { class: 'dt-rh-chips' }, chips),
      giay));
  };
  window.veLaiRehearsal = () => { if (RH.items !== null) window.renderRehearsal(); };

  window.loadRehearsal = async function () {
    let r = null;
    if (window.fetchRehearsal) r = await window.fetchRehearsal();
    RH.loi = r === null;
    RH.items = chuanHoa(r || []);
    RH.stage = 0;
    window.renderRehearsal();
  };
})();
