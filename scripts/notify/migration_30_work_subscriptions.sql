-- Migration 30 · work_subscriptions_and_chapter_notify
-- Nhận mail khi truyện có chương mới. Chỉ thành viên đăng nhập (email đã xác minh). Mail do GitHub Action
-- notify-new-chapters gửi (scripts/notify_new_chapters.py), không phải Supabase.
-- CHƯA CHẠY — chờ chủ repo duyệt (quy tắc trong CLAUDE.md).

-- 1) Đăng ký theo từng truyện ------------------------------------------------------------------------
create table public.work_subscriptions (
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  work_id     uuid        not null references public.works(id)    on delete cascade,
  unsub_token uuid        not null default gen_random_uuid() unique,   -- mã trong link "huỷ nhận mail"
  created_at  timestamptz not null default now(),
  primary key (user_id, work_id)
);
create index work_subscriptions_work_idx on public.work_subscriptions (work_id);

alter table public.work_subscriptions enable row level security;

create policy "work_subscriptions: chi xem cua minh" on public.work_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
-- Chỉ đăng ký được truyện mình đọc được (truyện Members only thì đã đăng nhập là đọc được).
create policy "work_subscriptions: tu dang ky" on public.work_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()) and public.can_read_work(work_id));
create policy "work_subscriptions: tu huy" on public.work_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- GRANT theo cột: client KHÔNG đọc được unsub_token (người khác có token là huỷ hộ được), không tự đặt created_at.
grant select (user_id, work_id, created_at) on public.work_subscriptions to authenticated;
grant insert (user_id, work_id)             on public.work_subscriptions to authenticated;
grant delete                                on public.work_subscriptions to authenticated;

-- 2) Đánh dấu chương đã báo ------------------------------------------------------------------------
-- null = chưa báo. Chương được đăng LẦN ĐẦU (insert published, hoặc draft → published) thì còn null và sẽ
-- được báo ở lượt chạy sau; sửa chữ chương cũ không đổi cột này nên không gửi lại.
alter table public.chapters add column notified_at timestamptz;

-- Mọi chương đang có coi như đã báo — không gửi mail hàng loạt cho chương cũ. Tạm tắt trigger chapters_touch
-- để không đè updated_at của cả 90+ chương (trigger word count chỉ chạy khi đổi word_count/status/work_id).
alter table public.chapters disable trigger chapters_touch;
update public.chapters set notified_at = coalesce(published_at, now()) where status = 'published';
alter table public.chapters enable trigger chapters_touch;

-- 3) Mã bí mật cho script gửi mail ------------------------------------------------------------------
-- 24 byte ngẫu nhiên. Chủ repo tự lấy ra (SQL editor) và dán vào GitHub Secret NOTIFY_SECRET:
--   select encode(value, 'hex') from app_private.secrets where name = 'notify_secret';
insert into app_private.secrets (name, value) values ('notify_secret', extensions.gen_random_bytes(24));

-- 4) Hai hàm cho script (gọi bằng publishable key + mã bí mật; KHÔNG cần service_role) --------------
create or replace function public.notify_pending(p_secret text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare ok boolean;
begin
  select encode(s.value, 'hex') = p_secret into ok from app_private.secrets s where s.name = 'notify_secret';
  if not coalesce(ok, false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'chapter_id',    c.id,
             'work_id',       w.id,
             'legacy_id',     w.legacy_id,
             'title',         w.title,
             'subtitle',      w.subtitle,
             'position',      c.position,
             'chapter_title', c.title,
             'recipients',    coalesce((
                select jsonb_agg(jsonb_build_object('email', u.email, 'token', ws.unsub_token))
                from public.work_subscriptions ws
                join auth.users u on u.id = ws.user_id
                where ws.work_id = w.id and u.email_confirmed_at is not null
              ), '[]'::jsonb)
           ) order by c.published_at, c.position)
    from public.chapters c
    join public.works w on w.id = c.work_id
    where c.status = 'published' and c.notified_at is null and w.status = 'published'
  ), '[]'::jsonb);
end $$;

create or replace function public.notify_mark_sent(p_secret text, p_chapter_ids uuid[])
returns integer
language plpgsql security definer set search_path = ''
as $$
declare ok boolean; n integer;
begin
  select encode(s.value, 'hex') = p_secret into ok from app_private.secrets s where s.name = 'notify_secret';
  if not coalesce(ok, false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.chapters set notified_at = now()
   where id = any (p_chapter_ids) and notified_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- 5) Huỷ bằng link trong mail (#unsub=<mã>) — không cần đăng nhập. Trả về tên truyện, mã sai/đã dùng → null.
create or replace function public.unsubscribe_by_token(p_token uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare ten text;
begin
  delete from public.work_subscriptions ws
   using public.works w
   where ws.unsub_token = p_token and w.id = ws.work_id
  returning w.title into ten;
  return ten;
end $$;

-- EXECUTE mặc định cấp cho PUBLIC → phải revoke PUBLIC trước (bài học migration 8), rồi cấp đúng chỗ.
revoke execute on function public.notify_pending(text)              from public;
revoke execute on function public.notify_mark_sent(text, uuid[])    from public;
revoke execute on function public.unsubscribe_by_token(uuid)        from public;
-- Script gọi qua PostgREST bằng publishable key (role anon); mã bí mật mới là thứ chặn thật.
grant  execute on function public.notify_pending(text)              to anon;
grant  execute on function public.notify_mark_sent(text, uuid[])    to anon;
grant  execute on function public.unsubscribe_by_token(uuid)        to anon, authenticated;
