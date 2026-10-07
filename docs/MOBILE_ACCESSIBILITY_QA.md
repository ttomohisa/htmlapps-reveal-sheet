# Reveal Sheet mobile & accessibility QA

This checklist belongs to the v0.8.0 / T15–T16 milestone. Automated evidence and physical/manual evidence are deliberately separated.

## Automated on Windows Chromium

| Area | Automated evidence | Status |
|---|---|---|
| 320 px layout | No page-level horizontal scroll; Create / Study / Save and editing controls remain reachable | Passed |
| Short landscape | 700×390 viewport remains usable without page-level horizontal scroll | Passed |
| Touch-style pan | Zoomed image pan changes ViewState without triggering a cover action | Passed |
| Resize / rotation model | Normalized center and zoom are preserved by `resizeView` / ResizeObserver path | Passed |
| Cover tap discrimination | >6 CSS px movement and cancelled gestures do not activate | Passed |
| Continuous cover mode | Explicit toggle keeps Cover mode only when enabled; normal mode returns to Move image | Passed |
| Touch targets | Primary workflow and cover adjustment actions meet the automated 48 px target checks | Passed |
| Fixed bottom navigation | Safe-area-aware body/toast offset is present in narrow layout CSS | Passed by CSS + browser layout regression |
| Escape cancellation | Unfinished two-point cover is cancelled without creating a rectangle | Passed |
| Japanese / English keys | Main translation key sets match and accessibility label keys exist in both languages | Passed |
| Closed guided answer | Plain-text answer absent from visible/accessibility text until reveal | Passed |
| Closed free-study answer | Plain-text answer live output is empty until the answer is opened | Passed |
| Exported lesson answer privacy | Same closed-answer behavior in lesson HTML | Passed |
| Language switch | Accessible labels change while document data remains unchanged | Passed |
| Repeated keyboard events | Repeated assessment shortcuts cannot advance guided study repeatedly | Passed |
| Help / focus | Help is scrollable at 320×420; Escape closes it and restores focus | Passed |
| Forced colors | Controls remain visible/focusable under `forced-colors: active` emulation | Passed |
| Reduced motion | Motion/transition suppression is active under `prefers-reduced-motion: reduce` | Passed |

## Physical/manual checks — pending

These are **not** claimed as passed by Playwright viewport emulation.

| Check | Suggested target | Status |
|---|---|---|
| Android Chrome file picker → edit → study → save | Current Android phone, Chrome stable | Not performed |
| iPhone Safari file picker → edit → study → save | Current iPhone, Safari | Not performed |
| Bottom fixed navigation with real safe-area inset | iPhone with home indicator | Not performed |
| Software keyboard does not hide active text field / confirmation action | Android + iPhone | Not performed |
| Real touch pan vs tap / pinch cancellation | Android + iPhone | Not performed |
| Device rotation preserves useful center / relative zoom | Android + iPhone | Not performed |
| 200% browser zoom reflow and help reachability | Desktop Chrome / Edge | Not performed |
| Screen reader: closed answer is not announced; revealed plain text is announced | NVDA or Narrator; VoiceOver/TalkBack later | Not performed |
| Keyboard-only full path Create → Study → Save | Desktop Chrome / Edge | Not performed manually (automated partial coverage exists) |
| Forced-colors visual quality | Windows High Contrast / Edge or Chrome | Not performed manually |
| Long 2,000-character prompt/answer readability | Desktop + phone | Not performed manually |

## Notes

- Optional page descriptions, prompts and answers improve text accessibility, but Reveal Sheet does not OCR or automatically expose text that exists only inside image pixels.
- Viewport emulation is useful regression coverage, not evidence of physical touch hardware, OS file chooser/save flows, safe-area behavior or software-keyboard behavior.
- Physical-device results should record device, OS, browser version, launch mode (`file:` or hosted), and whether the tested artifact was readable or self-extracting HTML.
