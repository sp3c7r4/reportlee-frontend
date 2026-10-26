# Photography

## desert-dunes.jpg

- **Subject:** sand dunes, Merzouga, Morocco.
- **Source:** Unsplash, photograph by raouf bedrani (@roofy_213).
  Photo page: https://unsplash.com/photos/a-large-group-of-sand-dunes-in-the-desert-oVWm9rQpbq0
  Original file: https://images.unsplash.com/photo-1638732984528-f255c9714619
- **Licence:** Unsplash License, free for commercial use, attribution not required. Credited
  anyway so the source stays traceable.
- **Derived, not the download:** this file is the original cropped to the auth panel's 41%-of-viewport
  shape at 2x (1400x2166) and graded to the reference's dark monochrome key. It is not the raw
  Unsplash asset, so re-downloading from the source URL will not reproduce it.

Regenerate from the source with sharp:

```js
sharp(source)
  .resize(1400, 2166, { fit: "cover", position: "center" })
  .grayscale()
  .linear(1.06, -46)
  .gamma(1.12)
  .linear(0.88, -52)
  .modulate({ brightness: 0.72 })
  .jpeg({ quality: 86, mozjpeg: true, progressive: true });
```

Where it is used: the authentication shell's left panel
(`src/app/(auth)/layout.tsx`).
