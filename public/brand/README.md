# Iroyin brand marks

Source of truth: the designer's own files, used unmodified.

| Source | Becomes |
| --- | --- |
| `Iroyin-text-only.svg` | `iroyin-wordmark*.svg` |
| `iroyin-logo-only.svg` | `iroyin-monogram*.svg`, `iroyin-app-icon.svg` |
| `iroyin-logo.svg` | `iroyin-lockup*.svg` |

Every path in this folder is byte-identical to the designer's source. Variants change
fills, framing, and export size only. Nothing here redraws, retimes, or re-cuts a shape.

## Files

| File | Use |
| --- | --- |
| `iroyin-wordmark.svg` | Primary. Ink letters, orange àmì. Light backgrounds. |
| `iroyin-wordmark-reversed.svg` | White letters, orange àmì. Ink and photographic backgrounds. |
| `iroyin-wordmark-mono.svg` | `currentColor` throughout. One-colour print, embossing, watermarks. |
| `iroyin-lockup.svg` | Monogram plus wordmark, exactly as drawn. Site header, letterheads, decks. |
| `iroyin-lockup-reversed.svg` | Same lockup for ink surfaces: white letters, unchanged tile. |
| `iroyin-monogram.svg` | The tile alone. App icon, avatar, favicon. |
| `iroyin-monogram-ink.svg` | Ink tile instead of orange. Where orange competes with its surroundings. |
| `iroyin-monogram-mono.svg` | `currentColor` tile with white bars. |
| `iroyin-app-icon.svg` | The tile at 512. Store listings, launcher. |
| `png/` | Raster exports: icons 32 → 512, wordmark at 1600, lockup at 2000. |

The site does not link these files. It renders the same paths from
`src/components/brand/{wordmark,monogram}.tsx`, generated from the sources above, so the
header can never drift from the asset. The letters inherit `currentColor`; the àmì are
pinned to `var(--brand)`, which is why one component covers both the light header and
the ink footer.

## Colour

| Part | Value |
| --- | --- |
| Letters | Ink `#0F0F0F`, or `#FFFFFF` reversed |
| Àmì | Brand orange `#FF6B2C` |
| Tile | Brand orange `#FF6B2C` |
| Bars in tile | `#FFFFFF` |

The àmì and the tile are the only orange in the system. In mono the whole mark is one
colour. Never split it further: no orange letters with grey àmì, no second hue in the bars.

## Clear space

Free space equal to the height of the tile on all sides of the lockup, and to half the
x-height when the wordmark stands alone. Nothing enters that band: no rules, no badges,
no photographic edges.

## Minimum sizes

| Context | Wordmark | Lockup |
| --- | --- | --- |
| Digital | 130px wide | 160px wide |
| Print | 30mm wide | 38mm wide |

Below those sizes the àmì fill in and the word loses its vowel quality. Use the tile
instead, down to 24px.

## Lockup proportions

Taken from the source file, so a lockup rebuilt in code still matches it:

- tile height = 69% of the wordmark's full ink height (ascender to descender)
- gap = 10% of the wordmark height (102 / 996)
- the tile is centred on the wordmark's ink, not on its cap line

In the site header the wordmark is 30px tall, so the tile is 21px and the gap 3px.

## Misuse

- Do not retype, re-letter, or re-kern the wordmark, and do not substitute another
  weight of the typeface.
- Do not drop, mirror, rotate, or recolour the àmì. They are orthography, not decoration:
  ìròyìn carries three low-tone graves, and a high-tone acute or a mid-tone macron would
  spell a different word.
- Do not straighten the bars in the tile. The 19° lean is shared with the àmì and is the
  single idea holding the mark together.
- Do not add shadows, outlines, glows, or gradients.
- Do not stretch, condense, or re-space any part of the mark.
- Do not place the lockup on a mid-tone or busy image without the reversed file and a scrim.

## Exporting

```bash
# SVG -> PNG at an exact size
npx sharp-cli -i iroyin-monogram.svg -o icon.png resize 512 512

# or any of: rsvg-convert -w 512 -h 512 iroyin-monogram.svg > icon.png
#            inkscape iroyin-monogram.svg --export-png=icon.png -w 512
```

The `png/` folder already carries the sizes most launchers ask for.
