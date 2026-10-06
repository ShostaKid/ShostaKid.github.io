import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Project 'ShostaKid update web'. Đây là publishable key — chỉ đọc/ghi được
// những gì RLS cho phép, an toàn để nằm trong mã nguồn công khai.
const SB_URL = 'https://oseddxgmwbeduazbomuf.supabase.co';
const SB_KEY = 'sb_publishable_aOYL383Vt2fI561c0VJqbg_VDcuKqUe';

const sb = createClient(SB_URL, SB_KEY);

const $ = (id) => document.getElementById(id);
// dùng lại t() của site cho song ngữ
const tr = (k) => (window.t ? window.t(k) : k);

let currentProfile = null;

// ---------- thông báo ----------
// Gắn data-i18n để applyLang() của site tự dịch lại khi đổi ngôn ngữ.
function msg(el, key, kind) {
  el.className = 'auth-msg show ' + (kind || '');
  if (key.i18n === false) { delete el.dataset.i18n; el.textContent = key.text; }
  else { el.dataset.i18n = key; el.textContent = tr(key); }
}
function clearMsg(el) { el.className = 'auth-msg'; delete el.dataset.i18n; el.textContent = ''; }
const raw = (text) => ({ i18n: false, text });

function busy(btn, on, labelKey) {
  btn.disabled = on;
  btn.textContent = tr(labelKey);
}

// ---------- điều hướng theo trạng thái đăng nhập ----------
function paintNav(session) {
  // Script chính (không phải module) cần biết đã đăng nhập chưa, để khoá nội
  // dung truyện "chỉ thành viên" và để đổi đích của nút gửi yêu cầu.
  const truoc = window.skDaDangNhap;
  window.skDaDangNhap = !!session;

  // CHỈ vẽ lại khi trạng thái thật sự đổi. supabase-js làm mới token mỗi lần tab
  // được focus lại và bắn onAuthStateChange kèm theo, nên gọi vô điều kiện là cứ
  // alt-tab quay về một cái lại dựng lại cả chương — vừa phí, vừa nháy màn hình.
  if (truoc !== undefined && truoc !== window.skDaDangNhap
      && window.veLaiKhiDoiDangNhap) {
    window.veLaiKhiDoiDangNhap();
  }
  // Danh sách truyện đã lưu, cho nút ✦ trên bìa đĩa. Cũng chỉ nạp khi trạng
  // thái đổi (lần đầu truoc là undefined nên luôn nạp).
  if (truoc !== window.skDaDangNhap) napDaLuu(session);
  // Đăng nhập rồi thì thay nút Sign In bằng cụm avatar; các mục cá nhân dời hết
  // vào menu đổ xuống nên chỉ cần bật/tắt một khối.
  $('nav-signin').style.display = session ? 'none' : '';
  $('nav-me').style.display     = session ? '' : 'none';
  if (!session) {
    // Nút đăng truyện chỉ hiện với admin; paintProfile() bật lên khi biết chắc.
    $('nav-post').style.display = 'none';
    if (window.skLaAdmin) { window.skLaAdmin = false; if (window.veLaiRehearsal) window.veLaiRehearsal(); if (window.veLaiNotes) window.veLaiNotes(); }
    paintNavAvatar(null);
    closeNavMenu();
  }
}

// Avatar trên thanh nav: đặt bằng background-image, không dựng thẻ <img> mới,
// vì avatar_url là dữ liệu người dùng nhập.
function paintNavAvatar(profile) {
  const nut = $('nav-avatar');
  const url = ((profile && profile.avatar_url) || '').trim();
  const chu = (((profile && (profile.display_name || profile.username)) || '♩')
                .trim().charAt(0) || '♩').toUpperCase();
  if (/^https?:\/\//i.test(url)) {
    nut.style.backgroundImage = 'url("' + url.replace(/["\\]/g, '') + '")';
    nut.textContent = '';
  } else {
    nut.style.backgroundImage = '';
    nut.textContent = chu;
  }
}

// ---------- menu đổ xuống ----------
function closeNavMenu() {
  $('nav-menu').classList.remove('open');
  $('nav-avatar').setAttribute('aria-expanded', 'false');
}
window.closeNavMenu = closeNavMenu;   // showPage() gọi để đóng menu khi chuyển trang

$('nav-avatar').addEventListener('click', (e) => {
  e.stopPropagation();               // không để chính cú bấm này rơi xuống document và đóng lại ngay
  const mo = $('nav-menu').classList.toggle('open');
  $('nav-avatar').setAttribute('aria-expanded', mo ? 'true' : 'false');
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#nav-me')) closeNavMenu();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNavMenu(); });

$('nav-profile'  ).addEventListener('click', () => window.showPage('profile'));
$('nav-bookmarks').addEventListener('click', () => window.showPage('bookmarks'));
$('nav-requests' ).addEventListener('click', () => window.showPage('requests'));
$('nav-members'  ).addEventListener('click', () => window.showPage('members'));
$('nav-post'     ).addEventListener('click', () => window.showPage('post'));
$('nav-logout'   ).addEventListener('click', async () => {
  closeNavMenu();
  await sb.auth.signOut();
  window.showPage('home', document.querySelector('.nav-links a[data-page="home"]'));
});

// Dựng bằng DOM thay vì chuỗi HTML: avatar_url là dữ liệu người dùng nhập,
// không nhét thẳng vào innerHTML.
function paintAvatar(box, profile) {
  const url = ((profile && profile.avatar_url) || '').trim();
  const letter = (((profile && (profile.display_name || profile.username)) || '♩')
                   .trim().charAt(0) || '♩').toUpperCase();

  const fallback = () => {
    const d = document.createElement('div');
    d.className = 'avatar-fallback';
    d.textContent = letter;
    return d;
  };

  box.textContent = '';
  if (!url) { box.appendChild(fallback()); return; }

  const img = document.createElement('img');
  img.className = 'avatar';
  img.alt = '';
  img.addEventListener('error', () => { box.textContent = ''; box.appendChild(fallback()); });
  img.src = url;
  box.appendChild(img);
}

// Nút ✎ sửa nhóm trên trang Opus chỉ dựng khi biết chắc là admin — mà hồ sơ về
// SAU khi trang đã vẽ. Nên vai đổi (đăng nhập / đăng xuất) là vẽ lại bàn xoay.
function veLaiOpusNeuDoiVai(truoc) {
  const nay = !!(currentProfile && currentProfile.is_admin);
  if (nay !== truoc && window.renderOpus) window.renderOpus();
}

function paintProfile(p) {
  const laAdminTruoc = !!(currentProfile && currentProfile.is_admin);
  currentProfile = p;
  veLaiOpusNeuDoiVai(laAdminTruoc);
  if (window.ntLamMoi) window.ntLamMoi();   // vai admin đổi: trang Notes nạp lại (bản nháp xem trước)
  // Phép đếm cho chấm báo khác nhau giữa admin và bạn đọc, mà chỉ tới đây mới
  // biết chắc vai — nên tính chấm ở đây chứ không phải trong paintNav().
  if (window.tinhChamBao) window.tinhChamBao();
  paintAvatar($('prof-avatar-box'), p);
  paintNavAvatar(p);
  $('prof-name').textContent   = p.display_name || p.username;
  $('prof-handle').textContent = '@' + p.username;
  $('nav-post').style.display = p.is_admin ? '' : 'none';
  $('btn-edit-about').style.display = p.is_admin ? '' : 'none';
  // Trang In rehearsal (script thường) chỉ hiện nút Edit khi biết chắc là admin; quyền ghi thật do RLS chặn.
  if (!!p.is_admin !== !!window.skLaAdmin) { window.skLaAdmin = !!p.is_admin; if (window.veLaiRehearsal) window.veLaiRehearsal(); if (window.veLaiNotes) window.veLaiNotes(); }
  $('prof-admin').innerHTML    = p.is_admin
    ? `<span class="admin-badge">${tr('prof_admin')}</span>` : '';
  $('pf-username').value = p.username || '';
  $('pf-display').value  = p.display_name || '';
  $('pf-bio').value      = p.bio || '';
  $('pf-avatar').value   = p.avatar_url || '';
  $('pf-ao3').value      = p.ao3_url || '';
  // is_admin cố tình KHÔNG có ô nhập: quyền admin không tự phong được.
  // Ngay cả khi sửa DOM cũng vô ích — cột is_admin không nằm trong
  // GRANT UPDATE của role authenticated, và còn một trigger chặn nữa.
}

async function loadProfile(session) {
  if (!session) return;
  const { data, error } = await sb
    .from('profiles')
    .select('username, display_name, bio, avatar_url, ao3_url, is_admin')
    .eq('id', session.user.id)
    .single();
  if (error) { msg($('prof-msg'), 'prof_load_err', 'err'); return; }
  paintProfile(data);
}

// ---------- ảnh đại diện: tải từ máy lên ----------
const AV_BUCKET = 'avatars';
const AV_MAX    = 2 * 1024 * 1024;
// Đuôi file suy ra từ MIME, không lấy từ tên file người dùng đặt.
const AV_EXT    = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' };
const AV_PREFIX = SB_URL + '/storage/v1/object/public/' + AV_BUCKET + '/';

// Chỉ trả về đường dẫn khi URL đúng là file nằm trong thư mục của chính mình.
// Nhờ vậy thao tác dọn file cũ không bao giờ đụng tới link dán từ nơi khác.
function ownAvatarPath(url, uid) {
  if (!url || url.indexOf(AV_PREFIX) !== 0) return null;
  let path;
  try { path = decodeURIComponent(url.slice(AV_PREFIX.length).split('?')[0]); }
  catch (_) { return null; }
  return path.indexOf(uid + '/') === 0 ? path : null;
}

// Ảnh cũ chỉ xoá SAU khi hồ sơ đã trỏ sang ảnh mới, và lỗi ở đây bỏ qua:
// dọn rác thất bại thì cũng không được làm hỏng thao tác vừa thành công.
function dropStaleAvatar(oldUrl, newUrl, uid) {
  const stale = ownAvatarPath(oldUrl, uid);
  if (stale && stale !== ownAvatarPath(newUrl, uid)) {
    sb.storage.from(AV_BUCKET).remove([stale]).then(null, () => {});
  }
}

function avatarBusy(on) {
  $('btn-avatar-pick').disabled  = on;
  $('btn-avatar-clear').disabled = on;
  $('btn-avatar-pick').textContent = tr(on ? 'prof_avatar_uploading' : 'prof_avatar_pick');
}

// Chỉ cập nhật riêng avatar_url và vẽ lại mỗi cái avatar — KHÔNG gọi paintProfile,
// vì người dùng có thể đang gõ dở ở ô bio/username mà chưa bấm Lưu.
async function saveAvatarUrl(url, session) {
  const { data, error } = await sb.from('profiles')
    .update({ avatar_url: url })
    .eq('id', session.user.id)
    .select('username, display_name, bio, avatar_url, ao3_url, is_admin')
    .single();
  if (error) return error;

  const old = currentProfile ? currentProfile.avatar_url : null;
  currentProfile = data;
  $('pf-avatar').value = data.avatar_url || '';
  paintAvatar($('prof-avatar-box'), data);
  paintNavAvatar(data);
  dropStaleAvatar(old, data.avatar_url, session.user.id);
  return null;
}

$('btn-avatar-pick').addEventListener('click', () => $('pf-avatar-file').click());

$('pf-avatar-file').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';   // reset để chọn lại đúng file đó vẫn kích hoạt change
  if (!file) return;
  clearMsg($('prof-msg'));

  // Kiểm ở client cho phản hồi nhanh. Bucket vẫn tự chặn lần nữa
  // (2MB + đúng MIME), nên sửa DOM để lách cũng không qua được.
  const ext = AV_EXT[file.type];
  if (!ext)               { msg($('prof-msg'), 'prof_avatar_bad_type', 'err'); return; }
  if (file.size > AV_MAX) { msg($('prof-msg'), 'prof_avatar_too_big', 'err');  return; }

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { msg($('prof-msg'), 'prof_need_signin', 'err'); return; }

  avatarBusy(true);
  // Tên file mang mốc thời gian nên URL luôn mới — trình duyệt không hiện ảnh cũ trong cache.
  const path = session.user.id + '/' + Date.now() + '.' + ext;
  const { error: upErr } = await sb.storage.from(AV_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });

  if (upErr) {
    avatarBusy(false);
    msg($('prof-msg'), raw(upErr.message || tr('prof_avatar_up_err')), 'err');
    return;
  }

  const { data: pub } = sb.storage.from(AV_BUCKET).getPublicUrl(path);
  const err = await saveAvatarUrl(pub.publicUrl, session);
  avatarBusy(false);

  if (err) {
    // Lưu hồ sơ hỏng thì file vừa lên thành rác — dọn ngay.
    sb.storage.from(AV_BUCKET).remove([path]).then(null, () => {});
    msg($('prof-msg'), raw(err.message), 'err');
    return;
  }
  msg($('prof-msg'), 'prof_avatar_done', 'ok');
});

$('btn-avatar-clear').addEventListener('click', async () => {
  clearMsg($('prof-msg'));
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { msg($('prof-msg'), 'prof_need_signin', 'err'); return; }

  avatarBusy(true);
  const err = await saveAvatarUrl(null, session);
  avatarBusy(false);

  if (err) { msg($('prof-msg'), raw(err.message), 'err'); return; }
  msg($('prof-msg'), 'prof_avatar_removed', 'ok');
});

// ---------- trang About: nội dung + nhạc sửa được qua web ----------
let abData = null;   // {body_en, body_vi, music}

function abSay(key, isErr) {
  const el = $('ab-msg');
  if (!key) { el.className = 'auth-msg'; delete el.dataset.i18n; el.textContent = ''; return; }
  el.className = 'auth-msg show ' + (isErr ? 'err' : 'ok');
  if (key.i18n === false) { delete el.dataset.i18n; el.textContent = key.text; }
  else { el.dataset.i18n = key; el.textContent = tr(key); }
}

// Vẽ bio theo ngôn ngữ đang chọn. Dùng innerHTML vì nội dung vốn có <strong>,
// <em> — và chỉ admin ghi được vào bảng này nên đó là chữ của chủ nhà.
function paintAbout() {
  if (!abData) return;
  const vi = document.documentElement.getAttribute('data-lang') === 'vi';
  const html = (vi ? abData.body_vi : abData.body_en) || abData.body_en || abData.body_vi;
  if (html) $('about-body').innerHTML = html;
  // Nhạc trang About lấy từ DB, thay cho hằng aboutMusic viết cứng.
  if (abData.music && abData.music.url) window.aboutMusicHienTai = abData.music;
}
window.repaintAbout = paintAbout;

async function loadAbout() {
  const { data, error } = await sb.from('site_content')
    .select('value').eq('key', 'about').maybeSingle();
  if (error || !data || !data.value) return;   // hỏng thì giữ nguyên bản viết cứng
  abData = data.value;
  paintAbout();
}

// ---------- Trang In rehearsal: danh sách bản thảo (site_content, khoá 'rehearsal') ----------
// Đọc: trả mảng (rỗng nếu chưa có hàng), hoặc null khi không gọi được DB. Ghi: cả mảng một lần.
// Không dùng upsert: ON CONFLICT DO UPDATE ghi cả cột `key`, mà role authenticated chỉ được UPDATE
// (value, updated_by). Nên UPDATE trước, không có hàng nào thì INSERT (được cấp INSERT key/value/updated_by).
window.fetchRehearsal = async function () {
  const { data, error } = await sb.from('site_content').select('value').eq('key', 'rehearsal').maybeSingle();
  if (error) return null;
  return data && data.value && Array.isArray(data.value.items) ? data.value.items : [];
};
window.saveRehearsal = async function (items) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { error: { message: 'signin' } };
  const value = { items };
  let r = await sb.from('site_content').update({ value, updated_by: session.user.id }).eq('key', 'rehearsal').select('key');
  if (!r.error && (!r.data || !r.data.length)) {
    r = await sb.from('site_content').insert({ key: 'rehearsal', value, updated_by: session.user.id });
  }
  return { error: r.error || null };
};

$('btn-edit-about').addEventListener('click', () => {
  abSay(null);
  $('ab-en').value = (abData && abData.body_en) || '';
  $('ab-vi').value = (abData && abData.body_vi) || '';
  pwMusicWrite($('ab-music'), abData && abData.music);
  $('about-form').style.display = '';
  $('btn-edit-about').style.display = 'none';
  $('ab-en').focus();
});

$('ab-cancel').addEventListener('click', () => {
  $('about-form').style.display = 'none';
  $('btn-edit-about').style.display = '';
  abSay(null);
});

$('ab-save').addEventListener('click', async () => {
  const btn = $('ab-save');
  abSay(null);
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { abSay('prof_need_signin', true); return; }

  busy(btn, true, 'ab_saving');
  const giaTri = {
    body_en: $('ab-en').value.trim(),
    body_vi: $('ab-vi').value.trim(),
    music:   pwMusicRead($('ab-music'))
  };
  const { error } = await sb.from('site_content')
    .update({ value: giaTri, updated_by: session.user.id })
    .eq('key', 'about');
  busy(btn, false, 'ab_save');

  if (error) { abSay(raw(error.message), true); return; }
  abData = giaTri;
  paintAbout();
  $('about-form').style.display = 'none';
  $('btn-edit-about').style.display = '';
  abSay('ab_saved');
});

// ---------- trang đăng / sửa truyện (chỉ admin) ----------
let pwWorkId = null;   // đang sửa truyện nào; null = đang tạo mới
let pwOto    = null;   // ô nội dung chương đang được chèn ảnh
// Ngày đăng GỐC của truyện đang sửa. Trước đây mỗi lần bấm Lưu là ghi đè
// published_at bằng giờ hiện tại, nên sửa một dấu phẩy là truyện nhảy lên đầu
// "mới nhất" — 26 truyện đã bị đổi ngày đăng thành 05/09 theo cách đó.
let pwPublishedAt = null;
let pwThuTuMax = 0;    // thứ tự lớn nhất trong các nhóm Opus, để nhóm mới xếp cuối

function pwSay(key, isErr) {
  const el = $('post-msg');
  if (!key) { el.className = 'auth-msg'; delete el.dataset.i18n; el.textContent = ''; return; }
  el.className = 'auth-msg show ' + (isErr ? 'err' : 'ok');
  if (key.i18n === false) { delete el.dataset.i18n; el.textContent = key.text; }
  else { el.dataset.i18n = key; el.textContent = tr(key); }
}

// Khối nhạc dùng chung cho cả truyện lẫn từng chương. Khớp đúng hình dạng
// chapters.music đã có sẵn: {source, url, start, name}.
function pwMusicRead(box) {
  const url = box.querySelector('.pw-m-url').value.trim();
  if (!url) return null;                       // không có link = không có nhạc
  const start = parseInt(box.querySelector('.pw-m-start').value, 10);
  return {
    source: box.querySelector('.pw-m-source').value || 'github',
    url,
    start: isNaN(start) ? 0 : Math.max(0, start),
    name: box.querySelector('.pw-m-name').value.trim() || null
  };
}

function pwMusicWrite(box, m) {
  box.querySelector('.pw-m-url').value    = (m && m.url) || '';
  box.querySelector('.pw-m-name').value   = (m && m.name) || '';
  box.querySelector('.pw-m-start').value  = (m && m.start) ? m.start : '';
  box.querySelector('.pw-m-source').value = (m && m.source) || 'github';
}

function pwMusicBox() {
  const d = document.createElement('div');
  d.className = 'pw-music';
  d.innerHTML = $('pw-music-work').innerHTML;   // dùng lại đúng bộ ô của truyện
  pwMusicWrite(d, null);                         // nhưng để trống
  return d;
}

function pwAddChapter(data) {
  const wrap = document.createElement('div');
  wrap.className = 'pw-ch';
  if (data && data.id) wrap.dataset.chId = data.id;   // để lúc lưu biết chương nào đã có sẵn
  if (data && data.position) wrap.dataset.chPos = data.position;  // vị trí cũ, để biết có đổi chỗ không
  if (data && data.published_at) wrap.dataset.chPubAt = data.published_at;  // ngày đăng gốc của chương

  const t1 = document.createElement('input');
  t1.type = 'text'; t1.className = 'pw-ch-title'; t1.maxLength = 200;
  t1.placeholder = tr('post_ch_title');
  t1.value = (data && data.title) || '';

  const ta = document.createElement('textarea');
  ta.className = 'pw-ch-body'; ta.rows = 8;
  ta.placeholder = tr('post_ch_body');
  ta.value = (data && data.content) || '';

  const hang = document.createElement('div');
  hang.className = 'pw-ch-actions';
  const img = document.createElement('button');
  img.type = 'button'; img.className = 'mini-btn';
  img.dataset.i18n = 'post_add_img';
  img.textContent = tr('post_add_img');
  img.addEventListener('click', () => {
    if (!pwWorkId) { pwSay('post_img_first', true); return; }
    pwOto = ta; $('pw-img-file').click();
  });

  // Chèn ảnh đã nằm sẵn ở nơi khác (GitHub Releases…): không tải lên gì cả,
  // nên cũng không cần id truyện, và không tốn dung lượng Storage.
  const imgLink = document.createElement('button');
  imgLink.type = 'button'; imgLink.className = 'mini-btn';
  imgLink.dataset.i18n = 'post_add_img_url';
  imgLink.textContent = tr('post_add_img_url');
  imgLink.addEventListener('click', () => {
    const url = (window.prompt(tr('post_img_url_ask')) || '').trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) { pwSay('post_img_url_bad', true); return; }
    pwSay(null);
    moBangChonCho(ta, url);
  });
  const xoa = document.createElement('button');
  xoa.type = 'button'; xoa.className = 'mini-btn danger';
  xoa.dataset.i18n = 'post_del_ch';
  xoa.textContent = tr('post_del_ch');
  xoa.addEventListener('click', () => wrap.remove());
  hang.append(img, imgLink, xoa);

  const nhanNhac = document.createElement('div');
  nhanNhac.className = 'field-hint';
  nhanNhac.style.margin = '0.6rem 0 0.3rem';
  nhanNhac.dataset.i18n = 'post_ch_music';
  nhanNhac.textContent = tr('post_ch_music');

  const hopNhac = pwMusicBox();
  if (data && data.music) pwMusicWrite(hopNhac, data.music);

  const goiY = document.createElement('div');
  goiY.className = 'field-hint';
  goiY.dataset.i18n = 'post_ch_music_hint';
  goiY.textContent = tr('post_ch_music_hint');

  wrap.append(t1, ta, hang, nhanNhac, hopNhac, goiY);
  $('pw-chapters').appendChild(wrap);
  return wrap;
}

$('pw-add-ch').addEventListener('click', () => pwAddChapter());
$('pw-add-fandom').addEventListener('click', () => pwThemMuc('fandom'));
$('pw-add-ship').addEventListener('click', () => pwThemMuc('ship'));
$('pw-add-opus').addEventListener('click', () => pwThemOpus());

// Tải một tệp ảnh lên bucket work-images. Trả về url, hoặc null nếu hỏng.
async function pwTaiAnh(file, tenDau) {
  const ext = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' }[file.type];
  if (!ext) { pwSay('prof_avatar_bad_type', true); return null; }
  if (file.size > 2 * 1024 * 1024) { pwSay('prof_avatar_too_big', true); return null; }

  pwSay('post_uploading');
  // Thư mục PHẢI là id truyện — policy work_images_insert_own kiểm đúng chỗ này.
  const path = pwWorkId + '/' + (tenDau || 'anh') + '-' + Date.now() + '.' + ext;
  const { error } = await sb.storage.from('work-images')
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (error) { pwSay(raw(error.message), true); return null; }

  pwSay(null);
  return sb.storage.from('work-images').getPublicUrl(path).data.publicUrl;
}

// ---------- Chèn ảnh minh hoạ ----------
// Tải ảnh lên xong thì KHÔNG chèn ngay. Mở bảng liệt kê các đoạn văn của chương
// để tự chọn đặt ảnh vào giữa hai đoạn nào — "giữa chương" chỉ là một lựa chọn
// trong danh sách, không phải chỗ bị ép.
$('pw-img-file').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file || !pwOto || !pwWorkId) return;
  pwSay(null);

  const url = await pwTaiAnh(file, 'minhhoa');
  if (!url) return;
  moBangChonCho(pwOto, url);
});

// Cắt nội dung chương thành các khối theo dòng trống — đúng cách txtToHtml()
// tách đoạn khi hiển thị, nên số đoạn ở đây khớp với cái người đọc nhìn thấy.
function cacDoan(text) {
  const ra = [];
  const re = /\n\s*\n/g;
  let dau = 0, m;
  while ((m = re.exec(text)) !== null) {
    ra.push({ dau, cuoi: m.index, chenTai: m.index + m[0].length });
    dau = m.index + m[0].length;
  }
  ra.push({ dau, cuoi: text.length, chenTai: text.length });
  return ra.filter(d => text.slice(d.dau, d.cuoi).trim());
}

// Bỏ thẻ HTML rồi rút gọn, để mỗi dòng trong bảng chọn đọc được như văn xuôi.
function tomTat(s, n) {
  const sach = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return sach.length > n ? sach.slice(0, n) + '…' : (sach || '(đoạn trống)');
}

function moBangChonCho(ta, url) {
  const khoiChuong = ta.closest('.pw-ch');
  const cu = khoiChuong.querySelector('.pw-cho-anh');
  if (cu) cu.remove();

  const text = ta.value;
  const doan = cacDoan(text);

  const bang = document.createElement('div');
  bang.className = 'pw-cho-anh';

  const tieu = document.createElement('div');
  tieu.className = 'pw-cho-tieu';
  tieu.textContent = tr('post_img_where');
  bang.append(tieu);

  const ds = document.createElement('div');
  ds.className = 'pw-cho-ds';

  const themMuc = (nhan, mota, viTri) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pw-cho-muc';
    const n = document.createElement('b');
    n.textContent = nhan;
    b.append(n, document.createTextNode(mota));
    b.addEventListener('click', () => { chenAnh(ta, url, viTri); bang.remove(); });
    ds.append(b);
  };

  if (!doan.length) {
    // Chương còn trống: chỉ có một chỗ để đặt.
    themMuc(tr('post_img_top'), '', 0);
  } else {
    themMuc(tr('post_img_top'), tomTat(text.slice(doan[0].dau, doan[0].dau + 90), 70), doan[0].dau);
    doan.forEach((d, i) => {
      const nhan = (i === doan.length - 1)
        ? tr('post_img_end')
        : tr('post_img_after').replace('{n}', i + 1);
      themMuc(nhan, tomTat(text.slice(d.dau, d.cuoi), 70), d.chenTai);
    });
  }

  bang.append(ds);

  const huy = document.createElement('button');
  huy.type = 'button';
  huy.className = 'mini-btn pw-cho-huy';
  huy.textContent = tr('post_img_cancel');
  // Ảnh đã nằm trên Storage rồi; huỷ ở đây chỉ là không chèn thẻ vào bài.
  // Lần lưu tiếp theo pwDonAnhThua() sẽ xoá tệp không ai dùng.
  huy.addEventListener('click', () => bang.remove());
  bang.append(huy);

  ta.insertAdjacentElement('afterend', bang);
  bang.scrollIntoView({ block: 'nearest' });
}

function chenAnh(ta, url, viTri) {
  // Dòng trống hai bên để txtToHtml() coi ảnh là một khối riêng, không dính
  // vào đoạn văn liền trước.
  const the = '\n\n<p align="center"><img src="' + url + '" alt=""></p>\n\n';
  const truoc = ta.value.slice(0, viTri).replace(/\s+$/, '');
  const sau   = ta.value.slice(viTri).replace(/^\s+/, '');
  // Phải là DÒNG TRỐNG (\n\n) cả hai bên. Một dấu xuống dòng thôi thì txtToHtml()
  // coi ảnh nằm cùng đoạn với văn bản liền trước và nối bằng <br>.
  ta.value = (truoc ? truoc + '\n\n' : '') + the.trim() + (sau ? '\n\n' + sau : '');
  ta.focus();
  pwSay('post_img_done');
}

// ---------- Ảnh bìa ----------
// Ô #pw-bia-url là nguồn duy nhất giữ đường dẫn bìa. Tải tệp lên chỉ là một cách
// điền vào ô đó; dán link GitHub Releases là cách kia. Nhờ vậy hai đường không
// bao giờ lệch nhau, và ô luôn cho thấy bìa đang thật sự trỏ đi đâu.
function biaHienTai() { return $('pw-bia-url').value.trim(); }

function veBia() {
  const url = biaHienTai();
  const o = $('pw-bia-xem');
  o.textContent = '';
  o.append(oBia(url, 'fic-bia'));
  $('pw-bia-xoa').disabled = !url;
  $('pw-bia-cat-o').disabled = !url;
}

// Dán link vào là xem trước ngay, không phải bấm gì thêm.
$('pw-bia-url').addEventListener('input', veBia);

$('pw-bia-chon').addEventListener('click', () => {
  // Chỉ đường TẢI LÊN mới cần id truyện, vì tệp phải nằm trong thư mục của nó.
  // Dán link thì không cần — truyện mới cũng dán được.
  if (!pwWorkId) { pwSay('post_img_first', true); return; }
  $('pw-bia-tep').click();
});

$('pw-bia-tep').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file || !pwWorkId) return;
  const url = await pwTaiAnh(file, 'bia');
  if (!url) return;
  $('pw-bia-url').value = url;
  veBia();
});

$('pw-bia-xoa').addEventListener('click', () => {
  // Chỉ gỡ khỏi truyện; tệp trên Storage do pwDonAnhThua() dọn lúc lưu.
  // Link ngoài thì xoá ở đây là hết, site không đụng vào tệp của nơi khác.
  $('pw-bia-url').value = '';
  $('pw-bia-cat-o').checked = false;
  veBia();
});

// Bỏ dấu tiếng Việt rồi rút gọn thành slug. Dùng chung cho fandom, ship và
// slug của truyện, để mọi thứ sinh ra cùng một kiểu.
function pwSlug(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

// Tạo fandom hoặc ship mới. Quyền đã có sẵn từ đầu (policy `chỉ admin ghi`),
// chỉ là form trước đây không cho nhập.
async function pwThemMuc(loai) {
  const el = loai === 'fandom' ? $('pw-fandom') : $('pw-ships');
  const ten = (window.prompt(tr(loai === 'fandom' ? 'post_new_fandom' : 'post_new_ship')) || '').trim();
  if (!ten) return;

  const slug = pwSlug(ten);
  if (!slug) { pwSay('post_name_bad', true); return; }

  // Đã có sẵn (kể cả khác hoa thường) thì chọn luôn, đừng đẻ thêm bản trùng.
  const trung = [...el.options].find(o => o.textContent.toLowerCase() === ten.toLowerCase());
  if (trung) { trung.selected = true; pwSay('post_already_there'); return; }

  // Hỏi lại trước khi ghi: form không có chỗ sửa/xoá, gõ sai là cái tên sai đó
  // nằm vĩnh viễn trong bộ lọc ở sidebar (đúng lỗi đã xảy ra với Nevuillette).
  if (!window.confirm(tr('post_confirm_new').replace('%s', ten))) return;

  const bang = loai === 'fandom' ? 'fandoms' : 'ships';
  const hang = { name: ten, slug };
  // Ship gắn theo fandom đang chọn, để sidebar xếp nó vào đúng nhóm.
  if (loai === 'ship' && $('pw-fandom').value) hang.fandom_id = $('pw-fandom').value;

  const { data, error } = await sb.from(bang).insert(hang).select('id,name').single();
  if (error) { pwSay(raw(error.message), true); return; }

  const o = document.createElement('option');
  o.value = data.id; o.textContent = data.name; o.selected = true;
  el.appendChild(o);
  pwSay('post_created');
}

// Tạo nhóm Opus mới ngay trong form. Cố ý CHỈ hỏi tên: mô tả hai thứ tiếng và
// thứ tự hiện thì viết sau, trên trang Opus, chỗ nhìn thấy được kết quả —
// nhét cả bốn ô vào window.prompt giữa lúc đang đăng truyện là cực hình.
async function pwThemOpus() {
  const el = $('pw-opus');
  const ten = (window.prompt(tr('post_new_opus')) || '').trim();
  if (!ten) return;

  const slug = pwSlug(ten);
  if (!slug) { pwSay('post_name_bad', true); return; }

  const trung = [...el.options].find(o => o.value && o.textContent.toLowerCase() === ten.toLowerCase());
  if (trung) { el.value = trung.value; pwSay('post_already_there'); return; }

  if (!window.confirm(tr('post_confirm_new_opus').replace('%s', ten))) return;

  // Phải khai thu_tu: bỏ trống thì DB điền mặc định 100, trùng với Suite III —
  // đó là cách Suite IV · Scherzo đã ra đời với thứ tự không xác định.
  const { data, error } = await sb.from('tags')
    .insert({ name: ten, slug, type: 'category', thu_tu: pwThuTuMax + 10 })
    .select('id,name').single();
  if (error) { pwSay(raw(error.message), true); return; }

  pwOpusIds.push(data.id);
  pwThuTuMax += 10;
  const o = document.createElement('option');
  o.value = data.id; o.textContent = data.name;
  el.appendChild(o);
  el.value = data.id;
  pwSay('post_created');
}

// Nạp danh sách fandom / ship có sẵn.
// Danh sách id của các nhóm Opus đang có. Cần giữ lại để lúc lưu chỉ xoá đúng
// liên kết loại 'category', không đụng tới nhãn cảnh báo cũng nằm trong work_tags.
let pwOpusIds = [];

async function pwLoadChoices() {
  const [f, s, o] = await Promise.all([
    sb.from('fandoms').select('id,name').order('name'),
    sb.from('ships').select('id,name').order('name'),
    sb.from('tags').select('id,name,name_vi,thu_tu').eq('type', 'category')
      .order('thu_tu').order('name')
  ]);
  const fill = (el, rows) => {
    el.textContent = '';
    (rows || []).forEach(r => {
      const op = document.createElement('option');
      op.value = r.id; op.textContent = r.name;
      el.appendChild(op);
    });
  };
  fill($('pw-fandom'), f.data);
  fill($('pw-ships'), s.data);

  // Ô Opus có thêm mục rỗng đứng đầu: truyện chưa xếp nhóm là chuyện bình thường,
  // không nên ép chọn bừa một nhóm chỉ vì ô bắt buộc phải có giá trị.
  pwOpusIds = (o.data || []).map(r => r.id);
  pwThuTuMax = Math.max(0, ...(o.data || []).map(r => r.thu_tu || 0));
  const sel = $('pw-opus');
  sel.textContent = '';
  const trong = document.createElement('option');
  trong.value = ''; trong.textContent = '—';
  sel.appendChild(trong);
  const vi = document.documentElement.getAttribute('data-lang') === 'vi';
  (o.data || []).forEach(r => {
    const op = document.createElement('option');
    op.value = r.id;
    op.textContent = (vi && r.name_vi) ? r.name_vi : r.name;
    sel.appendChild(op);
  });
}

// Mở form. Truyền idx để sửa truyện có sẵn, bỏ trống để tạo mới.
async function loadPostForm(idx) {
  pwSay(null);
  await pwLoadChoices();
  $('pw-chapters').textContent = '';
  pwWorkId = null;
  pwPublishedAt = null;

  const head = $('post-head');
  if (idx === undefined || idx === null) {
    head.dataset.i18n = 'post_head'; head.textContent = tr('post_head');
    ['pw-title','pw-subtitle','pw-summary','pw-warning'].forEach(id => { $(id).value = ''; });
    $('pw-status').value = 'published';
    pwMusicWrite($('pw-music-work'), null);
    $('pw-featured').checked = false;
    $('pw-restricted').checked = false;
    $('pw-lang-vi').checked = false;
    $('pw-complete').checked = false;
    $('pw-bia-url').value = ''; $('pw-bia-cat-o').checked = false; veBia();
    $('pw-opus').value = '';
    pwAddChapter();
    return;
  }

  head.dataset.i18n = 'post_edit_head'; head.textContent = tr('post_edit_head');
  const { data: w } = await sb.from('works')
    .select('id,title,subtitle,summary,warning_note,status,featured,is_restricted,cover_url,cover_crop,published_at,language,is_complete,'
          + 'work_fandoms(fandom_id), work_ships(ship_id), work_tags(tag_id),'
          + 'chapters(id,position,title,content,music,published_at)')
    .eq('legacy_id', 'fic-' + idx).maybeSingle();
  if (!w) { pwSay('post_err', true); return; }

  pwWorkId = w.id;
  pwPublishedAt = w.published_at || null;
  $('pw-title').value    = w.title || '';
  $('pw-subtitle').value = w.subtitle || '';
  $('pw-summary').value  = w.summary || '';
  $('pw-warning').value  = w.warning_note || '';
  $('pw-status').value   = w.status || 'published';
  $('pw-featured').checked = !!w.featured;
  $('pw-restricted').checked = !!w.is_restricted;
  $('pw-lang-vi').checked = w.language === 'vi';
  $('pw-complete').checked = !!w.is_complete;
  $('pw-bia-url').value = w.cover_url || '';
  $('pw-bia-cat-o').checked = !!w.cover_crop;
  veBia();

  const fid = (w.work_fandoms || []).map(x => x.fandom_id)[0];
  if (fid) $('pw-fandom').value = fid;
  const sid = new Set((w.work_ships || []).map(x => x.ship_id));
  [...$('pw-ships').options].forEach(o => { o.selected = sid.has(o.value); });

  // work_tags chứa cả nhãn cảnh báo lẫn nhóm Opus. Lọc ra đúng cái nào là Opus
  // bằng danh sách id đã nạp ở pwLoadChoices(), đừng lấy bừa phần tử đầu.
  const opusCu = (w.work_tags || []).map(x => x.tag_id).find(id => pwOpusIds.includes(id));
  $('pw-opus').value = opusCu || '';

  // Nhạc "của truyện" suy từ chương đầu — schema chỉ lưu nhạc theo chương.
  const dsChuong = (w.chapters || []).slice().sort((a, b) => a.position - b.position);
  const nhacChung = dsChuong[0] ? dsChuong[0].music : null;
  pwMusicWrite($('pw-music-work'), nhacChung);
  const nhuNhau = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);
  // Ô nhạc của chương chỉ điền khi chương đó KHÁC nhạc chung, để trống nghĩa là
  // "theo nhạc chung" — đúng như dòng gợi ý ghi dưới ô.
  dsChuong.forEach(c => pwAddChapter(
    nhuNhau(c.music, nhacChung)
      ? { id: c.id, position: c.position, title: c.title, content: c.content, published_at: c.published_at }
      : c
  ));
  if (!(w.chapters || []).length) pwAddChapter();
}
window.loadPostForm = loadPostForm;

$('pw-save').addEventListener('click', async () => {
  pwSay(null);
  const btn = $('pw-save');
  const title = $('pw-title').value.trim();
  if (!title) { pwSay('post_need_title', true); return; }

  const nhacChung = pwMusicRead($('pw-music-work'));
  const chuong = [...document.querySelectorAll('#pw-chapters .pw-ch')].map(w => ({
    // Ô nhạc của chương để trống thì dùng nhạc chung của truyện.
    id: w.dataset.chId || null,
    viTriCu: w.dataset.chPos ? parseInt(w.dataset.chPos, 10) : null,
    ngayCu: w.dataset.chPubAt || null,
    khoi: w,               // để ghi ngược id/ngày của chương vừa chèn vào form
    music: pwMusicRead(w.querySelector('.pw-music')) || nhacChung,
    title: w.querySelector('.pw-ch-title').value.trim(),
    content: w.querySelector('.pw-ch-body').value
  })).filter(c => c.content.trim());
  if (!chuong.length) { pwSay('post_need_ch', true); return; }

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { pwSay('prof_need_signin', true); return; }

  busy(btn, true, 'post_saving');

  const đếmTừ = (s) => (s.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length) || 1;
  const patch = {
    title,
    subtitle: $('pw-subtitle').value.trim() || null,
    summary:  $('pw-summary').value.trim() || null,
    warning_note: $('pw-warning').value.trim() || null,
    status:   $('pw-status').value,
    featured: $('pw-featured').checked,
    // Khoá thật nằm ở policy SELECT của bảng works: truyện bật cờ này biến mất
    // khỏi API với khách chưa đăng nhập, không phải chỉ ẩn trên giao diện.
    is_restricted: $('pw-restricted').checked,
    language: $('pw-lang-vi').checked ? 'vi' : 'en',
    is_complete: $('pw-complete').checked,
    cover_url:  biaHienTai() || null,
    cover_crop: !!$('pw-bia-cat-o').checked,
    // Giữ ngày đăng gốc; chỉ lần ĐẦU TIÊN truyện được đăng mới lấy giờ hiện tại.
    // Chuyển về bản nháp cũng giữ ngày cũ, để đăng lại không bị nhảy lên đầu.
    published_at: pwPublishedAt
      || ($('pw-status').value === 'published' ? new Date().toISOString() : null)
  };

  let workId = pwWorkId, err = null;
  if (workId) {
    const r = await sb.from('works').update(patch).eq('id', workId);
    err = r.error;
  } else {
    // slug tự sinh từ tiêu đề; legacy_id do trigger dưới DB cấp.
    patch.author_id = session.user.id;
    patch.slug = (title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
                   .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60) || 'work')
                 + '-' + Date.now().toString().slice(-6);
    const r = await sb.from('works').insert(patch).select('id').single();
    err = r.error; workId = r.data && r.data.id;
  }
  if (err || !workId) { busy(btn, false, 'post_save'); pwSay(raw((err && err.message) || 'error'), true); return; }
  pwWorkId = workId;
  pwPublishedAt = patch.published_at;

  // Fandom + ship: xoá hết rồi gắn lại cho khớp lựa chọn hiện tại.
  await sb.from('work_fandoms').delete().eq('work_id', workId);
  if ($('pw-fandom').value) {
    await sb.from('work_fandoms').insert({ work_id: workId, fandom_id: $('pw-fandom').value });
  }
  // Opus: CHỈ xoá liên kết tới nhóm Opus, không xoá cả hàng work_tags của truyện —
  // bảng đó còn giữ nhãn cảnh báo (rape-non-con, cuckold) từ hồi import.
  if (pwOpusIds.length) {
    await sb.from('work_tags').delete().eq('work_id', workId).in('tag_id', pwOpusIds);
  }
  if ($('pw-opus').value) {
    await sb.from('work_tags').insert({ work_id: workId, tag_id: $('pw-opus').value });
  }

  await sb.from('work_ships').delete().eq('work_id', workId);
  const ships = [...$('pw-ships').selectedOptions].map(o => ({ work_id: workId, ship_id: o.value }));
  if (ships.length) await sb.from('work_ships').insert(ships);

  // Chương: chỉ đụng vào cái nào thật sự đổi.
  //
  // Bản cũ xoá sạch rồi chèn lại. Hai bước đó là hai request riêng qua PostgREST,
  // KHÔNG nằm trong một transaction — bước hai hỏng là truyện mất trắng chương
  // (đã xảy ra thật một lần). Cách dưới đây không có cửa nào làm mất nội dung:
  // hỏng giữa chừng thì chỉ là vài chương chưa kịp cập nhật, lưu lại là xong.
  const truoc = new Set([...document.querySelectorAll('#pw-chapters .pw-ch')]
                        .map(w => w.dataset.chId).filter(Boolean));
  let rc = { error: null };

  // 1. Xoá những chương đã bị gỡ khỏi form. Làm trước để giải phóng `position`,
  //    vì có unique (work_id, position).
  if (pwWorkId) {
    const conLai = new Set(chuong.map(c => c.id).filter(Boolean));
    const canXoa = [...truoc].filter(id => !conLai.has(id));
    if (canXoa.length) {
      const r = await sb.from('chapters').delete().in('id', canXoa);
      if (r.error) rc = r;
    }
  }

  // 2. Nếu có chương phải đổi vị trí thì dời tạm ra vùng 1000+ trước, không thì
  //    hai chương đổi chỗ cho nhau sẽ đụng unique ngay giữa chừng.
  const coDoiChoNhau = chuong.some((c, i) => c.id && c.viTriCu && c.viTriCu !== i + 1);
  if (!rc.error && coDoiChoNhau) {
    for (let i = 0; i < chuong.length; i++) {
      if (!chuong[i].id) continue;
      const r = await sb.from('chapters').update({ position: 1000 + i }).eq('id', chuong[i].id);
      if (r.error) { rc = r; break; }
    }
  }

  // 3. Cập nhật chương cũ, chèn chương mới.
  for (let i = 0; i < chuong.length && !rc.error; i++) {
    const c = chuong[i];
    const hang = {
      position: i + 1, title: c.title || null, content: c.content,
      // Chương cũ giữ ngày đăng của nó; chương mới thêm vào thì lấy giờ hiện
      // tại — KHÔNG lấy ngày của truyện, vì chương 3 viết sau chương 1 cả tháng.
      status: patch.status,
      published_at: c.ngayCu || (patch.status === 'published' ? new Date().toISOString() : null),
      word_count: đếmTừ(c.content), music: c.music
    };
    const r = c.id
      ? await sb.from('chapters').update(hang).eq('id', c.id)
      : await sb.from('chapters').insert({ ...hang, work_id: workId }).select('id').single();
    if (r.error) { rc = r; continue; }
    // Ghi ngược vào form. Trước đây chương vừa chèn không được đánh dấu là "đã có",
    // nên bấm Lưu lần hai là nó bị chèn lại vào cùng vị trí → lỗi trùng khoá.
    if (!c.id && r.data && r.data.id) c.khoi.dataset.chId = r.data.id;
    c.khoi.dataset.chPos = i + 1;
    if (hang.published_at) c.khoi.dataset.chPubAt = hang.published_at;
  }

  busy(btn, false, 'post_save');
  if (rc.error) { pwSay(raw(rc.error.message), true); return; }

  pwSay('post_saved');
  await pwDonAnhThua(workId, chuong);
  if (window.invalidateChapters) window.invalidateChapters();
  // Danh sách truyện đổi rồi thì nạp lại Browse + trang chủ.
  if (window.fetchWorksFromDB) {
    const moi = await window.fetchWorksFromDB();
    if (moi && moi.length && window.applyWorksData) window.applyWorksData(moi);
  }
});

// Xoá những tệp ảnh không còn ai trỏ tới. Avatar đã có dropStaleAvatar() làm
// việc này; ảnh truyện thì trước đây không có gì cả, nên gỡ thẻ ảnh khỏi bài
// hay xoá cả chương là tệp nằm lại trong Storage vĩnh viễn.
// Chạy sau khi lưu xong, và im lặng nếu hỏng — dọn rác không được thì cũng
// đừng làm hỏng thông báo "đã lưu".
async function pwDonAnhThua(workId, chuong) {
  try {
    const { data: tep, error } = await sb.storage.from('work-images').list(workId, { limit: 200 });
    if (error || !tep || !tep.length) return;

    // Gom mọi đường dẫn đang được dùng: bìa + mọi thẻ img trong mọi chương.
    const dangDung = new Set();
    const nhat = (s) => {
      const re = /work-images\/([^\s"'<>)]+)/g;
      let m;
      while ((m = re.exec(s || '')) !== null) dangDung.add(decodeURIComponent(m[1]));
    };
    nhat(biaHienTai());
    chuong.forEach(c => nhat(c.content));

    const thua = tep
      .map(f => workId + '/' + f.name)
      .filter(p => !dangDung.has(p));
    if (thua.length) await sb.storage.from('work-images').remove(thua);
  } catch (_) { /* dọn rác hỏng thì thôi */ }
}

// ---------- Trang Opus ----------
// Bàn xoay dựng ở script cổ điển (renderOpus, dùng chung dữ liệu với Home/Works).
// Module chỉ lo hai việc: nạp bảng nhóm khi cần, và phần sửa/xoá nhóm của admin.
function opusSay(chu, loi) {
  const el = $('opus-msg');
  if (!chu) { el.className = 'auth-msg dt-opus-msg'; el.textContent = ''; return; }
  el.className = 'auth-msg dt-opus-msg show ' + (loi ? 'err' : 'ok');
  // Nhận cả chữ trơn lẫn raw(error.message) (object {i18n:false, text}).
  el.textContent = (chu && chu.i18n === false) ? chu.text : chu;
}

// napLai = true: vừa sửa/xoá nhóm, phải đọc lại bảng tags dù đã có.
async function loadOpus(napLai) {
  opusSay(null);
  if (napLai || !(window.opusNhom && window.opusNhom.length)) {
    const { data, error } = await sb.from('tags').select('id,slug,name,name_vi,mo_ta,mo_ta_vi,thu_tu')
      .eq('type', 'category').order('thu_tu').order('name');
    if (error) { opusSay(raw(error.message), true); return; }
    window.datNhomOpus(data || []);
    // Tên nhóm hiện cả trên bìa đĩa ở Home/Works, nên vẽ lại cả ba trang.
    window.veLaiDiaThan();
    return;
  }
  window.renderOpus();
}
window.loadOpus = loadOpus;

// ----- Sửa nhóm ngay tại chỗ, chỉ admin -----
// renderOpus() gọi hàm này mỗi lần vẽ danh sách của nhóm đang chọn.
// Cố ý có cả đổi tên lẫn xoá: nút "+ Thêm fandom/ship" trong form đăng bài KHÔNG
// có hai thứ này, và đó đúng là lý do lỗi gõ sai "Nevuillette/Furina" phải sửa
// bằng SQL. Đừng lặp lại ở đây.
window.dtNutSuaNhom = function (khung, g, soTruyen) {
  if (!(currentProfile && currentProfile.is_admin)) return;

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.className = 'mini-btn opus-sua-nut';
  nut.textContent = '✎';
  nut.title = tr('opus_sua');
  nut.setAttribute('aria-label', tr('opus_sua'));

  const form = document.createElement('div');
  form.className = 'opus-form';
  form.style.display = 'none';

  const o = (nhanKey, giaTri, nhieuDong) => {
    const f = document.createElement('div'); f.className = 'field';
    const l = document.createElement('label'); l.textContent = tr(nhanKey); f.append(l);
    const i = nhieuDong ? document.createElement('textarea') : document.createElement('input');
    if (nhieuDong) i.rows = 2;
    i.value = giaTri == null ? '' : giaTri;
    f.append(i); form.append(f);
    return i;
  };
  const iTen   = o('opus_f_ten',    g.name);
  const iTenVi = o('opus_f_ten_vi', g.name_vi);
  const iMo    = o('opus_f_mo',     g.mo_ta,    true);
  const iMoVi  = o('opus_f_mo_vi',  g.mo_ta_vi, true);
  const iThuTu = o('opus_f_thu_tu', g.thu_tu);

  const hang = document.createElement('div');
  hang.className = 'opus-form-nut';
  const luu = document.createElement('button');
  luu.type = 'button'; luu.className = 'mini-btn'; luu.textContent = tr('opus_luu');
  const xoa = document.createElement('button');
  xoa.type = 'button'; xoa.className = 'mini-btn danger'; xoa.textContent = tr('opus_xoa');
  hang.append(luu, xoa);
  form.append(hang);

  nut.addEventListener('click', () => {
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });

  luu.addEventListener('click', async () => {
    const ten = iTen.value.trim();
    if (!ten) { opusSay(tr('opus_can_ten'), true); return; }
    const thu = parseInt(iThuTu.value, 10);
    luu.disabled = true;
    const { error } = await sb.from('tags').update({
      name: ten,
      name_vi: iTenVi.value.trim() || null,
      mo_ta:    iMo.value.trim()   || null,
      mo_ta_vi: iMoVi.value.trim() || null,
      thu_tu: isNaN(thu) ? g.thu_tu : thu
    }).eq('id', g.id);
    luu.disabled = false;
    if (error) { opusSay(raw(error.message), true); return; }
    // Nạp lại TRƯỚC rồi mới báo: loadOpus() mở đầu bằng opusSay(null), báo
    // trước là câu vừa hiện đã bị xoá ngay (đúng bẫy đã gặp ở trang Bookmark).
    await loadOpus(true);
    opusSay(tr('opus_da_luu'));
  });

  xoa.addEventListener('click', async () => {
    // Nói rõ hậu quả: xoá nhóm thì truyện KHÔNG mất, chỉ mất chỗ xếp.
    if (!window.confirm(tr('opus_xoa_hoi').replace('%s', g.name).replace('%d', soTruyen))) return;
    xoa.disabled = true;
    const { error } = await sb.from('tags').delete().eq('id', g.id);
    xoa.disabled = false;
    if (error) { opusSay(raw(error.message), true); return; }
    // Truyện trong nhóm vừa xoá mất chỗ xếp → nạp lại cả danh sách truyện để bìa
    // của chúng chuyển về "Overture".
    const moi = await window.fetchWorksFromDB();
    if (moi && moi.length) window.applyWorksData(moi);
    await loadOpus(true);
    opusSay(tr('opus_da_xoa'));
  });

  khung.append(nut, form);
};

// ---------- Danh sách thành viên ----------
// Bảng profiles vốn đã cho đọc công khai (policy `true`, và anon có GRANT SELECT
// trên đủ các cột này), nên trang này không lộ thêm gì so với trước — nó chỉ làm
// thứ vốn đã công khai trở nên nhìn thấy được. Chủ repo chốt: chỉ thành viên xem.
function mbAvatar(p) {
  const box = document.createElement('span');
  box.className = 'mb-av';
  paintAvatar(box, p);       // dùng lại đúng hàm của trang hồ sơ
  return box;
}

// bio là chữ do BẤT KỲ người đăng ký nào nhập. Luôn dựng bằng textContent —
// đây là chỗ đầu tiên trong site đem bio ra hiển thị, dùng innerHTML ở đây là
// mở thẳng một lỗ XSS cho người lạ. (Trang About dùng innerHTML được vì chỉ
// admin ghi được vào bảng site_content.)
function mbDatBio(el, bio) {
  const s = (bio || '').trim();
  if (s) { el.className = 'mb-bio'; el.textContent = s; }
  else   { el.className = 'mb-bio mb-bio-trong'; el.textContent = tr('mb_chua_co_bio'); }
}

function mbNgay(iso) {
  const locale = (document.documentElement.getAttribute('data-lang') === 'vi') ? 'vi-VN' : 'en-GB';
  return new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'long' });
}

function mbTen(p) { return p.display_name || p.username || '—'; }

let mbDsCache = [];

async function loadMembers() {
  const el = $('mb-msg');
  el.className = 'auth-msg'; el.textContent = '';

  const { data: { session } } = await sb.auth.getSession();
  $('mb-canhbao').style.display = session ? 'none' : '';
  $('mb-ds').style.display      = session ? '' : 'none';
  if (!session) return;

  const { data, error } = await sb.from('profiles')
    .select('id, username, display_name, avatar_url, bio, is_admin, created_at')
    .order('created_at', { ascending: true });

  const ds = $('mb-ds');
  ds.textContent = '';
  if (error) {
    el.className = 'auth-msg show err';
    el.textContent = raw(error.message);
    return;
  }
  mbDsCache = data || [];

  mbDsCache.forEach(p => {
    // <button> chứ không phải <div>: bấm được bằng bàn phím và đọc màn hình
    // hiểu đây là thứ bấm được.
    const the = document.createElement('button');
    the.type = 'button';
    the.className = 'mb-the';
    the.addEventListener('click', () => { window.__xemThanhVien = p.id; window.showPage('member'); });

    the.append(mbAvatar(p));

    const than = document.createElement('div');
    than.className = 'mb-than';

    const ten = document.createElement('div');
    ten.className = 'mb-ten';
    ten.append(document.createTextNode(mbTen(p)));
    if (p.is_admin) {
      const badge = document.createElement('span');
      badge.className = 'admin-badge';
      badge.textContent = tr('prof_admin');
      ten.append(badge);
    }
    than.append(ten);

    const tay = document.createElement('div');
    tay.className = 'mb-tay';
    tay.textContent = '@' + (p.username || '') + ' · ' + tr('mb_tham_gia') + ' ' + mbNgay(p.created_at);
    than.append(tay);

    const bio = document.createElement('div');
    mbDatBio(bio, p.bio);
    than.append(bio);

    the.append(than);
    ds.append(the);
  });
}
window.loadMembers = loadMembers;

async function loadMember() {
  const o = $('mb-mot');
  o.textContent = '';
  const id = window.__xemThanhVien;
  if (!id) { window.showPage('members'); return; }

  // Ưu tiên bản đã có từ danh sách; vào thẳng bằng nút Back trình duyệt thì hỏi lại.
  let p = mbDsCache.find(x => x.id === id);
  if (!p) {
    const { data } = await sb.from('profiles')
      .select('id, username, display_name, avatar_url, bio, is_admin, created_at')
      .eq('id', id).maybeSingle();
    p = data;
  }
  if (!p) { window.showPage('members'); return; }

  const dau = document.createElement('div');
  dau.className = 'mb-dau';
  dau.append(mbAvatar(p));

  const khoi = document.createElement('div');
  const ten = document.createElement('div');
  ten.className = 'mb-ten';
  ten.append(document.createTextNode(mbTen(p)));
  if (p.is_admin) {
    const badge = document.createElement('span');
    badge.className = 'admin-badge';
    badge.textContent = tr('prof_admin');
    ten.append(badge);
  }
  const tay = document.createElement('div');
  tay.className = 'mb-tay';
  tay.textContent = '@' + (p.username || '') + ' · ' + tr('mb_tham_gia') + ' ' + mbNgay(p.created_at);
  khoi.append(ten, tay);
  dau.append(khoi);

  const hop = document.createElement('div');
  hop.className = 'mb-khoi-bio';
  const bio = document.createElement('div');
  mbDatBio(bio, p.bio);
  hop.append(bio);

  o.append(dau, hop);
}
window.loadMember = loadMember;

$('mb-dangnhap').addEventListener('click', () => window.showPage('auth', $('nav-signin')));

// ---------- Gửi yêu cầu ----------
function rqSay(key, isErr, tho) {
  const el = $('rq-msg');
  if (!key) { el.className = 'auth-msg'; delete el.dataset.i18n; el.textContent = ''; return; }
  el.className = 'auth-msg show ' + (isErr ? 'err' : 'ok');
  // Các chỗ gọi truyền raw(error.message) — một OBJECT {i18n:false, text}. Gán
  // thẳng object vào textContent là ra chữ "[object Object]" thay cho câu báo lỗi.
  if (key && key.i18n === false) { key = key.text; tho = true; }
  if (tho) { delete el.dataset.i18n; el.textContent = key; }
  else { el.dataset.i18n = key; el.textContent = tr(key); }
}

function demTu(s) {
  const t = (s || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

$('rq-body').addEventListener('input', () => {
  const n = demTu($('rq-body').value);
  $('rq-dem').textContent = n;
  // Đổi màu khi vượt, nhưng nút vẫn bấm được — database mới là chỗ chốt.
  $('rq-dem').style.color = n > 200 ? '#993C1D' : '';
});

$('rq-dangnhap').addEventListener('click', () => window.showPage('auth', $('nav-signin')));

const RQ_NHAN = { new:'rq_s_new', seen:'rq_s_seen', writing:'rq_s_writing',
                  done:'rq_s_done', declined:'rq_s_declined' };

// ---------- Chấm báo ----------
// Hai phép đếm khác nhau, cố ý:
//   bạn đọc  → yêu cầu CỦA MÌNH vừa đổi trạng thái (status_changed_at)
//   admin    → yêu cầu MỚI gửi tới (created_at)
// RLS lo phần "của mình": bạn đọc chỉ thấy hàng của họ, admin thấy hết.
async function docMocDaXem() {
  const { data } = await sb.from('notif_seen').select('requests_seen_at').maybeSingle();
  return data ? data.requests_seen_at : null;
}

function veCham(co) {
  const me = $('nav-me'), mucMenu = $('nav-requests');
  if (me) me.classList.toggle('co-cham', !!co);
  if (mucMenu) mucMenu.classList.toggle('co-cham', !!co);
}

async function tinhChamBao() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { veCham(false); return; }

  const moc = await docMocDaXem();
  const laAdmin = !!(currentProfile && currentProfile.is_admin);

  // head:true + count: chỉ hỏi số lượng, không kéo hàng nào về.
  let q = sb.from('requests').select('id', { count: 'exact', head: true });
  if (laAdmin) {
    if (moc) q = q.gt('created_at', moc);
  } else {
    q = q.not('status_changed_at', 'is', null);
    if (moc) q = q.gt('status_changed_at', moc);
  }
  const { count, error } = await q;
  veCham(!error && (count || 0) > 0);
}
window.tinhChamBao = tinhChamBao;

async function loadRequests() {
  rqSay(null);
  const { data: { session } } = await sb.auth.getSession();

  $('rq-canhbao').style.display = session ? 'none' : '';
  $('rq-form').style.display    = session ? '' : 'none';
  $('rq-cua-toi').style.display = session ? '' : 'none';
  if (!session) { veCham(false); return; }

  const laAdmin = !!(currentProfile && currentProfile.is_admin);
  // Đọc mốc TRƯỚC khi đánh dấu đã xem, để còn biết hàng nào là mới mà đánh dấu.
  const mocCu = await docMocDaXem();
  // Admin thấy hết kèm tên người gửi; bạn đọc chỉ thấy của mình — RLS đã lo,
  // ở đây chỉ đổi tiêu đề và xin thêm cột tên cho đúng vai.
  $('rq-ds-head').dataset.i18n = laAdmin ? 'rq_all' : 'rq_mine';
  $('rq-ds-head').textContent  = tr(laAdmin ? 'rq_all' : 'rq_mine');

  const { data, error } = await sb.from('requests')
    .select('id, body, feedback, status, admin_note, created_at, status_changed_at, profiles(username, display_name)')
    .order('created_at', { ascending: false });

  const ds = $('rq-ds');
  ds.textContent = '';
  if (error) { rqSay(raw(error.message), true, true); return; }
  if (!data || !data.length) {
    const tr0 = document.createElement('div');
    tr0.className = 'comments-empty';
    tr0.dataset.i18n = 'rq_trong';
    tr0.textContent = tr('rq_trong');
    ds.append(tr0);
  } else {
    const locale = (document.documentElement.getAttribute('data-lang') === 'vi') ? 'vi-VN' : 'en-GB';
    // "Mới" theo đúng phép đếm của từng vai — trùng khít với cái làm chấm sáng.
    const laMoi = r => laAdmin
      ? (!mocCu || r.created_at > mocCu)
      : (!!r.status_changed_at && (!mocCu || r.status_changed_at > mocCu));
    data.forEach(r => ds.append(veTheYeuCau(r, laAdmin, locale, laMoi(r))));
  }

  // Đã xem xong thì ghi mốc và tắt chấm. Làm SAU khi vẽ, để nhãn "Mới" ở trên
  // còn dựa được vào mốc cũ.
  await sb.rpc('danh_dau_da_xem_yeu_cau');
  veCham(false);
}
window.loadRequests = loadRequests;

// Dựng bằng DOM: nội dung yêu cầu là chữ người dùng nhập, không nhét vào innerHTML.
function veTheYeuCau(r, laAdmin, locale, moi) {
  const the = document.createElement('div');
  the.className = 'rq-the' + (moi ? ' rq-moi-doi' : '');

  const dau = document.createElement('div');
  dau.className = 'rq-the-dau';

  const ngay = document.createElement('span');
  ngay.className = 'rq-ngay';
  ngay.textContent = new Date(r.created_at).toLocaleDateString(locale,
    { year:'numeric', month:'short', day:'numeric' });
  dau.append(ngay);

  if (laAdmin && r.profiles) {
    const ai = document.createElement('span');
    ai.className = 'rq-ai';
    ai.textContent = r.profiles.display_name || r.profiles.username || '—';
    dau.append(ai);
  }

  if (moi) {
    const nhan = document.createElement('span');
    nhan.className = 'rq-nhan-moi';
    nhan.textContent = tr('rq_moi_nhan');
    dau.append(nhan);
  }

  const tt = document.createElement('span');
  tt.className = 'rq-trang s-' + r.status;
  tt.textContent = tr(RQ_NHAN[r.status] || 'rq_s_new');
  dau.append(tt);
  the.append(dau);

  const noi = document.createElement('div');
  noi.className = 'rq-noi';
  noi.textContent = r.body || '';
  the.append(noi);

  if (r.feedback) {
    const g = document.createElement('div');
    g.className = 'rq-gop';
    g.textContent = tr('rq_gop_nhan') + ' ' + r.feedback;
    the.append(g);
  }

  if (laAdmin) {
    const hang = document.createElement('div');
    hang.className = 'rq-dieu';
    Object.keys(RQ_NHAN).forEach(tt2 => {
      if (tt2 === r.status) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mini-btn';
      b.textContent = tr(RQ_NHAN[tt2]);
      b.addEventListener('click', async () => {
        b.disabled = true;
        const { error } = await sb.from('requests').update({ status: tt2 }).eq('id', r.id);
        if (error) { b.disabled = false; rqSay(raw(error.message), true, true); return; }
        loadRequests();
      });
      hang.append(b);
    });
    const xoa = document.createElement('button');
    xoa.type = 'button';
    xoa.className = 'mini-btn danger';
    xoa.textContent = tr('rq_xoa');
    xoa.addEventListener('click', async () => {
      if (!window.confirm(tr('rq_xoa_hoi'))) return;
      xoa.disabled = true;
      const { error } = await sb.from('requests').delete().eq('id', r.id);
      if (error) { xoa.disabled = false; rqSay(raw(error.message), true, true); return; }
      loadRequests();
    });
    hang.append(xoa);
    the.append(hang);
  }

  return the;
}

$('rq-gui').addEventListener('click', async () => {
  rqSay(null);
  const btn  = $('rq-gui');
  const body = $('rq-body').value.trim();
  const gop  = $('rq-feedback').value.trim();

  if (!body) { rqSay('rq_can_noi_dung', true); return; }
  if (demTu(body) > 200) { rqSay('rq_qua_dai', true); return; }
  if (gop && demTu(gop) > 200) { rqSay('rq_gop_qua_dai', true); return; }

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { rqSay('prof_need_signin', true); return; }

  busy(btn, true, 'rq_dang_gui');
  // Chỉ gửi hai cột này. user_id và status do trigger dưới database điền, và
  // grant insert cũng không cấp hai cột đó — sửa DOM cũng không lách được.
  const { error } = await sb.from('requests').insert({ body, feedback: gop || null });
  busy(btn, false, 'rq_send');

  if (error) {
    // PT429 là quy ước PostgREST cho "quá nhanh" — trigger chặn tần suất dùng nó.
    const qua = error.code === 'PT429' || /qua nhanh|chi gui duoc/i.test(error.message || '');
    rqSay(qua ? raw(error.message) : raw(error.message), true, true);
    return;
  }

  $('rq-body').value = ''; $('rq-feedback').value = ''; $('rq-dem').textContent = '0';
  rqSay('rq_da_gui', false);
  loadRequests();
});

// ---------- trang "Truyện đã lưu" ----------
// Dựng bằng dtVeBookmark() ở script cổ điển — cùng bìa đĩa + khung liner như Works,
// thêm dòng ngày lưu + nút Bỏ lưu dưới mỗi bìa.
function bmSay(key, isErr) {
  const el = $('bm-msg');
  if (!key) { el.className = 'auth-msg'; delete el.dataset.i18n; el.textContent = ''; return; }
  el.className = 'auth-msg show ' + (isErr ? 'err' : 'ok');
  el.dataset.i18n = key;
  el.textContent = tr(key);
}

// Trang Bookmark dựng ở script cổ điển (window.dtVeBookmark — cùng bìa đĩa và
// khung liner như Works). Module chỉ lo nạp danh sách và bỏ lưu.
async function loadBookmarks() {
  bmSay(null);
  window.dtVeBookmark(null, tr('bm_loading'));

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.dtVeBookmark(null, tr('prof_need_signin')); return; }

  // Chỉ lấy đúng cột cần. Bản đầy đủ của truyện lấy từ worksData; phần nhúng này
  // chỉ để dự phòng khi worksData chưa có truyện đó (vd. lúc DB còn chưa trả về).
  const { data, error } = await sb.from('bookmarks')
    .select('id, created_at, work_id, works!inner(id, legacy_id, title, subtitle, summary, warning_note,'
          + ' kudos_count, is_restricted, cover_url, language, word_count,'
          + ' work_fandoms(fandoms(name)), work_ships(ships(name)), work_tags(tags(slug,type)))')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) { window.dtVeBookmark(null, tr('bm_err')); return; }
  if (!data || !data.length) { window.dtVeBookmark([], tr('bm_empty')); return; }

  const rows = data.map(row => {
    const w = row.works;
    const idx = parseInt(String(w.legacy_id || '').replace(/\D/g, ''), 10);
    return {
      id: row.id, created_at: row.created_at, idx,
      w: isNaN(idx) ? null : {
        idx, uuid: w.id, title: w.title || '', subtitle: w.subtitle || '', summary: w.summary || '',
        fandom: (w.work_fandoms || []).map(x => x.fandoms.name)[0] || 'Others',
        ships: (w.work_ships || []).map(x => x.ships.name),
        warning: w.warning_note || '', restricted: !!w.is_restricted, cover: w.cover_url || '',
        lang: w.language || null, words: (typeof w.word_count === 'number') ? w.word_count : null,
        nch: null, music: [], kudos: w.kudos_count || 0,
        groupSlug: ((w.work_tags || []).map(x => x.tags).find(t0 => t0 && t0.type === 'category') || {}).slug || null
      }
    };
  });
  window.dtVeBookmark(rows, null, removeBookmark);
}
window.loadBookmarks = loadBookmarks;

async function removeBookmark(id, btn) {
  btn.disabled = true;
  btn.textContent = tr('bm_removing');
  const { data, error } = await sb.from('bookmarks').delete().eq('id', id).select('work_id');
  if (error) {
    btn.disabled = false; btn.textContent = tr('bm_remove');
    bmSay('bm_remove_err', true);
    return;
  }
  // Nút ✦ trên bìa ở các trang khác phải tắt theo.
  (data || []).forEach(r => window.skDaLuu.delete(r.work_id));
  window.dtVeLaiNutLuu();
  // Nạp lại TRƯỚC rồi mới báo: loadBookmarks() xoá trắng ô thông báo,
  // gọi ngược thứ tự là câu báo vừa hiện đã bị xoá ngay.
  await loadBookmarks();
  bmSay('bm_removed');
}

// ---------- nội dung chương cho trang đọc ----------
// Ba kết quả khác nhau, và trang đọc xử lý khác nhau ở từng cái:
//   mảng có phần tử -> nội dung thật
//   mảng rỗng       -> DB gọi được nhưng KHÔNG cho đọc (truyện bị hạn chế,
//                      hoặc chương còn draft). Không được lùi về file .txt,
//                      vì như vậy là vô hiệu hoá chính cái hạn chế đó.
//   null            -> không gọi được DB (project ngủ, mất mạng) -> mới lùi .txt
window.fetchChapters = async function (ficIdx) {
  const truyVan = sb.from('chapters')
    .select('position, title, content, music, works!inner(legacy_id)')
    .eq('works.legacy_id', 'fic-' + ficIdx)
    .eq('status', 'published')
    .order('position', { ascending: true })
    .then(res => res.error ? null : (res.data || []).map(r => ({
      position: r.position, title: r.title || '', content: r.content || '', music: r.music || null
    })))
    .catch(() => null);

  // supabase-js tự thử lại vài lần trước khi chịu thua, mất tới ~7 giây.
  // Người đọc không nên phải nhìn chữ "Loading" lâu như vậy khi project ngủ,
  // nên tự đặt hạn 4 giây rồi lùi về file .txt.
  const hetGio = new Promise(resolve => setTimeout(() => resolve(null), 4000));
  return Promise.race([truyVan, hetGio]);
};

// ---------- danh sách truyện cho Browse + trang chủ ----------
// Trả về mảng thẻ đã chuẩn hoá, hoặc null nếu không gọi được DB
// (script cổ điển sẽ giữ nguyên bản dựng từ fics.json).
//
// Không cần lọc is_restricted ở đây: policy SELECT của bảng works đã bỏ hẳn
// những hàng đó với khách chưa đăng nhập, nên truyện bị hạn chế biến mất khỏi
// danh sách — không lộ cả tên lẫn tóm tắt.
window.fetchWorksFromDB = async function () {
  try {
    // Cùng lúc nạp bảng nhóm Opus: bìa đĩa cần nhãn "Op. 1 / Suite II" và icon.
    // chapters(...) chỉ lấy trạng thái + nhạc để đếm số chương và tên bản nhạc —
    // KHÔNG lấy content. Với truyện Members only, khách nhận mảng rỗng (RLS), nên
    // số chữ phải lấy từ works.word_count (trigger giữ), đừng cộng từ chương.
    const [res, tRes] = await Promise.all([
      sb.from('works')
        .select('id, legacy_id, title, subtitle, summary, warning_note, featured, published_at,'
              + ' kudos_count, comment_count, cover_url, cover_crop, is_restricted, language, word_count, is_complete,'
              + ' work_fandoms(fandoms(name)), work_ships(ships(name)),'
              + ' work_tags(tags(slug,type)), chapters(position,status,music,published_at)')
        .eq('status', 'published'),
      sb.from('tags').select('id,slug,name,name_vi,mo_ta,mo_ta_vi,thu_tu')
        .eq('type', 'category').order('thu_tu').order('name')
    ]);
    const { data, error } = res;
    if (error || !data) return null;
    if (!tRes.error && window.datNhomOpus) window.datNhomOpus(tRes.data || []);

    // Tên nhạc: bỏ trùng (không phân biệt hoa thường), đổi " - " thành " — ".
    const tenNhac = ds => {
      const da = new Set();
      return ds.map(c => c.music && c.music.name).filter(Boolean)
        .map(s => String(s).replace(/\s+-\s+/g, ' — ').replace(/\s{2,}/g, ' ').trim())
        .filter(s => { const k = s.toLowerCase(); if (da.has(k)) return false; da.add(k); return true; });
    };

    // Chương mới nhất ra SAU ngày ra mắt truyện (hơn nửa ngày) = "movement mới". Mốc này đẩy truyện lên
    // New arrivals / Newest. Truyện Members only: khách nhận mảng chương rỗng → chỉ còn ngày ra mắt.
    const chuongMoi = w => {
      const goc = w.published_at ? new Date(w.published_at).getTime() : 0;
      let m = null;
      (w.chapters || []).forEach(c => {
        if (c.status !== 'published' || !c.published_at || c.position <= 1) return;
        const x = new Date(c.published_at).getTime();
        if (isNaN(x) || x <= goc + 12 * 3600e3) return;
        if (!m || x > m.x) m = { x, pos: c.position, at: c.published_at };
      });
      return m;
    };

    return data
      .map(w => ({ w, moi: chuongMoi(w) }))
      .map(({ w, moi }) => ({
        uuid: w.id,
        complete: !!w.is_complete,
        newMv: moi ? { pos: moi.pos, at: moi.at } : null,
        updated: moi ? moi.at : (w.published_at || ''),
        lang: w.language || null,
        words: (typeof w.word_count === 'number') ? w.word_count : null,
        nch: (w.chapters || []).filter(c => c.status === 'published').length || null,
        music: tenNhac((w.chapters || []).filter(c => c.status === 'published').sort((a, b) => a.position - b.position)),
        groupSlug: ((w.work_tags || []).map(x => x.tags).find(t0 => t0 && t0.type === 'category') || {}).slug || null,
        idx: parseInt(String(w.legacy_id).replace(/\D/g, ''), 10),
        title: w.title || '',
        subtitle: w.subtitle || '',
        fandom: (w.work_fandoms || []).map(x => x.fandoms.name)[0] || 'Others',
        warning: w.warning_note || '',
        summary: w.summary || '',
        ships: (w.work_ships || []).map(x => x.ships.name),
        featured: !!w.featured,
        date: w.published_at || '',
        kudos: w.kudos_count || 0,
        comments: w.comment_count || 0,
        restricted: !!w.is_restricted,
        cover: w.cover_url || '',
        coverCrop: !!w.cover_crop
      }))
      // Giữ đúng thứ tự cũ của trang Works: theo số thứ tự fic.
      .filter(d => !isNaN(d.idx))
      .sort((a, b) => a.idx - b.idx);
  } catch (_) {
    return null;
  }
};

// ---------- kudos & bookmark ----------
// Nối truyện đang đọc với hàng thật trong DB qua works.legacy_id = 'fic-<index>'.
// Đây là khoá THEO VỊ TRÍ: đánh số lại file trong fics/ sẽ làm kudos gắn nhầm
// truyện. Thêm fic mới thì luôn đánh số tiếp, đừng chèn vào giữa.
let waWork  = null;                            // { id, kudos_count }
let waFic   = null;                            // index đang đọc
let waMine  = { kudos:false, bookmark:false };
let waGuest = false;                           // khách này đã thả tim chưa
let waSeq   = 0;                               // chống chạy đua khi lật truyện nhanh

const guestKey = (id) => 'sk-kudos-' + id;
function guestGave(id) {
  try { return localStorage.getItem(guestKey(id)) === '1'; } catch (_) { return false; }
}
function markGuestGave(id) {
  try { localStorage.setItem(guestKey(id), '1'); } catch (_) {}
}

// Gắn data-i18n để applyLang() dịch lại khi đổi ngôn ngữ giữa chừng.
function waSay(key) {
  const el = $('wa-msg');
  if (!key) { delete el.dataset.i18n; el.textContent = ''; return; }
  el.dataset.i18n = key;
  el.textContent = tr(key);
}

function paintActions(session) {
  if (!waWork) return;
  const k = $('btn-kudos');
  const given = waMine.kudos || waGuest;

  $('kudos-count').textContent = waWork.kudos_count > 0 ? String(waWork.kudos_count) : '';
  $('kudos-icon').textContent  = given ? '♥' : '♡';
  k.classList.toggle('on', given);

  const kKey = given ? 'wa_kudos_done' : (session ? 'wa_kudos' : 'wa_kudos_guest');
  $('kudos-label').dataset.i18n = kKey;
  $('kudos-label').textContent  = tr(kKey);

  // Khách đã thả tim thì không rút lại được — danh tính khách chỉ dựa vào IP,
  // không xác minh được, nên nút thành trạng thái tĩnh. Thành viên đăng nhập
  // thì bấm lại để rút, đúng như policy DELETE dưới DB cho phép.
  k.disabled = given && !session;
  k.classList.toggle('done', given && !session);

  // Nút sửa chỉ hiện với admin. Đây chỉ là lớp giao diện — chặn thật nằm ở
  // policy UPDATE của works và chapters.
  $('btn-edit-work').style.display = (currentProfile && currentProfile.is_admin) ? '' : 'none';

  $('bookmark-icon').textContent = waMine.bookmark ? '★' : '☆';
  $('btn-bookmark').classList.toggle('on', waMine.bookmark);
  const bKey = waMine.bookmark ? 'wa_bookmarked' : 'wa_bookmark';
  $('bookmark-label').dataset.i18n = bKey;
  $('bookmark-label').textContent  = tr(bKey);
}

async function loadWorkActions(ficIdx) {
  const seq = ++waSeq;
  $('work-actions-wrap').style.display = 'none';
  waSay(null);
  waWork = null; waFic = ficIdx; waMine = { kudos:false, bookmark:false }; waGuest = false;

  const { data: work, error } = await sb.from('works')
    .select('id, kudos_count').eq('legacy_id', 'fic-' + ficIdx).maybeSingle();
  if (seq !== waSeq) return;                   // đã lật sang truyện khác
  if (error || !work) return;                  // chưa có trong DB thì không hiện gì
  waWork = work;

  const { data: { session } } = await sb.auth.getSession();
  if (seq !== waSeq) return;

  if (session) {
    const uid = session.user.id;
    const [k, b] = await Promise.all([
      sb.from('kudos').select('id').eq('work_id', work.id).eq('user_id', uid).maybeSingle(),
      sb.from('bookmarks').select('id').eq('work_id', work.id).eq('user_id', uid).maybeSingle()
    ]);
    if (seq !== waSeq) return;
    waMine.kudos    = !!k.data;
    waMine.bookmark = !!b.data;
  } else {
    // Khách không tra được hash IP của mình, nên nhớ tạm ở máy.
    waGuest = guestGave(work.id);
  }

  paintActions(session);
  $('work-actions-wrap').style.display = 'block';
}
window.loadWorkActions = loadWorkActions;

$('btn-edit-work').addEventListener('click', () => {
  if (waFic === null) return;
  window.__pwEditIdx = waFic;          // showPage đọc số này rồi nạp đúng truyện
  window.showPage('post');   // nav-post nằm trong menu đổ xuống, không phải mục nav để làm sáng
});

$('btn-kudos').addEventListener('click', async () => {
  if (!waWork) return;
  waSay(null);
  const { data: { session } } = await sb.auth.getSession();
  const given = waMine.kudos || waGuest;
  if (given && !session) return;

  const btn = $('btn-kudos');
  btn.disabled = true;

  if (given && session) {
    const { error } = await sb.from('kudos').delete()
      .eq('work_id', waWork.id).eq('user_id', session.user.id);
    btn.disabled = false;
    if (error) { waSay('wa_err'); return; }
    waMine.kudos = false;
    waWork.kudos_count = Math.max(0, waWork.kudos_count - 1);
    paintActions(session);
    waSay('wa_kudos_removed');
    return;
  }

  // Chỉ gửi work_id. user_id và guest_ip_hash do trigger dưới DB tự điền —
  // client không có quyền ghi hai cột đó nên không giả mạo được.
  const { error } = await sb.from('kudos').insert({ work_id: waWork.id });
  btn.disabled = false;

  if (error) {
    // 23505 = trùng unique → đã thả tim rồi (khách xoá localStorage rồi bấm lại,
    // hoặc cùng IP với một lượt trước đó). Không phải lỗi, chỉ báo lại cho đúng.
    if (error.code === '23505') {
      if (session) waMine.kudos = true;
      else { waGuest = true; markGuestGave(waWork.id); }
      paintActions(session);
      waSay('wa_kudos_already');
      return;
    }
    waSay('wa_err');
    return;
  }

  waWork.kudos_count += 1;
  if (session) { waMine.kudos = true; waSay('wa_kudos_thanks'); }
  else { waGuest = true; markGuestGave(waWork.id); waSay('wa_kudos_guest_thanks'); }
  paintActions(session);
});

$('btn-bookmark').addEventListener('click', async () => {
  if (!waWork) return;
  waSay(null);
  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    // Nhớ truyện đang đọc để đăng nhập xong quay lại đúng chỗ,
    // thay vì ném ra lỗi API khó hiểu.
    try { sessionStorage.setItem('sk-return-fic', String(waFic)); } catch (_) {}
    window.showPage('auth', $('nav-signin'));
    msg($('auth-msg'), 'wa_bm_signin', 'err');
    return;
  }

  const btn = $('btn-bookmark');
  btn.disabled = true;

  if (waMine.bookmark) {
    const { error } = await sb.from('bookmarks').delete()
      .eq('work_id', waWork.id).eq('user_id', session.user.id);
    btn.disabled = false;
    if (error) { waSay('wa_err'); return; }
    waMine.bookmark = false; paintActions(session); waSay('wa_bm_removed');
    window.skDaLuu.delete(waWork.id); window.dtVeLaiNutLuu();
    return;
  }

  // bookmarks không có trigger tự điền như kudos, phải gửi user_id;
  // policy INSERT vẫn buộc user_id = auth.uid() nên không ghi hộ người khác được.
  const { error } = await sb.from('bookmarks')
    .insert({ work_id: waWork.id, user_id: session.user.id });
  btn.disabled = false;
  if (error) { waSay('wa_err'); return; }
  waMine.bookmark = true; paintActions(session); waSay('wa_bm_added');
  window.skDaLuu.add(waWork.id); window.dtVeLaiNutLuu();
});

// ---------- nút ✦ trên khung liner notes (giao diện đĩa than) ----------
// Tập work_id người đang đăng nhập đã lưu, để nút ✦ hiện đúng trạng thái mà
// không phải hỏi DB mỗi lần mở một bìa. Nạp lại khi đăng nhập/đăng xuất.
window.skDaLuu = new Set();
async function napDaLuu(session) {
  if (!session) { window.skDaLuu = new Set(); window.dtVeLaiNutLuu(); return; }
  const { data, error } = await sb.from('bookmarks').select('work_id').eq('user_id', session.user.id);
  if (error) return;
  window.skDaLuu = new Set((data || []).map(r => r.work_id));
  window.dtVeLaiNutLuu();
}
window.dtLuuTruyen = async function (w, btn) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    // Giống nút Bookmark ở trang đọc: đăng nhập xong mở thẳng truyện đó.
    try { sessionStorage.setItem('sk-return-fic', String(w.idx)); } catch (_) {}
    window.showPage('auth', $('nav-signin'));
    msg($('auth-msg'), 'wa_bm_signin', 'err');
    return;
  }
  btn.disabled = true;
  const daLuu = window.skDaLuu.has(w.uuid);
  const { error } = daLuu
    ? await sb.from('bookmarks').delete().eq('work_id', w.uuid).eq('user_id', session.user.id)
    : await sb.from('bookmarks').insert({ work_id: w.uuid, user_id: session.user.id });
  btn.disabled = false;
  // 23505 = đã lưu từ trước (tab khác) — coi như lưu thành công.
  if (error && error.code !== '23505') { btn.title = tr('wa_err'); return; }
  if (daLuu) window.skDaLuu.delete(w.uuid); else window.skDaLuu.add(w.uuid);
  window.dtVeLaiNutLuu();
  // Đang ở trang Bookmark mà bỏ lưu bằng nút ✦ trên khung liner: nạp lại để
  // đĩa đó rời kệ ngay, đừng để nó nằm lại tới lần mở trang sau.
  if ($('page-bookmarks').classList.contains('active')) loadBookmarks();
};

// ---------- bình luận ----------
// Dùng lại work_id mà loadWorkActions() đã tra: cùng một truyện, khỏi hỏi DB hai lần.
let cmtRows    = [];      // dữ liệu thô của lần tải gần nhất, để vẽ lại khi đổi ngôn ngữ
let cmtSession = null;
let cmtSeq     = 0;

function cmtSay(key, isErr) {
  const el = $('cmt-msg');
  if (!key) { delete el.dataset.i18n; el.textContent = ''; el.className = 'cmt-msg'; return; }
  el.className = 'cmt-msg' + (isErr ? ' err' : '');
  el.dataset.i18n = key;
  el.textContent = tr(key);
}

// Avatar nhỏ trong danh sách. Dựng bằng DOM vì avatar_url là dữ liệu người lạ nhập.
function smallAvatar(prof, letterSrc) {
  const url = ((prof && prof.avatar_url) || '').trim();
  const letter = ((letterSrc || '♩').trim().charAt(0) || '♩').toUpperCase();
  const box = document.createElement('span');
  const fb = () => {
    const d = document.createElement('div');
    d.className = 'comment-avatar-fb';
    d.textContent = letter;
    return d;
  };
  if (!url) { box.appendChild(fb()); return box; }
  const img = document.createElement('img');
  img.className = 'comment-avatar';
  img.alt = '';
  img.addEventListener('error', () => { box.textContent = ''; box.appendChild(fb()); });
  img.src = url;
  box.appendChild(img);
  return box;
}

// Toàn bộ danh sách dựng bằng createElement/textContent — không có innerHTML nào
// chạm vào nội dung người dùng, nên không có đường nào chèn được HTML.
function renderComments() {
  closeReply();   // vẽ lại thì bỏ ô trả lời đang mở, tránh nó mồ côi
  const list = $('comments-list');
  list.textContent = '';

  if (!cmtRows.length) {
    const d = document.createElement('div');
    d.className = 'comments-empty';
    d.dataset.i18n = 'cmt_empty';
    d.textContent = tr('cmt_empty');
    list.appendChild(d);
    return;
  }

  const myId = cmtSession ? cmtSession.user.id : null;
  const locale = (document.documentElement.getAttribute('data-lang') === 'vi') ? 'vi-VN' : 'en-GB';

  // Cây đúng hai tầng. Trả lời của trả lời được gắn thẳng vào bình luận gốc
  // (xem openReply), nên ở đây không cần đệ quy.
  const goc = cmtRows.filter(c => !c.parent_id);
  const con = {};
  cmtRows.filter(c => c.parent_id).forEach(c => { (con[c.parent_id] = con[c.parent_id] || []).push(c); });
  // Bình luận gốc: mới nhất trước. Trả lời trong một mạch: cũ trước, để đọc xuôi.
  Object.values(con).forEach(a => a.sort((x, y) => new Date(x.created_at) - new Date(y.created_at)));

  const dung = (c, laTraLoi) => {
    const prof = c.profiles || null;
    const name = prof ? (prof.display_name || prof.username)
                      : (c.guest_name || tr('cmt_guest_default'));

    const item = document.createElement('div');
    item.className = 'comment-item' + (laTraLoi ? ' is-reply' : '');
    item.dataset.cid = c.id;
    item.appendChild(smallAvatar(prof, name));

    const main = document.createElement('div');
    main.className = 'comment-main';

    const head = document.createElement('div');
    head.className = 'comment-head';

    const who = document.createElement('span');
    who.className = 'comment-author';
    who.textContent = name;
    head.appendChild(who);

    if (prof && prof.is_admin) {
      const b = document.createElement('span');
      b.className = 'comment-badge';
      b.dataset.i18n = 'cmt_author';
      b.textContent = tr('cmt_author');
      head.appendChild(b);
    }

    const when = document.createElement('span');
    when.className = 'comment-date';
    when.textContent = new Date(c.created_at)
      .toLocaleDateString(locale, { day:'numeric', month:'short', year:'numeric' });
    head.appendChild(when);

    const rep = document.createElement('button');
    rep.type = 'button';
    rep.className = 'comment-reply';
    rep.dataset.i18n = 'cmt_reply';
    rep.textContent = tr('cmt_reply');
    rep.addEventListener('click', () => openReply(c, name, item));
    head.appendChild(rep);

    // Chỉ hiện nút xoá cho bình luận của chính mình. Người khác có bấm được
    // hay không thì policy DELETE dưới DB mới là chỗ quyết định.
    if (myId && c.user_id === myId) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'comment-del';
      del.dataset.i18n = 'cmt_delete';
      del.textContent = tr('cmt_delete');
      del.addEventListener('click', () => deleteComment(c.id, del));
      head.appendChild(del);
    }

    main.appendChild(head);

    const body = document.createElement('div');
    body.className = 'comment-body-text';
    body.textContent = c.body;
    main.appendChild(body);

    item.appendChild(main);
    return item;
  };

  goc.forEach(c => {
    list.appendChild(dung(c, false));
    (con[c.id] || []).forEach(k => list.appendChild(dung(k, true)));
  });
}

// Ô trả lời dựng ngay dưới bình luận được bấm. Mỗi lúc chỉ có một ô.
function closeReply() {
  const cu = document.querySelector('.cmt-reply-box');
  if (cu) cu.remove();
}

function openReply(c, tenNguoiDuocTraLoi, item) {
  closeReply();
  // Trả lời một trả lời thì vẫn gắn vào bình luận GỐC — giữ đúng hai tầng.
  const parentId = c.parent_id || c.id;

  const box = document.createElement('div');
  box.className = 'cmt-reply-box comment-form';

  const to = document.createElement('div');
  to.className = 'cmt-reply-to';
  to.append(document.createTextNode(tr('cmt_replying_to') + ' '));
  const b = document.createElement('b');
  b.textContent = tenNguoiDuocTraLoi;
  to.appendChild(b);
  box.appendChild(to);

  // Khách phải có tên; người đăng nhập thì lấy danh tính thật.
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.maxLength = 50;
  nameInput.placeholder = tr('cmt_name_ph');
  if (cmtSession) nameInput.style.display = 'none';
  box.appendChild(nameInput);

  // Bẫy bot y như form chính.
  const hp = document.createElement('div');
  hp.className = 'cmt-hp';
  hp.setAttribute('aria-hidden', 'true');
  const hpInput = document.createElement('input');
  hpInput.type = 'text'; hpInput.tabIndex = -1; hpInput.autocomplete = 'off';
  hp.appendChild(hpInput);
  box.appendChild(hp);

  const ta = document.createElement('textarea');
  ta.rows = 3; ta.maxLength = 10000;
  ta.placeholder = tr('cmt_reply_ph');
  box.appendChild(ta);

  const hang = document.createElement('div');
  hang.className = 'cmt-actions';
  const msg = document.createElement('span');
  msg.className = 'cmt-msg';
  const huy = document.createElement('button');
  huy.type = 'button'; huy.className = 'comment-reply';
  huy.textContent = tr('cmt_cancel');
  huy.addEventListener('click', closeReply);
  const gui = document.createElement('button');
  gui.type = 'button'; gui.className = 'ao3-link';
  gui.style.marginTop = '0';
  gui.textContent = tr('cmt_post');
  gui.addEventListener('click', () => sendReply(parentId, nameInput, hpInput, ta, gui, msg));
  hang.append(msg, huy, gui);
  box.appendChild(hang);

  item.insertAdjacentElement('afterend', box);
  ta.focus();
}

async function sendReply(parentId, nameInput, hpInput, ta, btn, msgEl) {
  const body = ta.value.trim();
  const say = (k, err) => { msgEl.className = 'cmt-msg' + (err ? ' err' : ''); msgEl.textContent = tr(k); };
  if (!body) { say('cmt_empty_body', true); ta.focus(); return; }

  // Bot điền vào ô ẩn thì im lặng nuốt, y như form chính.
  if (hpInput.value.trim() !== '') { closeReply(); cmtSay('cmt_replied'); return; }

  const { data: { session } } = await sb.auth.getSession();
  btn.disabled = true;
  btn.textContent = tr('cmt_posting');

  const row = session
    ? { work_id: waWork.id, body, user_id: session.user.id, parent_id: parentId }
    : { work_id: waWork.id, body, parent_id: parentId,
        guest_name: (nameInput.value.trim() || tr('cmt_guest_default')).slice(0, 50) };

  const { error } = await sb.from('comments').insert(row);
  btn.disabled = false;
  btn.textContent = tr('cmt_post');

  if (error) { say(error.code === 'PT429' ? 'cmt_too_fast' : 'cmt_post_err', true); return; }

  closeReply();
  cmtSay('cmt_replied');
  fetchComments();
}
window.repaintComments = () => { if (cmtRows.length || $('comments-list').children.length) renderComments(); };

async function fetchComments() {
  const seq = ++cmtSeq;
  const list = $('comments-list');
  list.textContent = '';
  const loading = document.createElement('div');
  loading.className = 'comments-empty';
  loading.textContent = tr('cmt_loading');
  list.appendChild(loading);

  if (!waWork) { list.textContent = ''; return; }

  const { data: { session } } = await sb.auth.getSession();
  if (seq !== cmtSeq) return;
  cmtSession = session;

  // Policy SELECT không lọc bình luận đã xoá mềm, phải tự lọc.
  // Không dùng select('*') — cột nào cần thì lấy đúng cột đó.
  const { data, error } = await sb.from('comments')
    .select('id, body, guest_name, user_id, parent_id, created_at, profiles(username, display_name, avatar_url, is_admin)')
    .eq('work_id', waWork.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (seq !== cmtSeq) return;
  if (error) {
    list.textContent = '';
    const d = document.createElement('div');
    d.className = 'comments-empty';
    d.textContent = tr('cmt_err');
    list.appendChild(d);
    return;
  }
  cmtRows = data || [];
  renderComments();
  paintCommentForm(session);
}

function paintCommentForm(session) {
  const asBox = $('cmt-as');
  // Ô tên khách ẩn/hiện theo SESSION chứ không theo currentProfile: đã đăng nhập
  // thì bình luận luôn gắn user_id, kể cả khi hồ sơ chưa kịp tải xong.
  if (!session) {
    asBox.style.display = 'none';
    $('comment-name').style.display = '';
    return;
  }
  asBox.style.display = '';
  $('comment-name').style.display = 'none';

  const p = currentProfile;
  const name = p ? (p.display_name || p.username) : (session.user.email || '').split('@')[0];
  const av = $('cmt-as-avatar');
  av.textContent = '';
  av.className = 'cmt-as-av';
  av.appendChild(smallAvatar(p, name));
  $('cmt-as-name').textContent = name;
}

function loadComments() {
  const wrap = $('comments-wrap');
  if (!wrap) return;
  // Truyện đang khoá thì giấu luôn khu bình luận: policy của bảng comments cũng
  // gác bằng can_read_work(), nên có hiện ô nhập thì gửi cũng bị từ chối —
  // thà đừng mời người ta gõ.
  wrap.style.display = window.skFicDangKhoa ? 'none' : 'block';
  // Đổi truyện thì gập lại và xoá trắng, tránh hiện nhầm bình luận của truyện trước.
  $('comments-body').style.display = 'none';
  $('comments-label').textContent = tr('cmt_show');
  $('comments-arrow').textContent = '▼';
  $('comments-list').textContent = '';
  $('comment-name').value = '';
  $('comment-text').value = '';
  $('comment-website').value = '';
  cmtRows = [];
  cmtSay(null);
}
window.loadComments = loadComments;

window.toggleComments = function () {
  const body = $('comments-body');
  const open = body.style.display === 'none';
  body.style.display = open ? 'block' : 'none';
  $('comments-label').textContent = open ? tr('cmt_hide') : tr('cmt_show');
  $('comments-arrow').textContent = open ? '▲' : '▼';
  if (open) fetchComments();
};

async function deleteComment(id, btn) {
  if (!window.confirm(tr('cmt_confirm_del'))) return;
  btn.disabled = true;
  btn.textContent = tr('cmt_deleting');

  // Xoá thật chứ không đặt is_deleted: trigger comment_count_trg chỉ chạy khi
  // INSERT/DELETE, xoá mềm sẽ để lại số đếm sai vĩnh viễn.
  const { error } = await sb.from('comments').delete().eq('id', id);
  if (error) {
    btn.disabled = false;
    btn.textContent = tr('cmt_delete');
    cmtSay('cmt_del_err', true);
    return;
  }
  cmtRows = cmtRows.filter((c) => c.id !== id);
  renderComments();
  cmtSay('cmt_deleted');
}

$('comment-submit').addEventListener('click', async () => {
  if (!waWork) return;
  const btn  = $('comment-submit');
  const body = $('comment-text').value.trim();
  cmtSay(null);

  if (!body) { cmtSay('cmt_empty_body', true); $('comment-text').focus(); return; }

  // Honeypot: người thật không thấy ô này nên luôn để trống. Bot điền bừa thì
  // dừng ở đây. Lưu ý: chỉ chặn bot đọc HTML — kẻ gọi thẳng API không đi qua
  // đường này, phần đó do trigger giới hạn tần suất dưới DB lo.
  if ($('comment-website').value.trim() !== '') {
    $('comment-text').value = '';
    cmtSay('cmt_posted');           // im lặng nuốt, không cho bot biết đã bị phát hiện
    return;
  }

  const { data: { session } } = await sb.auth.getSession();

  btn.disabled = true;
  btn.textContent = tr('cmt_posting');

  const row = session
    ? { work_id: waWork.id, body, user_id: session.user.id }
    : { work_id: waWork.id, body,
        guest_name: ($('comment-name').value.trim() || tr('cmt_guest_default')).slice(0, 50) };

  const { error } = await sb.from('comments').insert(row);

  btn.disabled = false;
  btn.textContent = tr('cmt_post');

  if (error) {
    // PT429 do trigger comments_rate_limit() ném ra khi gửi quá nhanh.
    cmtSay(error.code === 'PT429' ? 'cmt_too_fast' : 'cmt_post_err', true);
    return;
  }

  $('comment-text').value = '';
  cmtSay('cmt_posted');
  fetchComments();
});

// ---------- chuyển tab ----------
function showTab(which) {
  const isIn = which === 'signin';
  $('tab-signin').classList.toggle('active', isIn);
  $('tab-signup').classList.toggle('active', !isIn);
  $('form-signin').style.display = isIn ? '' : 'none';
  $('form-signup').style.display = isIn ? 'none' : '';
  clearMsg($('auth-msg'));
}
$('tab-signin').addEventListener('click', () => showTab('signin'));
$('tab-signup').addEventListener('click', () => showTab('signup'));

// ---------- đăng nhập ----------
$('form-signin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('si-submit');
  clearMsg($('auth-msg'));
  busy(btn, true, 'auth_signing_in');

  const { error } = await sb.auth.signInWithPassword({
    email: $('si-email').value.trim(),
    password: $('si-password').value
  });

  busy(btn, false, 'auth_signin_btn');
  if (error) { msg($('auth-msg'), raw(error.message), 'err'); return; }

  $('si-password').value = '';

  // Bấm Bookmark lúc chưa đăng nhập thì đưa về đúng truyện đang đọc dở,
  // chứ không quăng người ta sang trang hồ sơ rồi bỏ đó.
  let back = null;
  try { back = sessionStorage.getItem('sk-return-fic'); sessionStorage.removeItem('sk-return-fic'); }
  catch (_) {}
  if (back !== null && window.openFic) { window.openFic(Number(back)); return; }

  window.showPage('profile', $('nav-profile'));
});

// ---------- đăng ký ----------
$('form-signup').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('su-submit');
  const username = $('su-username').value.trim();
  clearMsg($('auth-msg'));

  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
    msg($('auth-msg'), 'auth_user_bad', 'err'); return;
  }

  busy(btn, true, 'auth_signing_up');

  // Kiểm tra trùng tên trước, để không rơi vào lỗi khó hiểu
  // 'Database error saving new user' do trigger tạo profile ném ra.
  const { data: taken } = await sb
    .from('profiles').select('username').eq('username', username).maybeSingle();
  if (taken) {
    busy(btn, false, 'auth_signup_btn');
    msg($('auth-msg'), 'auth_user_taken', 'err'); return;
  }

  const { data, error } = await sb.auth.signUp({
    email: $('su-email').value.trim(),
    password: $('su-password').value,
    // handle_new_user() đọc đúng khoá này để đặt username cho profile
    options: { data: { username } }
  });

  busy(btn, false, 'auth_signup_btn');

  if (error) {
    const dup = /duplicate|already|unique/i.test(error.message)
             || /Database error saving new user/i.test(error.message);
    msg($('auth-msg'), dup ? 'auth_user_taken' : raw(error.message), 'err');
    return;
  }

  $('su-password').value = '';

  // Nếu project bật xác nhận email thì chưa có session ngay.
  if (!data.session) {
    showTab('signin');
    msg($('auth-msg'), 'auth_confirm_email', 'ok');
    return;
  }
  window.showPage('profile', $('nav-profile'));
});

// ---------- quên mật khẩu ----------
$('btn-reset').addEventListener('click', async () => {
  const email = $('si-email').value.trim();
  clearMsg($('auth-msg'));
  if (!email) { msg($('auth-msg'), 'auth_reset_need_email', 'err'); return; }
  await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });
  // Cố tình luôn báo cùng một câu, dù email có tồn tại hay không,
  // để không lộ ra địa chỉ nào đã đăng ký.
  msg($('auth-msg'), 'auth_reset_sent', 'ok');
});

// ---------- lưu hồ sơ ----------
$('form-profile').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('pf-submit');
  clearMsg($('prof-msg'));

  const username = $('pf-username').value.trim();
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
    msg($('prof-msg'), 'auth_user_bad', 'err'); return;
  }

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { msg($('prof-msg'), 'prof_need_signin', 'err'); return; }

  busy(btn, true, 'prof_saving');

  const patch = {
    username,
    display_name: $('pf-display').value.trim() || null,
    bio:          $('pf-bio').value.trim() || null,
    avatar_url:   $('pf-avatar').value.trim() || null,
    ao3_url:      $('pf-ao3').value.trim() || null
  };

  const oldAvatar = currentProfile ? currentProfile.avatar_url : null;

  const { data, error } = await sb.from('profiles')
    .update(patch).eq('id', session.user.id)
    .select('username, display_name, bio, avatar_url, ao3_url, is_admin')
    .single();

  busy(btn, false, 'prof_save');

  if (error) {
    const dup = /duplicate|unique/i.test(error.message);
    msg($('prof-msg'), dup ? 'auth_user_taken' : raw(error.message), 'err');
    return;
  }
  // Sửa/xoá tay ô link cũng phải dọn file đã tải lên, không thì nó nằm lại mãi.
  dropStaleAvatar(oldAvatar, data.avatar_url, session.user.id);
  paintProfile(data);
  msg($('prof-msg'), 'prof_saved', 'ok');
});

// ---------- đăng xuất ----------
$('btn-signout').addEventListener('click', async () => {
  await sb.auth.signOut();
  window.showPage('home', document.querySelector('.nav-links a[data-page="home"]'));
});

// ---------- đồng bộ trạng thái ----------
sb.auth.onAuthStateChange((event, session) => {
  paintNav(session);
  // Đang đứng ở trang đọc mà đăng nhập/đăng xuất thì vẽ lại kudos/bookmark
  // theo danh tính mới, không để nút kẹt ở trạng thái cũ.
  if (waFic !== null && $('page-reading').classList.contains('active')) {
    loadWorkActions(waFic);
  }
  if (session) {
    clearMsg($('auth-msg'));
    loadProfile(session);
  } else {
    const laAdminTruoc = !!(currentProfile && currentProfile.is_admin);
    currentProfile = null;
    veLaiOpusNeuDoiVai(laAdminTruoc);
    if (window.ntLamMoi) window.ntLamMoi();   // vai admin đổi: trang Notes nạp lại (bản nháp xem trước)
    // Đang đứng ở trang hồ sơ mà mất session thì đẩy về trang đăng nhập.
    // (currentPage của site khai báo bằng `let` nên không nằm trên window —
    //  đọc trạng thái từ DOM thay vì đoán.)
    if ($('page-profile').classList.contains('active') || $('page-bookmarks').classList.contains('active')) {
      window.showPage('auth', $('nav-signin'));
    }
  }
});

// Chưa đăng nhập mà mở thẳng #profile (bookmark, refresh) thì chuyển sang đăng nhập.
async function guardProfile() {
  const { data: { session } } = await sb.auth.getSession();
  paintNav(session);
  if (session) loadProfile(session);
  const trangRieng = ["#profile", "#bookmarks"];
  if (!session && trangRieng.includes(window.location.hash)) {
    window.showPage('auth', $('nav-signin'));
    msg($('auth-msg'), 'prof_need_signin', 'err');
  }
}
loadAbout();
guardProfile();

// ---------- Notes · Listening Room ----------
// Trả về { rows, preview } hoặc null nếu không gọi được DB.
// Khách chỉ nhận note đã published (policy SELECT) và chỉ những note đang nằm trên bàn
// (programme_slot 1..4). Nếu bàn trống mà người xem là admin thì trả cả bản nháp
// (policy cho admin đọc) với cờ preview — để chủ repo xem placeholder mà không phải đăng.
// Cột cues là jsonb do admin ghi nên frontend phải tự kiểm lại hình dạng, đừng tin kiểu dữ liệu.
const NOTE_COLS = 'id, slug, title, piece, composer, opus, short_name, source, url, start_s, icon, sleeve,'
  + ' body, quote, cues, language, status, programme_slot, published_at,'
  + ' note_works(works(legacy_id, title, subtitle))';
window.fetchNotesFromDB = async function () {
  try {
    const { data, error } = await sb.from('notes').select(NOTE_COLS)
      .not('programme_slot', 'is', null).order('programme_slot');
    if (error || !data) return null;
    if (data.length || !(currentProfile && currentProfile.is_admin)) return { rows: data, preview: false };
    const r2 = await sb.from('notes').select(NOTE_COLS).order('created_at');
    if (r2.error || !r2.data) return null;
    return { rows: r2.data, preview: true };
  } catch (_) { return null; }
};

// ---------- Notes: công cụ viết note (chỉ admin; quyền ghi thật do RLS giữ) ----------
// Phần giao diện nằm ở notes-admin.js (script thường); ở đây chỉ có các hàm chạm DB.
const NOTE_ROW_COLS = ['slug', 'title', 'piece', 'composer', 'opus', 'short_name', 'source', 'url', 'start_s', 'icon', 'sleeve',
  'body', 'quote', 'cues', 'language', 'status', 'programme_slot'];
window.fetchNotesAdmin = async function () {
  try {
    const { data, error } = await sb.from('notes')
      .select('id, ' + NOTE_ROW_COLS.join(', ') + ', published_at, updated_at, note_works(work_id)')
      .order('programme_slot', { ascending: true, nullsFirst: false })
      .order('updated_at', { ascending: false });
    return error ? null : data;
  } catch (_) { return null; }
};
// Các bản nhạc đã dùng ở fic (chapters.music), bỏ trùng theo URL — để chọn lại khỏi phải dán link.
window.fetchTrackChoices = async function () {
  try {
    const { data, error } = await sb.from('chapters').select('music').not('music', 'is', null);
    if (error || !data) return [];
    const m = new Map();
    data.forEach(r => {
      const x = r.music; if (!x || !x.url || m.has(x.url)) return;
      m.set(x.url, { source: x.source, url: x.url, name: x.name || '', start: Number(x.start) || 0 });
    });
    return [...m.values()].sort((a, b) => (a.name || a.url).localeCompare(b.name || b.url));
  } catch (_) { return []; }
};
window.noteSlug = (piece) => {
  // pwSlug() cắt 60 ký tự; thêm 6 số cuối của mốc thời gian cho khỏi trùng (slug là UNIQUE).
  const base = pwSlug(piece) || 'note';
  return base + '-' + String(Date.now()).slice(-6);
};
// Lưu note rồi đồng bộ liên kết fic bằng cách so khớp (xoá cái bị gỡ, chèn cái mới) — không xoá-rồi-chèn.
// Trả { id, error }. Hỏng giữa chừng thì note đã lưu nhưng liên kết có thể chưa kịp cập nhật: không mất nội dung.
window.saveNote = async function (n, workIds) {
  if (!(currentProfile && currentProfile.is_admin)) return { error: { message: 'forbidden' } };
  const row = {}; NOTE_ROW_COLS.forEach(k => { row[k] = n[k]; });
  let id = n.id || null;
  if (id) {
    const r = await sb.from('notes').update(row).eq('id', id).select('id');
    if (r.error) return { error: r.error };
    if (!r.data || !r.data.length) return { error: { message: 'not-found' } };
  } else {
    const r = await sb.from('notes').insert(row).select('id').single();
    if (r.error) return { error: r.error };
    id = r.data.id;
  }
  const cur = await sb.from('note_works').select('work_id').eq('note_id', id);
  if (cur.error) return { id, error: cur.error };
  const have = new Set(cur.data.map(x => x.work_id)), want = new Set(workIds);
  const bo = [...have].filter(x => !want.has(x)), them = [...want].filter(x => !have.has(x));
  if (bo.length) { const r = await sb.from('note_works').delete().eq('note_id', id).in('work_id', bo); if (r.error) return { id, error: r.error }; }
  if (them.length) { const r = await sb.from('note_works').insert(them.map(w => ({ note_id: id, work_id: w }))); if (r.error) return { id, error: r.error }; }
  return { id, error: null };
};
window.deleteNote = async function (id) {
  const r = await sb.from('notes').delete().eq('id', id).select('id');
  return { error: r.error || ((!r.data || !r.data.length) ? { message: 'not-found' } : null) };
};
// Đưa note lên bàn ở slot (1..4) hoặc gỡ xuống (slot = null). Slot đang có note khác thì gỡ note đó trước
// (unique index không cho hai note chung slot); nếu bước gán hỏng thì trả note kia về chỗ cũ.
window.setNoteSlot = async function (id, slot, occupantId) {
  if (occupantId && occupantId !== id) {
    const a = await sb.from('notes').update({ programme_slot: null }).eq('id', occupantId).select('id');
    if (a.error) return { error: a.error };
  }
  const b = await sb.from('notes').update({ programme_slot: slot }).eq('id', id).select('id');
  if (b.error || !b.data || !b.data.length) {
    if (occupantId && occupantId !== id) await sb.from('notes').update({ programme_slot: slot }).eq('id', occupantId);
    return { error: b.error || { message: 'not-found' } };
  }
  return { error: null };
};
