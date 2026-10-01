// =============================================
// NOTES · công cụ viết note (chỉ admin)
// Script cổ điển, nạp sau notes.js. Giao diện ở đây; các hàm chạm DB (fetchNotesAdmin, saveNote,
// deleteNote, setNoteSlot, fetchTrackChoices, noteSlug) do module accounts.js cấp qua window.*.
// Quyền ghi thật do RLS giữ (is_admin()) — kiểm window.skLaAdmin ở đây chỉ để khỏi hiện form vô ích.
// Mọi thứ dựng bằng createElement / textContent / .value, không innerHTML.
// =============================================
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const A = { notes: [], tracks: null, edit: null, busy: false, loadErr: false };
  const SRC = ['github', 'musopen', 'archive', 'soundcloud'];
  const E = (tag, cls, ...con) => ganCon(dtEl(tag, cls ? { class: cls } : null), ...con);

  const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  // "1:36", "1:02:03" hoặc "96" → giây; sai khuôn thì null.
  function parseGio(v) {
    v = String(v || '').trim(); if (!v) return null;
    if (/^\d+$/.test(v)) return parseInt(v, 10);
    const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(v);
    return m ? (parseInt(m[1] || 0, 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10)) : null;
  }
  // Nguồn suy ra từ link — để người viết khỏi chọn nhầm nguồn so với link đã dán.
  function doiNguon(u) {
    let h; try { const x = new URL(u); if (x.protocol !== 'https:') return null; h = x.hostname; } catch (_) { return null; }
    if (h === 'github.com' || h.endsWith('.githubusercontent.com')) return 'github';
    if (h === 'dl.musopen.org' || h.endsWith('musopen.org')) return 'musopen';
    if (h === 'archive.org' || h.endsWith('.archive.org')) return 'archive';
    if (h === 'soundcloud.com' || h.endsWith('.soundcloud.com')) return 'soundcloud';
    return null;
  }
  function noi(key, loi) {
    const m = $('nta-msg'); if (!m) return;
    if (!key) { m.className = 'auth-msg'; m.textContent = ''; return; }
    m.className = 'auth-msg show ' + (loi ? 'err' : 'ok');
    m.textContent = typeof key === 'string' && key.indexOf('nta_') === 0 ? t(key) : String(key);
    m.scrollIntoView({ block: 'nearest' });
  }
  const loiDB = e => {
    const c = e && e.code, ms = String((e && e.message) || '');
    if (c === '23505' && /slot|programme/i.test(ms)) return t('nta_err_slot');
    if (c === '23505') return t('nta_err_dup');
    if (c === '23514') return t('nta_err_check') + ' (' + ms + ')';
    if (c === '42501' || ms === 'forbidden') return t('nta_err_forbidden');
    return t('nta_err_generic') + (ms ? ' (' + ms + ')' : '');
  };

  async function nap() {
    A.loadErr = false;
    const ds = window.fetchNotesAdmin ? await window.fetchNotesAdmin() : null;
    if (!ds) { A.loadErr = true; A.notes = []; } else A.notes = ds;
  }
  const ngayUp = () => { if (window.ntInvalidar) window.ntInvalidar(); };   // trang Notes nạp lại lần sau

  // ---------- danh sách (bàn làm việc) ----------
  function veDanhSach() {
    const root = $('nta-root'); root.textContent = '';
    if (!window.skLaAdmin) { root.append(E('p', 'nta-hint', t('nta_not_admin'))); return; }
    if (A.loadErr) { root.append(E('p', 'nta-hint', t('nta_load_err'))); return; }
    const tren = A.notes.filter(n => n.programme_slot);
    const bar = E('div', 'nta-bar',
      dtEl('button', { type: 'button', class: 'ao3-link', onclick: () => moForm(null) }, t('nta_new')),
      dtEl('button', { type: 'button', class: 'mini-btn', onclick: () => showPage('notes', document.querySelector('.nav-links a[data-page="notes"]')) }, t('nta_back_room')),
      E('span', 'nta-count', t('nta_on_table').replace('{n}', tren.length)));
    root.append(bar);
    if (!A.notes.length) { root.append(E('p', 'nta-hint', t('nta_none'))); return; }
    const ds = E('div', 'nta-list');
    A.notes.forEach(n => {
      const ra = n.status === 'published';
      const sel = dtEl('select', { 'aria-label': t('nta_slot') });
      const op = (v, tx) => { const o = dtEl('option', { value: v }, tx); if (String(n.programme_slot || '') === String(v)) o.selected = true; return o; };
      sel.append(op('', t('nta_off_table'))); [1, 2, 3, 4].forEach(i => sel.append(op(i, t('nta_slot') + ' ' + i)));
      if (!ra) sel.disabled = true;
      sel.addEventListener('change', () => datSlot(n, sel.value ? parseInt(sel.value, 10) : null, sel));
      ds.append(E('div', 'nta-row' + (n.programme_slot ? ' on' : ''),
        E('div', 'nta-t', E('b', null, n.piece), E('small', null, n.composer + ' · ' + (n.title || ''))),
        E('span', 'nta-st ' + (ra ? 'pub' : 'dr'), t(ra ? 'nta_published' : 'nta_draft')),
        sel,
        dtEl('button', { type: 'button', class: 'mini-btn', onclick: () => moForm(n.id) }, t('nta_edit'))));
    });
    root.append(ds, E('p', 'nta-hint', t('nta_hint_slot')));
  }
  async function datSlot(n, slot, sel) {
    if (A.busy) return; A.busy = true; noi(null);
    const chiem = slot ? A.notes.find(x => x.programme_slot === slot && x.id !== n.id) : null;
    if (chiem && !confirm(t('nta_swap_ask').replace('{a}', chiem.piece).replace('{n}', slot))) { A.busy = false; veDanhSach(); return; }
    const r = await window.setNoteSlot(n.id, slot, chiem && chiem.id);
    A.busy = false;
    if (r.error) { noi(loiDB(r.error), true); veDanhSach(); return; }
    await nap(); ngayUp(); veDanhSach(); noi('nta_saved', false);
  }

  // ---------- form soạn ----------
  function field(label, ...con) { return E('div', 'field', dtEl('label', null, label), ...con); }
  const input = (id, v, o) => dtEl('input', Object.assign({ type: 'text', value: v == null ? '' : v }, id ? { id } : {}, o || {}));

  async function moForm(id) {
    noi(null);
    if (!A.tracks && window.fetchTrackChoices) A.tracks = await window.fetchTrackChoices();
    const n = id ? A.notes.find(x => x.id === id) : null;
    A.edit = n ? JSON.parse(JSON.stringify(n)) : { id: null, slug: null, title: '', piece: '', composer: '', opus: '', short_name: '', source: 'github', url: '', start_s: 0,
      icon: 'note', sleeve: '#2B3350', body: '', quote: '', cues: [], language: 'en', status: 'draft', programme_slot: null, note_works: [] };
    veForm();
    window.scrollTo(0, 0);
  }

  function veForm() {
    const root = $('nta-root'); root.textContent = '';
    const n = A.edit, F = {};
    // -- bản nhạc --
    F.piece = input('nta-piece', n.piece, { maxlength: 200 });
    F.composer = input('nta-composer', n.composer, { maxlength: 120 });
    F.opus = input('nta-opus', n.opus, { maxlength: 40 });
    F.short = input('nta-short', n.short_name, { maxlength: 30 });
    F.title = input('nta-title', n.title, { maxlength: 200 });
    F.lang = dtEl('select', { id: 'nta-lang' }); [['en', 'English'], ['vi', 'Tiếng Việt']].forEach(([v, x]) => { const o = dtEl('option', { value: v }, x); if (n.language === v) o.selected = true; F.lang.append(o); });
    // -- nhạc --
    F.url = input('nta-url', n.url, { maxlength: 1000, placeholder: 'https://…' });
    F.src = dtEl('select', { id: 'nta-src', disabled: true }); SRC.forEach(v => { const o = dtEl('option', { value: v }, v); if (n.source === v) o.selected = true; F.src.append(o); });
    F.start = input('nta-start', n.start_s ? fmt(n.start_s) : '', { placeholder: '0:00' });
    F.url.addEventListener('input', () => { const s = doiNguon(F.url.value.trim()); if (s) F.src.value = s; });
    const pick = dtEl('select', { 'aria-label': t('nta_pick_track') });
    pick.append(dtEl('option', { value: '' }, t('nta_pick_track')));
    (A.tracks || []).forEach((x, i) => pick.append(dtEl('option', { value: i }, (x.name || x.url.split('/').pop().slice(0, 60)) + ' — ' + x.source)));
    pick.addEventListener('change', () => {
      const x = (A.tracks || [])[pick.value]; if (!x) return;
      F.url.value = x.url; F.src.value = SRC.includes(x.source) ? x.source : doiNguon(x.url) || 'github';
      F.start.value = x.start ? fmt(x.start) : '';
      if (!F.piece.value && x.name) F.piece.value = x.name;
    });
    // -- bìa --
    const icons = [...document.querySelectorAll('symbol[id^="ic-"]')].map(s => s.id.slice(3)).sort();
    F.icon = dtEl('select', { id: 'nta-icon' }); icons.forEach(v => { const o = dtEl('option', { value: v }, v); if (n.icon === v) o.selected = true; F.icon.append(o); });
    F.sleeve = dtEl('input', { type: 'color', id: 'nta-sleeve', value: /^#[0-9a-f]{6}$/i.test(n.sleeve) ? n.sleeve : '#2B3350' });
    const xem = E('span', 'nta-sleeve'); const kx = () => { xem.textContent = ''; xem.style.background = F.sleeve.value; xem.append(dtIcon(F.icon.value)); };
    F.icon.addEventListener('change', kx); F.sleeve.addEventListener('input', kx); kx();
    // -- chữ --
    F.body = dtEl('textarea', { id: 'nta-body', rows: 9, maxlength: 20000 }); F.body.value = n.body || '';
    F.quote = dtEl('textarea', { id: 'nta-quote', rows: 2, maxlength: 500 }); F.quote.value = n.quote || '';
    // -- cue --
    const cueBox = E('div', 'nta-cues');
    const themCue = (c) => {
      const tg = input('', c ? fmt(c.t) : '', { placeholder: '0:00', maxlength: 8, 'aria-label': t('nta_cue_time') });
      const tx = input('', c ? c.text : '', { maxlength: 300, placeholder: t('nta_cue_text') });
      const row = E('div', 'nta-cue', tg, tx, dtEl('button', { type: 'button', class: 'mini-btn danger', onclick: () => { row.remove(); kCue(); } }, '×'));
      row._tg = tg; row._tx = tx; cueBox.append(row); kCue();
    };
    const nutCue = dtEl('button', { type: 'button', class: 'mini-btn', onclick: () => themCue(null) }, t('nta_add_cue'));
    const kCue = () => { nutCue.disabled = cueBox.children.length >= 12; };
    (n.cues || []).forEach(themCue);
    // -- fic liên quan --
    const wk = (typeof worksData !== 'undefined' ? worksData : []).filter(w => w.uuid).slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    const co = new Set((n.note_works || []).map(x => x.work_id));
    const wkBox = E('div', 'nta-works');
    wk.forEach(w => {
      const cb = dtEl('input', { type: 'checkbox', value: w.uuid }); cb.checked = co.has(w.uuid);
      wkBox.append(E('label', null, cb, ' ' + w.title + (w.subtitle ? ' — ' + chuTron(w.subtitle) : '')));
    });
    const loc = dtEl('input', { type: 'search', class: 'nta-filter', placeholder: t('nta_filter_works'), 'aria-label': t('nta_filter_works') });
    loc.addEventListener('input', () => { const q = loc.value.trim().toLowerCase(); [...wkBox.children].forEach(l => { l.style.display = !q || l.textContent.toLowerCase().includes(q) ? '' : 'none'; }); });
    // -- trạng thái + bàn --
    F.status = dtEl('select', { id: 'nta-status' }); [['draft', t('nta_draft')], ['published', t('nta_published')]].forEach(([v, x]) => { const o = dtEl('option', { value: v }, x); if (n.status === v) o.selected = true; F.status.append(o); });
    F.slot = dtEl('select', { id: 'nta-slot' }); F.slot.append(dtEl('option', { value: '' }, t('nta_off_table')));
    [1, 2, 3, 4].forEach(i => { const o = dtEl('option', { value: i }, t('nta_slot') + ' ' + i); if (n.programme_slot === i) o.selected = true; F.slot.append(o); });
    const kSlot = () => { if (F.status.value !== 'published') { F.slot.value = ''; F.slot.disabled = true; } else F.slot.disabled = false; };
    F.status.addEventListener('change', kSlot); kSlot();

    const luu = dtEl('button', { type: 'button', class: 'ao3-link btn-full', id: 'nta-save' }, t('nta_save'));
    luu.addEventListener('click', () => luuForm(F, cueBox, wkBox, luu));
    const xoa = n.id ? dtEl('button', { type: 'button', class: 'mini-btn danger', onclick: () => xoaNote(n) }, t('nta_delete')) : null;

    root.append(
      E('div', 'nta-bar', dtEl('button', { type: 'button', class: 'mini-btn', onclick: async () => { noi(null); A.edit = null; await nap(); veDanhSach(); } }, '← ' + t('nta_back_desk')),
        E('span', 'nta-count', n.id ? t('nta_editing') : t('nta_new'))),
      E('div', 'nta-sub', t('nta_s_piece')),
      field(t('nta_piece') + ' *', F.piece), field(t('nta_composer') + ' *', F.composer),
      E('div', 'nta-two', field(t('nta_opus'), F.opus), field(t('nta_short'), F.short)),
      field(t('nta_title') + ' *', F.title, E('div', 'field-hint', t('nta_title_hint'))),
      field(t('nta_lang'), F.lang),
      E('div', 'nta-sub', t('nta_s_track')),
      field(t('nta_pick_track'), pick),
      field(t('nta_url') + ' *', F.url, E('div', 'field-hint', t('nta_url_hint'))),
      E('div', 'nta-two', field(t('nta_source'), F.src), field(t('nta_start'), F.start, E('div', 'field-hint', t('nta_start_hint')))),
      E('div', 'nta-sub', t('nta_s_sleeve')),
      E('div', 'nta-two', field(t('nta_icon'), F.icon), field(t('nta_color'), F.sleeve)), E('div', 'nta-prev', xem),
      E('div', 'nta-sub', t('nta_s_text')),
      field(t('nta_body'), F.body, E('div', 'field-hint', t('nta_body_hint'))),
      field(t('nta_quote'), F.quote),
      E('div', 'nta-sub', t('nta_s_cues')),
      E('div', 'field-hint', t('nta_cues_hint')), cueBox, nutCue,
      E('div', 'nta-sub', t('nta_s_works')),
      E('div', 'field-hint', t('nta_works_hint')), loc, wkBox,
      E('div', 'nta-sub', t('nta_s_publish')),
      E('div', 'nta-two', field(t('nta_status'), F.status), field(t('nta_slot'), F.slot)),
      E('div', 'field-hint', t('nta_slot_hint')),
      E('div', 'form-actions', luu, xoa ? E('div', 'nta-del', xoa) : null));
  }

  async function luuForm(F, cueBox, wkBox, luu) {
    if (A.busy) return; noi(null);
    const n = A.edit;
    const v = k => F[k].value.trim();
    if (!v('piece') || !v('composer') || !v('title')) return noi('nta_need_core', true);
    const url = v('url'); const nguon = doiNguon(url);
    if (!nguon) return noi('nta_bad_url', true);
    let start = 0; if (v('start')) { start = parseGio(v('start')); if (start == null) return noi('nta_bad_start', true); }
    const cues = [];
    for (const row of cueBox.children) {
      const a = row._tg.value.trim(), b = row._tx.value.trim();
      if (!a && !b) continue;
      const g = parseGio(a); if (g == null || !b) return noi('nta_bad_cue', true);
      cues.push({ t: g, text: b });
    }
    cues.sort((x, y) => x.t - y.t);
    if (cues.length > 12) return noi('nta_too_many_cues', true);
    const status = F.status.value, slot = status === 'published' && F.slot.value ? parseInt(F.slot.value, 10) : null;
    const chiem = slot ? A.notes.find(x => x.programme_slot === slot && x.id !== n.id) : null;
    if (chiem && !confirm(t('nta_swap_ask').replace('{a}', chiem.piece).replace('{n}', slot))) return;
    const ws = [...wkBox.querySelectorAll('input:checked')].map(c => c.value);
    const note = { id: n.id, slug: n.slug || window.noteSlug(v('piece')), title: v('title'), piece: v('piece'), composer: v('composer'),
      opus: v('opus') || null, short_name: v('short') || null, source: nguon, url, start_s: start, icon: F.icon.value, sleeve: F.sleeve.value,
      body: F.body.value.trim(), quote: v('quote') || null, cues, language: F.lang.value, status, programme_slot: null };
    A.busy = true; luu.disabled = true; luu.textContent = t('nta_saving');
    // Gỡ note đang chiếm slot trước (unique index), rồi lưu; hỏng thì trả note kia về chỗ cũ.
    if (chiem) { const r0 = await window.setNoteSlot(chiem.id, null, null); if (r0.error) { fin(r0.error); return; } }
    note.programme_slot = slot;
    const r = await window.saveNote(note, ws);
    if (r.error && chiem) await window.setNoteSlot(chiem.id, slot, null);
    fin(r.error, r.id);
    async function fin(err, id) {
      A.busy = false; luu.disabled = false; luu.textContent = t('nta_save');
      if (err) { noi(loiDB(err), true); if (id && !n.id) A.edit.id = id; return; }
      ngayUp(); await nap(); A.edit = null; veDanhSach(); noi('nta_saved', false); window.scrollTo(0, 0);
    }
  }
  async function xoaNote(n) {
    if (!confirm(t('nta_delete_ask').replace('{a}', n.piece))) return;
    A.busy = true; const r = await window.deleteNote(n.id); A.busy = false;
    if (r.error) return noi(loiDB(r.error), true);
    ngayUp(); await nap(); A.edit = null; veDanhSach(); noi('nta_deleted', false); window.scrollTo(0, 0);
  }

  // ---------- vòng đời ----------
  window.ntAdminVao = async function () {
    if (A.opening) return;    // ntAdminMo đang tự mở form: đừng dựng danh sách đè lên
    noi(null);
    if (!window.skLaAdmin) { $('nta-root').textContent = ''; $('nta-root').append(E('p', 'nta-hint', t('nta_not_admin'))); return; }
    $('nta-root').textContent = ''; $('nta-root').append(E('p', 'nta-hint', t('nt_loading')));
    await nap();
    if (A.edit) veForm(); else veDanhSach();
  };
  // Mở thẳng form sửa một note (nút ✎ trên trang Notes). id = null → note mới.
  window.ntAdminMo = async function (id) {
    A.opening = true;
    showPage('notes-admin', null);
    $('nta-root').textContent = ''; await nap(); await moForm(id || null);
    A.opening = false;
  };
  window.veLaiNotesAdmin = function () {
    const p = $('page-notes-admin'); if (!p || !p.classList.contains('active')) return;
    if (A.edit) return;       // đang soạn dở: không dựng lại, kẻo mất chữ
    veDanhSach();
  };
})();
