# Synthetic image fixtures

Generated offline by `scripts/prepare-test-fixtures.mjs`. Base JPEG, PNG and WebP bytes were drawn with Pillow from a 120×80 four-quadrant image (red, green, blue, yellow); no user files or third-party artwork. Dedicated to CC0. JPEG EXIF orientation 1–8 is injected into the common JPEG, without changing its compressed pixels. Browser tests compare quadrant colors against the eight independently specified geometric permutations. The top-left pixel of the transparent fixture has zero alpha. Animated samples have two frames. Truncated files are prefixes of static samples. oversize-header.png has a valid IHDR CRC but deliberately incompatible 8192×2000 dimensions, and must fail before decode.

The generator is imported by test helpers and runs before npm tests. Generated images are not tracked, and are never embedded in the application.
