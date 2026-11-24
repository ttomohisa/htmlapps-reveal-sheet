Reveal Sheet v1.2.1 - repository guide / リポジトリ案内

This repository contains source code, tests, and release preparation scripts.
The built single-HTML files are generated, not tracked at repository root.

To use the app without building / ビルドせずに使う:
  https://github.com/ttomohisa/htmlapps-reveal-sheet/releases/latest
  Download the readable .html file under Assets (not Source code).
  Note: until PR #22 is merged and released, latest still means v1.2.0.

To build from source (Windows with PowerShell 7):
  pwsh -NoProfile -File ./scripts/check-repository.ps1

Generated files / 生成ファイル:
  dist/index.html                Readable standalone app / 可読版
  dist/index.self-extract.html   Self-extracting standalone app / 自己展開版

Reveal Sheet supports local image input, cover editing, free/guided study,
editable .reveal.json export, and portable .reveal.html lesson export.
Optional draft and study-progress saving are OFF by default.
A study cover is not redaction: saved files retain the source image pixels.

For current features, file limits, privacy and caveats:
  README.md / README.ja.md
  SECURITY.md
  docs/SAVE_FORMAT.md
  docs/RELEASE_CHECKLIST.md

Do not merge a PR automatically; the repository owner reviews and merges it.
