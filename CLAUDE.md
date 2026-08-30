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
- Nội dung truyện: **file `.txt` phẳng ở gốc repo** (64 file), fetch runtime rồi
  chuyển sang HTML bằng `txtToHtml()` (tách đoạn theo dòng trống, `---` → scene break).
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

2. **Thẻ `.fic-card` hard-code trong `index.html`** (trang Works, dòng ~566–810).
   Đây mới là thứ hiển thị ở trang Works, và `buildSidebar()` **quét DOM của
   các thẻ này** (`data-fandom` + `.tag`) để dựng bộ lọc fandom/ship. Trang Home
   thì ngược lại, render từ `fics.json` qua `makeCard()`.
   → Fandom và ship hiện **không có danh sách chuẩn ở đâu cả**, chúng được suy ra
   từ HTML. Thuộc tính `data-fandom` dùng key rút gọn (`Figure Skating`, `Honkai`)
   khác với nhãn hiển thị (`Figure Skating RPF`, `Honkai: Star Rail`).

### Những chỗ đã biết là lệch / nợ kỹ thuật

- `Violin concerto 2.3.txt` được `fics/034` tham chiếu nhưng **không tồn tại** trong repo.
- 62 file `.txt` được tham chiếu / 64 file `.txt` có thật → 2 file mồ côi.
- Ship bị gõ sai chính tả tạo thành tag trùng lặp: `Neuvillette/Furina` vs
  `Nevuillette/Furina` — cùng một ship, đã gộp.
- **`Khaslana/Cyrne` KHÔNG phải lỗi gõ của `Phainon/Cyrene`.** Hai nhãn này cùng
  gắn trên `014-impromptu-no2` (nội dung cuckold: Cyrene đi với "bạn" Khaslana,
  còn Phainon nghĩ khác) → đó là hai ship khác nhau, gộp lại là làm hỏng nghĩa
  của truyện. Chỉ sửa lỗi gõ `Cyrne` → `Cyrene`.
- `const REPO` (dòng ~911) trỏ raw content sang tài khoản khác:
  `lavaknight2017-rgb/ShostaKid.github.io`. Nội dung truyện đang được tải từ đó.
- **Đã có Supabase rồi**: dòng 1773–1774 hard-code `SUPABASE_URL` +
  `SUPABASE_KEY` (anon) của project `ggbahdhmtgaemgblfdum` ("ShostaKid's Project",
  ap-south-1) cho tính năng comment (`fetchComments` / `submitComment`, bảng
  `comments`, khoá theo `fic_id = 'fic-<index>'`). **Project này hiện đang
  INACTIVE/paused** → comment trên site thật đang hỏng. Ngoài ra khoá comment theo
  index của mảng nên đổi thứ tự fic sẽ làm comment gắn nhầm truyện.

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
8 function, RLS bật đủ 12/12. Dữ liệu đã import xong (36 fic, 62 chương).

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

### Cảnh báo advisor còn lại — cố ý để vậy

`is_admin()`, `can_read_work()`, `owns_work()` vẫn bị lint
`anon_security_definer_function_executable`. **Không được revoke**: ba hàm này được
gọi bên trong biểu thức policy, mà biểu thức policy chạy với quyền của chính người
truy vấn → revoke là mọi query của anon/authenticated đều `permission denied`.
Chúng chỉ trả boolean về chính người gọi, không lộ thêm gì ngoài những gì RLS đã cho.
`rls_auto_enable()` thì **đã revoke** (migration 10) — nó là hàm của event trigger
`ensure_rls`, không hề được policy gọi, nên khoá lại không ảnh hưởng gì; đã kiểm
chứng bảng mới tạo vẫn tự bật RLS sau khi revoke.

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

### Việc tiếp theo

- **Comment** — phần còn lại của kudos/bookmark/comment. Khối comment cũ ở
  `index.html` (`SUPABASE_URL`/`SUPABASE_KEY` của project `ggbahdhmtgaemgblfdum`
  đã paused) vẫn còn nguyên và vẫn hỏng. **Đừng chỉ đổi URL sang project mới** —
  bảng `comments` mới có schema khác hẳn (không có `fic_id`), đổi mỗi key là hỏng
  theo kiểu khác. Phải viết lại cả khối.
- Trang "Bookmark của tôi": hiện `bookmarks` có sẵn `note`, `is_private`, `is_rec`,
  `last_chapter_id` nhưng giao diện chưa dùng tới — bookmark tạo ra đang để mặc định
  (riêng tư, không ghi chú).
- Đấu phần Browse vào DB: thay `fetch('fics.json')` + thẻ `.fic-card` hard-code
  bằng truy vấn `works` / `chapters`. Làm xong mới hiện được số kudos trên thẻ,
  và mới bỏ được khoá theo vị trí `legacy_id`.
- Bật **Leaked Password Protection** trong Dashboard → Authentication.
  Chủ repo báo đã bật ngày 2026-08-30 nhưng advisor quét lại vẫn báo tắt — cần
  kiểm tra lại xem thiết lập có thật sự lưu không.
- Chuyển nhạc/ảnh từ GitHub Releases sang Supabase Storage (`chapters.music` hiện
  vẫn trỏ URL GitHub, giữ nguyên cấu trúc `{source,url,start,name}` của site cũ).
  Bucket `avatars` đã có, làm mẫu được cho bucket nhạc/ảnh sau này.
