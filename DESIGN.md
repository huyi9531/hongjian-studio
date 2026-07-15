# Xiaohongshu Web - Style Reference

> A bright, editorial discovery feed held together by one decisive red signal.

**Theme:** light

This is a reverse-engineered reference for the public desktop homepage of [xiaohongshu.com](https://www.xiaohongshu.com), observed on 2026-07-15 at a 1280px viewport. It is not an official Xiaohongshu design specification. The interface begins with a nearly unmodified white canvas and lets user photography supply most of the color. System-native Chinese typography makes the product feel familiar and immediate rather than branded through a custom display face. The main red is concentrated in the brand mark and selected or promotional moments, keeping the feed itself visually quiet. Navigation, search, and utility actions use pale neutral surfaces, no visible borders, and no elevation. Images do the heavy compositional work: compact captions and small author or engagement metadata retreat below them. The characteristic rhythm is the contrast between a fixed, spacious left rail and a dense, rounded-corner masonry feed.

## Evidence and Scope

- **Public route sampled:** `https://www.xiaohongshu.com/`
- **Observed environment:** unauthenticated desktop homepage, 1280 x 720 viewport
- **Direct-file check:** `https://xiaohongshu.com/DESIGN.md`, `https://www.xiaohongshu.com/DESIGN.md`, and lowercase variants each returned `404`.
- **Confidence:** exact computed values below are observed where noted; layout values inferred from the rendered public viewport are marked *inferred*. No logged-in-only interface was inspected.
- **States:** the public page did not expose hover, focus, active, or pressed styles without interaction. They are intentionally omitted rather than invented.

## Tokens - Colors

| Name | Value | Token | Role |
|---|---|---|---|
| Canvas White | `#ffffff` | `--color-canvas` | Primary page background |
| Ink | `#333333` | `--color-ink` | Default text and neutral controls |
| Ink Soft | `rgba(51, 51, 51, 0.8)` | `--color-ink-soft` | Secondary action text |
| Search Surface | `rgba(0, 0, 0, 0.03)` | `--color-surface-search` | Search field fill |
| Navigation Surface | `#f5f5f5` | `--color-surface-selected` | Selected navigation item, inferred from the rendered page |
| Hairline | `rgba(0, 0, 0, 0.06)` | `--color-hairline` | Use only where a quiet separator is necessary; no border was observed on primary controls |
| Brand Red | `#ff2442` | `--color-brand-red` | Brand mark and selected promotional emphasis |
| Meta Gray | `#999999` | `--color-ink-muted` | Author, engagement, and supporting metadata, inferred from the rendered page |

## Tokens - Typography

### System CJK Sans - native, neutral, and content-first - `--font-sans`

- **Observed stack:** `system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "PingFang TC", "PingFang HK", "Microsoft Yahei", Arial, sans-serif`
- **Substitute:** Noto Sans SC, then Inter
- **Observed weights:** 400, 600
- **Observed sizes:** 14px, 16px
- **Observed line heights:** 16.1px, 19.2px
- **Letter spacing:** browser default (`normal`)
- **Role:** all public desktop navigation, search, card, and metadata text.

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|---|---:|---:|---|---|
| meta | 12px | 1.4 | normal | `--text-meta` |
| card-title | 14px | 1.4 | normal | `--text-card-title` |
| body | 14px | 1.5 | normal | `--text-body` |
| control | 16px | 19.2px | normal | `--text-control` |
| nav | 16px | 19.2px | normal | `--text-nav` |

## Tokens - Spacing and Shapes

**Base unit:** 4px, inferred from the observed 16px and 24px control and layout intervals.

**Density:** comfortable in navigation; compact in feed metadata.

### Spacing Scale

| Name | Value | Token |
|---|---:|---|
| 4 | 4px | `--space-4` |
| 8 | 8px | `--space-8` |
| 12 | 12px | `--space-12` |
| 16 | 16px | `--space-16` |
| 20 | 20px | `--space-20` |
| 24 | 24px | `--space-24` |
| 32 | 32px | `--space-32` |

### Border Radius

| Element | Value | Token |
|---|---:|---|
| Feed image card | 16px | `--radius-card` |
| Compact icon button | 50% | `--radius-circle` |
| Search field | 999px | `--radius-search` |
| Text utility button | 100px | `--radius-pill` |

### Shadows

No `box-shadow` was observed on the sampled search field, utility buttons, or feed-card link. Maintain separation with white space and pale fills rather than elevation.

### Layout

- **Left rail:** approximately 256px wide, fixed on the public desktop viewport (*inferred*).
- **Main content inset:** 20px from the rail and viewport edges (*inferred*).
- **Feed columns:** four at 1280px, with roughly 24px column gaps (*inferred*).
- **Feed image treatment:** portrait-oriented media blocks, 16px rounded corners.
- **Header search:** horizontally centered, pill-shaped field; observed `padding: 0 84px 0 16px`.

## Components

### Brand mark

**Role:** persistent home identity.

Use `--color-brand-red` (`#ff2442`) as the dominant brand field. The mark is compact and isolated from the content feed, so it can remain the strongest saturated element in the shell.

### Search field

**Role:** primary entry point for discovery.

- background: `--color-surface-search` (`rgba(0, 0, 0, 0.03)`)
- color: `--color-ink` (`#333333`)
- border: none
- border-radius: `--radius-search` (`999px`)
- padding: `0 84px 0 16px`
- font: 16px / 400 / 19.2px `--font-sans`
- box-shadow: none

### Text utility button

**Role:** top-right contextual actions such as creator or business entry points.

- background: transparent
- color: `--color-ink-soft`
- border: none
- border-radius: `--radius-pill` (`100px`)
- padding: `0 16px`
- font: 16px / 600 / 19.2px `--font-sans`
- box-shadow: none

### Circular icon button

**Role:** compact utility action.

- background: transparent
- color: `--color-ink-soft`
- border: none
- border-radius: `--radius-circle` (`50%`)
- padding: `0 10px`
- font: 16px / 600 / 19.2px `--font-sans`

### Side navigation item

**Role:** switches primary product sections.

The active item sits in a very pale neutral capsule (`--color-surface-selected`, inferred `#f5f5f5`) and pairs a simple outline icon with 16px semibold text. Default items remain on the white canvas; avoid card borders and shadows.

### Channel tab

**Role:** narrows the discovery feed by topic.

Use plain text on the white canvas. The selected tab should use stronger `--color-ink` weight rather than an oversized container or a competing accent fill. Preserve the short horizontal cadence seen in the category row.

### Feed card

**Role:** individual photo, video, or editorial note in the discovery masonry.

- media: rounded at `--radius-card` (`16px`)
- card shell: transparent, no border, no shadow
- title: 14px regular `--color-ink`
- author and engagement: smaller `--color-ink-muted`
- image color: unrestrained; user media is intentionally the page's principal color source

## Surfaces

| Level | Name | Value | Purpose |
|---|---|---|---|
| 0 | Canvas | `#ffffff` | Whole-page background |
| 1 | Search | `rgba(0, 0, 0, 0.03)` | Input and low-emphasis utility fill |
| 2 | Selected navigation | `#f5f5f5` (inferred) | Current section affordance |
| 3 | Content media | User supplied | Feed images and video covers |

## Do's and Don'ts

### Do

- Keep `--color-canvas` (`#ffffff`) as the default page surface so editorial imagery remains prominent.
- Reserve `--color-brand-red` (`#ff2442`) for identity and sparse emphasis, not for every action.
- Use the observed native CJK system stack for Chinese-heavy interface copy.
- Keep search controls on `--color-surface-search` with `--radius-search` rather than adding an outlined input.
- Use 16px rounded media through `--radius-card` to preserve the feed's soft image rhythm.
- Let metadata use `--color-ink-muted` so titles and media retain priority.
- Separate navigation and feed cards with spacing, not `box-shadow`.

### Don't

- Do not put the feed on gray, blue, or tinted page backgrounds; that competes with user photography and `--color-canvas`.
- Do not extend `--color-brand-red` to all tabs, labels, and card actions; its scarcity is part of its recognition value.
- Do not use a custom display font for content cards; `--font-sans` keeps the UI familiar and legible in Chinese.
- Do not replace the search pill with a square or bordered field; it breaks the observed `999px` control language.
- Do not add drop shadows to feed cards, side navigation, or utility buttons; no sampled shadow was present.
- Do not wrap every channel tab in a pill; the category row relies on compact plain text.
- Do not over-style user media with color overlays or gradients; the media itself supplies the visual variety.

## Imagery

Photography and video covers are the dominant visual layer. The UI frames them with consistent 16px image corners and minimal chrome, while titles, author rows, and interaction counts stay subordinate. Preserve original imagery without decorative tints; a calm white shell should make a mixed, user-generated feed feel coherent.

## Layout

The desktop page is a two-part shell: a persistent left navigation rail and a main discovery canvas. The main area starts with a centered search control and utility actions, then a compact horizontal channel row, then a four-column masonry-style feed at the sampled width. On narrower screens, retain the image-first hierarchy and reduce columns before reducing readable text below the 14px card-title baseline.

## Agent Prompt Guide

1. Create a Chinese discovery search bar using `rgba(0, 0, 0, 0.03)` fill, no border or shadow, `999px` radius, 16px native CJK system text, and `0 84px 0 16px` padding.
2. Create a desktop content-feed shell with a 256px left rail, white canvas, restrained `#ff2442` brand accent, and four transparent image cards with 16px media corners.
3. Create a feed card with unfiltered user media, 14px `#333333` title text, 12px muted metadata, no card background, border, or shadow.

## Similar Products

- **Pinterest** - image-led masonry discovery with a quiet product shell.
- **Instagram Explore** - user media dominates while metadata stays compact.
- **Douyin Web** - Chinese social content discovery with a fixed product navigation layer.
- **Lemon8** - lifestyle editorial content with photography-first hierarchy.

## Quick Start

```css
:root {
  --color-canvas: #ffffff;
  --color-ink: #333333;
  --color-ink-soft: rgba(51, 51, 51, 0.8);
  --color-ink-muted: #999999;
  --color-surface-search: rgba(0, 0, 0, 0.03);
  --color-surface-selected: #f5f5f5;
  --color-hairline: rgba(0, 0, 0, 0.06);
  --color-brand-red: #ff2442;

  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft Yahei", Arial, sans-serif;
  --text-meta: 12px;
  --text-card-title: 14px;
  --text-control: 16px;

  --space-4: 4px;
  --space-8: 8px;
  --space-12: 12px;
  --space-16: 16px;
  --space-24: 24px;
  --space-32: 32px;

  --radius-card: 16px;
  --radius-circle: 50%;
  --radius-pill: 100px;
  --radius-search: 999px;
}
```
