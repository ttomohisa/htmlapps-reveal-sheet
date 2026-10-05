# Security and privacy

Reveal Sheet v0.1.0 accepts local JPEG, static PNG and static WebP only. Extension and browser MIME are not treated as sufficient validation. Size/dimension limits and format/animation headers are checked before browser decoding; input is normalized to PNG without resizing. Failed imports do not replace the current document.

The runtime has no network dependency, telemetry, external fonts or API calls. Its CSP blocks connections, frames, objects, media and workers, and allows only local data/Blob images. The normal app keeps the template's inline script/style approach; a future lesson player will use a separate fixed-code hash policy. Do not claim the future player is implemented now.

No image, draft or session is persisted by this version. Original filenames are transient error-list text, not document metadata. Images can still visibly contain private details; normalization is not anonymity or redaction. Future covers are study aids, not confidentiality controls.

Only use files and materials you are authorized to use. Browser decoding can still fail under memory pressure or for unsupported/corrupt files. Do not interpret configured upper bounds as guarantees for all devices.

If reporting a vulnerability, do not put private source images, credentials or personal information into a public issue. Use a minimal synthetic reproduction where possible. No unverified security contact address is asserted here.
