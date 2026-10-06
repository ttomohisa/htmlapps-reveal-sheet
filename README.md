# Reveal Sheet

[日本語](README.ja.md)

Reveal Sheet turns diagrams, photos and notes that already contain answers into study sheets with opaque covers. **The current v0.7.0 development build hardens schema-v1 save compatibility and export recovery: older format-1 fixtures remain readable, hostile or unsupported saved data is rejected before replacement, save sizes are measured before download, and stale prepared output is invalidated after changes.** Self-contained lesson HTML, safe non-executing lesson re-edit, free/guided study and opt-in local persistence remain available. It is not the completed v1.0 release.

## Available now

Add multiple JPEG, static PNG or static WebP images using the file picker, desktop drag-and-drop, or an image-file paste event. Images are normalized to orientation-fixed PNGs without resizing. Failed images are separated from accepted pages.

Create rectangular covers by dragging or selecting two corners. Covers can also be moved or resized with buttons and arrow keys, duplicated, deleted, undone and redone. Pages can be renamed, moved earlier/later and deleted.

Select multiple answer covers and use **Reveal together** to make them one question. Groups can be split again. **Keep covered while studying** makes a cover auxiliary: it does not count as a question and stays opaque while answers are revealed. Overlaps between separate questions or auxiliary covers are warned about in the editor.

Free study mode reveals and hides answers in place. The checked count is the number of unique questions opened in that session, not a score or mastery rate. Group members open together.

**One at a time** follows page/question order. A question cannot be rated before its answer is revealed; after revealing, choose Recalled or Review again, or Skip. Results are counted per question. Review again only and Review unchecked start separate review sessions without changing the original session denominator.

Use **Edit this question** during guided study to change the relevant cover and then **Return to study**. The current question and per-page zoom/center are preserved, affected questions become unanswered, and unrelated ratings remain. **This question** recenters only when explicitly requested.

Save images, pages, questions and covers as a `.reveal.json` file and reopen it without reselecting the source image. Study results, Undo history, view position and original filenames are not exported.


**Study lesson HTML (`.reveal.html`)** packages the images, covers and study player into one file when the sheet contains at least one question. Open it directly in a browser to use free reveal, one-at-a-time study, self-assessment/results/review, Japanese/English switching and keyboard controls without additional network requests. Author study results, Undo history, view position and original filenames are not embedded. Saving editable data from the lesson also excludes personal study results.

**Open a sheet** now accepts both `.reveal.json` and Reveal Sheet `.reveal.html`. Incoming lesson HTML is never adopted as DOM or executed. Reveal Sheet scans the file as UTF-8 text for exactly one fixed non-executing JSON data tag, validates its structure/references/PNG assets, and rebuilds the editor from that data. Outer script, iframe, image, style or refresh markup is ignored rather than constructed.

v0.7.0 fixes the portable **schemaVersion 1** compatibility contract with fixtures from v0.2.0 through v0.6.0. Unknown future schemas, invalid UTF-8, excessive JSON nesting, structural pollution keys, duplicate/orphan references, cross-page groups and disguised animated PNG data are rejected before the current sheet is replaced. See [SAVE_FORMAT.md](docs/SAVE_FORMAT.md) for the format and validation order.

The **Save** view prepares actual editable-JSON and lesson-HTML byte sizes before download. Prepared output is tied to the current document revision/export generation and is discarded if it becomes stale. A browser download is reported only as **started**, not as proof that the operating system completed the save; preparation failures keep the current sheet available for retry.

**Keep this work on this device** starts OFF. Only after explicit opt-in, normalized images and sheet content are stored in IndexedDB and changes are committed after about a one-second debounce. If another tab advances the same saved generation, Reveal Sheet stops automatic saving instead of silently overwriting and offers manual export or reload-latest recovery. Quota/security failures leave the in-memory sheet and manual export available.

**Keep only study progress on this device** is a separate OFF-by-default option. It stores no image bytes: only the small study-session state. Resume is offered only when document ID, revision and a SHA-256 fingerprint of the canonical document all match, and the current answer is closed on resume. Without Web Crypto, study persistence is disabled while in-memory study remains available. Saved work and study progress can be cleared separately.

## Usage

1. Open `reveal-sheet.html` or `dist/index.html` and choose **Add images**.
2. Use **Cover** and drag, or **Two points**, to cover an answer.
3. Select multiple covers when needed and choose **Reveal together**. Convert hint covers to **Keep covered while studying**.
4. Choose **Study**, then use Reveal freely or One at a time. In guided study, reveal the answer before self-assessing and use the result screen for focused review sessions.
5. Use **Edit this question** when a study item needs correction, then **Return to study** to continue.
6. Optionally enable **Keep this work on this device** and/or **Keep only study progress on this device**. They are separate settings and both start OFF.
7. Use **Save** to export editable data (`.reveal.json`) or, when at least one question exists, a self-contained study lesson (`.reveal.html`). The lesson can be previewed in an isolated study session before download.
8. Use **Open a sheet** to reopen either `.reveal.json` or Reveal Sheet `.reveal.html` without reselecting source images.

Manual editable-sheet export is always available even when on-device persistence is disabled. Leave on-device persistence off on shared devices.

## Formats and safety limits

| Item | Limit |
|---|---|
| Input image | 20 MiB |
| Dimensions | 8192 px per side, 16,000,000 pixels total |
| Normalized PNG | 32 MiB per image |
| Images in one sheet | 64 MiB total |
| Pages | 30 |
| Covers | 1,000 total, 200 per page |
| Questions | 1,000 total, 50 covers per question |
| Editable JSON | 96 MiB |
| Lesson HTML | 100 MiB (embedded JSON remains at or below 96 MiB) |

These are rejection rules, not measured guarantees of every device's capacity. GIF, APNG, animated WebP, SVG, HEIC / HEIF, AVIF, PDF and URL-based image input are unsupported.

## Privacy

Image and editable-sheet processing takes place inside the page. Original filenames are used only in transient failed-image messages and are not copied into sheet data. Images are normalized to orientation-fixed PNG and embedded in the editable file. EXIF is not deliberately copied, but visible information in image pixels is not removed.

**Covers are for studying. The original answers and images remain in the editable sheet file. This tool does not redact personal or confidential information.**

There are no runtime CDNs, remote fonts, analytics, ads or external APIs. CSP uses `connect-src 'none'`, and runtime third-party dependencies remain zero. Exported lesson HTML embeds its images, required code, CSS and SVG and requires no additional network request after it is opened. Incoming lesson HTML is not executed or inserted; only its fixed JSON data tag is parsed and validated. Optional persistence uses IndexedDB in this browser. Work saving and study-progress saving are separate OFF-by-default choices. Browser storage can be cleared or become unavailable, so keep important sheets as manually exported `.reveal.json` files too.

## Browser verification and limitations

Chrome / Edge are primary targets. Automated Windows Chromium runs and local diagnostics are recorded in [QA_RESULTS.md](docs/QA_RESULTS.md). Narrow Playwright viewports are not physical phone tests. Real phones, macOS Safari, Firefox, OS file-sharing flows and large-memory stress tests remain unverified.

## Single HTML / offline behavior

App build outputs are `dist/index.html`, `dist/index.self-extract.html`, and `reveal-sheet.html`. User-exported study lessons are named `sheet-name.reveal.html` and embed the images and study player in one file. After a compatible browser opens the single HTML, image input, editing, study, editable JSON / lesson HTML export, and validated Reveal Sheet lesson re-open require no additional network request. OS file previews may not execute JavaScript.

## Development and build

```powershell
pwsh -NoProfile -File ./scripts/check-powershell-syntax.ps1
pwsh -NoProfile -File ./scripts/check-repository.ps1
pwsh -NoProfile -File ./scripts/test-reveal-build.ps1
```

```text
npm ci
npm run test:unit
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

Set `APP_VARIANT=self-extract` to run the same E2E suite against the self-extracting build.

## Roadmap

Next is v0.8.0 / T15–T16: finish smartphone interaction and fixed UI, then bilingual keyboard/screen-reader/accessibility behavior. PDF, OCR, AI and cloud sync remain outside the initial release scope.

## License

MIT. Template-derived notices and the original LICENSE are retained. Synthetic QA images are original CC0 fixtures. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
