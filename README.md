# Reveal Sheet

[![App tests](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/workflows/test-app.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/workflows/test-app.yml)
[![Standalone build](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/workflows/build-standalone.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/workflows/build-standalone.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-16624F)](reveal-sheet.html)

[日本語版 README](README.ja.md)

Reveal Sheet is a browser-only study-sheet maker for diagrams, photos, screenshots, and notes that already contain answers. Add opaque covers over the parts you want to recall, then reveal them freely or study one question at a time.

Selected images and saved-sheet data are processed on your device. The app does not upload them to a server and does not require an account or installation.

![Reveal Sheet screenshot](assets/screenshot-en.png)

![Reveal Sheet mobile editing screenshot](assets/screenshot-mobile-edit.png)

![Reveal Sheet mobile screenshot](assets/screenshot-mobile.png)

## Features

- **Create covers directly on an image** — Drag over an answer to place a cover, then move, resize, duplicate, delete, Undo, or Redo it.
- **Edit on a phone** — Switch between Place covers and Move image, pinch to zoom, and adjust a selected cover by 1, 5, or 10 image pixels using an inline toolbar that leaves the image visible. At 100%, Move image shows a zoom-in tip.
- **Capture a page** — The Take photo button opens the device's camera-capable file chooser where supported. Imported photos follow the same on-device processing and format limits as other images.
- **Choose the question order** — Select an answer cover and use Move earlier / Move later in Question content. Grouped covers move as one question; Undo/Redo and both saved formats preserve the order. The current study session keeps its existing order until you start a new session.
- **Choose the cover color** — The selected color is stored with the sheet and used consistently while editing and studying.
- **Turn several covers into one question** — Group related answers so they reveal together, or keep hint areas covered while studying.
- **Study freely or one question at a time** — Reveal any answer manually, or use the guided flow with Recalled / Review again self-assessment.
- **Use the exported lesson on a phone** — The standalone `.reveal.html` provides an image-first screen, page and question selectors, large Reveal / assessment controls, zoom and pan/pinch, and a settings sheet for optional study-progress saving and editable export. No account or external runtime network is required.
- **Keep your place while navigating** — Moving between Create, Study and Save in the same tab retains the current in-memory study session even with optional study-progress saving turned off. Reloading still requires opted-in persistence and a matching document.
- **Edit without losing your place** — Fix the current question during guided study and return to the same question and view position.
- **Manage multi-page material** — Rename pages, add optional descriptions, reorder with a drag handle, delete, and Undo. On phones, tap the page title to open the horizontal page-card carousel.
- **Save an editable sheet** — Export a `.reveal.json` file that contains normalized images, covers, questions, and page structure.
- **Share a self-contained lesson** — Export a `.reveal.html` file that contains the images and study player in one HTML file.
- **Reopen Reveal Sheet lessons safely** — Imported lesson HTML is read as text; only the fixed non-executing JSON data block is validated and used.
- **Optional local persistence** — Work recovery and study-progress storage are separate, OFF by default, and stored in the browser only when enabled.
- **Japanese / English and keyboard support** — Major controls are keyboard-operable, with dedicated shortcuts for guided study.

## Quick start

### Use the standalone HTML

1. Download [`reveal-sheet.html`](reveal-sheet.html).
2. Open it in a current Chrome or Edge browser.
3. Choose **Add images** and select JPEG, static PNG, or static WebP files.
4. Drag over an answer in the image to create a cover.
5. Open **Study** when the sheet is ready.

No account, installation, local server, or backend is required.

### Build from the repository

On Windows:

```powershell
./build-standalone.bat
```

The generated app is written to `dist/index.html`. A self-extracting single-HTML build is also generated at `dist/index.self-extract.html`.

## Usage

1. **Add images** — Use the file picker, desktop drag-and-drop, or paste an image file. Accepted images are normalized to orientation-fixed PNG without resizing.
2. **Create covers** — Drag over each answer. Drag a selected cover to move it and use the corner handles to resize it.
3. **Organize pages** — Edit page names and optional descriptions directly in the cards. On mobile, tap the page title to open the horizontal carousel; swipe normally and start reordering only from the drag handle.
4. **Build questions** — Select several answer covers and choose **Reveal together** when they should behave as one question. Use **Keep covered while studying** for auxiliary hint covers.
5. **Study** — Choose **Reveal freely** or **One at a time**. Guided study requires the answer to be revealed before it can be rated.
6. **Correct while studying** — Use **Edit this question**, make the change, then return to study.
7. **Save** — Export editable data as `.reveal.json`, or export a self-contained study lesson as `.reveal.html`.
8. **Open a sheet** — Reopen either Reveal Sheet JSON or Reveal Sheet lesson HTML without reselecting the source images.

### Save formats

| Format | Purpose | Contains study results? |
| --- | --- | --- |
| `.reveal.json` | Re-edit the sheet later | No |
| `.reveal.html` | Study/share as one self-contained HTML file | No |

Original filenames, Undo history, current view position, and the author's study results are not included in exported sheet data.

## Mobile behavior

On smartphones, **Create / Study / Save** stays in bottom navigation. After importing an image, the editor fills the available screen with the image and a bottom tool dock. Previous / Next and Undo / Redo remain available above the image. Tap the page title to open a bottom sheet with the horizontal page-card carousel; reorder only from each card's drag handle.

Use **Place covers** to draw covers, or **Move image** to pan. Within the pan limits, the image follows your finger by the same distance regardless of zoom. A two-finger pinch zooms in either mode, and a remaining finger can continue panning. Selecting a cover shows **Adjust**, duplicate, and delete near the image without changing the image area. On short screens these actions overlay the image's lower edge; on very short landscape screens they share the bottom dock with the four editing tools, clear of the zoom controls. **Adjust** opens Move / Size controls with 1 / 5 / 10 image-pixel steps. **Covers** opens grouping and question settings. **More** contains image import, camera, color, and local-saving settings. **Take photo** uses a camera-capable chooser where supported; regular image selection remains available.

Guided study is compacted so the image and the primary action — **Reveal answer** or the rating buttons — fit together on a 390 × 760 viewport in the automated regression suite. Secondary actions such as Previous, Skip, Edit this question, and Finish study are kept under **More**.

## Keyboard shortcuts

### Guided study

| Shortcut | Action |
| --- | --- |
| `Space` | Reveal the current answer |
| `1` | Recalled |
| `2` | Review again |
| `S` | Skip |
| `←` | Previous question |

### Selected cover

| Shortcut | Action |
| --- | --- |
| Arrow key | Move by 1 image pixel |
| `Shift` + Arrow | Move by 10 image pixels |
| `Alt` + Arrow | Resize |

The page reorder handle also supports arrow-key movement.

## Privacy and runtime network protection

Reveal Sheet is designed for local processing.

- Selected images and sheet data are processed in the browser.
- There are no runtime CDNs, remote fonts, analytics, ads, or external APIs.
- The app CSP uses `connect-src 'none'`.
- Exported lesson HTML embeds its images, CSS, SVG, and required JavaScript and does not need additional network requests after opening.
- Optional work recovery uses IndexedDB only after explicit opt-in.
- Optional study-progress persistence is separate and also OFF by default.

**The covers are for studying, not redaction.** The original image pixels and answers remain inside editable or lesson files. Do not use Reveal Sheet to remove confidential information from an image.

## Supported input and safety limits

Supported image input:

- JPEG
- Static PNG
- Static WebP

Unsupported input includes GIF, APNG, animated WebP, SVG, HEIC / HEIF, AVIF, PDF, and URL-based images.

| Item | Limit |
| --- | ---: |
| Input image | 20 MiB |
| Dimensions | 8192 px per side |
| Total pixels per image | 16,000,000 |
| Normalized PNG | 32 MiB per image |
| Images in one sheet | 64 MiB total |
| Pages | 30 |
| Covers | 1,000 total / 200 per page |
| Questions | 1,000 total / 50 covers per question |
| Editable JSON | 96 MiB |
| Lesson HTML | 100 MiB |

These are rejection limits, not a guarantee that every device can comfortably handle material near the maximum.

## Browser support and limitations

Chrome and Edge are the primary targets. Automated Windows Chromium tests cover mobile-width layouts, short landscape layouts, keyboard/accessibility contracts, offline/network restrictions, save/reopen flows, and configured resource ceilings.

Current limitations:

- Physical iPhone / Android device testing is not represented by the automated suite.
- macOS Safari and Firefox are not yet treated as verified release targets.
- Reveal Sheet does not perform OCR.
- PDF input is not supported.
- There is no cloud sync or account-based storage.
- Browser storage can be cleared or become unavailable, so important work should also be kept as exported `.reveal.json`.

See [docs/QA_RESULTS.md](docs/QA_RESULTS.md), [docs/QA_MATRIX.md](docs/QA_MATRIX.md), and [docs/MOBILE_ACCESSIBILITY_QA.md](docs/MOBILE_ACCESSIBILITY_QA.md) for verification details.

## Development and build

Requirements:

- Node.js 22 or later
- PowerShell 7 for the repository checks/build scripts

Repository checks:

```powershell
pwsh -NoProfile -File ./scripts/check-powershell-syntax.ps1
pwsh -NoProfile -File ./scripts/check-repository.ps1
pwsh -NoProfile -File ./scripts/test-reveal-build.ps1
```

Unit and browser tests:

```text
npm ci
npm run test:unit
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

Set `APP_VARIANT=self-extract` to run the same E2E suite against the self-extracting build.

Important source locations:

```text
src/index.template.html       Main app template
src/player.template.html      Exported lesson template
src/reveal/                   Reveal Sheet application code
scripts/assemble-reveal.ps1   Standalone assembler
scripts/verify-reveal.ps1     Standalone verification
dist/index.html               Generated readable standalone app
reveal-sheet.html             Repository standalone app
```

## Release status

**v1.0.1** adds within-page question ordering and fixes cover duplication so grouped covers, auxiliary roles, prompts, and answers are preserved. The saved format remains schemaVersion 1. Physical Android/iPhone, real screen-reader, real 200% zoom, and OS file-handoff checks remain explicitly unverified until they are performed on real hardware; see the QA documents for the release boundary.

## Contributing

Bug reports and feature proposals are welcome through GitHub Issues. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance.

## License

Copyright © 2026 ttomohisa

Licensed under the [MIT License](LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party notices.
