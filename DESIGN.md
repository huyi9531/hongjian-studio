# 红笺创作工作台 - Design System

> 保留红笺品牌，用小红书创作服务平台的安静、清晰和高效组织完整创作流程。

**Theme:** light

红笺采用固定工作台外壳：64px 白色顶栏、224px 白色左侧导航，以及浅灰内容画布。主操作红只用于新建、生成、上传和发布；交互蓝负责焦点、进度和数据反馈。页面不依赖大标题或重阴影制造层级，而使用白色内容面、20px 圆角、4px 间距基准和明确的文字透明度。重复内容直接排列在画布上，避免卡片嵌套。原始调研与完整证据保存在 [`themes/xiaohongshu-creator/DESIGN.md`](themes/xiaohongshu-creator/DESIGN.md)。

## Color Tokens

| Role | Value | CSS token |
|---|---|---|
| Standard canvas | `#f7f7f7` | `--background` |
| Creation home canvas | `#eef1f8` | `--background-home` |
| Content surface | `#ffffff` | `--card` |
| Quiet surface | `#fafafa` | `--secondary` |
| Subtle fill | `rgba(0,0,0,0.03)` | `--muted` |
| Hover fill | `rgba(0,0,0,0.05)` | `--accent` |
| Primary ink | `rgba(0,0,0,0.85)` | `--foreground` |
| Description ink | `rgba(0,0,0,0.45)` | `--muted-foreground` |
| Disabled ink | `rgba(0,0,0,0.20)` | `--disabled-foreground` |
| Border | `#e6e6e6` | `--border` |
| Hairline | `rgba(0,0,0,0.08)` | `--hairline` |
| Brand action | `#ff2442` | `--primary` |
| Brand hover | `#db0031` | `--primary-hover` |
| Brand pressed | `#a00020` | `--primary-pressed` |
| Brand soft | `#ffedeb` | `--primary-soft` |
| Focus / progress | `#386bff` | `--ring` |
| Focus ring | `#d0daff` | `--ring-soft` |
| Success | `#00ab46` | `--success` |
| Warning | `#fd6321` | `--warning` |
| Error | `#fb3367` | `--destructive` |

## Typography

```css
font-family: RedNum, RedZh, RedEn, "PingFang SC", "Noto Sans SC",
  "Microsoft YaHei", system-ui, -apple-system, "Segoe UI", sans-serif;
```

| Role | Size / line-height | Weight |
|---|---|---|
| Page title | `24px / 32px` | 600 |
| Section title | `18px / 26px` | 600 |
| Card title | `16px / 24px` | 500 |
| Body | `14px / 22px` | 400 |
| Metadata | `12px / 18px` | 400 |

Letter spacing remains `0`. Operational pages must not use marketing-scale display text.

## Spacing, Radius and Depth

- Base spacing: 4px; common values are 8, 12, 16, 20, 24, 32 and 40px.
- Small controls: 4-8px radius.
- Media and secondary groups: 12-16px radius.
- Primary content surfaces: 20px radius (`rounded-2xl`).
- Buttons and segmented controls: full pill radius.
- Cards remain flat. Use `0 1px 8px rgba(0,0,0,0.09)` only for dropdowns and `0 9px 20px rgba(0,0,0,0.09)` for larger overlays.

## Application Shell

### Desktop

- Top bar: fixed, 64px, white, subtle bottom hairline.
- Sidebar: fixed below the top bar, 224px wide, white.
- Main: begins after the top bar and sidebar, using the standard canvas.
- Sidebar primary action: red 44px pill labeled “新建创作”.
- Navigation: 48px rows, 8px radius, neutral selected fill; never use red for the current route.

### Mobile

- Keep the 64px top bar.
- Hide the fixed sidebar and expose the three routes as 44px icon buttons in the header.
- Switch two-column management grids to one column before compressing editable content.

## Components

### Primary Button

- 44px default height; 40px for compact tool actions.
- Red fill, white text, full pill radius.
- Hover `#db0031`; pressed `#a00020`.
- Focus uses a 2px `#d0daff` ring with offset.
- Disabled remains visible with a muted red fill and no interaction.

### Neutral Button

- White or quiet neutral fill, `#e6e6e6` border where containment is required.
- Hover uses the 5% black accent fill.
- Icons use Lucide and include accessible labels or titles when text is hidden.

### Input and Textarea

- White surface, 1px neutral border, 8px radius.
- Placeholder uses description ink.
- Focus border is `#386bff` with `#d0daff` ring.
- Disabled uses the subtle fill and 20% ink rather than opacity-only disappearance.

### Page Header

`WorkspacePageHeader` owns the page title, optional eyebrow/back link, description, status and right-aligned actions. Pages should not recreate this layout independently.

### Content Surface

- White, 20px radius, no shadow.
- Standard padding: 20px mobile and 24px desktop.
- Use borders only between sections inside a single surface.

### Image Card

- Media remains 3:4 with 12-16px radius.
- Labels and state metadata sit below the image.
- Result cards reveal “修改大纲” and “重新生成” in a bottom overlay on hover/focus without lifting the full card.
- Result overlays use translucent black with white text and a subtle light divider so the action bar remains distinct from both the image and page canvas.

### Empty and Error States

- Center a small icon, concise heading, short description and one recovery action.
- Keep the state inside one white content surface.
- Errors use destructive text and retain the failed content context where possible.

## Page Patterns

### New Work

- Use the cool `#eef1f8` canvas.
- Place the topic editor in one white 20px panel.
- The editable area uses a 3% black fill and 16px radius.
- Reference images are 80px thumbnails; “生成大纲” is the sole primary action.

### Outline Management

- Three columns on wide screens, two on tablet and one on mobile.
- Each page is a 3:4 white 20px card with a quiet inner editor.
- Reorder and delete actions remain compact icon buttons.

### Generation and Results

- Progress uses interaction blue, not brand red.
- Preserve a 3:4 image grid and explicit waiting, generating, success and failure states.
- Allow each completed result image to edit its matching outline in a dialog, with separate save and save-and-regenerate actions.
- Result editing uses a main column plus a white, sticky QR publishing sidebar.

### Works and Settings

- Works use two-column horizontal management cards without requiring additional cover data.
- Settings separate text and image model categories; each provider owns one independent white configuration surface that can be repeated as new channels are added.
- Provider panels keep their API key, model choices and relevant generation parameters together instead of using a global service-status area.
- Text and image API keys use password inputs and only expose configured/unconfigured status after saving; stored values are never rendered back into the form.
- Binary model behavior such as deep thinking uses a labeled switch inside the owning provider panel, with latency and token impact stated beside the control.

### Login

- Use the same 64px brand header and standard canvas.
- Center one white 20px authentication panel.
- Do not use a marketing hero or split-screen landing layout.

## Do

- Reserve red for actions that create, generate, upload or publish.
- Use blue for focus, progress and interactive feedback.
- Separate sections with canvas contrast and whitespace before adding borders.
- Keep titles between 16px and 24px.
- Preserve 44px mobile targets and visible keyboard focus.
- Keep all business and error states explicit.

## Don't

- Do not copy Xiaohongshu logos, account imagery or campaign artwork.
- Do not add video, podcast or analytics controls that RedInk cannot execute.
- Do not add shadows to ordinary cards.
- Do not nest decorative cards inside other cards.
- Do not use brand red for route selection or ordinary links.
- Do not change server APIs, persistence or generation behavior for visual parity.

## Verification

Before merging UI changes, run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Visually inspect login, new work, outline, generation, result, works and settings at 1536x735, 1024x768 and 390x844. Confirm the header/sidebar do not overlap content, grids collapse cleanly, 3:4 media does not distort, and focus/disabled/error states remain legible.
