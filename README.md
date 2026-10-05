# Reveal Sheet

[日本語](README.ja.md)

Reveal Sheet turns images with written answers into reusable study sheets. **The current v0.2.0 development build supports image input, rectangular cover editing, free reveal study, and image-embedded editable JSON save/reopen.** It is not a v1.0 release.

## Available now

Add multiple JPEG, static PNG or static WebP images using the file picker, desktop drag-and-drop, or an image-file paste event. Images are checked before decoding, converted into orientation-fixed PNGs without resizing, and shown in selection order. Invalid files appear separately. Stop keeps completed pages; New sheet cancels stale work after confirmation. Page additions support Undo and Redo (up to 100 operations).

Add opaque rectangular covers by dragging or selecting two corners. Selected covers can also be moved or resized with buttons and arrow keys, duplicated, deleted, undone and redone. Once a cover exists, free study mode reveals and hides answers in place. The checked count is the number of unique questions opened in that session, not a score or mastery rate.\n\nSave the image, covers and editable structure as a `.reveal.json` file and reopen it without reselecting the source image. Study results, Undo history and original filenames are not exported. The interface is light-only, bilingual, and designed from 320 CSS pixels upward. Runtime libraries, remote fonts, telemetry and network services are not used.

## Usage

Open the generated `reveal-sheet.html` or `dist/index.html` in a browser. Choose **Add images**, then select a page to inspect its orientation and dimensions. **This build keeps work only in memory. Closing the page loses the images and work.** The disabled Study / Save / Open controls explicitly indicate later stages rather than pretending to provide them.

The current picture is shown unmasked because this is the editing/input stage. There is no study session yet.

## Formats and safety limits

| Item | Limit |
|---|---|
| Input image | 20 MiB |
| Dimensions | 8192 px per side, 16,000,000 pixels total |
| Normalized PNG | 32 MiB per image |
| Images in one sheet | 64 MiB total |
| Pages | 30 |\n| Covers | 1,000 total, 200 per page |\n| Questions | 1,000 total |\n| Editable JSON | 96 MiB |

These are rejection rules, not measured guarantees of every device's capacity. Images are never automatically resized to fit a limit. PNG conversion may increase file size. GIF, APNG, animated WebP, SVG, HEIC / HEIF, AVIF, PDF and URL-based image input are unsupported.

## Privacy

Image and editable-sheet processing takes place inside the page. Original filenames are used only in transient failed-image messages, not as document/page titles or asset metadata. Images are normalized to orientation-fixed PNG and those PNG bytes are embedded in the editable sheet. EXIF is not deliberately copied, but visible personal details in image pixels are not removed. Automatic draft storage and study-record persistence are not implemented yet.

**Covers are for studying. The original answers and images remain in the editable sheet file. This tool does not redact personal or confidential information.** Use materials you are allowed to distribute when sharing a sheet.

The CSP uses `connect-src 'none'`, with no external images, fonts, frames or workers. Browser network tests complement static checks; see [QA status](docs/QA_RESULTS.md). Fetching a hosted app for the first time still requires a connection. Opening a downloaded HTML in a compatible browser should not require further network access for its image-input workflow. OS file previews may not execute JavaScript.

## Browser verification and limitations

Chrome / Edge are primary targets. Automated Windows Chromium checks and local diagnostic runs are recorded separately in [QA_RESULTS.md](docs/QA_RESULTS.md). Narrow Playwright viewports are **not physical Android or iPhone tests**. Real phones, macOS Safari, Firefox, OS file-sharing flows and large-memory stress tests remain unverified. Do not infer their acceptance from a green build.

## Development and build

The source is assembled into a single HTML. Do not edit generated files.

```powershell
pwsh -NoProfile -File ./scripts/check-powershell-syntax.ps1
pwsh -NoProfile -File ./scripts/check-repository.ps1
pwsh -NoProfile -File ./scripts/test-reveal-build.ps1
```

Windows PowerShell 5.1 can run the scripts using `powershell.exe -NoProfile -ExecutionPolicy Bypass -File`. The inherited builder requires `tar.exe`. Ordinary users do not need Node, npm or PowerShell to use an already-built HTML.

Development tests use Node 22+ and the exact Playwright version in `package-lock.json`:

```text
npm ci
npm run test:unit
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

Set `APP_VARIANT=self-extract` to test the self-extracting file. Test fixture generation is deterministic and independent of production image code. The application-test workflow runs both file variants and publishes reports, network observations, actual UI captures and environment details. It uses `npm ci`; dependency installation is a development-only network operation.

Generated files are `dist/index.html`, `dist/index.self-extract.html`, and `reveal-sheet.html`. The root copy matches the normal file byte-for-byte, and the self-extractor is verified to restore those bytes. Favicon and header icon come from `assets/favicon.svg`. Runtime dependency manifests remain empty.

## Roadmap

The next planned stage, v0.3.0 / T05–T06, completes page management and adds grouped answers, auxiliary covers and overlap handling. Guided sessions, optional local persistence and portable study HTML belong to later tasks. PDF, OCR, AI and cloud sync are not in the initial release scope.

## License

MIT. Template-derived notices and the original LICENSE are retained. Synthetic QA images are original CC0 fixtures. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
