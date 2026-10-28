# Native mobile editor and direct image manipulation

> **For agentic workers:** Use the executing-plans workflow. The current user request authorizes implementation of these corrections to PR #16.

**Goal:** Make image panning follow the finger at every zoom level and make the loaded smartphone editor an image-first app workspace.

**Architecture:** Keep the existing browser-native editor, shared study renderer, document model, and single-HTML build. Correct one coordinate transform shared by image and covers; use a viewport-bounded mobile workspace and temporary native dialog sheets for secondary controls, keeping the existing controls and event handlers.

**Tech stack:** HTML, CSS, JavaScript, SVG, native dialog, Node tests, Playwright, existing PowerShell build.

**Spec:** APP_SPEC.md, including its v1.1.0 addendum; user correction on 2026-10-28 requesting responsive image movement and a native-app-like smartphone interface.

## Design decisions

- Use the existing source/runtime with no framework, runtime service, or new package.
- Fix actual pointer-to-image displacement and remove transform easing during direct manipulation. A cosmetic adjustment cannot correct the coordinate error.
- Loaded mobile Create uses a compact page row, a large image stage, a bottom editing dock, and the existing Create / Study / Save navigation.
- Pages, full cover editing, fine adjustment, and sheet settings open only on request in a safe-area-aware native dialog. Restore moved nodes when the dialog closes or the responsive mode changes.
- Keep the empty-state import flow, desktop layout, page-card horizontal carousel, accessible alternative controls, and study workflow.

## Global constraints

- Brand accent #16624F; SVG icons; Japanese and English; visible version.
- Local processing and connect-src 'none'; no change to schemaVersion 1 or existing JSON/HTML export.
- Preserve Undo/Redo, grouped/auxiliary covers, free/guided study, optional local persistence, cancellation and page view retention.
- Update the existing PR; merge remains the user's action. Do not update Browser Kitty itself.
- Physical Android/iPhone checks remain unperformed unless a real device is actually used.

## Review focus

1. Wide/portrait images letterboxed in a tall/short viewport: finger displacement and pinch anchor must match the rendered image.
2. Pointer cancellation, pinch-to-one-finger transitions, and page/mode switches must not create accidental covers or leave pending draws.
3. 320px width, short landscape, large text, and safe areas: controls remain reachable and no horizontal document overflow.
4. Dialog focus restoration and mobile-to-desktop resize: no orphaned controls or inaccessible background.
5. Edited covers, Undo, study, save/reload, and exported lesson view behavior remain compatible.

## Task 1: Image gesture correction

**Files:** src/reveal/study-view.js, pointer/view portions of src/reveal/editor.js and src/reveal/player.js; dedicated pointer/gesture tests.

**Interfaces:** Existing normalized {zoom, centerX, centerY} viewport is retained. The renderer and gesture handlers use the same fitted-image geometry; image and SVG use identical transforms.

- [x] Reproduce the baseline pan error and add one-to-one CSS-pixel movement regressions at 1.25×, about 2×, 4× and 8×, and 16×.
- [x] Correct fitted-image coordinate calculations, transform order, and pinch anchors; batch viewport updates into animation frames without rebuilding unrelated UI.
- [x] Verify panning, pinch, cancellation, state retention and corresponding lesson-player behavior.

## Task 2: Smartphone workspace

**Files:** src/index.template.html, src/reveal/shared.css, mobile UI/state/event portions of src/reveal/editor.js, translations in the source template, mobile browser tests.

**Interfaces:** Reuse existing element IDs for imports, page cards, covers, history and persistence. A native mobile dialog temporarily hosts those nodes; its close handler restores the original parents and focus.

- [x] Add a regression proving the loaded mobile stage and dock fit together on screen and secondary tools are reached through dialogs.
- [x] Build the image-first viewport layout, bottom tool dock, compact selection actions and secondary sheets; remove per-frame transform transitions.
- [x] Verify empty/loaded states, page carousel, cover edits, settings, language, narrow/short screens and dialog dismissal.

## Task 3: Integration and handoff

**Files:** APP_SPEC.md, README.md, README.ja.md, CHANGELOG.md, docs/QA_RESULTS.md; generated outputs from the normal builder.

- [x] Run PowerShell preflight and repository build, Node unit suite, affected mobile/gesture tests and export/study regression suite for both release variants.
- [x] Capture actual rendered mobile screens and inspect the image/dock/dialog layout.
- [x] Run an independent code review, fix material findings, and record verification limits.
- [x] Prepare verified source, tests, documentation and actual screenshots for the existing PR; leave generated standalone HTML ignored according to repository rules.

**Delivery:** Update PR #16 with this change and record the resulting hosted CI/preview status in its description. Merge remains the repository owner's action. Completed local evidence and physical-device limits are in `docs/QA_RESULTS.md`.
