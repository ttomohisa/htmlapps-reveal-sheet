# Reveal Sheet

[日本語](README.ja.md)

Reveal Sheet turns diagrams, photos and notes that already contain answers into study sheets with opaque covers. **The current v0.4.0 development build adds one-at-a-time study, self-assessment, session results/review, and targeted edits that return to the same study position, alongside the existing free-reveal and image-embedded editable JSON flows.** It is not the completed v1.0 release.

## Available now

Add multiple JPEG, static PNG or static WebP images using the file picker, desktop drag-and-drop, or an image-file paste event. Images are normalized to orientation-fixed PNGs without resizing. Failed images are separated from accepted pages.

Create rectangular covers by dragging or selecting two corners. Covers can also be moved or resized with buttons and arrow keys, duplicated, deleted, undone and redone. Pages can be renamed, moved earlier/later and deleted.

Select multiple answer covers and use **Reveal together** to make them one question. Groups can be split again. **Keep covered while studying** makes a cover auxiliary: it does not count as a question and stays opaque while answers are revealed. Overlaps between separate questions or auxiliary covers are warned about in the editor.

Free study mode reveals and hides answers in place. The checked count is the number of unique questions opened in that session, not a score or mastery rate. Group members open together.

**One at a time** follows page/question order. A question cannot be rated before its answer is revealed; after revealing, choose Recalled or Review again, or Skip. Results are counted per question. Review again only and Review unchecked start separate review sessions without changing the original session denominator.

Use **Edit this question** during guided study to change the relevant cover and then **Return to study**. The current question and per-page zoom/center are preserved, affected questions become unanswered, and unrelated ratings remain. **This question** recenters only when explicitly requested.

Save images, pages, questions and covers as a `.reveal.json` file and reopen it without reselecting the source image. Study results, Undo history, view position and original filenames are not exported.

## Usage

1. Open `reveal-sheet.html` or `dist/index.html` and choose **Add images**.
2. Use **Cover** and drag, or **Two points**, to cover an answer.
3. Select multiple covers when needed and choose **Reveal together**. Convert hint covers to **Keep covered while studying**.
4. Choose **Study**, then use Reveal freely or One at a time. In guided study, reveal the answer before self-assessing and use the result screen for focused review sessions.
5. Use **Edit this question** when a study item needs correction, then **Return to study** to continue.
6. Use **Save** to export the editable sheet. Use **Open a sheet** to reopen the `.reveal.json` file later.

Automatic draft saving is not implemented yet. Export an editable sheet before closing the page if you want to keep your work.

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

These are rejection rules, not measured guarantees of every device's capacity. GIF, APNG, animated WebP, SVG, HEIC / HEIF, AVIF, PDF and URL-based image input are unsupported.

## Privacy

Image and editable-sheet processing takes place inside the page. Original filenames are used only in transient failed-image messages and are not copied into sheet data. Images are normalized to orientation-fixed PNG and embedded in the editable file. EXIF is not deliberately copied, but visible information in image pixels is not removed.

**Covers are for studying. The original answers and images remain in the editable sheet file. This tool does not redact personal or confidential information.**

There are no runtime CDNs, remote fonts, analytics, ads or external APIs. CSP uses `connect-src 'none'`, and runtime third-party dependencies remain zero. Automatic draft storage and personal study-record persistence are not implemented yet.

## Browser verification and limitations

Chrome / Edge are primary targets. Automated Windows Chromium runs and local diagnostics are recorded in [QA_RESULTS.md](docs/QA_RESULTS.md). Narrow Playwright viewports are not physical phone tests. Real phones, macOS Safari, Firefox, OS file-sharing flows and large-memory stress tests remain unverified.

## Single HTML / offline behavior

Generated files are `dist/index.html`, `dist/index.self-extract.html`, and `reveal-sheet.html`. After a compatible browser opens the single HTML, the image-input, editing, study and editable-JSON save/reopen flow requires no additional network request. OS file previews may not execute JavaScript.

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

The next stage, v0.5.0 / T09–T10, adds opt-in on-device draft persistence and opt-in study-session continuation. Portable study HTML follows in v0.6.0 and later. PDF, OCR, AI and cloud sync are outside the initial scope.

## License

MIT. Template-derived notices and the original LICENSE are retained. Synthetic QA images are original CC0 fixtures. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
