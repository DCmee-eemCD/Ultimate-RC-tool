<a id="english"></a>

[English](#english) | [Tiếng Việt](#tieng-viet)

# Ultimate RC tools — Chrome extension

Current version: **2.1.0**. Requires **Chrome 116 or newer**.

Ultimate RC tools customizes EduNext's appearance, recovers original message text
when available, provides local Vietnamese/English OCR, adds background music,
and automatically answers new questions through your own OpenAI-compatible API.

This guide is for users and developers. AI coding agents should read
[AGENT_README.md](AGENT_README.md) for implementation details and maintenance notes.
Control names in this section are translated into English; the current console
may display Vietnamese labels. The Vietnamese section uses those labels.

## Install in Chrome

### 1. Download and extract

1. Open the [GitHub Releases page](https://github.com/DCmee-eemCD/Ultimate-RC-tool/releases).
2. Under the release's **Assets**, download **Ultimate-RC-tools-v2.0.0-unpacked.zip**
   (or the equivalent unpacked ZIP for a newer version).
3. Extract the downloaded archive into a permanent folder, such as
   `Documents/Ultimate-RC-tools`. Keep this folder
   after installation: Chrome loads the extension from it.

The release ZIP contains an **extension** folder, **INSTALL.txt**, **README.md**,
and **LICENSE**. Use the unpacked ZIP attached to the release for these steps;
GitHub's automatic **Source code** downloads contain the full development project.

### 2. Load the extension

1. If you previously installed Ultimate RC tools in Tampermonkey, disable that
   userscript to prevent duplicate buttons and actions.
2. Paste `chrome://extensions` into Chrome's address bar and press **Enter**.
3. Turn on **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Open the folder you extracted and select its **extension** folder.
   This is the folder containing `manifest.json`; do not select the ZIP or its
   outer folder.
6. Confirm that **Ultimate RC tools** appears in the extension list and is enabled.

No build, Node.js, Rust, server or Tampermonkey installation is needed.
This is an unpacked extension, not a Chrome Web Store installation.
The manifest requires Chrome 116 or newer.

### 3. Open EduNext

1. Open [EduNext](https://fsc-edunext.fpt.edu.vn/) and sign in as usual.
   If it is already open, refresh the page.
2. Look for the **Fe logo** settings launcher and text button at the bottom left.
3. Click the Fe logo or press **Alt+C** to open settings. Press **Esc** to close
   them unless cancelling a resize drag.

For a stuck OCR session, open **Text → Reset OCR**. This stops OCR across
tabs and reloads the current EduNext page, clearing its OCR queue while keeping
saved settings. Retry the scan afterwards; this does not fix an underlying network error.

The text button shows **Original text** in source-first mode or **OCR** in OCR mode.
Right-click it to scan the latest observed image. OCR runs locally and needs no
API key. The optional AI assistant needs your own provider settings; see
[BYOK short answers](#byok-short-answers).

### Update an existing installation

1. Open **Utilities → Check for updates** to download a newer ZIP, or download
   it manually from GitHub Releases, then extract it.
2. Close any open EduNext tabs, then find the extracted folder containing
   `manifest.json` and copy its contents into the same folder you originally loaded. Choose to
   replace existing files.
3. Open `chrome://extensions`, find **Ultimate RC tools**, and click its
   **Reload** button (the circular arrow).
4. Reopen EduNext.

Keep the same installation folder and reload the existing extension to retain
its saved settings. You do not need to remove and reinstall it.

### If it does not load

- **Manifest file is missing or unreadable:** extract the ZIP first, then select
  the **extension** folder containing `manifest.json`.
- **No Load unpacked button:** turn on **Developer mode** at
  `chrome://extensions`.
- **No buttons on EduNext:** make sure the extension is enabled, check that you
  are on `https://fsc-edunext.fpt.edu.vn/`, and refresh the page.
- **Duplicate buttons:** disable the old Ultimate RC tools Tampermonkey
  userscript or any duplicate installation, then refresh EduNext.
- **Extension stopped working after moving files:** restore the extracted folder
  to its original location, then reload the extension.

## Check for updates

Open **Utilities → Check for updates** in the Ultimate RC console. The update page
checks the latest public stable release from
[DCmee-eemCD/Ultimate-RC-tool](https://github.com/DCmee-eemCD/Ultimate-RC-tool/releases).
If its version is higher than the installed manifest version, Chrome downloads
the release ZIP automatically and the page shows a four-step update guide.
Equal or older releases are not downloaded. Checks run only when opening this page
or clicking **Check again**, not in the background.

Unzip the download, find the folder containing `manifest.json`, and copy its
contents over the **same folder already loaded in Chrome**. At `chrome://extensions`,
enable Developer mode and click **Reload** on Ultimate RC tools, then refresh EduNext.
Keep the folder path and existing extension installation to retain settings/API keys.
The extension cannot replace its installed files automatically; it is distributed
unpacked until Chrome Web Store publishing is available.

The added `downloads` permission starts the ZIP download and tracks completion or
interruption. No new host access is added. The updater accepts ZIP links only from
this repository's GitHub release assets; it never executes downloaded code.
Checks time out after 15 seconds. Keep the update tab open to see download status;
reopening it starts a fresh check and may download the newer ZIP again until you
install it. Release selection validates metadata and the asset URL, not the ZIP
contents or a checksum. Release maintainers must verify that the packaged
`manifest.json` matches the release version.

## BYOK short answers

Reload the unpacked extension at `chrome://extensions`, then refresh EduNext.
Open the main Ultimate RC console, then click the **bot icon** beside its top
edge to open the companion **AI assistant** panel. Click **API settings** there to
edit settings directly inside the console. Enter your OpenAI-compatible API base URL (for example
`https://api.openai.com/v1`), your provider's model ID, and your own API key, then
save. A full `/chat/completions` URL is also accepted. When switching providers,
enter the key for the new endpoint.
Endpoint API can be saved blank and stays blank after reopening. No default is inserted.
Enter an endpoint before sending an AI request.
Other providers still need their own URL; the key does not identify it automatically.
Endpoint autocorrection is disabled: saving and reopening preserve your address
(apart from surrounding spaces). No provider paths are guessed. Scheme-less
addresses use HTTPS internally for requests, or HTTP for localhost.
Model ID remains required. Saving shows the resolved endpoint explicitly.
Changing to a new endpoint requires entering its key; saved keys are not silently reused.

The AI panel previews the current question. Use **Read again** to refresh this preview
without calling the provider. The status area shows progress, completion, or a
problem that needs attention. Opening **API settings** switches to the connection
form; the outlined **Back to assistant** button with a left arrow returns to the question.
The question leads the panel, followed by an automatic-mode switch, answer controls,
and a separate status area. Automatic-mode controls stay in the assistant view.

API settings use a single-column form grouped into **Connection** and **Access key**.
Both screens follow the saved light/dark palette. **Show key** sits inside the
key field; saved-key status and **Delete key** sit directly below it. **Save configuration**
is the full-width primary action. The same form is available in extension options.

With a chat open, AI automatically reads the **Question** box in the latest
assistant message once its text settles, requests a short Vietnamese answer,
fills the empty Text composer, and clicks **Submit answer**. The AI panel can
stay closed. **Automatic: On/Off** pauses or resumes automatic answering; it starts
enabled when the page loads. **AI answer & send** remains available for manual
retries. Failed questions are not retried automatically until you resume automatic
answering or save API settings. **Stop** pauses automatic answering and
prevents a pending answer from being sent; the provider request may still incur
a charge. Existing drafts are preserved, changed questions cancel stale results,
and a question already submitted by this feature is not sent again on that page.

Only extracted question text is sent to the configured API provider. Image-based
questions need readable text from source recovery/OCR first; questions containing
diagrams are not supported by this text-only feature. Model answers can be wrong.
The feature uses your API balance and does not use a ChatGPT subscription.

The key is stored locally in Chrome extension storage, not in theme exports or
the website's storage. Local storage is not an encrypted password vault. Use
**Delete key** on the settings page to remove it. No credentials are bundled.
API calls run in the extension background, not through the page's message bridge.

## Features

- Three settings tabs: **Appearance**, **Utilities**, and **Text**.
  **Music** opens from its own music-note button beside the Assistant launcher.
  Each tab opens with a short description; flat settings rows and sentence-case
  group headings keep the controls easy to scan. Horizontal palette choices and
  flat color rows share the same saved theme colors. Wide panels arrange related
  settings groups in columns; narrow panels keep a single scrolling column.
- Main actions use the primary theme color. Utility pairs use quiet primary and
  secondary tints with neutral borders, including upload/remove background,
  import/export theme and play/stop music. API settings have one full-width Save
  action and a quiet key-deletion control beside the saved-key status.
- Source-first mode is enabled by default. It recovers full original text from
  an exact message match, falling back to local OCR when content is unavailable
  or ambiguous. Explicit automatic OCR and source-first are mutually exclusive.
  Recovered LaTeX stays source text; this feature does not newly typeset it.
- Appearance includes a dashboard background color, styled color swatches and
  theme-aware switches/sliders. Dashboard surfaces derive readable light/dark
  shades from the selected color rather than displaying the raw color unchanged.
- Every quick theme and image palette supports **Dark**, **Light**, and
  **Automatic by time**, using the appearance selector above the quick themes.
  Automatic uses light from 07:00 to 19:00 and dark otherwise, in the computer's
  local time; open tabs check every 30 seconds and when resumed. Choosing a quick
  theme turns off automatic image color matching so the selected theme stays active.
  Both Rust and JavaScript palettes use the selected mode and update the dashboard
  color too. Mode changes invalidate palette reuse; stale asynchronous results
  are rejected if the image or mode changes.
- The Discord preset has a dedicated light palette. Sidebar hover states,
  account menus, late-loaded headings and table headers follow the active theme.
  Appearance mode buttons show labels on hover or keyboard focus.
- Portable themes include `dashboardBg`, `imageThemeMode`, console accent colors
  (`consolePrimary`, `consoleSecondary`) and size (`consoleWidth`, `consoleHeight`). Older version-1
  themes without those fields retain the current values. OCR and behavior settings
  are excluded from theme transfer.
  Themes include uploaded image/video backgrounds (video up to 14 MB); the maximum
  theme file size is 25 MB. Linked backgrounds remain URLs.
- EduNext's left navigation uses SVG icons for account, home, assignments,
  upcoming slots, guide, support and FAQ. Original image nodes remain for React;
  replacements follow rerenders and resize. Button labels omit decorative emoji.
- Music accepts validated YouTube/Spotify links and provides title, real API
  position, seek, SVG playback controls, a video visibility toggle and stop.
  Both providers start with the video/embed collapsed and playback controls visible.
  A separate minimize button reduces the player to a 48px corner icon. Hiding or
  minimizing does not request a pause; restoring retains video visibility.
  The gray unplayed seek track is not a measured download/buffer indicator.
- Opening music requests playback; reloading the page only restores the saved
  link. Live playback remains subject to embedding, service and autoplay limits.
- Since pre-reset version 6.1.2, OCR question text and formulas remain selectable text; short
  enumerated answers are retained. Whole-line image replacement is disabled;
  isolated colored glyphs may remain inline images alongside selectable words.
  Actual diagrams can still be image segments.

OCR is local, using bundled Vietnamese/English Tesseract workers in an offscreen
document. Rust/WASM accelerates pixel operations; it is not a new recognition
model. Emoji, math and ordinary text may still be recognized incorrectly. Original
React source recovery is best effort. Image observation order can differ from
chat chronology: the latest observed image is not necessarily the newest message.
Source recovery requires an unambiguous matching assistant message and nonempty
content; it does not reconstruct missing original text. Signed-in EduNext and
live music streaming have not been verified by the fixture tests.

## Panel controls

The settings panel remains anchored at bottom-left. Size presets are **Compact**
(320 x 520), **Default** (380 x 620) and **Wide** (560 x 820).
The size controls sit below the scrolling settings, above the footer.
The readout shows the actual displayed size, capped to fit the viewport.
Preset changes animate over 240 ms unless reduced motion is enabled; dragging
updates the size directly.

Drag the faint resize arrow in the top-right corner; it becomes more prominent
on hover, keyboard focus and during dragging. With the grip focused,
arrow keys adjust by 10px; Shift adjusts by 40px. Home or double-click resets
only the size. Escape cancels an active drag without closing the panel.
Dimensions save on release; viewport changes alone preserve the preferred size.
Stored width is limited to 320-560px and height to 420-820px.

The panel uses a plain surface, compact header and understated tab strip.
Keyboard tabs and per-tab scroll positions remain supported, with light/dark
and narrow layouts. The interface uses Segoe UI and system-font fallbacks.
The shared tab underline slides to the selected tab in 220 ms, follows resizing,
and moves immediately when the system's reduced-motion preference is enabled.

The bot and music-note buttons open separate, theme-matched Assistant and Music
panels. Closed-panel launchers are 44px buttons spaced 8px apart. Open panels
line up to the right of Settings in opening order, with aligned tops and 12px
gaps. Closing a panel shifts the others left; reopening places it last. Unopened
launchers move after the open panels. Panels keep their own content height.
On narrow screens, panels are kept onscreen and may overlap; this is not a
horizontally scrolling workspace. Opening the Music panel does not start playback;
paste a link and choose **Open player** to play it.

Companion panels are 340px wide, shrinking to fit narrow screens. Escape closes
Music first when it is open, otherwise Assistant, before the main console.
Closing the main console hides both companion panels. API settings use an isolated
extension-origin frame inside the AI panel. Opening uses a 180 ms fade/slide
(60 ms fade with reduced motion). The assistant uses a 6px rounded scrollbar.
API settings use a slim, theme-matched scrollbar and support the mouse
wheel, touch or keyboard. The form fits its frame automatically, so there is
only one scrolling area when it is taller than the available screen space.

## Settings and permissions

The extension has separate storage from Tampermonkey. Existing userscript
preferences do not migrate automatically; the first run uses the current defaults.
Your original Tampermonkey settings remain untouched.

The extension injects its GUI only on the original EduNext domain. HTTP(S) host
access allows arbitrary image/video background URLs, FPT image downloads, and
requests to the configured LLM provider and GitHub release checks. The `downloads`
permission starts update ZIP downloads and tracks their status. The API form and its bundled resources
are web-accessible only to EduNext so it can be embedded without exposing its
document or key to page scripts. `clipboardWrite` preserves auto-copy; `storage` and
`unlimitedStorage` preserve settings and locally uploaded backgrounds/videos.
`declarativeNetRequestWithHostAccess` enables the narrowly scoped CSP header rule.
`offscreen` allows hidden DOM/canvas processing and local OCR workers.
It does not request browser history, passwords, cookies or debugger access.

The enabled `edunext_csp` rule removes CSP and CSP-Report-Only response headers
only from HTTPS documents on `fsc-edunext.fpt.edu.vn`. This removes all
header-delivered CSP protections there, not just media restrictions; HTML meta
CSP is separate. Other hosts and the extension's own CSP remain unchanged.

## Development

From the repository root, with Node.js and npm installed:

```powershell
npm ci
npm run build
npm run check
npm test
```

Load the repository's `extension/` folder at `chrome://extensions`.
After runtime changes, rebuild, reload the extension, and refresh EduNext.
Documentation-only changes need no build or reload.

| Path | Purpose |
| --- | --- |
| `source/` | Maintained feature modules, styles, and base userscript |
| `scripts/transforms/` | Ordered build transforms |
| `extension/` | Loadable extension: generated and directly maintained files |
| `rust-kernels/` | Rust/WASM image kernels with JavaScript fallbacks |
| `tests/` | Focused checks and browser fixtures |
| `images/` | Original logo assets |

Edit generated features in their source files. The build regenerates app.js,
auto-answer.js, OCR core/engine files, and console CSS in `extension/`.
Other modules, including the background worker and API settings, are maintained
directly. See [the maintenance reference](AGENT_README.md#development) for the
file map, browser-test setup, and release caveats.

`npm run check` checks script syntax; `npm test` runs only Node source-first
fixtures. `npm run test:byok` checks AI/provider fixtures and
`node tests/updates.cjs` checks the updater. Browser tests require separately
installed Playwright and Chrome for Testing; `npm ci` installs CSS build
dependencies only. Fixture results do not certify signed-in EduNext, live
music streaming, or paid-provider behavior.

<a id="tieng-viet"></a>

[English](#english) | [Tiếng Việt](#tieng-viet)

# Ultimate RC tools — tiện ích Chrome

Phiên bản hiện tại: **2.1.0**. Yêu cầu **Chrome 116 trở lên**.

Ultimate RC tools tùy biến giao diện EduNext, khôi phục văn bản tin nhắn gốc khi
có thể, cung cấp OCR tiếng Việt/Anh cục bộ, thêm nhạc nền và tự động trả lời câu
hỏi mới thông qua API tương thích OpenAI của bạn.

Tài liệu này dành cho người dùng và nhà phát triển. AI hỗ trợ lập trình nên đọc
[AGENT_README.md](AGENT_README.md) để biết chi tiết triển khai và ghi chú bảo trì.

## Cài đặt trong Chrome

### 1. Tải xuống và giải nén

1. Mở [trang GitHub Releases](https://github.com/DCmee-eemCD/Ultimate-RC-tool/releases).
2. Trong **Tài sản** của bản phát hành, tải **Ultimate-RC-tools-v2.0.0-unpacked.zip**
   (hoặc ZIP unpacked tương đương của phiên bản mới hơn).
3. Giải nén archive đã tải vào một thư mục cố định, chẳng hạn
   `Documents/Ultimate-RC-tools`.
   Giữ thư mục này sau khi cài đặt: Chrome tải tiện ích từ đó.

ZIP phát hành chứa thư mục **extension**, **INSTALL.txt**, **README.md** và
**LICENSE**.
Dùng ZIP unpacked đính kèm bản phát hành cho các bước này; bản tải **Mã nguồn**
tự động của GitHub chứa toàn bộ dự án phát triển.

### 2. Tải tiện ích

1. Nếu trước đây bạn đã cài Ultimate RC tools trong Tampermonkey, hãy tắt
   userscript đó để tránh nút và hành động bị trùng.
2. Dán `chrome://extensions` vào thanh địa chỉ Chrome và nhấn **Enter**.
3. Bật **Chế độ dành cho nhà phát triển** ở góc trên bên phải.
4. Nhấp **Tải tiện ích đã giải nén**.
5. Mở thư mục đã giải nén và chọn thư mục **extension**.
   Đây là thư mục chứa `manifest.json`; không chọn ZIP hoặc thư mục bao ngoài.
6. Xác nhận **Ultimate RC tools** xuất hiện trong danh sách tiện ích và đang bật.

Không cần cài build, Node.js, Rust, server hay Tampermonkey.
Đây là tiện ích unpacked, không phải tiện ích cài từ Chrome Web Store.
Manifest yêu cầu Chrome 116 trở lên.

### 3. Mở EduNext

1. Mở [EduNext](https://fsc-edunext.fpt.edu.vn/) và đăng nhập như thường lệ.
   Nếu trang đã mở, hãy làm mới trang.
2. Tìm launcher cài đặt **logo Fe** và nút văn bản ở góc dưới bên trái.
3. Nhấp logo Fe hoặc nhấn **Alt+C** để mở cài đặt.
   Nhấn **Esc** để đóng, trừ khi bạn đang hủy thao tác kéo đổi kích thước.

Nút văn bản hiển thị **Chữ gốc** ở chế độ source-first hoặc **OCR** ở chế độ OCR.
Nhấp phải vào nút này để quét ảnh được quan sát gần nhất.
OCR chạy cục bộ và không cần API key.
Trợ lý AI tùy chọn cần cài đặt nhà cung cấp của bạn; xem
[Trả lời ngắn bằng BYOK](#vi-byok).

### Cập nhật bản cài đặt hiện có

1. Mở **Tiện ích → Kiểm tra cập nhật** để tải ZIP mới hơn, hoặc tải thủ công
   từ GitHub Releases, rồi giải nén.
2. Đóng mọi tab EduNext đang mở, tìm thư mục đã giải nén chứa `manifest.json`,
   rồi chép nội dung vào đúng thư mục tiện ích đã nạp trước đó.
   Chọn thay thế các file hiện có.
3. Mở `chrome://extensions`, tìm **Ultimate RC tools** và nhấp nút **Tải lại**
   (mũi tên vòng tròn).
4. Mở lại EduNext.

Giữ nguyên thư mục cài đặt và tải lại tiện ích hiện có để giữ cài đặt đã lưu.
Bạn không cần xóa rồi cài lại.

Nếu OCR bị kẹt, mở **Văn bản → Đặt lại OCR**. Thao tác này dừng OCR trên các tab
và tải lại trang EduNext hiện tại, giữ nguyên cài đặt. Sau đó thử quét lại;
đặt lại không sửa được lỗi mạng bên dưới.

### Nếu tiện ích không tải

- **Thiếu hoặc không đọc được manifest:** trước hết hãy giải nén ZIP, sau đó chọn
  thư mục **extension** chứa `manifest.json`.
- **Không có nút Tải tiện ích đã giải nén:** bật **Chế độ dành cho nhà phát triển** tại
  `chrome://extensions`.
- **Không có nút trên EduNext:** bảo đảm tiện ích đang bật, kiểm tra bạn ở
  `https://fsc-edunext.fpt.edu.vn/` và làm mới trang.
- **Nút bị trùng:** tắt userscript Ultimate RC tools cũ trong Tampermonkey hoặc
  bản cài trùng, rồi làm mới EduNext.
- **Tiện ích ngừng hoạt động sau khi di chuyển file:** đưa thư mục đã giải nén về
  vị trí ban đầu, rồi tải lại tiện ích.

## Kiểm tra cập nhật

Trong bảng Ultimate RC, mở **Tiện ích → Kiểm tra cập nhật**. Trang cập nhật kiểm tra
bản phát hành ổn định mới nhất trên GitHub và tự tải ZIP nếu phiên bản cao hơn bản
đang dùng. Bản bằng hoặc cũ hơn sẽ không được tải. Nếu GitHub lỗi hoặc thiếu ZIP,
trang sẽ báo rõ và có liên kết tải thủ công.

Giải nén ZIP, tìm thư mục chứa `manifest.json`, rồi chép toàn bộ nội dung vào
**đúng thư mục tiện ích đã nạp trong Chrome**, thay thế tệp trùng tên. Mở
`chrome://extensions`, bật chế độ nhà phát triển, bấm **Tải lại ↻** trên thẻ Ultimate
RC tools, rồi làm mới EduNext. Giữ đường dẫn và không gỡ tiện ích để giữ cài đặt/khóa API.
Hướng dẫn bốn bước này cũng hiển thị trên trang cập nhật. Tiện ích chưa có trên Chrome
Web Store nên không tự thay tệp đã cài. Quyền `downloads` mới dùng để tải ZIP và theo
dõi trạng thái; không thêm quyền truy cập host.

Chỉ kiểm tra khi mở trang hoặc bấm **Kiểm tra lại**, không kiểm tra nền định kỳ.
Yêu cầu GitHub có giới hạn 15 giây. Giữ trang mở để xem trạng thái tải; mở lại sẽ
kiểm tra mới và có thể tải ZIP lần nữa nếu bạn chưa cài phiên bản mới.
Chỉ chọn ZIP đã tải lên kho phát hành chính thức, ưu tiên đúng một ZIP có tên
`unpacked`, nếu không thì cần đúng một ZIP. Bản nháp, prerelease, nhiều ZIP không
rõ lựa chọn hoặc phiên bản tag/tên ZIP mâu thuẫn đều bị từ chối. Tag không phải
số có thể dùng phiên bản trong tên ZIP. Không tự chọn kho mã nguồn của GitHub.
Hệ thống không kiểm tra nội dung ZIP hay checksum; người phát hành phải bảo đảm
phiên bản trong `manifest.json`, tag và tên ZIP khớp nhau.

<a id="vi-byok"></a>

## Trả lời ngắn bằng BYOK

Tải lại tiện ích đã giải nén tại `chrome://extensions`, sau đó làm mới EduNext.
Mở bảng điều khiển Ultimate RC chính, rồi nhấp **biểu tượng bot** cạnh mép trên
để mở bảng **Trợ lý AI** đi kèm.
Nhấp **Cài đặt API** tại đó để chỉnh sửa cài đặt ngay trong bảng điều khiển.
Nhập URL cơ sở API tương thích OpenAI của bạn (ví dụ
`https://api.openai.com/v1`), ID model của nhà cung cấp và API key của bạn, rồi
lưu.
Có thể dùng cả URL đầy đủ `/chat/completions`.
Khi đổi nhà cung cấp, hãy nhập key cho endpoint mới.
Có thể lưu Endpoint API trống và endpoint này vẫn trống sau khi mở lại. Không có
giá trị mặc định nào được chèn vào.
Hãy nhập endpoint trước khi gửi yêu cầu AI.
Các nhà cung cấp khác vẫn cần URL riêng; key không tự xác định nhà cung cấp.
Tính năng tự sửa endpoint bị tắt: việc lưu và mở lại giữ nguyên địa chỉ của bạn
(ngoài khoảng trắng ở đầu và cuối).
Không tự đoán đường dẫn của nhà cung cấp.
Địa chỉ không có scheme dùng HTTPS nội bộ cho các yêu cầu, hoặc HTTP khi là
localhost.
ID model vẫn bắt buộc.
Khi lưu, endpoint sau khi phân giải được hiển thị rõ ràng.
Đổi sang endpoint mới yêu cầu nhập key của endpoint đó; các key đã lưu không được
âm thầm dùng lại.

Bảng AI xem trước câu hỏi hiện tại.
Dùng **Đọc lại** để làm mới phần xem trước này mà không gọi nhà cung cấp.
Vùng trạng thái hiển thị tiến trình, hoàn tất hoặc vấn đề cần chú ý.
Mở **Cài đặt API** sẽ chuyển sang biểu mẫu kết nối; nút **Quay lại trợ lý** có
viền và mũi tên trái sẽ đưa về câu hỏi.
Câu hỏi nằm ở đầu bảng, tiếp theo là công tắc chế độ tự động, các điều khiển trả
lời và một vùng trạng thái riêng.
Các điều khiển chế độ tự động vẫn nằm trong chế độ trợ lý.

Cài đặt API dùng biểu mẫu một cột, được nhóm thành **Kết nối** và **Khóa truy
cập**.
Cả hai màn hình tuân theo bảng màu sáng/tối đã lưu.
**Hiện khóa** nằm bên trong trường key; trạng thái key đã lưu và **Xóa khóa** nằm
ngay bên dưới trường đó.
**Lưu cấu hình** là nút chính rộng toàn bộ.
Biểu mẫu tương tự cũng có trong tùy chọn của tiện ích.

Khi một cuộc trò chuyện đang mở, AI tự động đọc ô **Câu hỏi** trong tin nhắn trợ
lý mới nhất sau khi văn bản ổn định, yêu cầu một câu trả lời tiếng Việt ngắn, điền
vào trình soạn thảo Text đang trống và nhấp **Nộp câu trả lời**.
Bảng AI có thể vẫn đóng.
**Tự động: Bật/Tắt** tạm dừng hoặc tiếp tục trả lời tự động; tính năng bắt đầu
được bật khi trang tải xong.
**AI trả lời & gửi** vẫn có thể dùng để thử lại thủ công.
Câu hỏi thất bại không được tự động thử lại cho đến khi bạn tiếp tục trả lời tự
động hoặc lưu cài đặt API.
**Dừng** tạm dừng trả lời tự động và ngăn câu trả lời đang chờ được gửi; yêu cầu
đến nhà cung cấp vẫn có thể phát sinh phí.
Bản nháp hiện có được giữ lại, câu hỏi thay đổi sẽ hủy kết quả cũ và câu hỏi đã
được tính năng này gửi trên trang đó sẽ không được gửi lại.

Chỉ phần văn bản câu hỏi đã trích xuất được gửi đến nhà cung cấp API đã cấu hình.
Câu hỏi dạng hình ảnh trước hết cần văn bản có thể đọc được từ khôi phục nguồn/OCR;
tính năng chỉ xử lý văn bản này không hỗ trợ câu hỏi có sơ đồ.
Câu trả lời của model có thể sai.
Tính năng dùng số dư API của bạn và không dùng gói đăng ký ChatGPT.

Key được lưu cục bộ trong bộ nhớ của tiện ích Chrome, không nằm trong bản xuất
theme hay bộ nhớ của trang web.
Bộ nhớ cục bộ không phải kho mật khẩu được mã hóa.
Dùng **Xóa khóa** trên trang cài đặt để xóa key.
Không có thông tin xác thực nào được đóng gói.
Các lệnh gọi API chạy trong nền của tiện ích, không đi qua cầu nối tin nhắn của
trang.

## Tính năng

- Có ba tab cài đặt: **Giao diện**, **Tiện ích** và **Văn bản**.
  **Nhạc** mở bằng nút nốt nhạc riêng cạnh nút Trợ lý.
  Mỗi tab mở ra với mô tả ngắn; các hàng cài đặt phẳng và tiêu đề nhóm theo kiểu
  sentence-case giúp dễ quét.
  Các lựa chọn bảng màu ngang và hàng màu phẳng dùng chung màu theme đã lưu.
  Bảng rộng sắp xếp các nhóm cài đặt liên quan thành các cột; bảng hẹp giữ một
  cột cuộn duy nhất.
- Hành động chính dùng màu chính của theme.
  Các cặp tiện ích dùng sắc độ yên hơn của màu chính và phụ với viền trung tính,
  gồm tải/xóa nền, nhập/xuất theme và phát/dừng nhạc.
  Cài đặt API có một hành động Lưu rộng toàn bộ và một điều khiển xóa key kín
  đáo cạnh trạng thái key đã lưu.
- Chế độ source-first được bật mặc định.
  Nó khôi phục toàn bộ văn bản gốc từ một tin nhắn khớp chính xác, rồi chuyển sang
  OCR cục bộ khi nội dung không có hoặc không rõ ràng.
  OCR tự động rõ ràng và source-first loại trừ lẫn nhau.
  LaTeX được khôi phục vẫn là văn bản nguồn; tính năng này không typeset lại nó.
- Phần giao diện có màu nền dashboard, ô màu được tạo kiểu và switch/slider theo
  theme.
  Các bề mặt dashboard lấy sắc độ sáng/tối dễ đọc từ màu đã chọn thay vì hiển thị
  nguyên màu thô.
- Mọi theme nhanh và bảng màu ảnh đều hỗ trợ **Tối**, **Sáng** và **Tự động theo
  thời gian**, dùng bộ chọn giao diện phía trên các theme nhanh.
  Tự động dùng sáng từ 07:00 đến 19:00 và tối vào thời gian còn lại theo giờ địa
  phương của máy; các tab đang mở kiểm tra mỗi 30 giây và khi được tiếp tục.
  Chọn theme nhanh sẽ tắt việc tự động khớp màu ảnh để theme đã chọn luôn hoạt động.
  Cả bảng màu Rust và JavaScript đều dùng mode đã chọn và cũng cập nhật màu
  dashboard.
  Thay đổi mode làm vô hiệu việc dùng lại bảng màu; kết quả bất đồng bộ cũ bị từ
  chối nếu ảnh hoặc mode thay đổi.
- Preset Discord có bảng màu sáng riêng.
  Trạng thái hover của sidebar, menu tài khoản, tiêu đề tải muộn và tiêu đề bảng
  tuân theo theme đang hoạt động.
  Nút mode giao diện hiển thị nhãn khi hover hoặc focus bằng bàn phím.
- Theme portable gồm `dashboardBg`, `imageThemeMode`, màu nhấn của console
  (`consolePrimary`, `consoleSecondary`) và kích thước (`consoleWidth`,
  `consoleHeight`).
  Theme version 1 cũ không có các trường này vẫn giữ giá trị hiện tại.
  Cài đặt OCR và hành vi không được chuyển khi truyền theme.
  Theme gồm nền ảnh/video đã tải lên (video tối đa 14 MB); kích thước file theme
  tối đa là 25 MB.
  Nền liên kết vẫn là URL.
- Thanh điều hướng trái của EduNext dùng icon SVG cho tài khoản, trang chủ, bài
  tập, các lịch sắp tới, hướng dẫn, hỗ trợ và FAQ.
  Các node ảnh gốc vẫn được giữ cho React; thay thế được áp dụng lại sau khi
  render lại và đổi kích thước.
  Nhãn nút bỏ emoji trang trí.
- Nhạc chấp nhận liên kết YouTube/Spotify đã được kiểm tra và cung cấp tiêu đề,
  vị trí API thực, tua, điều khiển phát SVG, công tắc hiển thị video và dừng.
  Cả hai nhà cung cấp bắt đầu với video/embed thu gọn và điều khiển phát hiển thị.
  Nút thu nhỏ riêng đưa player về icon góc 48px.
  Ẩn hoặc thu nhỏ không yêu cầu tạm dừng; khi khôi phục vẫn giữ khả năng hiển thị
  video.
  Thanh tua màu xám chưa phát không phải chỉ báo download/buffer được đo lường.
- Mở nhạc sẽ yêu cầu phát; tải lại trang chỉ khôi phục liên kết đã lưu.
  Phát trực tiếp vẫn chịu giới hạn của việc nhúng, dịch vụ và autoplay.
- Từ phiên bản 6.1.2 trước khi đặt lại, văn bản câu hỏi và công thức OCR vẫn là
  văn bản có thể chọn; các đáp án đánh số ngắn được giữ lại.
  Đã tắt việc thay ảnh cả dòng; glyph màu cô lập có thể vẫn là ảnh nội tuyến bên
  cạnh các từ có thể chọn.
  Sơ đồ thực tế vẫn có thể là các đoạn ảnh.

OCR chạy cục bộ, dùng worker Tesseract tiếng Việt/Anh được đóng gói trong một
tài liệu offscreen.
Rust/WASM tăng tốc thao tác pixel; đây không phải model nhận dạng mới.
Emoji, công thức và văn bản thông thường vẫn có thể được nhận dạng sai.
Khôi phục nguồn React là nỗ lực tốt nhất.
Thứ tự quan sát ảnh có thể khác thứ tự thời gian của cuộc trò chuyện: ảnh được
quan sát gần nhất không nhất thiết là ảnh của tin nhắn mới nhất.
Khôi phục nguồn cần một tin nhắn trợ lý khớp rõ ràng và nội dung không rỗng; nó
không dựng lại văn bản gốc bị thiếu.
Các kiểm thử fixture chưa xác minh EduNext đã đăng nhập và việc phát nhạc trực
tiếp.

## Điều khiển bảng

Bảng cài đặt vẫn neo ở góc dưới bên trái.
Preset kích thước là **Gọn** (320 x 520), **Mặc định** (380 x 620) và **Rộng**
(560 x 820).
Điều khiển kích thước nằm dưới phần cài đặt có thể cuộn và phía trên chân trang.
Số đo hiển thị kích thước thực tế đang được hiển thị, bị giới hạn để vừa viewport.
Thay đổi preset có hiệu ứng trong 240 ms trừ khi bật reduced motion; kéo cập nhật
trực tiếp kích thước.

Kéo mũi tên đổi kích thước mờ ở góc trên bên phải; nó nổi bật hơn khi hover,
focus bằng bàn phím và trong lúc kéo.
Khi grip được focus, các phím mũi tên điều chỉnh 10px; Shift điều chỉnh 40px.
Home hoặc nhấp đúp chỉ đặt lại kích thước.
Escape hủy thao tác kéo đang hoạt động mà không đóng bảng.
Kích thước được lưu khi nhả chuột; chỉ thay đổi viewport sẽ giữ nguyên kích thước
ưu tiên.
Chiều rộng lưu được giới hạn từ 320 đến 560px và chiều cao từ 420 đến 820px.

Bảng dùng bề mặt đơn giản, header gọn và dải tab kín đáo.
Tab bằng bàn phím và vị trí cuộn riêng của từng tab vẫn được hỗ trợ cùng bố cục
sáng/tối và hẹp.
Giao diện dùng Segoe UI và các font hệ thống dự phòng.
Gạch chân tab dùng chung trượt tới tab được chọn trong 220 ms, theo việc đổi kích
thước và di chuyển ngay khi tùy chọn reduced-motion của hệ thống được bật.

Nút bot và nốt nhạc mở các bảng Trợ lý và Nhạc riêng, khớp theme.
Các nút mở bảng có kích thước 44px và cách nhau 8px. Bảng đã mở xếp bên phải
console theo thứ tự mở, thẳng mép trên và cách nhau 12px. Đóng một bảng sẽ dồn
các bảng còn lại sang trái; mở lại sẽ đặt bảng đó cuối hàng. Các nút chưa mở
di chuyển ra sau các bảng đang mở. Mỗi bảng giữ chiều cao theo nội dung.
Trên màn hình hẹp, các bảng được giữ trong màn hình và có thể chồng lên nhau;
không có vùng làm việc cuộn ngang. Mở bảng Nhạc chưa phát nhạc: dán liên kết
và chọn **Mở trình phát** để phát.
Các bảng rộng 340px, thu nhỏ để vừa màn hình hẹp.
Escape đóng Nhạc trước nếu đang mở, sau đó đến Trợ lý, rồi console chính.
Đóng console chính sẽ ẩn cả hai bảng phụ.
Cài đặt API dùng frame nguồn tiện ích cô lập bên trong bảng AI.
Mở bảng dùng hiệu ứng mờ/trượt 180 ms (mờ 60 ms khi reduced motion).
Trợ lý dùng thanh cuộn bo tròn 6px.
Cài đặt API dùng thanh cuộn mảnh khớp theme và hỗ trợ con lăn chuột, cảm ứng hoặc
bàn phím.
Biểu mẫu tự động vừa frame, nên chỉ có một vùng cuộn khi nó cao hơn phần màn hình
còn trống.

## Cài đặt và quyền

Tiện ích có bộ nhớ riêng, tách khỏi Tampermonkey.
Tùy chọn userscript hiện có không được tự động chuyển; lần chạy đầu tiên dùng mặc
định hiện tại.
Cài đặt Tampermonkey gốc của bạn không bị thay đổi.

Tiện ích chỉ chèn GUI trên domain EduNext gốc.
Quyền truy cập host HTTP(S) cho phép URL nền ảnh/video tùy ý, tải ảnh FPT và gửi
yêu cầu đến nhà cung cấp LLM đã cấu hình và kiểm tra bản phát hành GitHub.
Quyền `downloads` bắt đầu tải ZIP cập nhật và theo dõi trạng thái tải.
Biểu mẫu API và các tài nguyên đi kèm chỉ có thể được EduNext truy cập trên web để
có thể nhúng mà không làm lộ document hoặc key cho script của trang.
`clipboardWrite` giữ chức năng tự sao chép; `storage` và `unlimitedStorage` giữ
cài đặt cùng nền/video đã tải lên cục bộ.
`declarativeNetRequestWithHostAccess` bật rule header CSP có phạm vi hẹp.
`offscreen` cho phép xử lý DOM/canvas ẩn và worker OCR cục bộ.
Tiện ích không yêu cầu lịch sử trình duyệt, mật khẩu, cookie hay quyền debugger.

Rule `edunext_csp` đang bật chỉ xóa header phản hồi CSP và CSP-Report-Only khỏi
document HTTPS trên `fsc-edunext.fpt.edu.vn`.
Điều này xóa mọi bảo vệ CSP được phân phối qua header ở đó, không chỉ hạn chế
media; CSP meta HTML là phần riêng.
Các host khác và CSP của chính tiện ích không thay đổi.

## Phát triển

Từ thư mục gốc dự án, sau khi cài Node.js và npm:

```powershell
npm ci
npm run build
npm run check
npm test
```

Nạp thư mục `extension/` của dự án tại `chrome://extensions`.
Sau khi sửa mã chạy, build lại, tải lại tiện ích và làm mới EduNext.
Chỉ sửa tài liệu thì không cần build hay tải lại.

| Đường dẫn | Mục đích |
| --- | --- |
| `source/` | Module tính năng, kiểu giao diện và userscript nền được duy trì |
| `scripts/transforms/` | Các bước biến đổi build theo thứ tự |
| `extension/` | Tiện ích có thể nạp: tệp được tạo và tệp được duy trì trực tiếp |
| `rust-kernels/` | Kernel ảnh Rust/WASM với phương án JavaScript dự phòng |
| `tests/` | Kiểm tra tập trung và dữ liệu kiểm thử trình duyệt |
| `images/` | Tài nguyên logo gốc |

Sửa tính năng được tạo tự động tại tệp nguồn. Build tạo lại app.js,
auto-answer.js, các tệp lõi/engine OCR và CSS bảng điều khiển trong `extension/`.
Các module khác, gồm tiến trình nền và cài đặt API, được duy trì trực tiếp.
Xem [tài liệu bảo trì](AGENT_README.md#development) để biết chi tiết tệp,
thiết lập kiểm thử trình duyệt và lưu ý phát hành.

`npm run check` kiểm tra cú pháp; `npm test` chỉ chạy kiểm thử ưu tiên nguồn trên
Node. `npm run test:byok` kiểm tra AI/nhà cung cấp bằng dữ liệu mô phỏng và
`node tests/updates.cjs` kiểm tra cập nhật. Kiểm thử trình duyệt cần cài riêng
Playwright và Chrome for Testing; `npm ci` chỉ cài phụ thuộc build CSS.
Kết quả mô phỏng không xác nhận hoạt động trên EduNext đã đăng nhập,
nhạc trực tiếp hay nhà cung cấp API trả phí.
