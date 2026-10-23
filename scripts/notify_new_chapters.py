#!/usr/bin/env python3
"""Gửi mail báo chương mới cho những thành viên đã bấm "Email me new movements" ở trang đọc.

Chạy bằng GitHub Action .github/workflows/notify-new-chapters.yml (15 phút/lần, hoặc bấm chạy tay).
Chỉ dùng thư viện chuẩn của Python — không cần cài gì.

Luồng: hỏi DB các chương đã đăng mà chưa báo (hàm notify_pending, migration 30) → gom theo truyện →
mỗi người nhận một mail riêng (có link huỷ của riêng họ) → đánh dấu đã báo (notify_mark_sent).
Lần chạy hỏng giữa chừng (mất mạng, sai mật khẩu Gmail) thì chương chưa được đánh dấu, lần sau tự gửi bù.

Biến môi trường:
  SUPABASE_URL, SUPABASE_KEY   publishable key — công khai, đã nằm trong accounts.js
  NOTIFY_SECRET                GitHub Secret: mã trong app_private.secrets 'notify_secret' (dạng hex)
  GMAIL_USER                   GitHub Secret: địa chỉ Gmail gửi đi
  GMAIL_APP_PASSWORD           GitHub Secret: App Password 16 ký tự của Gmail đó (không phải mật khẩu đăng nhập)
  SITE_URL                     mặc định https://shostakid.github.io/
  DRY_RUN=1                    chỉ in ra sẽ gửi gì, không gửi, không đánh dấu

Mẫu mail (tiếng Anh): scripts/mail/new_chapter.txt — dòng đầu là "Subject: …",
phần còn lại là thân mail. Tuỳ chọn thêm scripts/mail/new_chapter.html (bản HTML).
Chỗ được thay: {{url}} link tới chương mới · {{unsubscribe}} link huỷ nhận mail · {{title}} tên truyện ·
{{chapter}} tên chương. Mẫu không có {{unsubscribe}} thì script tự thêm một dòng huỷ ở cuối.
"""
import json
import os
import re
import smtplib
import ssl
import sys
import time
import urllib.error
import urllib.request
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from html import escape
from pathlib import Path

GOC = Path(__file__).resolve().parent
MAU_TXT = GOC / 'mail' / 'new_chapter.txt'
MAU_HTML = GOC / 'mail' / 'new_chapter.html'


def env(ten, mac_dinh=None):
    v = os.environ.get(ten, '').strip()
    return v or mac_dinh


def rpc(url, key, ten, payload):
    req = urllib.request.Request(
        url.rstrip('/') + '/rest/v1/rpc/' + ten,
        data=json.dumps(payload).encode(),
        headers={'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'},
        method='POST')
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode() or 'null')
    except urllib.error.HTTPError as e:
        raise SystemExit(f'::error::RPC {ten} trả về HTTP {e.code}: {e.read().decode()[:300]}')


def doc_mau():
    if not MAU_TXT.exists():
        raise SystemExit(f'::error::Thiếu mẫu mail {MAU_TXT.relative_to(GOC.parent)}')
    dong = MAU_TXT.read_text(encoding='utf-8').splitlines()
    if not dong or not dong[0].lower().startswith('subject:'):
        raise SystemExit('::error::Dòng đầu của new_chapter.txt phải là "Subject: …"')
    tieu_de = dong[0].split(':', 1)[1].strip()
    than = '\n'.join(dong[1:]).strip('\n') + '\n'
    html = MAU_HTML.read_text(encoding='utf-8') if MAU_HTML.exists() else None
    return tieu_de, than, html


def dien(mau, gia_tri, la_html=False):
    def thay(m):
        v = gia_tri.get(m.group(1).strip().lower(), m.group(0))
        return escape(v, quote=True) if la_html else v
    return re.sub(r'\{\{\s*([a-zA-Z_]+)\s*\}\}', thay, mau)


def link_chuong(site, legacy_id, vi_tri):
    so = re.sub(r'\D', '', legacy_id or '')
    return site + '#fic-' + so + ('/' + str(vi_tri) if vi_tri and vi_tri > 1 else '')


def main():
    url, key = env('SUPABASE_URL'), env('SUPABASE_KEY')
    bi_mat = env('NOTIFY_SECRET')
    gmail, mat_khau = env('GMAIL_USER'), (env('GMAIL_APP_PASSWORD') or '').replace(' ', '')
    site = env('SITE_URL', 'https://shostakid.github.io/')
    if not site.endswith('/'):
        site += '/'
    thu = env('DRY_RUN') == '1'

    thieu = [t for t, v in [('SUPABASE_URL', url), ('SUPABASE_KEY', key), ('NOTIFY_SECRET', bi_mat),
                            ('GMAIL_USER', gmail), ('GMAIL_APP_PASSWORD', mat_khau)] if not v and not (thu and t.startswith('GMAIL'))]
    if thieu:
        # Chưa cài Secrets: báo rồi thoát êm, để workflow chạy 15 phút/lần không đỏ suốt trước khi cài.
        print('::notice::Chưa đủ cấu hình (' + ', '.join(thieu) + ') — bỏ qua lượt này.')
        return 0

    cho = rpc(url, key, 'notify_pending', {'p_secret': bi_mat}) or []
    if not cho:
        print('Không có chương mới nào chờ báo.')
        return 0

    # Gom theo truyện: hai chương cùng truyện đăng một lúc thì mỗi người chỉ nhận một mail, dẫn tới chương sớm nhất.
    theo_truyen = {}
    for c in cho:
        theo_truyen.setdefault(c['work_id'], []).append(c)

    tieu_de_mau, than_mau, html_mau = doc_mau()
    smtp = None
    loi = 0
    try:
        for ds in theo_truyen.values():
            ds.sort(key=lambda c: c['position'])
            dau = ds[0]
            nguoi_nhan = dau.get('recipients') or []
            ten = dau['title'] + (': ' + dau['subtitle'] if dau.get('subtitle') else '')
            ten_chuong = dau.get('chapter_title') or ('Movement ' + str(dau['position']))
            link = link_chuong(site, dau['legacy_id'], dau['position'])
            print(f'{ten} · {ten_chuong} → {len(nguoi_nhan)} người nhận · {link}')

            for r in nguoi_nhan:
                huy = site + '#unsub=' + r['token']
                gia_tri = {'url': link, 'unsubscribe': huy, 'title': ten, 'chapter': ten_chuong}
                than = dien(than_mau, gia_tri)
                if '{{unsubscribe' not in than_mau.replace(' ', ''):
                    than += '\n—\nUnsubscribe from this work:' + huy + '\n'
                if thu:
                    # Log của Action trong repo công khai ai cũng xem được → không in nguyên địa chỉ mail.
                    e = r['email']
                    print('  [DRY_RUN] →', e[:2] + '***' + e[e.find('@'):])
                    continue
                if smtp is None:
                    smtp = smtplib.SMTP_SSL('smtp.gmail.com', 465, context=ssl.create_default_context(), timeout=30)
                    smtp.login(gmail, mat_khau)
                m = EmailMessage()
                m['From'] = formataddr(('ShostaKid', gmail))
                m['To'] = r['email']
                m['Subject'] = dien(tieu_de_mau, gia_tri)
                m['Message-ID'] = make_msgid(domain='shostakid.github.io')
                m['List-Unsubscribe'] = '<' + huy + '>'
                m.set_content(than)
                if html_mau:
                    m.add_alternative(dien(html_mau, gia_tri, la_html=True), subtype='html')
                try:
                    smtp.send_message(m)
                except smtplib.SMTPException as e:
                    loi += 1
                    print(f'::warning::Gửi tới một người nhận thất bại: {e.__class__.__name__}')
                time.sleep(1)   # Gmail không thích gửi dồn

            if not thu:
                # Đánh dấu cả các chương của truyện này, kể cả khi vài người nhận lỗi — để không gửi lặp cho người khác.
                rpc(url, key, 'notify_mark_sent', {'p_secret': bi_mat, 'p_chapter_ids': [c['chapter_id'] for c in ds]})
    finally:
        if smtp is not None:
            try:
                smtp.quit()
            except smtplib.SMTPException:
                pass

    return 1 if loi else 0


if __name__ == '__main__':
    sys.exit(main())
