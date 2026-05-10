# KiMiS — UI/UX Redesign Prompt
### Visual Layer Redesign Only · No Functionality or Logic Changes

---

## 1. Product Context

**KiMiS (Knowledge Intelligence Management System)** is a workspace-based dark-theme platform for organizing and executing knowledge through articles and visual workflows. It is a tool for individuals and teams — members collaborate inside workspaces with role-based access, write Markdown articles, and build connected workflow diagrams.

The current design ("KiMiS Dark") uses `#6366f1` indigo as its primary accent, Inter as its typeface, and glassmorphism (`backdrop-filter: blur`) as a core visual effect. **All three of these must be replaced.** They represent the most generic AI-adjacent aesthetic in SaaS today and actively undermine KiMiS's credibility as a serious knowledge tool.

The redesign keeps the dark theme. It replaces everything else.

---

## 2. What Actually Exists — Page Inventory

KiMiS currently has **4 pages / views**:

1. **Login Page** — entry point, centered auth card
2. **Register Page** — onboarding form, wider auth card
3. **Dashboard** — flex layout: fixed profile sidebar + fluid workspace content
4. **Workspace Management View** — the main workspace area with tabs (Members · Articles · Workflows) and an AI assistant

This prompt redesigns exactly these 4 pages. Nothing more, nothing less.

---

## 3. Design Direction

### 3.1 North Star

KiMiS should feel like a tool built by people who read. Precise, dark, typographically deliberate. Like a terminal that grew up. Reference points: **Raycast** (keyboard-native precision), **Linear** (opinionated dark UI), **Oxide Computer** (technical warmth).

### 3.2 What to Replace

| Current (Remove)                         | Replacement                                       |
| ---------------------------------------- | ------------------------------------------------- |
| `#6366f1` Indigo primary                 | `#C2410C` Burnt Orange primary                    |
| `Inter` typeface                         | `IBM Plex Sans` (body) + `IBM Plex Mono` (code)   |
| Glassmorphism + `backdrop-filter: blur`  | Solid surfaces with precise border contrast       |
| Radial gradient atmospheric backgrounds  | Flat dark surfaces, depth via layered borders     |
| Indigo-to-violet gradient text on logo   | Flat high-contrast text, no gradient text anywhere|
| Indigo glow / shadow on buttons          | Warm `#C2410C` focus ring on active states only   |

### 3.3 What to Keep

- **Dark theme** — intentional and correct for the product
- **Card-based surface system** — layered dark surfaces communicating depth
- **Tab navigation inside workspace** — Members / Articles / Workflows tab pattern stays
- **All layouts and structural zones** — sidebar width, flex containers, card grids

---

## 4. Design System

### 4.1 Color Palette

#### Surfaces (Background Layers)

| Token              | Hex       | Usage                                                 |
| ------------------ | --------- | ----------------------------------------------------- |
| `--bg-base`        | `#0D0D0D` | Page background, outermost layer                      |
| `--bg-surface`     | `#161618` | Cards, sidebar, modal backgrounds                     |
| `--bg-elevated`    | `#1E1E21` | Elevated cards, dropdown menus, hover rows            |
| `--bg-sunken`      | `#0A0A0C` | Input fields, code block backgrounds, inset elements  |

> **Rule:** No `backdrop-filter`, `blur()`, or semi-transparent backgrounds anywhere. Every surface is a solid opaque color from this scale.

#### Primary — Burnt Orange

| Token               | Hex       | Usage                                                         |
| ------------------- | --------- | ------------------------------------------------------------- |
| `--primary`         | `#C2410C` | Buttons, active tab underline, focus rings, active node borders |
| `--primary-hover`   | `#9A3412` | Hover state on primary buttons                                |
| `--primary-muted`   | `#431407` | Subtle tinted backgrounds (selected row, active item bg)      |
| `--primary-text`    | `#FB923C` | Inline links, active nav labels, highlighted text values      |

#### Borders

| Token               | Value                     | Usage                                          |
| ------------------- | ------------------------- | ---------------------------------------------- |
| `--border-subtle`   | `rgba(255,255,255,0.06)`  | Default card borders, dividers                 |
| `--border-default`  | `rgba(255,255,255,0.12)`  | Input borders, table borders, panel edges      |
| `--border-strong`   | `rgba(255,255,255,0.22)`  | Hover borders on cards, focus-adjacent         |
| `--border-primary`  | `#C2410C`                 | Focus rings, active states, selected items     |

#### Text

| Token               | Hex       | Usage                                      |
| ------------------- | --------- | ------------------------------------------ |
| `--text-primary`    | `#F4F4F5` | Headings, card titles, active labels       |
| `--text-secondary`  | `#A1A1AA` | Body text, metadata, descriptions          |
| `--text-tertiary`   | `#52525B` | Placeholders, disabled states, timestamps  |
| `--text-accent`     | `#FB923C` | Links, highlights, active tab labels       |

#### Semantic

| State   | Background | Border    | Text      |
| ------- | ---------- | --------- | --------- |
| Success | `#052E16`  | `#166534` | `#4ADE80` |
| Danger  | `#2D0000`  | `#7F1D1D` | `#F87171` |
| Warning | `#1C1000`  | `#78350F` | `#FCD34D` |
| Info    | `#0C1A2E`  | `#1E3A5F` | `#60A5FA` |

---

### 4.2 Typography

| Font            | Role                                                                 | Source       |
| --------------- | -------------------------------------------------------------------- | ------------ |
| `IBM Plex Sans` | All UI text                                                          | Google Fonts |
| `IBM Plex Mono` | Code, Markdown source, node IDs, monospace values                   | Google Fonts |

IBM Plex Sans is humanist but structured — it carries authority without the sterility of Inter. IBM Plex Mono is its natural pair and belongs in a knowledge-work tool.

#### Type Scale

| Name    | Size  | Weight | Line Height | Usage                                              |
| ------- | ----- | ------ | ----------- | -------------------------------------------------- |
| Display | 24px  | 600    | 1.2         | Page headings, empty state titles                  |
| Title   | 18px  | 600    | 1.3         | Card headers, section titles, modal titles         |
| Heading | 15px  | 600    | 1.4         | Sub-section labels, table headers                  |
| Body    | 14px  | 400    | 1.6         | All general text, descriptions, article previews   |
| Small   | 13px  | 400    | 1.5         | Metadata, timestamps, form helper text             |
| Label   | 12px  | 500    | 1.4         | Input labels, badge text, tab labels               |
| Micro   | 11px  | 500    | 1.3         | Uppercase section markers, node type labels        |
| Code    | 13px  | 400    | 1.7         | Markdown source, code blocks — IBM Plex Mono only  |

**Rules:**
- No gradient text anywhere — not on the logo, not on headings.
- No font weights above 600 in body content.
- IBM Plex Mono only for: Markdown editor source, code blocks, node IDs, and monospace value display.
- `letter-spacing: 0.07em` on 11px uppercase micro labels only.

---

### 4.3 Spacing

Base unit: `4px`.

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64px`

---

### 4.4 Border Radius

| Token  | Value    | Usage                                         |
| ------ | -------- | --------------------------------------------- |
| `sm`   | `4px`    | Badges, type chips, inline tags               |
| `md`   | `6px`    | Inputs, buttons, small cards                  |
| `lg`   | `10px`   | Main cards, panels, auth containers           |
| `xl`   | `14px`   | Modals, large drawers                         |
| `full` | `9999px` | Avatars, toggle pills                         |

---

### 4.5 Elevation Model

No decorative `box-shadow`. Elevation is communicated by:

1. **Surface color stepping** — deeper elements use darker backgrounds (`--bg-sunken` inside `--bg-surface`)
2. **Border contrast stepping** — elevated cards use `--border-strong`, default cards use `--border-subtle`
3. **Single exception:** A workflow node being actively dragged may receive `box-shadow: 0 12px 32px rgba(0,0,0,0.5)` — drops to nothing on release.

---

### 4.6 Iconography

- **Library:** Lucide Icons throughout. No mixing with other sets.
- **Stroke width:** `1.5px` everywhere. No filled icons.
- **Sizes:** `16px` (inline/compact), `20px` (primary actions, tab icons), `24px` (empty state illustrations)
- **Color:** Always inherits from its text context. Never hardcoded.

---

## 5. Page-by-Page Redesign Specifications

---

### 5.1 Login Page

#### Current state
Centered `380px` auth card. KiMiS name in indigo-to-violet gradient text. Midnight-navy card. Indigo-glow on input focus. "Sign In" button with `translateY` hover and indigo shadow glow.

#### Redesign

**Layout:** Single centered column. `100dvh` height. `--bg-base` page background. No split columns, no side illustration.

**Brand header (above card):**
- `KiMiS` wordmark: `IBM Plex Mono`, `22px`, weight `600`, `--text-primary`. No gradient. No glow. The monospace typeface makes the name read as a system identifier, not a marketing asset.
- Tagline: `13px`, `--text-tertiary`. One line maximum.

**Auth card:**
- Width: `380px`. `background: --bg-surface`. `border: 1px solid --border-default`. `border-radius: 10px`. `padding: 32px`.
- No glassmorphism. No atmospheric radial gradient behind it.

**Form fields:**
- Label: `12px / 500 / --text-secondary`, above input, `margin-bottom: 6px`
- Input: `background: --bg-sunken`, `border: 1px solid --border-default`, `border-radius: 6px`, height `38px`, `padding: 0 12px`, `font-size: 14px`, `color: --text-primary`
- Focus: `border-color: #C2410C`, `box-shadow: 0 0 0 3px rgba(194,65,12,0.18)`. No indigo glow.
- Fields: Email, Password (with Lucide `Eye` show/hide toggle, `16px`, `--text-tertiary`)

**Remember me:**
- Checkbox + label inline. Checked state: burnt orange fill, `border-color: #C2410C`.

**Sign In button:**
- Full width. Height `40px`. `background: #C2410C`. `color: #FFFFFF`. `border-radius: 6px`. `14px / 500`.
- Hover: `background: #9A3412`. Transition `120ms ease`.
- No `translateY`. No box-shadow glow.

**Footer link:**
- "Don't have an account? Register" — `13px`, `--text-tertiary`. "Register" in `--text-accent`.

---

### 5.2 Register Page

#### Current state
`440px` card. Two-column rows for First/Last Name and Password/Confirm Password. Horizontal rule dividing "Account Credentials" from "Optional Information" (Job Title, Department, Profile Picture). Custom file upload.

#### Redesign

**Card:**
- Width: `440px`. Same surface/border/radius as Login. `padding: 36px`.

**Two-column rows:**
- Retain for: First Name / Last Name, and Password / Confirm Password.
- `display: grid; grid-template-columns: 1fr 1fr; gap: 12px`.
- Mobile (< 480px): stacks to single column.

**Section divider:**
- `border: none; border-top: 1px solid --border-subtle`.
- Section label: `11px / 500 / --text-tertiary / uppercase / letter-spacing: 0.07em`. E.g. `ACCOUNT CREDENTIALS` and `PROFILE — OPTIONAL`.

**Optional fields (Job Title, Department):**
- Same input treatment as Login.

**Profile picture upload:**
- Replace browser default file input entirely.
- Custom component: `80px × 80px` circle, `background: --bg-sunken`, `border: 1px dashed --border-default`. Centered Lucide `Camera` icon (`20px`, `--text-tertiary`) + "Upload photo" label (`12px`, `--text-tertiary`).
- On file selected: circular image preview replaces the icon. Small burnt orange `×` remove badge at top-right of the circle.

**Register button:** Full width, burnt orange filled, `40px` height. Same spec as Sign In.

**Footer link:** "Already have an account? Sign in" — same style as Login footer.

---

### 5.3 Dashboard

#### Current state
`display: flex`. Fixed `320px` sidebar (profile panel) on left. Fluid main content on right. Sidebar: large circular avatar with `3px` indigo ring + soft glow, user metadata in definition-list style, "Edit Profile" button, red-bordered "Logout" button.

#### Redesign

**Layout:** `display: flex; height: 100dvh; overflow: hidden`. Sidebar reduced to `280px`.

**Sidebar:**
- `background: --bg-surface`. `border-right: 1px solid --border-subtle`. `padding: 24px 20px`. Fixed height, internal scroll if needed.
- No glow on avatar. No indigo ring.

**Avatar:**
- `80px × 80px` circle. `border: 2px solid --border-default`.
- No image: initials in `IBM Plex Mono`, `18px / 600`, `--text-secondary`, `background: --bg-elevated`.
- With image: `object-fit: cover`, same border.

**User metadata:**
- Each field: label `11px / 500 / uppercase / --text-tertiary / letter-spacing: 0.07em`, value `14px / 400 / --text-primary`.
- `gap: 16px` between fields.
- Fields: Full name, Username, Email, Job Title, Department, Role badge.

**Action buttons:**
- "Edit Profile": ghost button, full width, `36px`. `border: 1px solid --border-default`. `color: --text-secondary`. Hover: `border-color: --border-strong`, `color: --text-primary`.
- "Logout": ghost button, full width, `36px`. `border: 1px solid rgba(239,68,68,0.3)`. `color: #F87171`. Hover: `background: rgba(239,68,68,0.08)`. A red-tinted ghost — not a filled red button.
- "Logout" anchored to bottom with `margin-top: auto`.

**Main content area:**
- `background: --bg-base`. `overflow-y: auto`. `padding: 32px`.
- Renders the Workspace Management View (Section 5.4).

---

### 5.4 Workspace Management View

Three major sections stacked vertically inside the main content area:

1. Workspace list
2. AI Knowledge Assistant
3. Tabbed content (Members · Articles · Workflows)

---

#### 5.4.1 Workspace List

**Current state:** Elevated cards with hover border color change.

**Redesign:**

Each workspace card: `background: --bg-surface`. `border: 1px solid --border-subtle`. `border-radius: 10px`. `padding: 16px 20px`. `display: flex; align-items: center; gap: 16px`.

Contents (left to right):
- Workspace icon: `36px × 36px` rounded square (`border-radius: 8px`), `background: --primary-muted`, Lucide `Layers` icon in `--primary-text`.
- Workspace name: `15px / 600 / --text-primary`
- Member count: `13px / --text-tertiary`
- Role badge: right side, `margin-left: auto`

Hover: `border-color: --border-strong`. No scale, no glow.

"New Workspace": ghost button above/below list — `+ New workspace`, Lucide `Plus` icon.

---

#### 5.4.2 AI Knowledge Assistant

**Current state:** Prominent glassmorphism container. Search bar + "Ask AI" button. Results with type badges and italicized keyword-highlighted snippets.

**Redesign:**

Remove glassmorphism entirely. The assistant is a functional tool, not a hero feature.

**Container:** `background: --bg-surface`. `border: 1px solid --border-subtle`. `border-radius: 10px`. `padding: 20px`.

**Search bar:**
- Text input (fills width) + "Ask AI" button (fixed right), in one connected row.
- Input: `background: --bg-sunken`. `border: 1px solid --border-default`. `border-radius: 6px 0 0 6px`. Height `40px`. Placeholder in `--text-tertiary`.
- "Ask AI" button: `background: #C2410C`. `color: #FFFFFF`. `border-radius: 0 6px 6px 0`. Height `40px`. `padding: 0 16px`. `13px / 500`.
- Input focus: `border-color: #C2410C`.

**Results:**
- Each result is a compact row inside the container, separated by `border-top: 1px solid --border-subtle`.
- Left: type badge (`Article` or `Node`).
- Center: result title (`14px / 500 / --text-primary`), context snippet below (`13px / --text-secondary`). Matched keywords: `color: --text-accent` (`#FB923C`). Not italic, not bold.
- Right: Lucide `ArrowUpRight`, `16px`, `--text-tertiary`. Entire row is clickable.
- Row hover: `background: --bg-elevated`.

**Section label above container:** `11px / 500 / --text-tertiary / uppercase` — `AI KNOWLEDGE ASSISTANT`.

---

#### 5.4.3 Tabs System (Members · Articles · Workflows)

**Current state:** Indigo-underlined active tab headers.

**Redesign:**

Tab bar: horizontal row. `border-bottom: 1px solid --border-subtle` runs full width below.

Each tab: `14px / 500`. `padding: 10px 16px`. `color: --text-tertiary`. No background.

Active tab: `color: --text-accent`. Underline: `2px solid #C2410C` on the bottom edge. The underline is the only active indicator.

Hover (inactive): `color: --text-secondary`. `120ms ease`.

---

#### 5.4.4 Members Tab

**Current state:** Table with lighter slate header row.

**Redesign:**

Full-width table. `border-collapse: collapse`.

**Header row:** `background: --bg-elevated`. `border-bottom: 1px solid --border-default`. Columns: `11px / 500 / uppercase / --text-tertiary / letter-spacing: 0.07em`.

Columns: Avatar + Name · Email · Role · Joined · Actions

**Data rows:**
- `border-bottom: 1px solid --border-subtle`. `padding: 12px 16px` per cell.
- Avatar: `28px` circle, initials if no image.
- Name: `14px / 500 / --text-primary`. Email below: `12px / --text-tertiary`.
- Role badge chip (spec below).
- Joined: `13px / --text-tertiary`.
- Actions: Lucide `MoreHorizontal`, `16px`, `--text-tertiary`. Dropdown on click.
- Row hover: `background: --bg-elevated`.

**Role Badges:**

| Role   | Background | Border    | Text      |
| ------ | ---------- | --------- | --------- |
| Viewer | `#18181B`  | `#3F3F46` | `#A1A1AA` |
| Editor | `#0C1A2E`  | `#1E3A5F` | `#60A5FA` |
| Admin  | `#1C0D00`  | `#7C2D12` | `#FB923C` |
| Owner  | `#C2410C`  | none      | `#FFFFFF` |

All badges: `border-radius: 4px`. `padding: 2px 8px`. `11px / 500`.

---

#### 5.4.5 Articles Tab

**Current state:** List of cards (title, author, timestamp). Markdown editor with `Fira Code` font and live "Markdown Preview" toggle.

**Redesign:**

**Article list:**

Each article is a row card: `background: --bg-surface`. `border: 1px solid --border-subtle`. `border-radius: 8px`. `padding: 14px 18px`. `margin-bottom: 8px`.

Contents:
- Title: `15px / 600 / --text-primary`
- Author: `20px` avatar circle + name, `13px / --text-secondary`
- Timestamp: `12px / --text-tertiary`, right-aligned
- Lucide `ChevronRight`, far right, `--text-tertiary`

Row hover: `border-color: --border-strong`.

"New Article" button: burnt orange ghost, top-right of tab content. Lucide `FilePlus` icon.

**Markdown Editor (article open):**

Top bar:
- Lucide `ArrowLeft` (`20px`) + article title (editable inline, `16px / 600 / --text-primary`)
- Right side: `Source | Preview` two-segment control, "Save" button (burnt orange primary, `32px`)

Editor surface:
- `background: --bg-sunken`. `border: 1px solid --border-subtle`. `border-radius: 8px`. `padding: 20px 24px`.
- `font-family: IBM Plex Mono`. `font-size: 14px`. `line-height: 1.8`. `color: --text-primary`.
- Replace `Fira Code` with `IBM Plex Mono` to stay within the design system.
- Cursor color: `#C2410C`.
- Minimum height: `400px`. Grows with content.

Preview surface:
- Same container, same padding.
- Rendered headings: `IBM Plex Sans / 600`. Body: `IBM Plex Sans / 400`. Code blocks: `IBM Plex Mono`, `background: #0D0D0D`, `border-radius: 4px`.
- Links: `color: #FB923C`.

---

#### 5.4.6 Workflows Tab

**Current state:** Visual map. Color-coded nodes (`Action=Blue`, `Decision=Orange`, `Start=Green`, `End=Red`). Directed arrows (`→`) with orange italicized condition labels.

**Redesign:**

The color-coded node logic is retained. Colors are revised to work within the dark system.

**Canvas surface:**
- `background: --bg-sunken`. `border: 1px solid --border-subtle`. `border-radius: 10px`.
- Dot-grid overlay: `1px` dots, `24px` spacing, `rgba(255,255,255,0.04)`.

**Node visual redesign:**

| Node Type | Border / Accent     | Background | Text color | Icon                  |
| --------- | ------------------- | ---------- | ---------- | --------------------- |
| Start     | `#166534` green     | `#052E16`  | `#4ADE80`  | Lucide `Play`         |
| Action    | `#1E3A5F` slate-blue| `#0C1A2E`  | `#60A5FA`  | Lucide `Zap`          |
| Decision  | `#78350F` amber     | `#1C1000`  | `#FCD34D`  | Lucide `GitBranch`    |
| End       | `#7F1D1D` red       | `#2D0000`  | `#F87171`  | Lucide `CheckCircle`  |

Each node: `border-radius: 8px`. `border: 1px solid` (color from table). `padding: 12px 16px`. `min-width: 160px`. Left accent bar: `3px solid` (lighter shade of border color). Node type label: `10px / 500 / uppercase` (color from table). Node title: `13px / 500 / --text-primary`.

**Edges (directed arrows):**
- Stroke: `rgba(255,255,255,0.2)`, `stroke-width: 1.5px`, smooth bezier.
- Arrowhead: same color.
- Condition labels (Decision node outputs): `11px / IBM Plex Mono / --text-tertiary`. Not orange, not italic. Placed midway along edge on a small `background: --bg-base` pill.

**Canvas toolbar (above canvas):**
- Row: "Add Node" dropdown (ghost + Lucide `Plus`) · Zoom controls (Lucide `ZoomOut` / percentage / Lucide `ZoomIn`) · Lucide `Maximize2` fit-to-screen.
- Ghost buttons, `32px` height, `--border-default` borders.

---

## 6. Shared Component Specifications

### 6.1 Buttons

| Variant      | Background              | Text               | Border                          | Usage                        |
| ------------ | ----------------------- | ------------------ | ------------------------------- | ---------------------------- |
| Primary      | `#C2410C`               | `#FFFFFF`          | none                            | Sign In, Save, Ask AI        |
| Primary hover| `#9A3412`               | `#FFFFFF`          | none                            |                              |
| Ghost        | transparent             | `--text-secondary` | `1px solid --border-default`    | Edit Profile, New Article    |
| Ghost hover  | `--bg-elevated`         | `--text-primary`   | `1px solid --border-strong`     |                              |
| Danger ghost | transparent             | `#F87171`          | `1px solid rgba(239,68,68,0.3)` | Logout                       |
| Danger hover | `rgba(239,68,68,0.08)`  | `#F87171`          | `1px solid rgba(239,68,68,0.5)` |                              |
| Disabled     | `--bg-elevated`         | `--text-tertiary`  | `1px solid --border-subtle`     | Any disabled state           |

Height: `38px` (default) · `32px` (compact) · `40px` (auth forms)
Padding: `0 16px` (default) · `0 12px` (compact)
Border radius: `6px` · Font: `14px / 500 / IBM Plex Sans` · Icon gap: `8px`
Active: `transform: scale(0.98)` · `80ms` · Transition: `120ms ease`

---

### 6.2 Form Inputs

Height `38px` · `background: --bg-sunken` · `border: 1px solid --border-default` · `border-radius: 6px`
Padding `0 12px` · `font-size: 14px / IBM Plex Sans / --text-primary`
Placeholder: `--text-tertiary`

Focus: `border-color: #C2410C` · `box-shadow: 0 0 0 3px rgba(194,65,12,0.18)`
Error: `border-color: #F87171` · error message `12px / #F87171` below field
Disabled: `opacity: 0.5` · `cursor: not-allowed`
Label: `12px / 500 / --text-secondary` · `margin-bottom: 6px` · always above field

---

### 6.3 Dropdowns / Context Menus

Container: `background: --bg-elevated` · `border: 1px solid --border-default` · `border-radius: 8px` · `padding: 4px` · `min-width: 160px`
`box-shadow: 0 8px 24px rgba(0,0,0,0.5)` — the one permitted shadow, for floating layers only.

Item: `padding: 8px 12px` · `14px / --text-secondary` · `border-radius: 4px`
Item hover: `background: --bg-surface` · `color: --text-primary`
Destructive item: `color: #F87171`. Hover: `background: rgba(239,68,68,0.08)`.

---

### 6.4 Type / Status Badges

`border-radius: 4px` · `padding: 2px 8px` · `11px / 500 / IBM Plex Sans`

| Badge   | Background | Border    | Text      |
| ------- | ---------- | --------- | --------- |
| Article | `#0C1A2E`  | `#1E3A5F` | `#60A5FA` |
| Node    | `#1C1000`  | `#78350F` | `#FCD34D` |
| Active  | `#052E16`  | `#166534` | `#4ADE80` |
| Draft   | `#1C1C1C`  | `#3F3F46` | `#A1A1AA` |

---

## 7. Interaction & Motion

### Timing

| Interaction             | Duration | Easing   |
| ----------------------- | -------- | -------- |
| Button hover / active   | 120ms    | ease     |
| Input focus ring        | 100ms    | ease     |
| Card border hover       | 150ms    | ease     |
| Tab underline slide     | 150ms    | ease-out |
| Dropdown open           | 150ms    | ease-out |
| Row hover background    | 100ms    | ease     |

### Micro-interactions

- **Save state:** Button text changes to "Saved ✓" for `1.5s` on success, then reverts. Color: `#4ADE80` text, same button bg.
- **Ask AI loading:** Animated `···` replacement inside the button while fetching. No spinner overlays.
- **Tab switch:** Active underline `width: 0 → 100%` slides in from left, `150ms ease-out`. Content cross-fades `100ms`.
- **Checkbox check:** Burnt orange fill slides in from bottom-left, `80ms`.
- **Node selection:** Border transitions from resting to `2px solid #C2410C`, `120ms`.

### What NOT to animate

- No `translateY` on button hover
- No glow or shadow pulsing
- No entrance animations on page load
- `prefers-reduced-motion`: all transitions collapse to opacity fades only

---

## 8. Responsive Behavior

| Breakpoint      | Behavior                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------ |
| `≥ 1024px`      | Full flex layout: `280px` sidebar + fluid content area                                     |
| `768px–1023px`  | Sidebar moves to top of page — avatar left, metadata inline, buttons right                |
| `< 768px`       | Sidebar collapses to avatar + name only. Full-width content below. Tabs horizontally scrollable. Auth cards: `95vw`. |
| `< 768px` Canvas| Workflow canvas: pan-only. Read-only mode with a top banner: "Open on desktop to edit workflows." |

---

## 9. Accessibility

- WCAG 2.1 AA minimum
- All interactive elements keyboard-navigable
- Focus rings visible on all interactive elements: `box-shadow: 0 0 0 3px rgba(194,65,12,0.18)`
- Icon-only buttons (MoreHorizontal, Eye toggle, canvas zoom) must have `aria-label`
- Role badges communicate role as text, not color alone
- Contrast: ≥ 4.5:1 for all 14px text, ≥ 3:1 for large text and UI components
- `--text-secondary` (`#A1A1AA`) must be verified against `--bg-surface` (`#161618`) — passes at ~5.2:1
- `role="tab"` and `aria-selected` on tab elements
- Markdown editor: `aria-label="Article content editor"`, `aria-multiline="true"`

---

## 10. What This Redesign Is Not Changing

The following must not be modified:

- Page routing and URL structure
- Authentication logic (remember me, session handling, registration fields)
- RBAC role definitions and permission enforcement
- Workspace creation and membership workflows
- Markdown parsing, rendering output, and editor behavior
- AI assistant query handling, ranking, and result structure
- Workflow node connection logic and data model
- All existing field names, labels, and copy
- The tab structure (Members · Articles · Workflows) and its order
- The sidebar-left / content-right layout of the Dashboard
- Responsive breakpoint behavior logic

---

## 11. Deliverables

### Design System
- [ ] Color token sheet — all tokens with hex values, dark mode only
- [ ] Typography specimen — all 8 scale steps, IBM Plex Sans + IBM Plex Mono
- [ ] Spacing scale reference
- [ ] Border radius and elevation model reference

### Component Library
- [ ] Buttons — all variants + states (default, hover, active, disabled)
- [ ] Form inputs — text, password with show/hide, checkbox, file upload, textarea
- [ ] Role badges — Viewer, Editor, Admin, Owner
- [ ] Type/status badges — Article, Node, Active, Draft
- [ ] Cards — workspace card, article row card, workflow node (all 4 types)
- [ ] Dropdown / context menu
- [ ] Tab bar — active, hover, inactive states
- [ ] Workflow canvas toolbar

### Screen Mockups (High-Fidelity, Dark Theme)
- [ ] Login Page
- [ ] Register Page
- [ ] Dashboard — full layout (sidebar + workspace content)
- [ ] Workspace Management — Members tab active
- [ ] Workspace Management — Articles tab, list view
- [ ] Workspace Management — Articles tab, Markdown editor open
- [ ] Workspace Management — Articles tab, Preview mode active
- [ ] Workspace Management — Workflows tab, canvas with nodes
- [ ] AI Assistant — results state (type badges + keyword highlights)

### Responsive Variants
- [ ] Dashboard at 768px (sidebar on top)
- [ ] Dashboard at 375px (collapsed sidebar, scrollable tabs)

### Interaction Notes
- [ ] Tab switch animation spec
- [ ] Node selection state on canvas
- [ ] Save button state transitions in Markdown editor
- [ ] AI assistant loading state
