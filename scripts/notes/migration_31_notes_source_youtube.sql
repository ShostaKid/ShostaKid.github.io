-- Migration 31: Notes desk nhận nguồn nhạc YouTube.
-- notes.source có check chỉ cho github | musopen | archive | soundcloud; thêm youtube.
-- Chỉ nới một ràng buộc check, không đụng dữ liệu hay quyền. (chapters.music / site_content là jsonb, không có ràng buộc nguồn.)
alter table public.notes drop constraint if exists notes_source_check;
alter table public.notes add constraint notes_source_check
  check (source = any (array['github'::text, 'musopen'::text, 'archive'::text, 'soundcloud'::text, 'youtube'::text]));
