# 小红书创作服务平台 - Style Reference
> 轻盈的创作工作台：用大面积白色内容面、克制灰阶和少量高辨识度红色组织复杂任务。

**Theme:** light

小红书创作服务平台以接近白色的工作区为主，左侧固定导航和宽阔内容画布让高频创作任务保持安静、清晰。品牌红只承担发布、上传和新建等主操作，数据页和内容分类的选中态则使用独立的交互蓝，二者职责明确。字体以 RedNum、RedZh、RedEn 和系统中文字体组成，标题通常只有 16-20px，不依赖夸张字号制造层级。页面深度主要来自白色表面、3% 黑色填充和极淡分隔线，只有菜单浮层使用完整阴影。首页采用 20px 大圆角信息卡，而工具型列表内部使用 4-12px 小圆角；发布页再以 16px 上传区和 20px 胶囊按钮形成更亲和的操作语言。最具辨识度的节奏变化，是左侧红色“发布笔记”胶囊与内容区低饱和大面积灰白之间的强对比。

## Research Scope

- **Observed:** 首页、笔记管理、活动中心、笔记灵感、创作学院、创作百科、视频上传、图文上传、长文入口、播客上传、发布下拉菜单、权限空状态。
- **Restricted:** 账号概览、内容分析、粉丝数据均显示“暂无访问权限”，未申请额外权限。
- **Not triggered:** 文件选择、创建草稿、发布、收藏、删除、申请权限等会改变账号状态的操作。
- **Viewport:** 1536 x 735 desktop Chrome; responsive values below are implementation guidance derived from the observed fluid grid, not an audited mobile product UI.

## Tokens - Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| App Canvas | `#f7f7f7` | `--color-canvas` | 笔记管理、活动、学院、百科和发布页的主画布 |
| Home Canvas | `#eef1f8` | `--color-canvas-home` | 首页独有的冷灰蓝画布 |
| Surface | `#ffffff` | `--color-surface` | 内容卡片、主面板、侧栏和顶部栏 |
| Surface Muted | `#fafafa` | `--color-surface-muted` | 活动列表卡片和次级内容块 |
| Fill Subtle | `rgba(0,0,0,0.03)` | `--color-fill-subtle` | 选中胶囊、上传区、分段控件底色 |
| Fill Hover | `rgba(0,0,0,0.05)` | `--color-fill-hover` | 行、图标按钮和轻量控件 hover |
| Fill Pressed | `rgba(0,0,0,0.08)` | `--color-fill-pressed` | 轻量控件 pressed |
| Ink | `rgba(0,0,0,0.85)` | `--color-ink` | 标题、重要数字、主正文 |
| Ink Paragraph | `rgba(0,0,0,0.65)` | `--color-ink-paragraph` | 常规正文和导航 |
| Ink Description | `rgba(0,0,0,0.45)` | `--color-ink-description` | 时间、统计标签、说明文字 |
| Ink Placeholder | `rgba(0,0,0,0.42)` | `--color-ink-placeholder` | 输入占位符和弱提示 |
| Ink Disabled | `rgba(0,0,0,0.20)` | `--color-ink-disabled` | 禁用操作与不可用图标 |
| Hairline | `rgba(0,0,0,0.08)` | `--color-hairline` | 标签下边线和内容分隔 |
| Border | `#e6e6e6` | `--color-border` | 输入框和标准控件边框 |
| Brand Red | `#ff2442` | `--color-brand` | 发布、上传、新建等主操作 |
| Brand Red Hover | `#db0031` | `--color-brand-hover` | 品牌主操作 hover；来自页面加载的品牌色阶 token |
| Brand Red Pressed | `#a00020` | `--color-brand-pressed` | 品牌主操作 pressed；来自页面加载的品牌色阶 token |
| Brand Red Soft | `#ffedeb` | `--color-brand-soft` | 红色提示或品牌弱背景 |
| Interaction Blue | `#386bff` | `--color-interaction` | 数据页选中态、链接、焦点强调 |
| Interaction Blue Soft | `#d0daff` | `--color-interaction-soft` | `:focus-visible` 2px 外轮廓 |
| Success | `#00ab46` | `--color-success` | 成功语义和状态图标 |
| Warning | `#fd6321` | `--color-warning` | 警告语义和状态图标 |
| Danger | `#fb3367` | `--color-danger` | 错误或危险语义，不替代品牌主操作 |
| Publish Image Tint | `#fff2e6` | `--color-tint-image` | 首页图文发布入口 |
| Publish Video Tint | `#ecf4fe` | `--color-tint-video` | 首页视频发布入口 |
| Publish Live Tint | `#ffedf0` | `--color-tint-live` | 首页直播入口 |

### Decorative / Gradient

未观察到可复用的系统级渐变。创作学院 Banner、活动封面和内容缩略图中的渐变属于运营素材，不应提升为 UI token。

## Tokens - Typography

### RedNum / RedZh / RedEn - 平台 UI 字体栈 · `--font-ui`
- **Substitute:** `Noto Sans SC`, `Inter`, system-ui
- **Weights:** 400, 500, 600, 900（900 仅在发布页容器继承中出现；可见标签实际使用 500）
- **Sizes:** 12px, 14px, 16px, 18px, 20px, 24px, 32px
- **Line height:** 16px, 18px, 20px, 22px, 24px, 26px, 28px, 32px, 40px
- **Letter spacing:** `normal` / `0`
- **OpenType features:** 未观察到显式设置
- **Role:** 全局导航、数据、标签、按钮和内容列表。

### PingFang SC - 中文标题与正文 · `--font-zh`
- **Substitute:** `Noto Sans SC`, `Microsoft YaHei`, sans-serif
- **Weights:** 400, 500, 600
- **Sizes:** 12px, 14px, 16px, 18px
- **Line height:** 18px, 20px, 22px, 24px, 26px
- **Letter spacing:** `normal`
- **Role:** 卡片标题、时间、按钮文案和百科长文本。

### Type Scale

| Role | Size | Line Height | Letter Spacing | Weight | Token |
|------|------|-------------|----------------|--------|-------|
| page-title | 24px | 40px | 0 | 500 | `--text-page-title` |
| publish-tab | 20px | 28px | 0 | 500 | `--text-publish-tab` |
| heading | 18px | 26px | 0 | 500 | `--text-heading` |
| section-title | 16px | 24px | 0 | 500 | `--text-section-title` |
| body | 16px | 24px | 0 | 400 | `--text-body` |
| body-sm | 14px | 22px | 0 | 400 | `--text-body-sm` |
| label | 14px | 20px | 0 | 500 | `--text-label` |
| caption | 12px | 18px | 0 | 400 | `--text-caption` |

Large promotional text such as the 32px long-form headline is a page-specific campaign treatment, not the default application heading.

## Tokens - Spacing & Shapes

**Base unit:** 4px, with a 2px micro-step for icon and border alignment.

**Density:** comfortable for content; compact for navigation and metadata.

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 2 | 2px | `--spacing-2` |
| 4 | 4px | `--spacing-4` |
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 20 | 20px | `--spacing-20` |
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |

### Border Radius

| Name | Value | Token | Typical use |
|------|-------|-------|-------------|
| sm | 4px | `--radius-sm` | 图标按钮、媒体边框、分段控件 |
| md | 8px | `--radius-md` | 首页发布小卡、标准控件 |
| lg | 12px | `--radius-lg` | 封面裁切、次级内容块 |
| xl | 16px | `--radius-xl` | 上传拖拽区 |
| card | 20px | `--radius-card` | 首页卡片、笔记卡片、发布主面板 |
| pill | 999px | `--radius-pill` | 发布按钮、上传按钮、标签页胶囊 |

### Shadows

| Name | Value | Token | Role |
|------|-------|-------|------|
| default | `0 1px 8px 0 rgba(0,0,0,0.09)` | `--shadow-default` | 发布下拉菜单、轻量浮层 |
| inset | `0 1px 2px 0 rgba(0,0,0,0.08), 0 0 1px 0 rgba(0,0,0,0.20)` | `--shadow-inset` | 内嵌输入/控件 |
| focus | `0 20px 32px 0 rgba(0,0,0,0.12), 0 0 1px 0 rgba(0,0,0,0.20)` | `--shadow-focus` | 高层浮动交互面 |
| drawer | `0 9px 20px 0 rgba(0,0,0,0.09)` | `--shadow-drawer` | 抽屉和较大弹层 |

### Layout

- **Application header:** 64px high, white, full width.
- **Sidebar:** 224px observed outer width; internal menu width 208px; 16-24px horizontal inset.
- **Content gutter:** 16px at the right and between major columns; 24px around standard page sections.
- **Home grid:** 960px primary column + approximately 320px rail + 16px gap at 1536px viewport.
- **Management grid:** two equal 614px note cards with 20px gap at 1536px viewport.
- **Publish panel:** 1296px fluid surface with 32px horizontal padding, 16px top, 24px bottom.
- **Card padding:** 20px for note cards; 16px 24px 24px for home cards; 12px 24px 12px 16px for activity rows.

## Components

### Application Header
**Role:** Persistent brand and account context.

- height: 64px
- background: `{colors.surface}` (`#ffffff`)
- brand area: 24px left inset; logo plus 20px product name
- account area: circular avatar, 14-16px label, chevron
- state: remains visually flat; no observed drop shadow or bottom border

### Sidebar Navigation
**Role:** Primary cross-feature navigation.

- width: 224px outer / 208px menu
- background: `{colors.surface}`
- item height: approximately 48px
- icon: 20-24px, `{colors.ink-description}`
- default: transparent background, paragraph ink
- hover: `{colors.fill-hover}`
- selected: `rgba(0,0,0,0.06)`-like neutral fill, 8px radius, dark icon and text
- nested items: 16px text, 36-48px row, 36px left indentation
- collapse control: pinned to lower left with icon + text

### Publish Menu Button
**Role:** Persistent primary creation entry.

- background: `{colors.brand}` (`#ff2442`)
- color: white
- size: 176px x 44px on sidebar
- border-radius: `{radius.pill}`
- padding: 0 20px
- icon + label + chevron with 8px gaps
- hover: `{colors.brand-hover}`
- pressed: `{colors.brand-pressed}`
- expanded: chevron rotates upward; dropdown appears below
- focus-visible: 2px `{colors.interaction-soft}` outline

### Publish Dropdown
**Role:** Select video, image, long-form or podcast creation mode.

- surface: white
- width: 176px
- padding: 8px 0
- border-radius: 12px
- box-shadow: `{shadow.default}`
- item: 44px high, 16px horizontal padding
- hover: `{colors.fill-hover}`
- icons: 16px, description ink

### Home Information Card
**Role:** Profile, overview, creation shortcuts and dashboard summaries.

- background: white
- border-radius: 20px
- box-shadow: none
- padding: 16px 24px 24px
- section title: 16px / 24px / 500
- corner action: 12px / 18px / description ink
- cards rely on spacing and canvas contrast, not borders

### Publish Shortcut Card
**Role:** Quick entry to image, video or live creation.

- height: 80px
- border-radius: 8px
- padding: 16px 12px
- backgrounds: `{colors.tint-image}`, `{colors.tint-video}`, `{colors.tint-live}`
- hover: use a 5% black overlay without adding shadow
- title: 14-16px / 500; helper: 12px / description ink

### Tabs
**Role:** Switch content categories without leaving context.

Two visual families are present:

1. **Underline tabs:** 14-16px labels, transparent background; selected text uses interaction blue or ink and a 2px underline; inactive text uses description ink.
2. **Publish pill tabs:** 20px / 28px / 500; padding 8px 16px; 33px radius; selected background `{colors.fill-subtle}`; inactive background transparent.

Hover uses `{colors.fill-hover}` only for pill tabs. Focus-visible uses the 2px interaction-blue-soft outline.

### Search Input
**Role:** Filter published notes.

- size: 240px x 40px
- surface: white
- border: 1px solid `{colors.border}`
- border-radius: 4px
- padding: 0 12px
- text: 14px / 20px
- placeholder: `{colors.ink-placeholder}`
- hover: border darkens toward `rgba(0,0,0,0.20)`
- focus: border `{colors.interaction}`; focus-visible ring `{colors.interaction-soft}`

### Note Card
**Role:** Scan and manage a published note.

- background: white
- border-radius: 20px
- padding: 20px
- height: 178px
- media: 97px x 128px; cover radius 12px; inner media border 1px `rgba(0,0,0,0.10)` and 4px radius
- title: 16px / 24px / 500 / ink
- time: 14px / 22px / description ink
- action icons: 20px; default `rgba(0,0,0,0.70)`; disabled `rgba(0,0,0,0.20)`
- hover: keep card flat; reveal or strengthen row actions rather than lifting the card

### Activity Row
**Role:** Present campaign metadata with a secondary action.

- two-column grid
- row surface: `#fafafa`
- size: approximately 612px x 108px
- padding: 12px 24px 12px 16px
- cover: 84px square
- action: outlined neutral 32px control; favorite icon stays separate
- hover: fill shifts from `#fafafa` to white or a 5% neutral overlay; no large shadow

### Upload Drop Zone
**Role:** Accept media while explaining limits.

- background: `{colors.fill-subtle}`
- border: none in observed idle state
- border-radius: 16px
- video height: 394px; image height: 374px; audio regions vary by two-column layout
- centered neutral illustration, 16px instruction and 40px action buttons
- drag-over: use 1px interaction-blue border and interaction-blue-soft fill
- error: 1px danger border with concise inline message; do not replace the entire panel with red

### Primary Button
**Role:** Upload, create or confirm the single main action.

- height: 40px
- min-width: 120px
- padding: 0 16px
- border-radius: 20px
- background: `{colors.brand}`
- color: white
- font: 14-16px / 500
- hover: `{colors.brand-hover}`
- pressed: `{colors.brand-pressed}`
- disabled: brand tint with 40% opacity and no pointer interaction
- focus-visible: 2px `{colors.interaction-soft}` outline with 2px offset

### Outlined Brand Button
**Role:** Import, RSS and other secondary creation actions.

- height: 40px
- min-width: 120px
- border: 1px solid `{colors.brand}`
- background: transparent or white
- color: `{colors.brand}`
- border-radius: 20px
- hover: `{colors.brand-soft}` background
- pressed: border `{colors.brand-pressed}` and matching text

### Empty / Permission State
**Role:** Explain unavailable or absent content without disrupting the shell.

- centered within the white content surface
- illustration approximately 120px wide
- title: 16-18px / 500 / ink
- helper: 14px / description ink
- inline action: interaction blue text
- never place a full-size card around the illustration; the content surface already supplies containment

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | App Canvas | `#f7f7f7` | Standard application background |
| 0a | Home Canvas | `#eef1f8` | Home dashboard background |
| 1 | Surface | `#ffffff` | Sidebar, cards, main panels |
| 2 | Surface Muted | `#fafafa` | Dense activity rows and quiet groups |
| 3 | Floating | `#ffffff` + `0 1px 8px rgba(0,0,0,0.09)` | Dropdowns and transient menus |

## Do's and Don'ts

### Do

- Keep the application canvas at `#f7f7f7` and reserve `#eef1f8` for dashboard-style home compositions.
- Use `#ff2442` only for creation and upload actions with clear user intent.
- Use `#386bff` for data selection, links and focus feedback; it should not compete with the publish action.
- Build information hierarchy with white surfaces, 16-24px padding and 20px card radii.
- Keep operational headings between 16px and 24px; use 12-14px metadata for dense scanning.
- Apply `rgba(0,0,0,0.45)` to timestamps and helper copy, and `rgba(0,0,0,0.20)` to disabled icons.
- Use 4-12px radii inside cards, then 16-20px radii for the containing surface.
- Keep status illustrations centered and visually quiet inside the existing content surface.

### Don't

- Do not use brand red for ordinary links, selected analytics tabs or neutral filters.
- Do not put borders around every white card; canvas contrast is the primary separator.
- Do not add heavy shadows to note cards, activity rows or upload panels.
- Do not turn content pages into marketing layouts with oversized headings or decorative hero cards.
- Do not mix activity artwork colors into the system palette; campaign media is content, not chrome.
- Do not use 20px rounding on small icon buttons or inline tags; keep them at 4-8px.
- Do not hide unavailable actions silently; use the observed disabled ink or a centered permission state.
- Do not trigger permission requests, drafts or uploads merely to preview a component state.

## Imagery

The shell uses monochrome outline icons and small neutral empty-state illustrations. Content imagery is dense and literal: note covers use portrait ratios, activities use square thumbnails, and academy courses use poster-like covers in a horizontal shelf. Campaign images can be colorful, but they sit inside a mostly neutral UI and never redefine navigation or control colors. Preserve original image ratios, use 4-12px media radii, and avoid dark overlays unless a visibility label must sit directly on a cover.

## Layout

The desktop product is a fixed-shell application: a 64px top bar, a 224px left navigation rail and a fluid content region. Home uses an asymmetric dashboard grid with a 960px main column and a narrow right rail, while management and activity pages use equal two-column grids for repeated items. Publishing replaces the normal page body with one large white 20px-radius panel whose controls remain aligned to a 32px inner gutter. At narrower widths, collapse the sidebar before compressing content cards; switch two-column grids to one column near 960px and preserve at least 16px page gutters. The interface should remain information-first and work-focused rather than becoming a stack of decorative cards.

## Agent Prompt Guide

1. Create a desktop creator dashboard with a 64px white header, 224px white sidebar and `#eef1f8` home canvas. Use white 20px-radius cards, 24px padding, 16px gaps, `rgba(0,0,0,0.85)` titles and a single `#ff2442` 176x44 publish pill.
2. Build a note management grid on `#f7f7f7`: two 614x178 white cards per row, 20px card radius and padding, 97x128 covers, 16/24/500 titles, 14/22 muted timestamps and 20px action icons with visible disabled states.
3. Build a media upload panel: white 20px-radius outer surface with 32px horizontal padding, 20px pill tabs, a `rgba(0,0,0,0.03)` 16px-radius drop zone, and 120x40 primary/outlined buttons using `#ff2442`.

## Similar Brands

- **Douyin Creator Center** - Similar creator operations shell with dense data and content management.
- **Bilibili Creative Center** - Comparable publishing modes, analytics navigation and campaign content.
- **YouTube Studio** - Similar fixed navigation and task-oriented content management, but denser and more angular.
- **Notion Calendar** - Similar quiet neutral surfaces and restrained use of accent color.
- **Linear light theme** - Similar disciplined hierarchy and minimal reliance on shadows, though more compact.

## Quick Start

### CSS Custom Properties

```css
:root {
  --color-canvas: #f7f7f7;
  --color-canvas-home: #eef1f8;
  --color-surface: #ffffff;
  --color-surface-muted: #fafafa;
  --color-fill-subtle: rgba(0, 0, 0, 0.03);
  --color-fill-hover: rgba(0, 0, 0, 0.05);
  --color-fill-pressed: rgba(0, 0, 0, 0.08);
  --color-ink: rgba(0, 0, 0, 0.85);
  --color-ink-paragraph: rgba(0, 0, 0, 0.65);
  --color-ink-description: rgba(0, 0, 0, 0.45);
  --color-ink-placeholder: rgba(0, 0, 0, 0.42);
  --color-ink-disabled: rgba(0, 0, 0, 0.20);
  --color-hairline: rgba(0, 0, 0, 0.08);
  --color-border: #e6e6e6;
  --color-brand: #ff2442;
  --color-brand-hover: #db0031;
  --color-brand-pressed: #a00020;
  --color-brand-soft: #ffedeb;
  --color-interaction: #386bff;
  --color-interaction-soft: #d0daff;
  --color-success: #00ab46;
  --color-warning: #fd6321;
  --color-danger: #fb3367;
  --color-tint-image: #fff2e6;
  --color-tint-video: #ecf4fe;
  --color-tint-live: #ffedf0;

  --font-ui: RedNum, RedZh, RedEn, 'Noto Sans SC', Inter, system-ui, sans-serif;
  --font-zh: 'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif;

  --text-page-title: 24px;
  --text-publish-tab: 20px;
  --text-heading: 18px;
  --text-section-title: 16px;
  --text-body: 16px;
  --text-body-sm: 14px;
  --text-caption: 12px;

  --spacing-2: 2px;
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-card: 20px;
  --radius-pill: 999px;

  --shadow-default: 0 1px 8px 0 rgba(0, 0, 0, 0.09);
  --shadow-inset: 0 1px 2px 0 rgba(0, 0, 0, 0.08), 0 0 1px 0 rgba(0, 0, 0, 0.20);
  --shadow-focus: 0 20px 32px 0 rgba(0, 0, 0, 0.12), 0 0 1px 0 rgba(0, 0, 0, 0.20);
  --shadow-drawer: 0 9px 20px 0 rgba(0, 0, 0, 0.09);
}
```

### Tailwind v4

```css
@theme {
  --color-canvas: #f7f7f7;
  --color-canvas-home: #eef1f8;
  --color-surface: #ffffff;
  --color-surface-muted: #fafafa;
  --color-brand: #ff2442;
  --color-brand-hover: #db0031;
  --color-interaction: #386bff;
  --color-success: #00ab46;
  --color-warning: #fd6321;
  --color-danger: #fb3367;
  --font-sans: RedNum, RedZh, RedEn, 'Noto Sans SC', Inter, system-ui, sans-serif;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-card: 20px;
}
```
