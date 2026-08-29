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
ap-northeast-1, ACTIVE) — schema `public` hiện đang **rỗng**.

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
8 function, RLS bật đủ 12/12. Toàn bộ bảng đang rỗng — chưa import fic nào.

Migration đã chạy, theo thứ tự:

1. `enums_and_utility_functions`
2. `core_tables`
3. `security_helper_functions`
4. `enable_rls_and_policies`
5. `triggers_signup_moderation_counters`
6. `harden_function_search_path_and_execute`
7. `grant_dml_to_api_roles`
8. `revoke_trigger_function_execute_from_public`

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
`rls_auto_enable()` là hàm của nền tảng Supabase, không phải của dự án.

### Bất biến phải giữ

Điều kiện đọc work nằm ở **hai chỗ** và phải luôn trùng khít:
`public.can_read_work()` và policy SELECT của bảng `works`
(`status = 'published' and (not is_restricted or auth.uid() is not null)`).
Sửa một bên mà quên bên kia thì `chapters.content` / `comments` / `kudos` của truyện
restricted sẽ rò rỉ cho khách vãng lai, trong khi hàng `works` vẫn bị chặn —
lỗi này đã từng xảy ra một lần và bị bắt lúc review.

### Việc tiếp theo (chưa làm)

- Import 36 fic từ `fics/*.yaml` + 62 file `.txt` vào `works` / `chapters`,
  dùng `works.legacy_id = 'fic-<index>'` để map.
- Chuẩn hoá fandom / ship (gộp `Nevuillette/Furina`, `Khaslana/Cyrne` qua `canonical_id`).
- Tách warning hiện tại thành tag `type='warning'` + `works.warning_note`.
- Đấu frontend vào project mới; đổi `SUPABASE_URL`/`SUPABASE_KEY` ở
  `index.html:1773` sang `oseddxgmwbeduazbomuf`.
- Comment cũ ở project `ggbahdhmtgaemgblfdum`: **đã chốt bỏ, không import.**

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

### Việc tiếp theo

- Đấu frontend vào project mới: đổi `SUPABASE_URL`/`SUPABASE_KEY` ở
  `index.html:1773` sang `oseddxgmwbeduazbomuf`, rồi thay dần
  `fetch('fics.json')` + thẻ `.fic-card` hard-code bằng truy vấn `works`/`chapters`.
- Bật **Leaked Password Protection** trong Dashboard → Authentication → Policies
  (advisor đang cảnh báo; giờ đã có tài khoản thật nên nó có ý nghĩa).
- Chuyển nhạc/ảnh từ GitHub Releases sang Supabase Storage (`chapters.music` hiện
  vẫn trỏ URL GitHub, giữ nguyên cấu trúc `{source,url,start,name}` của site cũ).
