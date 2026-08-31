# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này.

## Dự án là gì

**ShostaKid.github.io** — fanfic archive cá nhân của ShostaKid, theo phong cách AO3
nhưng giao diện riêng (gothic/classical, hai theme sáng-tối, song ngữ EN/VI).
Truyện được đặt tên theo tác phẩm cổ điển (Toccata, Nocturne, Piano Concerto...),
mỗi "chapter" là một "movement". Fandom chính: Figure Skating RPF, Reverse: 1999,
Honkai: Star Rail, Genshin Impact, Spider-Verse.

Repo anh em: **ShostaKid/DaVaoTruyenRa** — bản tiếng Việt của cùng website.
Chưa đụng tới trong giai đoạn này, nhưng mọi thay đổi schema/backend sau này
phải tính đến việc nó cũng sẽ dùng chung backend.

## Stack hiện tại

- **Static site thuần**, không build step cho frontend, không framework, không bundler.
- Host trên **GitHub Pages** (`ShostaKid.github.io`).
- `index.html` (~1.900 dòng) là **toàn bộ website**: CSS inline (dòng 8–445),
  HTML của cả 4 "page" (home / works / reading / about) trong cùng một file,
  JS inline (dòng 884–1876). Điều hướng là SPA thủ công bằng `showPage(id)`.
- Nội dung truyện: đọc từ **`chapters.content` trong Supabase** (bước 6), vẫn qua
  `txtToHtml()` để dựng HTML. File `.txt` ở gốc repo (63 file) **giữ lại làm dự
  phòng** khi không gọi được DB — chủ repo đã chốt không xoá.
- Nhạc nền per-chapter: file audio host trên **GitHub Releases** (tag `music-v1`),
  phát bằng `<audio>` với `start`/`end` offset.
- State phía client: `localStorage` (`sk-continue` = vị trí đọc dở, `sk-fontsize`).

### Dữ liệu truyện đang nằm ở đâu

Có **hai nguồn song song, phải sửa cả hai khi thêm/sửa fic**:

1. **`fics/*.yaml`** — nguồn chuẩn cho *trình đọc*. Mỗi fic một file, tên
   `NNN-slug.yaml`; số `NNN` quyết định thứ tự và cũng chính là index `openFic(i)`.
   Build bằng `scripts/build_fics.py` (chạy tự động qua GitHub Action
   `.github/workflows/build-fics.yml`) → gộp thành **`fics.json`** ở gốc repo,
   và Action tự commit ngược lại. Frontend `fetch('fics.json')` lúc load.

   Schema YAML (bắt buộc: `title`, `fandom`, `files`, `chapters`):
   ```yaml
   title: Piano concerto no.2 in F major
   subtitle: For you                    # hoặc null
   fandom: Figure Skating RPF           # chuỗi tự do, 1 giá trị duy nhất
   warning: null                        # chuỗi tự do hoặc null
   summary: ...                         # có thể chứa HTML thô (<p>, <em>)
   tags: [Anna Shcherbakova/Alexandra Trusova]   # thực chất là SHIP, không phải tag tự do
   date: '2026-07-17'
   featured: false                      # true → hiện ở mục "My Favorite Children"
   music:                               # object đơn HOẶC array song song với chapters
     - {source: github, url: ..., start: 15}
   musicName: Shostakovich - Piano concerto no.2   # string HOẶC array
   files: [Piano concerto 2.1.txt, ...] # tên file .txt ở gốc repo, theo thứ tự chapter
   chapters: [Movement I, Movement II]  # tên chapter, cùng độ dài với files
   ```

2. ~~Thẻ `.fic-card` hard-code trong `index.html`~~ — **đã xoá hết ở bước 5.**
   36 thẻ viết tay không còn nữa; trang Works và trang Home đều dựng từ Supabase.
   `fics.json` giờ có hai việc: cấp `files` / `chapters` / `music` cho trình đọc,
   và làm **bản dự phòng** cho danh sách khi không gọi được DB.

Ba nguồn này **phải luôn khớp nhau**. Sửa fic là sửa cả YAML lẫn DB, rồi để
Action dựng lại `fics.json`. Cách kiểm nhanh xem có lệch không: băm
`title|subtitle|summary` và `warning|ships` và `fandom` ở hai phía rồi so
(xem lịch sử hội thoại bước 5 — lần đó bắt được 30 chỗ lệch).

### Những chỗ đã biết là lệch / nợ kỹ thuật

- ~~`Violin concerto 2.3.txt` không tồn tại; 2 file mồ côi~~ — **đã xử xong ở bước 6.**
  Thực tế là **3** file mồ côi chứ không phải 2, và hai trong số đó là truyện thật
  chưa có ở đâu khác: chương 3 của fic-34 (nằm dưới cái tên
  `Violin_concerto_no.2_movement_III_trusokova (1).txt`) và chương 3 của fic-32.
  Cả hai đã vào DB + YAML, `published`. File thứ ba (`Sonata for cello.txt`) không
  thuộc fic nào nên đã xoá. Giờ 63 file `.txt` = 63 chương, khớp một-một.
- Ship bị gõ sai chính tả tạo thành tag trùng lặp: `Neuvillette/Furina` vs
  `Nevuillette/Furina` — cùng một ship, đã gộp.
- **`Khaslana/Cyrne` KHÔNG phải lỗi gõ của `Phainon/Cyrene`.** Hai nhãn này cùng
  gắn trên `014-impromptu-no2` (nội dung cuckold: Cyrene đi với "bạn" Khaslana,
  còn Phainon nghĩ khác) → đó là hai ship khác nhau, gộp lại là làm hỏng nghĩa
  của truyện. Chỉ sửa lỗi gõ `Cyrne` → `Cyrene`.
- `const REPO` (dòng ~911) trỏ raw content sang tài khoản khác:
  `lavaknight2017-rgb/ShostaKid.github.io`. Nội dung truyện đang được tải từ đó.
- ~~Khoá anon của project cũ `ggbahdhmtgaemgblfdum` nằm trong `index.html`~~ —
  **đã xoá ở bước 4** cùng toàn bộ khối comment cũ. Project đó (ap-south-1) đang
  paused và không còn được tham chiếu ở đâu trong repo.

## Kế hoạch đang làm

Rebuild sang backend thật trên **Supabase**, **giữ nguyên giao diện hiện tại**:

- Tài khoản người dùng thật (Supabase Auth) thay cho comment ẩn danh.
- Kudos / bookmark / comment kiểu AO3.
- Works, chapters, tag, fandom, ship, warning chuyển từ YAML/HTML hard-code
  sang bảng Postgres; nội dung chapter chuyển từ file `.txt` sang cột trong DB
  (hoặc Supabase Storage), bỏ dần `fics.json` + thẻ hard-code.
- Đa phương tiện (nhạc, ảnh) chuyển dần sang Supabase Storage thay cho GitHub Releases.
- Frontend dự kiến vẫn dùng `supabase-js` từ CDN trong `index.html`, chưa đổi sang framework.

Project Supabase đích: **`oseddxgmwbeduazbomuf`** ("ShostaKid update web",
ap-northeast-1, ACTIVE) — schema `public` đã có đủ 12 bảng và toàn bộ dữ liệu truyện.

### Quy tắc bắt buộc

- **RLS (Row Level Security) là BẮT BUỘC cho MỌI bảng mới.** Không được tạo bảng
  trong schema `public` mà không `ENABLE ROW LEVEL SECURITY` và không có policy
  tương ứng. Bảng bật RLS mà không có policy = chặn hết, đó là mặc định an toàn;
  bảng không bật RLS = lộ toàn bộ dữ liệu qua anon key của PostgREST.
- Không bao giờ đưa `service_role` key vào code frontend hay commit vào repo.
  Chỉ `anon` / publishable key mới được xuất hiện ở client.
- **Không chạy migration / tạo bảng thật khi chưa được chủ repo duyệt rõ ràng.**
  Trình bày SQL ra trước, đợi xác nhận rồi mới `apply_migration`.
- Giai đoạn hiện tại: **không sửa giao diện, không đụng vào file web**
  (`index.html`, CSS, các file `.txt`) trừ khi được yêu cầu.

## Trạng thái backend (cập nhật 2026-08-30)

Schema đã được **tạo thật** trên project `oseddxgmwbeduazbomuf`. 12 bảng, 36 policy,
8 function, RLS bật đủ 12/12. Dữ liệu: 36 fic, 63 chương (tất cả published).

Migration đã chạy, theo thứ tự:

1. `enums_and_utility_functions`
2. `core_tables`
3. `security_helper_functions`
4. `enable_rls_and_policies`
5. `triggers_signup_moderation_counters`
6. `harden_function_search_path_and_execute`
7. `grant_dml_to_api_roles`
8. `revoke_trigger_function_execute_from_public`
9. `create_avatars_bucket`
10. `lock_down_rls_auto_enable`
11. `kudos_allow_guests`
12. `comments_rate_limit`
13. `restrict_posting_to_admin`
14. `restrict_tag_creation_to_admin`
15. `auto_assign_legacy_id`
16. `create_work_images_bucket`
17. `fix_chapters_insert_allow_admin`

### Ba cái bẫy đã gặp — đừng lặp lại

- **`GRANT` không tự có.** Project này (tạo 2026-08-29) không còn default privileges
  cấp DML cho `anon` / `authenticated`. Bảng mới tạo ra chỉ có REFERENCES/TRIGGER/TRUNCATE
  → API trả `permission denied` dù policy viết đúng hoàn toàn. **Mỗi bảng mới phải
  `grant` tường minh**, RLS chỉ lọc dòng chứ không thay được `grant`.
- **RLS không chặn được cột.** `anon` có quyền INSERT vào `comments` nên phải cấp
  `grant insert (danh_sach_cot)` thay vì cấp cả bảng, nếu không khách tự set được
  `created_at` / `is_deleted`. Tương tự, `works` chỉ cấp UPDATE trên các cột nội dung —
  các cột đếm (`kudos_count`, `hit_count`...) do trigger giữ, client không ghi được.
- **`revoke execute ... from anon, authenticated` là vô nghĩa** nếu không revoke
  khỏi `PUBLIC` trước — EXECUTE mặc định cấp cho PUBLIC. Đã revoke PUBLIC trên
  `handle_new_user()` và `bump_work_counter()`; đã kiểm chứng trigger vẫn chạy sau đó
  (quyền EXECUTE của trigger function chỉ bị kiểm lúc CREATE TRIGGER).


### Đăng bài chỉ dành cho admin (migration 13)

Policy cũ `works: tac gia tu dang` chỉ đòi `author_id = auth.uid()`, nghĩa là
**bất kỳ ai đăng ký tài khoản cũng đăng được truyện vào archive qua API** —
không cần giao diện. Đã thử thật và lọt cả truyện lẫn chương; nó không hiện trên
trang Works chỉ vì bộ lọc `legacy_id` ở frontend tình cờ loại ra, tức là may chứ
không phải thiết kế. Đã đổi thành `is_admin() and author_id = auth.uid()`.

**Còn một lỗ cùng loại chưa bịt:** policy `tags: user dang nhap duoc tao tag` có
điều kiện `true`, nên người lạ vẫn tạo được hàng rác trong bảng `tags`. Họ không
gắn được tag vào truyện của người khác (`work_tags` đòi `owns_work`), nên tác hại
chỉ là rác. **Chưa sửa vì chủ repo chưa duyệt riêng mục này.**

### Nhạc: KHÔNG chuyển sang Supabase Storage — đã chốt bỏ

26 file, **385 MB, trung bình 14,8 MB/file**. Gói Free có 1 GB dung lượng (vừa)
nhưng **băng thông chỉ 5 GB/tháng** → khoảng **340 lượt nghe là hết**, nhạc chết
tới đầu tháng sau. GitHub Releases không giới hạn băng thông cho repo public.
Giữ nguyên ở GitHub Releases. **Đừng đề xuất lại.**

Nhân tiện: **không có tấm ảnh nào trong nội dung truyện** — 0 thẻ `<img>` trong
cả 63 file `.txt` lẫn `chapters.content`, 0 `works.cover_url`. Chữ "ảnh" trong
mục "chuyển nhạc/ảnh sang Storage" ở các bản CLAUDE.md trước là **viết sai, chưa
bao giờ có căn cứ**. Ảnh duy nhất trên site là avatar.
### Cảnh báo advisor còn lại — cố ý để vậy

`is_admin()`, `can_read_work()`, `owns_work()` vẫn bị lint
`anon_security_definer_function_executable`. **Không được revoke**: ba hàm này được
gọi bên trong biểu thức policy, mà biểu thức policy chạy với quyền của chính người
truy vấn → revoke là mọi query của anon/authenticated đều `permission denied`.
Chúng chỉ trả boolean về chính người gọi, không lộ thêm gì ngoài những gì RLS đã cho.
`rls_auto_enable()` thì **đã revoke** (migration 10) — nó là hàm của event trigger
`ensure_rls`, không hề được policy gọi, nên khoá lại không ảnh hưởng gì; đã kiểm
chứng bảng mới tạo vẫn tự bật RLS sau khi revoke.

`auth_leaked_password_protection` cũng sẽ cảnh báo vĩnh viễn: tính năng đó bị khoá
ở gói Free, không bật được. Bỏ qua, đừng báo lại.

`app_private.secrets` bị lint `rls_enabled_no_policy` (mức INFO) — **cố ý**: bật RLS
mà không có policy nào chính là cách chặn hết. Bảng đó chỉ chứa muối băm IP, không
ai ngoài trigger `SECURITY DEFINER` được đụng vào.

Lưu ý về báo cáo cũ: migration 8 chỉ revoke được `handle_new_user()` và
`bump_work_counter()`, **không** đụng tới 4 hàm còn lại — có lúc đã nói nhầm là
"đã revoke hết". Bốn hàm kia vẫn ở mặc định PUBLIC cho tới migration 10.

### Supabase Storage — bucket `avatars`

Bucket duy nhất hiện có. Cấu hình ở migration 9:

| Thuộc tính | Giá trị |
|---|---|
| `public` | `true` — ảnh xem được qua `/storage/v1/object/public/avatars/...`, không cần đăng nhập |
| `file_size_limit` | `2097152` (2 MB) |
| `allowed_mime_types` | `image/jpeg`, `image/png`, `image/webp` |

Quy ước đường dẫn: **`avatars/{user_id}/{timestamp}.{ext}`**. Cả 4 policy ghi đều
buộc `(storage.foldername(name))[1] = auth.uid()::text`, nên không ai ghi/xoá được
trong thư mục người khác. Policy INSERT/UPDATE còn chặn thêm đuôi file lạ và đường
dẫn lồng sâu hơn một cấp.

Tên file mang mốc thời gian là **cố ý**: mỗi lần đổi ảnh sinh URL mới nên trình
duyệt không hiện lại ảnh cũ trong cache. Đổi lại, frontend phải tự dọn file cũ —
`dropStaleAvatar()` trong `index.html` xoá file cũ **sau khi** `profiles.avatar_url`
đã trỏ sang ảnh mới, và chỉ xoá khi URL cũ đúng là file trong thư mục của chính
người đó (link dán từ nơi khác thì bỏ qua).

**Không xoá được `storage.objects` bằng SQL trực tiếp.** Trigger `protect_objects_delete`
của Supabase chặn, bắt đi qua Storage API để tránh bỏ lại file mồ côi trong S3.
Khi test bằng SQL thì phải `set local storage.allow_delete_query = 'true'` — nhưng
làm vậy chỉ xoá hàng trong DB, file thật vẫn nằm lại. Muốn xoá sạch thì dùng
`sb.storage.from('avatars').remove([...])`.

### Bất biến phải giữ

Điều kiện đọc work nằm ở **hai chỗ** và phải luôn trùng khít:
`public.can_read_work()` và policy SELECT của bảng `works`
(`status = 'published' and (not is_restricted or auth.uid() is not null)`).
Sửa một bên mà quên bên kia thì `chapters.content` / `comments` / `kudos` của truyện
restricted sẽ rò rỉ cho khách vãng lai, trong khi hàng `works` vẫn bị chặn —
lỗi này đã từng xảy ra một lần và bị bắt lúc review.

### Việc tiếp theo (chưa làm)

Bốn gạch đầu dòng import/chuẩn hoá ở đây **đã xong** — xem mục "Trạng thái import"
ngay bên dưới. Việc còn lại xem "Việc tiếp theo" ở cuối file.


## Trạng thái import (cập nhật 2026-08-30) — ĐÃ XONG

Dữ liệu truyện cũ **đã nằm hết trong Supabase**:

| Bảng | Số dòng |
|---|---|
| `profiles` | 1 (`ShostaKid`, `is_admin = true`) |
| `works` | 36 (tất cả `status='published'`) |
| `chapters` | 62 (61 published + 1 draft) |
| `fandoms` / `ships` / `tags` | 6 / 9 / 3 |
| `work_fandoms` / `work_ships` / `work_tags` | 36 / 39 / 5 |

Tổng 136.952 từ. Tác giả của cả 36 work là tài khoản admin duy nhất
(`select id from public.profiles where is_admin` — repo này public nên không ghi
UUID ra đây).

Đã đối chiếu sau import: 0 chương lệch byte so với repo, 0 fic lệch thứ tự
(`legacy_id = 'fic-N'` khớp `fics.json[N]`), 0 chương lệch tên, 0 fic lệch ngày.
Khách vãng lai (role `anon`) đọc được 36 work + 61 chương, đúng như site cần.

Vùng staging `import_tmp` và extension `http` (bật tạm để Postgres tự kéo 797 KB
nội dung từ raw.githubusercontent, khỏi phải chép tay) **đã được xoá sau khi xong** —
không để `http` bật vĩnh viễn vì đó là bề mặt SSRF ngay trong DB.

### Gán admin: trigger chặn cả `postgres`

`profiles_protect_admin` là trigger BẢNG, không phải RLS, nên `postgres` cũng bị
chặn khi sửa `is_admin`. Cách làm đúng:

```sql
alter table public.profiles disable trigger profiles_protect_admin;
update public.profiles set is_admin = true where id = '<uuid>';
alter table public.profiles enable trigger profiles_protect_admin;   -- ĐỪNG QUÊN
```

### Quyết định đã chốt khi import

- `slug` của work **giữ tiền tố số** (`007-nocturne-in-c-sharp-minor`) vì có 3 fic
  cùng tên `nocturne-in-c-sharp-minor` mà `works.slug` là UNIQUE.
- `legacy_id = 'fic-<idx>'` khớp với `openFic(i)` của site cũ.
- Fandom `Figure Skating` gộp vào `Figure Skating RPF`.
- Ship `Nevuillette/Furina` gộp vào `Neuvillette/Furina`; `Khaslana/Cyrne` chỉ sửa
  chính tả thành `Khaslana/Cyrene`, **không gộp** (xem phần nợ kỹ thuật ở trên).
- Nhãn `Others` trong `tags[]` của `033` **không đưa vào bảng `ships`** vì nó không
  phải một cặp đôi — đã cho vào `tags` với `type='freeform'`.
- Warning làm song song đúng như thiết kế: nguyên văn vào `works.warning_note`,
  đồng thời gắn tag `type='warning'` (`rape-non-con` / `cuckold`).
- Tiêu đề chỉ bị cắt khoảng trắng thừa hai đầu và dấu `:` bị bỏ lại ở cuối
  (4 fic: 013, 014, 015, 020). Khoảng trắng đôi *bên trong* tiêu đề 014
  (`Impromptu no.2 in  A Major`) **để nguyên**, không tự sửa.
- `Violin concerto 2.3.txt` không tồn tại → chương 3 của `034` tạo ra với nội dung
  rỗng và `status='draft'` nên không hiển thị công khai. **Bẫy đã gặp:** `http_get`
  trả về 404 kèm thân trang `'404: Not Found'`, suýt nữa lưu chuỗi đó thành nội dung
  chương — phải kiểm `http_status = 200` trước khi lấy `content`.
- `language='vi'` cho 3 fic 031 / 033 / 035 (nội dung tiếng Việt), còn lại `'en'`.

### Thêm chương mới sau này (quy trình đã đổi)

Trên site cũ: thả file `.txt` vào gốc repo là xong. **Với backend mới thì không còn
như vậy** — nội dung chương nằm trong `chapters.content`, không đọc file `.txt` nữa.

Cụ thể với chương 3 của `034-violin-concerto-no2-in-a-minor` (đang rỗng, `draft`,
chờ chủ repo viết xong): khi có nội dung thì

```sql
update public.chapters c
set content = $$...noi dung...$$, status = 'published', published_at = now()
from public.works w
where w.id = c.work_id and w.legacy_id = 'fic-34' and c.position = 3;
```

rồi cập nhật lại `word_count`. Việc thả file `.txt` vào repo giờ chỉ còn tác dụng
với site cũ, **không tự chảy vào database**.

## Bước 2 — hệ thống tài khoản (cập nhật 2026-08-30)

Đã thêm vào `index.html`, **không đụng Browse/danh sách truyện** (vẫn dùng
`fics.json` + thẻ hard-code như cũ):

- Trang `#page-auth` — hai tab Đăng nhập / Đăng ký, dùng Supabase Auth email+password.
- Trang `#page-profile` — sửa `username`, `display_name`, `bio`, `avatar_url`,
  `ao3_url`. **Không có ô nhập `is_admin`** và cũng không cần: cột đó không nằm
  trong GRANT UPDATE của `authenticated`, sửa DOM để lách vẫn bị chặn ở tầng DB.
- Một `<script type="module">` ở cuối `<body>`, import `supabase-js` từ jsdelivr,
  trỏ project `oseddxgmwbeduazbomuf` bằng publishable key.

Vài điểm dễ vấp nếu sửa tiếp:

- **Xác nhận email đang BẬT.** `signUp()` trả về `session: null`; người dùng phải
  bấm link trong mail rồi mới đăng nhập được. Code xử lý cả hai trường hợp.
- **Đăng ký phải tự kiểm trùng `username` trước khi gọi `signUp()`.** Trigger
  `handle_new_user()` sẽ ném lỗi khó hiểu ("Database error saving new user") nếu
  trùng, nên frontend hỏi trước cho ra thông báo tử tế.
- **Không dựng avatar bằng `innerHTML`.** `avatar_url` là dữ liệu người dùng nhập;
  `paintAvatar()` dựng bằng `document.createElement` và bắt sự kiện `error`.
- **`currentPage` của site khai báo bằng `let`, không nằm trên `window`.** Muốn biết
  đang ở trang nào thì đọc `.classList.contains('active')` chứ đừng đọc
  `window.currentPage` (undefined).
- Hai mục nav mới (`#nav-signin`, `#nav-profile`) phải nằm **cuối** `.nav-links`:
  `goBack()` và nút "View All Works" tham chiếu `.nav-links a:nth-child(1)` và `(2)`,
  chèn vào đầu là gãy cả hai. Thêm mục nav cũng làm nav tràn ngang trên điện thoại
  → đã vá bằng `min-width:0` + `overflow-x:auto` trong media query `max-width:768px`.

## Bước 3 — kudos & bookmark (cập nhật 2026-08-30)

Khối `#work-actions-wrap` nằm giữa `#chapter-nav-bot` và `#reading-footer` trên
trang đọc. `openFic()` gọi `window.loadWorkActions(i)` — hàm này do module
Supabase ở cuối file gắn lên `window`.

### Nối truyện với hàng trong DB

`openFic(i)` dùng **chỉ số mảng** của `fics.json`, nối sang `works.legacy_id = 'fic-<i>'`.
Đã kiểm chứng: `fics/*.yaml` đánh số 000–035 liên tục, `build_fics.py` sắp theo số đó,
`legacy_id` trong DB cũng là `fic-0..fic-35`, đối chiếu tiêu đề index 0/22/34/35 đều khớp.

**Đây là khoá theo VỊ TRÍ.** Đánh số lại file trong `fics/` hoặc chèn fic vào giữa
sẽ làm kudos/bookmark gắn nhầm truyện — đúng lỗi mà comment cũ đã dính.
**Quy tắc: thêm fic mới thì đánh số tiếp theo, không chèn vào giữa.**
Lỗi này chỉ hết hẳn khi Browse đọc từ DB và mang UUID thật.

Nếu không tìm thấy hàng tương ứng thì khối nút **ẩn hoàn toàn**, không báo lỗi.

### Kudos khách vãng lai

`kudos.user_id` giờ nullable, thêm `guest_ip_hash bytea`. Danh tính do trigger
`kudos_identity_trg` → `kudos_set_identity()` tự điền, **client chỉ được gửi `work_id`**
(GRANT INSERT theo đúng một cột). Hash = `sha256(muối || ip || ':' || work_id)`,
muối 32 byte nằm ở `app_private.secrets` — schema ngoài `public` nên PostgREST
không phơi ra, lại bật RLS không policy nên chặn hết.

Trộn `work_id` vào hash là cố ý: cùng một người ở hai truyện cho ra hai hash khác
nhau, nên không ai đối chiếu được một IP đã thả tim cho những truyện nào.

Hai unique index riêng phần thay cho unique cũ:
`kudos_uniq_user (work_id,user_id) where user_id is not null` và
`kudos_uniq_guest (work_id,guest_ip_hash) where guest_ip_hash is not null`.
Nên **khách và thành viên đếm riêng** — cùng một IP vừa thả tim ẩn danh vừa đăng
nhập thả tim thì thành 2 kudos. Đó là hành vi đúng, không phải lỗi.

Ràng buộc `kudos_one_identity check (num_nonnulls(user_id, guest_ip_hash) = 1)`
an toàn vì FK `user_id` là `ON DELETE CASCADE` (xoá tài khoản thì xoá luôn kudos),
không phải `SET NULL` như bảng `comments`.

### Rút lại kudos

Thành viên đăng nhập rút được (policy DELETE `user_id = auth.uid()`).
Khách **không** rút được vì `user_id` null → policy không khớp. Đây là chủ đích:
danh tính khách chỉ dựa vào IP, không xác minh được. Giao diện phản ánh đúng vậy:
nút của khách sau khi bấm thành trạng thái tĩnh (`disabled` + class `done`).

### Vài chỗ dễ vấp

- **Không được `select('*')` trên bảng `kudos`.** Cột `guest_ip_hash` nằm ngoài
  quyền đọc của `anon`/`authenticated`, gọi `*` là `permission denied`.
  Chỉ đọc `id, work_id, user_id, created_at`.
- Số đếm lấy từ `works.kudos_count` (trigger `bump_work_counter` giữ), không đếm tay.
- Khách không tra được hash của chính mình nên trạng thái "đã thả tim" nhớ tạm ở
  `localStorage` khoá `sk-kudos-<work_uuid>`. Xoá đi bấm lại thì DB trả `23505`,
  frontend hiểu đó là "đã thả rồi" chứ không hiện lỗi.
- `bookmarks` **không** có trigger tự điền như `kudos`, phải gửi `user_id` tường minh.
- Chưa đăng nhập mà bấm Bookmark thì nhớ truyện vào `sessionStorage['sk-return-fic']`
  rồi chuyển sang trang đăng nhập; handler đăng nhập đọc lại và quay về đúng truyện.
- `waSeq` chống chạy đua: lật truyện nhanh thì kết quả truy vấn của truyện cũ bị bỏ.

## Bước 4 — bình luận gắn tài khoản (cập nhật 2026-08-30)

Khối comment cũ **đã viết lại hoàn toàn** và chuyển vào module Supabase. Ba hàm
`loadComments` / `toggleComments` / `repaintComments` gắn lên `window` vì HTML
gọi bằng `onclick=` và `openFic()` nằm ở script cổ điển.

**Đã xoá `SUPABASE_URL` + `SUPABASE_KEY` của project chết `ggbahdhmtgaemgblfdum`**
cùng `escapeHtml()` không còn ai dùng. Trong repo không còn khoá của project đó.

Không cần migration cho phần cơ bản: bảng `comments` từ bước 1 đã có sẵn
`guest_name`, policy INSERT cho cả `anon` lẫn `authenticated`, và GRANT theo cột.

### Chống spam — hai lớp, đừng nhầm vai trò

1. **Honeypot `#comment-website`** — ô ẩn bằng `position:absolute;left:-9999px`
   (không dùng `display:none` vì bot nhận ra), `tabindex="-1"`, `autocomplete="off"`.
   Bot điền vào thì frontend **im lặng báo thành công** rồi vứt đi, không cho bot
   biết đã bị lộ. **Chỉ chặn được bot đọc HTML** — kẻ gọi thẳng PostgREST bằng
   publishable key không bao giờ chạy qua đoạn này.
2. **Trigger `comments_rate_limit_trg`** — đây mới là lớp chặn thật.
   Khách 3 bình luận / 5 phút / IP, thành viên 10 / 5 phút / tài khoản,
   **admin được miễn**. Vượt thì ném `PT429` (quy ước PostgREST → HTTP 429),
   frontend bắt `error.code === 'PT429'` để hiện thông báo tử tế.

Bộ đếm nằm ở `app_private.rate_limit(bucket_key, window_start, hits)`, khoá là
`sha256(muối || 'ip:'||ip)` hoặc `sha256(muối || 'u:'||uid)`. **Bảng `comments`
không lưu bất kỳ dấu vết IP nào** — đó là lý do tách bảng riêng. Muối
`rate_limit_salt` khác muối `kudos_ip_salt` để hai bên không đối chiếu chéo được.
Dọn rác bằng `random() < 0.01` mỗi lần insert, không cần cron.

Lượt bị RLS từ chối **không tốn hạn mức**: trigger và policy cùng một transaction,
bị chặn thì bộ đếm rollback theo.

### Vài chỗ dễ vấp

- **Xoá bình luận là xoá thật (`DELETE`), không đặt `is_deleted`.** Trigger
  `comment_count_trg` chỉ chạy khi INSERT/DELETE, xoá mềm sẽ để `comment_count`
  sai vĩnh viễn. Cột `is_deleted` để dành cho kiểm duyệt sau.
- **Truy vấn phải `.eq('is_deleted', false)`** — policy SELECT không lọc giúp.
- **Không `select('*')`** — lấy đúng cột, kèm `profiles(...)` để nhúng tên/avatar
  qua FK `comments_user_id_fkey`.
- **`comments.user_id` là `ON DELETE SET NULL`** (cố ý, giữ lại bình luận khi user
  tự xoá tài khoản). Nên khi dọn dữ liệu test phải **xoá comment TRƯỚC rồi mới xoá
  user**, không thì còn lại bình luận mồ côi hiện dưới tên "Khách".
- Danh sách dựng 100% bằng `createElement`/`textContent`. Đã thử chèn
  `<img onerror>`, `<script>` vào cả nội dung lẫn `display_name` — hiện ra nguyên
  văn dạng chữ, không tạo thẻ nào.
- `applyLang()` gọi `window.repaintComments()` để vẽ lại danh sách khi đổi ngôn ngữ
  (ngày tháng đổi locale, nút Xoá và badge Tác giả đổi chữ).
- Nút `#comment-submit` **cố ý không gắn `data-i18n`**: `applyLang()` đã xử lý riêng,
  gắn cả hai thì nhãn "Đang gửi…" bị ghi đè giữa chừng.
- Chưa làm: trả lời lồng nhau (`parent_id` có sẵn), sửa bình luận,
  bình luận theo từng chương (`chapter_id` đang để null).

## Bước 5 — Browse & trang chủ đọc từ database (cập nhật 2026-08-30)

36 thẻ `.fic-card` viết cứng đã bị xoá, thay bằng `<div id="works-grid"></div>`.
Cả trang Works lẫn trang Home giờ dựng từ cùng một mảng `worksData`.

### Bộ lọc không phải sửa một dòng nào

`buildSidebar()` và `applyFilters()` vốn **chỉ đọc DOM** (`data-fandom`, chữ trong
`.fic-title`, chữ trong `.tag`). Nên chỉ cần dựng thẻ ra đúng cấu trúc DOM cũ là
lọc/tìm kiếm/accordion/pill mobile chạy y nguyên. Đây là lý do bước này rẻ hơn vẻ ngoài.

### Khoá fandom

`data-fandom` giờ = **đúng tên trong bảng `fandoms`** (`Figure Skating RPF`,
`Honkai: Star Rail`...), không còn khoá rút gọn (`Figure Skating`, `Honkai`).
Bảng `fandomLabels` cũ đã xoá — nó khai `Genshin Impact` trong khi thẻ ghi
`Genshin`, làm mục Genshin trên sidebar hiện cụt.

Hiển thị thì giữ nguyên như cũ qua `FANDOM_DISPLAY`: riêng Reverse vẫn hiện
`重返未来：1999 · Reverse: 1999` ở dòng `.fic-meta`. Người xem không thấy khác biệt.

Nhánh dự phòng dùng `fandomKeyFromYaml()` để cắt phần trước dấu `·` trong chuỗi
fandom của `fics.json` ra đúng khoá DB.

### Dự phòng khi Supabase ngủ

Luồng khởi tạo: tải `fics.json` → dựng thẻ ngay từ đó → rồi mới gọi DB và vẽ đè.
`window.fetchWorksFromDB()` trả `null` khi lỗi, script cổ điển giữ nguyên bản tĩnh.
**Trang không bao giờ trắng** kể cả khi project bị pause.

**Đánh đổi phải biết:** ở nhánh dự phòng, truyện `is_restricted` **hiện trở lại**,
vì `fics.json` không biết gì về cờ đó. Chỉ hết khi Browse bỏ hẳn `fics.json`.

### `is_restricted`

Không cần lọc ở frontend: policy SELECT của `works` đã bỏ hẳn hàng đó với khách
chưa đăng nhập, nên **tên và tóm tắt cũng không lộ**. Đã thử: đánh dấu 2 fic →
khách thấy 34, người đăng nhập thấy 36, chữ "Toccata" không xuất hiện ở đâu.

**Nhưng nội dung vẫn đọc được** qua `#fic-N` và qua file `.txt` công khai trên
GitHub, vì trình đọc chưa lấy nội dung từ `chapters.content`. Muốn chặn thật thì
phải làm nốt phần trình đọc **và** xoá `.txt` khỏi repo.

### Pill lọc fandom trên mobile

Trước đây ba pill viết cứng nên **Genshin / Spider-Verse / Others không lọc được
trên điện thoại**. Giờ `buildSidebar()` dựng theo fandom có thật, đủ cả sáu.

### Bẫy đã gặp

- **Trigger `kudos_identity_trg` chặn cả `INSERT` bằng SQL trực tiếp.** Chạy
  `insert into kudos` từ SQL editor sẽ lỗi `Khong xac dinh duoc nguon gui` vì
  `auth.uid()` null và không có `request.headers`. Muốn chèn tay để test thì phải
  `set_config('request.jwt.claims', ...)` trong cùng transaction.
- **Đo `getBoundingClientRect()` trên trang đang ẩn luôn ra 0×0.** Trang nào không
  có class `active` thì mọi phép đo đều vô nghĩa — phải `showPage()` trước khi đo.


## Trang "Truyện đã lưu" (bước 7 phần 2)

`#page-bookmarks`, link nav `#nav-bookmarks` đặt **trước** `#nav-profile` nhưng
vẫn ở cuối danh sách — nhắc lại: `goBack()` và nút "View All Works" bám vào
`.nav-links a:nth-child(1)` và `(2)`, nên mục mới luôn phải nằm sau Home/Works.

Dựng lại đúng khung `.fic-card` của Browse bằng `window.makeCardEl()` nên không
thêm kiểu dáng nào ngoài `.bm-foot` (dòng ngày lưu + nút Bỏ lưu). Bấm thẻ vẫn mở
truyện; nút Bỏ lưu có `stopPropagation()` để không mở truyện theo.

`showPage('bookmarks')` nạp lại danh sách mỗi lần mở, vì người dùng có thể vừa
bỏ lưu ở trang đọc rồi quay lại.

**Bẫy đã vấp:** `removeBookmark()` gọi `bmSay('bm_removed')` rồi `loadBookmarks()`
— mà `loadBookmarks()` xoá trắng ô thông báo, nên câu báo vừa hiện đã bị xoá ngay.
Phải nạp lại **trước**, báo **sau**.

Vào thẳng `#bookmarks` khi chưa đăng nhập thì rơi về trang chủ (chặn đúng), nhưng
không kịp hiện câu "đăng nhập trước" vì site tự đặt hash về `#home` trước khi
`guardProfile()` chạy. Trang `#profile` cũng vậy — hành vi có sẵn, không phải mới.

## Trả lời bình luận lồng nhau (bước 7 phần 3)

Đúng **hai tầng**, cố ý. Trả lời một trả lời vẫn gắn `parent_id` vào bình luận
**gốc** (`c.parent_id || c.id` trong `openReply`), nên không bao giờ có tầng ba
và không thụt lề vô tận trên điện thoại.

Bình luận gốc xếp mới nhất trước; trả lời trong một mạch xếp cũ trước để đọc xuôi.

Ô trả lời dựng ngay dưới bình luận được bấm, mỗi lúc chỉ có một ô
(`closeReply()` gọi cả trong `renderComments()` để nó không thành mồ côi khi
danh sách vẽ lại). Ô này có honeypot riêng và đi qua đúng trigger giới hạn tần
suất như form chính — đã test cả hai.

`comments_parent_id_fkey` là `ON DELETE CASCADE`: xoá bình luận gốc là **mất cả
mạch trả lời**. Chấp nhận được, nhưng nếu sau này làm xoá mềm thì phải nghĩ lại.

### Bẫy mất thời gian nhất: session cũ của tài khoản đã xoá

Đang test thì gửi bình luận khách báo `permission denied for table comments`,
trong khi chạy cùng câu lệnh đó bằng SQL với role `anon` lại chạy ngon.

Nguyên nhân: trình duyệt còn **session của một tài khoản test đã bị xoá khỏi
`auth.users`**. `createClient()` đọc lại session đó từ localStorage nên request
đi với role `authenticated` — mà role đó **không có quyền ghi cột `guest_name`**
(chỉ `anon` mới có). Dấu hiệu nhận ra: bỏ `guest_name` đi thì lỗi đổi thành
"violates row-level security policy", tức là đã qua được tầng GRANT.

Sau khi xoá tài khoản test, nhớ `signOut()` và xoá key `sb-*` trong localStorage,
không thì lần test sau sẽ đuổi theo một lỗi không có thật.

## Dọn nền cho trang đăng bài (bước 7 phần 4)

Truyện đăng qua form chỉ nằm trong DB, **không có trong `fics.json`**. Trước đó
frontend lấy tiêu đề, fandom, danh sách chương và nhạc từ `fics.json` nên truyện
mới sẽ vỡ. Đã đổi:

- `ficInfo(i)` — tiêu đề/phụ đề/fandom/cảnh báo, ưu tiên `worksData` (DB).
- `chapterNames(i)` — tên chương từ `chapterRows` (DB), lùi về `fics.json`.
- `getMusicData()` — ưu tiên `chapters.music`, lùi về `fics.json`.
- Định tuyến `#fic-N` và banner "đọc tiếp" hỏi thêm `worksData`, không chỉ `fics`.

Migration 15 `auto_assign_legacy_id`: trigger cấp `fic-<max+1>` khi `legacy_id`
để trống. Cột đã có unique index nên hai lượt chèn cùng lúc sẽ đụng nhau chứ
không lặng lẽ trùng số. Khai sẵn `legacy_id` thì trigger giữ nguyên.

**Đây là giải pháp tối thiểu.** Cách đúng về lâu dài là bỏ `legacy_id`, định
tuyến bằng `slug` — đụng `openFic`, URL `#fic-N` và `sk-continue` nên để riêng.

### Ba lỗi tự gây ra khi sửa bằng awk — đọc trước khi dùng lại chiêu này

1. **`&` trong phần thay thế của `gsub()` nghĩa là "toàn bộ chuỗi khớp"**, không
   phải ký tự `&`. Ba dòng bị nhân bản thành rác kiểu
   `if (x if (cond) doIt();if (cond) doIt(); y)`. Muốn `&` thật thì phải `\&`,
   mà trong shell còn phải nhân đôi lần nữa. **Đừng dùng gsub cho code có `&&`.**
2. `chapterRows` đã bị đổi thành promise ở bước 6, nhưng hai hàm mới vẫn gọi tên
   cũ → `ReferenceError`. Đã thêm lại một biến giữ **bản đã giải quyết** của
   promise, vì `chapterNames()`/`getMusicData()` bị gọi từ chỗ không await được.
3. `playMusic()` nổ vì `openFic()` gọi nó **trước khi** chương tải xong, mà truyện
   mới thì `fics.json` không có nhạc. Đã cho nó im lặng thoát khi chưa có dữ liệu;
   `loadChapter()` gọi lại sau khi chương về.

Bài học chung: sau mỗi lần sửa hàng loạt bằng awk/sed, **mở trang và xem console**
— cả ba lỗi trên đều không lộ ra ở `grep`.

## Trang đăng / sửa truyện (bước 7 phần 5)

`#page-post`, link nav `#nav-post` **chỉ hiện khi `profiles.is_admin`** —
`paintNav()` ẩn mặc định, `paintProfile()` mới bật lên khi biết chắc. Đây chỉ là
lớp giao diện; chặn thật nằm ở policy INSERT của `works` (migration 13).

Một form dùng cho cả đăng mới lẫn sửa: `loadPostForm()` không tham số là tạo mới,
truyền `idx` là nạp truyện có sẵn. Fandom và ship **chỉ chọn từ danh sách có
sẵn**, không tự thêm — tạo fandom/ship/tag mới là quyền admin ở tầng DB.

Lưu: `works` trước (lấy `id`), rồi **xoá sạch và gắn lại** `work_fandoms`,
`work_ships`, `chapters`. Thay toàn bộ chương đơn giản hơn nhiều so với so khớp
từng dòng, và luôn khớp thứ tự đang thấy trên form. Đổi lại: **`chapters.id` đổi
sau mỗi lần lưu**, nên đừng tham chiếu tới nó ở đâu khác (hiện `bookmarks.last_chapter_id`
chưa dùng, nhưng nếu sau này dùng thì phải nghĩ lại chỗ này).

`slug` sinh từ tiêu đề (bỏ dấu tiếng Việt) + 6 số cuối của timestamp cho khỏi trùng.
`legacy_id` do trigger migration 15 cấp.

### Bucket `work-images` (migration 16)

Cùng khuôn với `avatars` nhưng thư mục theo `work_id`, và policy ghi kiểm
`exists (select 1 from works where id = thư_mục and (author_id = auth.uid() or is_admin()))`.
2 MB, jpg/png/webp, đọc công khai.

Nút "Chèn ảnh" tải lên rồi chèn `<p align="center"><img src="..."></p>` **ngay tại
vị trí con trỏ** trong ô nội dung. Phải lưu truyện một lần trước đã, vì đường dẫn
ảnh cần `work_id`.

### Bẫy: bộ nhớ đệm chương không tự hết hạn

Sửa truyện xong mở ra đọc thì vẫn thấy **bản cũ** — vì `ensureChapters()` giữ
promise theo `chapterFic`, mà truyện vẫn là truyện đó nên nó trả lại bản đã đệm.
Đã thêm `window.invalidateChapters()` và gọi sau mỗi lần lưu. Triệu chứng lúc bắt
được: chèn ảnh, lưu, mở đọc — ảnh không hiện, dễ tưởng lỗi upload.

### Nhạc trong form đăng bài, và một lần suýt mất bài của chủ repo

Form có ô nhạc **chung cho cả truyện** và ô **ghi đè riêng từng chương**, khớp
đúng hình dạng `chapters.music` = `{source, url, start, name}`. Schema chỉ lưu
nhạc **theo chương**, nên "nhạc của truyện" là quy ước ở frontend: lúc nạp thì
suy từ chương 1; ô của chương chỉ điền khi **khác** nhạc chung; lúc lưu, chương
để trống sẽ nhận nhạc chung.

**Lỗi nghiêm trọng đã xảy ra thật.** Policy INSERT của `chapters` chỉ có
`owns_work(work_id)`, trong khi UPDATE và DELETE đều có thêm `is_admin()`. Hàm
lưu của form **xoá hết chương rồi chèn lại**, và hai bước đó **không nằm trong
một transaction** (đi qua PostgREST là hai request riêng). Khi một admin sửa
truyện do người khác đứng tên: bước xoá chạy được, bước chèn bị RLS chặn →
**truyện mất sạch chương**. Đã xảy ra với `fic-36` của chủ repo; may là nội dung
còn trong form trên trình duyệt nên vá policy (migration 17) rồi bấm Lưu lại là
khôi phục đủ.

Hai điều rút ra, đừng quên:
1. **Xoá-rồi-chèn qua PostgREST không có tính nguyên tử.** Nếu sau này còn dùng
   kiểu này ở chỗ khác, phải tính tới trường hợp bước hai hỏng.
2. Khi thêm policy cho một bảng, **kiểm cả ba lệnh INSERT/UPDATE/DELETE có cùng
   điều kiện không** — lệch một cái là sinh ra đúng loại lỗi trên.

`fetchChapters()` ban đầu quên `select` cột `music`, nên nhạc không bao giờ tới
được trang đọc dù DB có đủ. Triệu chứng: thanh nhạc vẫn hiện tên bài của truyện
mở trước đó.

### Lối vào chế độ sửa truyện

`loadPostForm(idx)` hỗ trợ sửa từ đầu, nhưng ban đầu **không có nút nào gọi nó
với tham số** — `showPage('post')` luôn gọi `loadPostForm()` rỗng, tức luôn mở
form trống. Chức năng sửa chỉ chạy được khi gọi tay từ console, nên trên web coi
như không tồn tại. Chủ repo phát hiện ra.

Giờ nút **✎ Sửa truyện** nằm cạnh Kudos/Bookmark ở cuối trang đọc, chỉ hiện với
admin. Nó đặt `window.__pwEditIdx` rồi mới `showPage('post')`; hook trong
`showPage` đọc số đó, xoá đi, và truyền vào `loadPostForm`. Nhờ vậy nút nav
"Đăng truyện" vẫn mở form trống như cũ.

**Bài học:** viết xong một hàm và test nó bằng console **không có nghĩa là tính
năng đã có trên web**. Phải đi đúng đường người dùng đi.

### Lưu chương: cập nhật đúng chỗ đổi, không còn xoá-rồi-chèn

Bản cũ xoá sạch chương rồi chèn lại — hai request riêng qua PostgREST, không
nguyên tử, và đã làm mất trắng chương một lần. Giờ:

1. Xoá những chương bị gỡ khỏi form (làm trước để giải phóng `position`).
2. Nếu có chương đổi chỗ thì dời tạm cả loạt sang vùng `1000+` — bảng có unique
   `(work_id, position)` nên hai chương hoán vị sẽ đụng nhau ngay giữa chừng.
3. `update` chương đã có, `insert` chương mới.

Form nhớ `chId` và `chPos` trên từng khối chương để biết cái nào cũ, cái nào đổi chỗ.
**`chapters.id` giờ được giữ nguyên qua mỗi lần lưu** — ghi chú cũ nói ngược lại
đã hết hiệu lực, `bookmarks.last_chapter_id` sau này dùng được.

Hỏng giữa chừng thì chỉ là vài chương chưa kịp cập nhật, **không mất nội dung**.

### GitHub Action giữ Supabase không ngủ

`.github/workflows/keep-supabase-awake.yml`, chạy 3 ngày một lần, gọi một request
đếm nhẹ (`Range: 0-0`) tới `/rest/v1/works`. Gói Free tạm dừng project sau ~7 ngày
không ai gọi. Chấp nhận cả `200` lẫn `206` (206 vì có header `Range`).

Key trong workflow là publishable key, vốn đã công khai trong `index.html` — không
phải bí mật, không cần đưa vào GitHub Secrets.

**Lưu ý:** GitHub tự tắt workflow theo lịch nếu repo **60 ngày không có hoạt động
nào**. Repo này có Action build `fics.json` chạy mỗi lần sửa fic nên hiếm khi chạm
mốc đó, nhưng nếu bỏ bẵng vài tháng thì phải vào bật lại bằng tay.

### Nhạc liền mạch giữa các chương

Hành vi "chạy tiếp khi cùng bài" trước đây **không phải do code cố ý** — không có
đoạn nào so sánh URL (đã tìm cả lịch sử git). Nó chạy được là do `loadChapter()`
chỉ gọi `playMusic()` khi `music` khai dạng **mảng**; fic khai một object đơn nên
không bao giờ bị dựng lại player.

Vì thế fic khai mảng vẫn restart dù mọi mục cùng một bài — **fic-21, 22, 26, 29** —
và truyện đăng qua form thì luôn restart (không có trong `fics.json`).
Riêng **fic-31** mà chủ repo nêu thì vốn không lỗi, đã đo: giây 38 → 40.

Giờ `playMusic()` nhớ bài đang phát trong `nhacDangPhat = {source, url, start}`:

| Tình huống | Xử lý |
|---|---|
| Cùng `source` + `url`, cùng `start` | Không đụng gì |
| Cùng bài, **khác `start`** | Giữ player, `currentTime = start mới` |
| Khác bài | `stopMusic()` rồi dựng lại |
| Nguồn iframe (YouTube/SoundCloud) khác `start` | Đành dựng lại — không seek được từ ngoài |

`stopMusic()` phải xoá `nhacDangPhat`, không thì lần sau tưởng vẫn đang phát.

### Tạo fandom / ship mới ngay trong form

Không cần migration: policy `fandoms` và `ships` vốn đã là `ALL` với `is_admin()`,
và `authenticated` đã có đủ GRANT — admin **đã** tạo được qua API từ trước, chỉ là
form chưa cho nhập.

Nút **+ Thêm fandom** / **+ Thêm ship** cạnh mỗi ô chọn. `pwSlug()` bỏ dấu tiếng
Việt (kể cả `đ`) rồi rút thành slug — dùng chung cho cả slug của truyện.

Ba lớp chặn nhầm lẫn:
1. Trùng tên (kể cả khác hoa thường) → **chọn cái có sẵn**, không đẻ bản trùng.
2. Hỏi xác nhận kèm chính cái tên sắp tạo, nói rõ **form không sửa/xoá lại được**.
3. Ship mới tự gắn `fandom_id` theo fandom đang chọn, để sidebar xếp đúng nhóm.

Vẫn **không có chỗ sửa/xoá** trong form. Gõ sai thì phải sửa bằng SQL — đúng loại
lỗi đã xảy ra với `Nevuillette/Furina`. Bảng `ships` có `canonical_id` để gộp trùng
nếu cần.
## Bước 6 — trang đọc lấy nội dung từ database (cập nhật 2026-08-30)

`loadChapter()` giờ đọc `chapters.content` thay vì `fetch` file `.txt` từ GitHub.
`txtToHtml()`, thanh điều hướng chương, dropdown chọn chương, nhạc, cỡ chữ,
thanh tiến độ và `sk-continue` đều **giữ nguyên không sửa**.

`ensureChapters()` tải **toàn bộ chương của truyện trong một truy vấn** lúc mở
truyện, rồi giữ lại. Mở truyện 5 chương ~370ms; lật chương sau đó **~1ms** vì
không gọi mạng nữa (trước đây mỗi lần lật là một lượt fetch tới GitHub).

### Ba kết quả, ba cách xử lý — đây là chỗ dễ làm sai nhất

`window.fetchChapters()` cố ý phân biệt:

| Trả về | Nghĩa | Trang đọc làm gì |
|---|---|---|
| mảng có phần tử | đọc được | hiện nội dung |
| **mảng rỗng** | DB **gọi được** nhưng không cho đọc (bị hạn chế / còn draft) | hiện "Coming soon", **KHÔNG lùi `.txt`** |
| `null` | không gọi được DB (project ngủ) | lùi về `.txt` như site cũ |

**Đừng gộp hai trường hợp "rỗng" và "null" làm một.** Gộp lại là mỗi lần
`is_restricted` chặn thì frontend lại đi lấy đúng nội dung đó từ GitHub — tự tay
mở lại cái cửa vừa đóng. Đã test: mở thẳng truyện bị hạn chế ra "Coming soon",
không có request nào tới `raw.githubusercontent.com`.

### Hạn giờ 4 giây

supabase-js tự thử lại vài lần trước khi chịu thua, mất tới **~7 giây** — người
đọc phải nhìn chữ "Loading" suốt thời gian đó khi project ngủ. Nên `fetchChapters`
tự đặt hạn 4 giây rồi trả `null`. Đo thật: DB chết → lùi `.txt` sau ~4,7 giây.

Đánh đổi: mạng chỉ chậm (không chết) mà quá 4 giây thì cũng lùi `.txt`. Nội dung
giống hệt nhau nên vô hại — trừ đúng một trường hợp: truyện bị hạn chế **và** mạng
chậm thì có thể lộ qua `.txt`. Chấp nhận được vì chủ repo đã chốt giữ file `.txt`.

### Vẫn lấy từ fics.json

Danh sách chương, tên chương và **nhạc** vẫn đọc từ `fics.json`, không phải DB.
Cột `chapters.music` có dữ liệu nhưng chưa dùng — để dành cho bước chuyển nhạc
sang Supabase Storage. Ba nguồn đang khớp nhau nên không có mâu thuẫn.

### Đã vá luôn

`loadChapter` cũ dùng biến `previews` mà **không chỗ nào khai báo** — nhánh đó
chưa từng chạy nên chưa lộ, nhưng chạm vào là `ReferenceError`. Đã bỏ.


### Bẫy chạy đua ở "Đọc tiếp" — đã vá, đừng làm hỏng lại

`resumeReading()` gọi `openFic()` (bên trong đã chạy `loadChapter(i,0)`) rồi gọi
tiếp `loadChapter(i, n)` ngay — **hai lượt cùng lúc cho cùng một truyện**.

Bản đầu dùng bộ đếm `chapterSeq` để chống chạy đua, và nó làm lượt sau huỷ lượt
trước. Lượt trước nhận `null`, hiểu nhầm thành "không gọi được DB", rồi đi lấy
file `.txt` — nghĩa là **đường "Đọc tiếp" âm thầm bỏ qua DB và bỏ qua luôn
`is_restricted`**. Đã bắt được vì thấy có request tới `raw.githubusercontent.com`
trong lúc nội dung rõ ràng đã lấy từ DB.

Cách sửa: `ensureChapters()` giữ nguyên **promise** theo từng truyện, hai lượt
cùng truyện dùng chung một lượt gọi. Chống vẽ đè khi lật truyện thì kiểm
`chapterFic !== ficIdx` **sau** khi await, ngay trước lúc render.
### Bẫy đã gặp

- **`updateChapterNav()` thay hẳn thanh chương trên bằng `<select id="ch-select">`**,
  nên `ch-label-top` trong template của `openFic()` biến mất ngay sau đó. Muốn đọc
  nhãn chương thì dùng `ch-label-bot`, đừng tìm `ch-label-top`.
- **Pane trình duyệt bị ẩn thì `setTimeout` bị bóp xuống tối thiểu 1 giây.** Đo
  hiệu năng bằng vòng lặp polling sẽ ra toàn số ~1000ms giả. Đo bằng cách `await`
  thẳng hàm cần đo.

### Việc tiếp theo

- Trang "Bookmark của tôi": `bookmarks` có sẵn `note`, `is_private`, `is_rec`,
  `last_chapter_id` nhưng giao diện chưa dùng.
- Bình luận: trả lời lồng nhau (`parent_id`), sửa bình luận, bình luận theo chương
  (`chapter_id`) — schema có chỗ rồi, chưa làm giao diện.
- Kiểm duyệt: `comments.is_deleted` chưa ai dùng. Nếu làm xoá mềm thì **phải sửa
  `comment_count_trg`**, vì trigger hiện chỉ đếm INSERT/DELETE.
- Chuyển nhạc/ảnh từ GitHub Releases sang Supabase Storage. Cột `chapters.music`
  đã có dữ liệu nhưng frontend chưa dùng — vẫn lấy nhạc từ `fics.json`.
  Bucket `avatars` làm mẫu được.
- `const REPO` trỏ raw content sang `lavaknight2017-rgb/...` — chủ repo xác nhận
  đó là tài khoản cá nhân của mình, không phải người lạ, **không cần xử lý**.
  Đường dẫn này giờ chỉ dùng ở nhánh dự phòng khi DB không gọi được.
- **`is_restricted` vẫn hở một đường:** file `.txt` nằm công khai trên GitHub
  (ở cả hai repo), nên ai gõ thẳng raw URL vẫn đọc được. Chủ repo **đã chốt giữ
  file `.txt` làm dự phòng**, chấp nhận đánh đổi này. Muốn bịt thì phải xoá file —
  và lưu ý `git rm` chưa đủ, commit cũ vẫn phục vụ được nội dung, phải viết lại
  lịch sử ở cả hai repo.
