# Design Language: QG do Mestre — Nuckturp | Plataforma para Mestres de RPG

> Extracted from `https://nuckturp.com.br` on May 28, 2026
> 615 elements analyzed

This document describes the complete design language of the website. It is structured for AI/LLM consumption — use it to faithfully recreate the visual design in any framework.

## Color Palette

### Primary Colors

| Role | Hex | RGB | HSL | Usage Count |
|------|-----|-----|-----|-------------|
| Primary | `#beff4d` | rgb(190, 255, 77) | hsl(82, 100%, 65%) | 108 |
| Secondary | `#c08aff` | rgb(192, 138, 255) | hsl(268, 100%, 77%) | 21 |
| Accent | `#77b30f` | rgb(119, 179, 15) | hsl(82, 85%, 38%) | 1 |

### Neutral Colors

| Hex | HSL | Usage Count |
|-----|-----|-------------|
| `#383838` | hsl(0, 0%, 22%) | 595 |
| `#f7ffe6` | hsl(79, 100%, 95%) | 287 |
| `#8c8c8c` | hsl(0, 0%, 55%) | 98 |
| `#000000` | hsl(0, 0%, 0%) | 84 |
| `#1f1f1f` | hsl(0, 0%, 12%) | 31 |
| `#0f0f0f` | hsl(0, 0%, 6%) | 10 |
| `#2e2e2e` | hsl(0, 0%, 18%) | 6 |
| `#f6f6f4` | hsl(60, 10%, 96%) | 1 |
| `#ffffff` | hsl(0, 0%, 100%) | 1 |

### Background Colors

Used on large-area elements: `#1a1a1a`, `#1f1f1f`, `#beff4d`, `#2e2e2e`

### Text Colors

Text color palette: `#000000`, `#f7ffe6`, `#8c8c8c`, `#0f0f0f`, `#beff4d`, `#f6f6f4`, `#ffffff`, `#ef4343`, `#c08aff`, `#8847d1`

### Gradients

```css
background-image: linear-gradient(rgba(26, 26, 26, 0.6), rgba(26, 26, 26, 0.8), rgb(26, 26, 26));
```

```css
background-image: linear-gradient(to right, rgba(26, 26, 26, 0.5), rgba(0, 0, 0, 0), rgba(26, 26, 26, 0.5));
```

```css
background-image: linear-gradient(to top, rgba(31, 31, 31, 0.4), rgba(0, 0, 0, 0));
```

```css
background-image: linear-gradient(rgba(31, 31, 31, 0.3), rgb(26, 26, 26));
```

### Full Color Inventory

| Hex | Contexts | Count |
|-----|----------|-------|
| `#383838` | border | 595 |
| `#f7ffe6` | text | 287 |
| `#beff4d` | background, text, border | 108 |
| `#8c8c8c` | text, background | 98 |
| `#000000` | text | 84 |
| `#1f1f1f` | background, border | 31 |
| `#ef4343` | background, border, text | 30 |
| `#8847d1` | background, text | 22 |
| `#c08aff` | background, text | 21 |
| `#0f0f0f` | text | 10 |
| `#2e2e2e` | background | 6 |
| `#f6f6f4` | text | 1 |
| `#77b30f` | background | 1 |
| `#ffffff` | text | 1 |

## Typography

### Font Families

- **Inter** — used for body (573 elements)
- **Space Grotesk** — used for all (42 elements)

### Type Scale

| Size (px) | Size (rem) | Weight | Line Height | Letter Spacing | Used On |
|-----------|------------|--------|-------------|----------------|---------|
| 96px | 6rem | 900 | 96px | -4.8px | h1, br, span |
| 36px | 2.25rem | 700 | 40px | normal | h2, span |
| 30px | 1.875rem | 700 | 36px | normal | h2, span |
| 24px | 1.5rem | 700 | 32px | normal | h3, h2 |
| 20px | 1.25rem | 400 | 28px | normal | p, span |
| 16px | 1rem | 400 | 24px | normal | html, head, meta, link |
| 14px | 0.875rem | 500 | 20px | normal | button, svg, line, p |
| 12px | 0.75rem | 400 | 16px | normal | nav, a, button, svg |
| 10px | 0.625rem | 700 | 15px | normal | div, span, svg, circle |

### Heading Scale

```css
h1 { font-size: 96px; font-weight: 900; line-height: 96px; }
h2 { font-size: 36px; font-weight: 700; line-height: 40px; }
h2 { font-size: 30px; font-weight: 700; line-height: 36px; }
h3 { font-size: 24px; font-weight: 700; line-height: 32px; }
h3 { font-size: 14px; font-weight: 500; line-height: 20px; }
h4 { font-size: 10px; font-weight: 700; line-height: 15px; }
```

### Body Text

```css
body { font-size: 12px; font-weight: 400; line-height: 16px; }
```

### Font Weights in Use

`400` (530x), `600` (40x), `500` (22x), `700` (19x), `900` (4x)

## Spacing

**Base unit:** 2px

| Token | Value | Rem |
|-------|-------|-----|
| spacing-2 | 2px | 0.125rem |
| spacing-96 | 96px | 6rem |
| spacing-128 | 128px | 8rem |
| spacing-152 | 152px | 9.5rem |
| spacing-192 | 192px | 12rem |
| spacing-256 | 256px | 16rem |

## Border Radii

| Label | Value | Count |
|-------|-------|-------|
| lg | 12px | 31 |
| lg | 16px | 14 |
| xl | 24px | 1 |
| full | 9999px | 24 |

## Box Shadows

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(132, 255, 0, 0.2) 0px 0px 20px 0px;
```

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.25) 0px 25px 50px -12px;
```

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px;
```

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px;
```

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(190, 255, 77, 0.05) 0px 25px 50px -12px;
```

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(190, 255, 77, 0.25) 0px 10px 15px -3px, rgba(190, 255, 77, 0.25) 0px 4px 6px -4px;
```

## CSS Custom Properties

### Colors

```css
--foreground: 0 0% 12%;
--card: 60 10% 99%;
--card-foreground: 0 0% 12%;
--popover: 60 10% 99%;
--popover-foreground: 0 0% 12%;
--primary: 82 85% 38%;
--primary-foreground: 0 0% 100%;
--secondary: 268 60% 55%;
--secondary-foreground: 0 0% 100%;
--muted: 60 10% 92%;
--muted-foreground: 0 0% 42%;
--accent: 82 85% 38%;
--accent-foreground: 0 0% 100%;
--destructive: 0 72% 51%;
--destructive-foreground: 0 0% 100%;
--border: 60 5% 85%;
--ring: 82 85% 38%;
--sidebar-foreground: 0 0% 12%;
--sidebar-primary: 82 85% 38%;
--sidebar-primary-foreground: 0 0% 100%;
--sidebar-accent: 60 10% 93%;
--sidebar-accent-foreground: 0 0% 12%;
--sidebar-border: 60 5% 88%;
--sidebar-ring: 82 85% 38%;
--warning-foreground: 0 0% 100%;
--success-foreground: 0 0% 100%;
--info-foreground: 0 0% 100%;
--caution-foreground: 0 0% 100%;
--tw-ring-offset-shadow: 0 0 #0000;
--tw-ring-shadow: 0 0 #0000;
--tw-ring-inset: ;
--tw-border-spacing-x: 0;
--tw-ring-color: rgb(59 130 246 / .5);
--tw-ring-offset-color: #fff;
--tw-ring-offset-width: 0px;
--tw-shadow-colored: 0 0 #0000;
--tw-border-spacing-y: 0;
```

### Spacing

```css
--tw-numeric-spacing: ;
--tw-contain-size: ;
```

### Shadows

```css
--tw-drop-shadow: ;
--tw-shadow: 0 0 #0000;
```

### Radii

```css
--radius: .75rem;
```

### Other

```css
--background: 60 10% 96%;
--input: 60 5% 85%;
--sidebar-background: 60 10% 98%;
--cyber-lime: 82 85% 38%;
--vapor-violet: 268 60% 55%;
--noir-void: 60 10% 96%;
--grid-gray: 60 5% 80%;
--warning: 45 93% 47%;
--success: 152 69% 31%;
--info: 213 94% 48%;
--caution: 25 95% 53%;
--tw-backdrop-sepia: ;
--tw-sepia: ;
--tw-ordinal: ;
--tw-backdrop-saturate: ;
--tw-contain-style: ;
--tw-backdrop-invert: ;
--tw-brightness: ;
--tw-backdrop-grayscale: ;
--tw-hue-rotate: ;
--tw-scale-y: 1;
--tw-pan-y: ;
--tw-backdrop-contrast: ;
--tw-backdrop-brightness: ;
--tw-pan-x: ;
--tw-translate-y: 0;
--tw-rotate: 0;
--tw-contrast: ;
--tw-skew-x: 0;
--tw-backdrop-blur: ;
--tw-translate-x: 0;
--tw-gradient-via-position: ;
--tw-saturate: ;
--tw-scroll-snap-strictness: proximity;
--tw-grayscale: ;
--tw-scale-x: 1;
--tw-backdrop-hue-rotate: ;
--tw-gradient-to-position: ;
--tw-numeric-fraction: ;
--tw-skew-y: 0;
--tw-slashed-zero: ;
--tw-blur: ;
--tw-invert: ;
--tw-backdrop-opacity: ;
--tw-gradient-from-position: ;
--tw-numeric-figure: ;
--tw-pinch-zoom: ;
--tw-contain-paint: ;
--tw-contain-layout: ;
```

### Semantic

```css
success: [object Object];
warning: [object Object];
error: [object Object];
info: [object Object];
```

## Breakpoints

| Name | Value | Type |
|------|-------|------|
| sm | 600px | max-width |
| sm | 640px | min-width |
| md | 768px | min-width |
| lg | 1024px | min-width |
| xl | 1280px | min-width |
| 1400px | 1400px | min-width |

## Transitions & Animations

**Easing functions:** `[object Object]`, `[object Object]`

**Durations:** `0.15s`, `0.5s`, `0.7s`, `0.1s`, `0.2s`, `0.3s`, `0.4s`

### Common Transitions

```css
transition: all;
transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1);
transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), text-decoration-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), fill 0.15s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.15s cubic-bezier(0.4, 0, 0.2, 1);
transition: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
transition: opacity 0.7s ease-out, transform 0.7s ease-out;
transition: opacity 0.7s ease-out 0.1s, transform 0.7s ease-out 0.1s;
transition: opacity 0.7s ease-out 0.2s, transform 0.7s ease-out 0.2s;
transition: opacity 0.7s ease-out 0.3s, transform 0.7s ease-out 0.3s;
transition: opacity 0.7s ease-out 0.4s, transform 0.7s ease-out 0.4s;
```

### Keyframe Animations

**bell-ring**
```css
@keyframes bell-ring {
  0% { transform: rotate(0deg); }
  10% { transform: rotate(14deg); }
  20% { transform: rotate(-12deg); }
  30% { transform: rotate(10deg); }
  40% { transform: rotate(-8deg); }
  50% { transform: rotate(6deg); }
  60% { transform: rotate(-4deg); }
  70% { transform: rotate(2deg); }
  80% { transform: rotate(-1deg); }
  100% { transform: rotate(0deg); }
}
```

**fade-in**
```css
@keyframes fade-in {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0px); }
}
```

**fade-up**
```css
@keyframes fade-up {
  0% { opacity: 0; transform: translateY(30px); }
  100% { opacity: 1; transform: translateY(0px); }
}
```

**ping**
```css
@keyframes ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}
```

**pulse**
```css
@keyframes pulse {
  50% { opacity: 0.5; }
}
```

**pulse-lime**
```css
@keyframes pulse-lime {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

**scale-up**
```css
@keyframes scale-up {
  0% { opacity: 0; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}
```

**spin**
```css
@keyframes spin {
  100% { transform: rotate(360deg); }
}
```

**enter**
```css
@keyframes enter {
  0% { opacity: var(--tw-enter-opacity, 1); transform: translate3d(var(--tw-enter-translate-x, 0),var(--tw-enter-translate-y, 0),0) scale3d(var(--tw-enter-scale, 1),var(--tw-enter-scale, 1),var(--tw-enter-scale, 1)) rotate(var(--tw-enter-rotate, 0)); }
}
```

**exit**
```css
@keyframes exit {
  100% { opacity: var(--tw-exit-opacity, 1); transform: translate3d(var(--tw-exit-translate-x, 0),var(--tw-exit-translate-y, 0),0) scale3d(var(--tw-exit-scale, 1),var(--tw-exit-scale, 1),var(--tw-exit-scale, 1)) rotate(var(--tw-exit-rotate, 0)); }
}
```

## Component Patterns

Detected UI component patterns and their most common styles:

### Buttons (8 instances)

```css
.button {
  background-color: rgb(190, 255, 77);
  color: rgb(15, 15, 15);
  font-size: 12px;
  font-weight: 500;
  padding-top: 0px;
  padding-right: 40px;
  border-radius: 12px;
}
```

### Cards (23 instances)

```css
.card {
  background-color: rgb(31, 31, 31);
  border-radius: 16px;
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px;
  padding-top: 0px;
  padding-right: 0px;
}
```

### Links (32 instances)

```css
.link {
  color: rgb(247, 255, 230);
  font-size: 16px;
  font-weight: 400;
}
```

### Navigation (1 instances)

```css
.navigatio {
  color: rgb(140, 140, 140);
  padding-top: 0px;
  padding-bottom: 0px;
  padding-left: 0px;
  padding-right: 0px;
  position: static;
}
```

### Footer (1 instances)

```css
.foote {
  color: rgb(247, 255, 230);
  padding-top: 0px;
  padding-bottom: 0px;
  font-size: 16px;
}
```

### Dropdowns (1 instances)

```css
.dropdown {
  border-radius: 0px;
  border-color: rgb(56, 56, 56);
  padding-top: 0px;
}
```

### Badges (1 instances)

```css
.badge {
  color: rgba(140, 140, 140, 0.5);
  font-size: 16px;
  font-weight: 400;
  padding-top: 0px;
  padding-right: 0px;
  border-radius: 0px;
}
```

## Component Clusters

Reusable component instances grouped by DOM structure and style similarity:

### Button — 5 instances, 4 variants

**Variant 1** (1 instance)

```css
  background: rgba(0, 0, 0, 0);
  color: rgb(140, 140, 140);
  padding: 0px 12px 0px 12px;
  border-radius: 12px;
  border: 0px solid rgb(56, 56, 56);
  font-size: 12px;
  font-weight: 500;
```

**Variant 2** (1 instance)

```css
  background: rgb(190, 255, 77);
  color: rgb(15, 15, 15);
  padding: 0px 40px 0px 40px;
  border-radius: 12px;
  border: 0px solid rgb(56, 56, 56);
  font-size: 16px;
  font-weight: 700;
```

**Variant 3** (1 instance)

```css
  background: rgb(26, 26, 26);
  color: rgb(247, 255, 230);
  padding: 0px 40px 0px 40px;
  border-radius: 12px;
  border: 1px solid rgb(56, 56, 56);
  font-size: 16px;
  font-weight: 500;
```

**Variant 4** (2 instances)

```css
  background: rgb(26, 26, 26);
  color: rgb(247, 255, 230);
  padding: 0px 12px 0px 12px;
  border-radius: 9999px;
  border: 1px solid rgb(56, 56, 56);
  font-size: 12px;
  font-weight: 500;
```

### Button — 1 instance, 1 variant

**Variant 1** (1 instance)

```css
  background: rgb(190, 255, 77);
  color: rgb(15, 15, 15);
  padding: 0px 20px 0px 20px;
  border-radius: 9999px;
  border: 0px solid rgb(56, 56, 56);
  font-size: 12px;
  font-weight: 500;
```

### Card — 1 instance, 1 variant

**Variant 1** (1 instance)

```css
  background: rgba(31, 31, 31, 0.5);
  color: rgb(247, 255, 230);
  padding: 24px 24px 24px 24px;
  border-radius: 24px;
  border: 1px solid rgba(56, 56, 56, 0.3);
  font-size: 16px;
  font-weight: 400;
```

### Card — 1 instance, 1 variant

**Variant 1** (1 instance)

```css
  background: rgba(0, 0, 0, 0);
  color: rgb(247, 255, 230);
  padding: 0px 0px 0px 0px;
  border-radius: 0px;
  border: 0px solid rgb(56, 56, 56);
  font-size: 16px;
  font-weight: 400;
```

### Card — 2 instances, 1 variant

**Variant 1** (2 instances)

```css
  background: rgba(31, 31, 31, 0.3);
  color: rgb(247, 255, 230);
  padding: 80px 0px 80px 0px;
  border-radius: 0px;
  border: 1px 0px 0px solid rgba(56, 56, 56, 0.2);
  font-size: 16px;
  font-weight: 400;
```

### Card — 9 instances, 1 variant

**Variant 1** (9 instances)

```css
  background: rgb(31, 31, 31);
  color: rgb(247, 255, 230);
  padding: 0px 0px 0px 0px;
  border-radius: 16px;
  border: 1px solid rgba(56, 56, 56, 0.6);
  font-size: 16px;
  font-weight: 400;
```

### Link — 6 instances, 1 variant

**Variant 1** (6 instances)

```css
  background: rgb(31, 31, 31);
  color: rgb(247, 255, 230);
  padding: 0px 0px 0px 0px;
  border-radius: 12px;
  border: 1px solid rgba(56, 56, 56, 0.6);
  font-size: 16px;
  font-weight: 400;
```

### Card — 1 instance, 1 variant

**Variant 1** (1 instance)

```css
  background: rgba(31, 31, 31, 0.3);
  color: rgb(247, 255, 230);
  padding: 96px 0px 96px 0px;
  border-radius: 0px;
  border: 1px 0px 0px solid rgba(56, 56, 56, 0.2);
  font-size: 16px;
  font-weight: 400;
```

### Card — 1 instance, 1 variant

**Variant 1** (1 instance)

```css
  background: rgba(0, 0, 0, 0);
  color: rgb(247, 255, 230);
  padding: 0px 0px 0px 0px;
  border-radius: 0px;
  border: 1px 0px 0px solid rgba(56, 56, 56, 0.4);
  font-size: 16px;
  font-weight: 400;
```

### Button — 1 instance, 1 variant

**Variant 1** (1 instance)

```css
  background: rgb(190, 255, 77);
  color: rgb(15, 15, 15);
  padding: 0px 20px 0px 20px;
  border-radius: 9999px;
  border: 0px solid rgb(56, 56, 56);
  font-size: 12px;
  font-weight: 500;
```

## Layout System

**6 grid containers** and **87 flex containers** detected.

### Container Widths

| Max Width | Padding |
|-----------|---------|
| 100% | 0px |
| 1280px | 24px |
| 448px | 24px |
| 1024px | 24px |
| 768px | 0px |
| 896px | 24px |
| 1152px | 24px |

### Grid Column Patterns

| Columns | Usage Count |
|---------|-------------|
| 3-column | 3x |
| 12-column | 1x |
| 2-column | 1x |
| 4-column | 1x |

### Grid Templates

```css
grid-template-columns: 58.6562px 58.6562px 58.6562px 58.6562px 58.6562px 58.6562px 58.6562px 58.6562px 58.6562px 58.6562px 58.6562px 58.6562px;
gap: 48px;
grid-template-columns: 312px 312px 312px;
gap: 20px;
grid-template-columns: 312px 312px 312px;
gap: 20px;
grid-template-columns: 246px 246px 246px 246px;
gap: 40px;
grid-template-columns: 376px 376px;
gap: 16px;
```

### Flex Patterns

| Direction/Wrap | Count |
|----------------|-------|
| column/nowrap | 4x |
| row/nowrap | 81x |
| row-reverse/nowrap | 2x |

**Gap values:** `10px`, `12px`, `16px`, `20px`, `24px`, `32px`, `40px`, `48px`, `4px`, `56px`, `6px`, `8px`

## Responsive Design

### Viewport Snapshots

| Viewport | Body Font | Nav Visible | Max Columns | Hamburger | Page Height |
|----------|-----------|-------------|-------------|-----------|-------------|
| mobile (375px) | 16px | No | 1 | No | 8801px |
| tablet (768px) | 16px | Yes | 3 | No | 8178px |
| desktop (1280px) | 16px | Yes | 12 | No | 6243px |
| wide (1920px) | 16px | Yes | 12 | No | 6243px |

### Breakpoint Changes

**375px → 768px** (mobile → tablet):
- H1 size: `36px` → `60px`
- Nav visibility: `hidden` → `visible`
- Max grid columns: `1` → `3`
- Page height: `8801px` → `8178px`

**768px → 1280px** (tablet → desktop):
- H1 size: `60px` → `96px`
- Max grid columns: `3` → `12`
- Page height: `8178px` → `6243px`

## Interaction States

### Button States

**"Entrar"**
```css
/* Hover */
color: rgb(140, 140, 140) → rgb(243, 251, 227);
background-color: rgba(0, 0, 0, 0) → rgba(190, 255, 76, 0.97);
outline: rgb(140, 140, 140) none 3px → rgb(243, 251, 227) none 3px;
```
```css
/* Focus */
color: rgb(140, 140, 140) → rgb(247, 255, 230);
background-color: rgba(0, 0, 0, 0) → rgb(190, 255, 77);
box-shadow: none → rgba(26, 26, 26, 0.92) 0px 0px 0px 1.84155px, rgba(190, 255, 76, 0.92) 0px 0px 0px 3.6831px, rgba(0, 0, 0, 0) 0px 0px 0px 0px;
outline: rgb(140, 140, 140) none 3px → rgba(247, 255, 230, 0.08) solid 2px;
```

**"Criar conta grátisEntrar"**
```css
/* Hover */
background-color: rgb(190, 255, 77) → rgba(190, 255, 76, 0.918);
```
```css
/* Focus */
background-color: rgb(190, 255, 77) → rgba(190, 255, 77, 0.9);
box-shadow: none → rgba(26, 26, 26, 0.92) 0px 0px 0px 1.84129px, rgba(190, 255, 76, 0.92) 0px 0px 0px 3.68259px, rgba(0, 0, 0, 0) 0px 0px 0px 0px;
outline: rgb(15, 15, 15) none 3px → rgba(15, 15, 15, 0.08) solid 2px;
```

**"Comece Grátis Agora"**
```css
/* Hover */
background-color: rgb(190, 255, 77) → rgba(190, 255, 76, 0.918);
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(132, 255, 0, 0.2) 0px 0px 20px 0px → rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(132, 255, 0, 0.37) 0px 0px 28.3716px 0px;
```
```css
/* Focus */
background-color: rgb(190, 255, 77) → rgba(190, 255, 77, 0.9);
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(132, 255, 0, 0.2) 0px 0px 20px 0px → rgba(26, 26, 26, 0.97) 0px 0px 0px 1.93785px, rgba(190, 255, 76, 0.97) 0px 0px 0px 3.87571px, rgba(132, 255, 0, 0.4) 0px 0px 29.9754px 0px;
outline: rgb(15, 15, 15) none 3px → rgba(15, 15, 15, 0.03) solid 2px;
```

### Link Hover

```css
opacity: 1 → 0.806249;
```

## Accessibility (WCAG 2.1)

**Overall Score: 100%** — 5 passing, 0 failing color pairs

### Passing Color Pairs

| Foreground | Background | Ratio | Level |
|------------|------------|-------|-------|
| `#0f0f0f` | `#beff4d` | 16.07:1 | AAA |
| `#f7ffe6` | `#1a1a1a` | 16.91:1 | AAA |

## Design System Score

**Overall: 91/100 (Grade: A)**

| Category | Score |
|----------|-------|
| Color Discipline | 92/100 |
| Typography Consistency | 90/100 |
| Spacing System | 100/100 |
| Shadow Consistency | 90/100 |
| Border Radius Consistency | 100/100 |
| Accessibility | 100/100 |
| CSS Tokenization | 100/100 |

**Strengths:** Tight, disciplined color palette, Consistent typography system, Well-defined spacing scale, Clean elevation system, Consistent border radii, Strong accessibility compliance, Good CSS variable tokenization

**Issues:**
- 48 !important rules — prefer specificity over overrides
- 90% of CSS is unused — consider purging
- 2410 duplicate CSS declarations

## Gradients

**4 unique gradients** detected.

| Type | Direction | Stops | Classification |
|------|-----------|-------|----------------|
| linear | — | 3 | bold |
| linear | to right | 3 | bold |
| linear | to top | 2 | brand |
| linear | — | 2 | brand |

```css
background: linear-gradient(rgba(26, 26, 26, 0.6), rgba(26, 26, 26, 0.8), rgb(26, 26, 26));
background: linear-gradient(to right, rgba(26, 26, 26, 0.5), rgba(0, 0, 0, 0), rgba(26, 26, 26, 0.5));
background: linear-gradient(to top, rgba(31, 31, 31, 0.4), rgba(0, 0, 0, 0));
background: linear-gradient(rgba(31, 31, 31, 0.3), rgb(26, 26, 26));
```

## Z-Index Map

**4 unique z-index values** across 3 layers.

| Layer | Range | Elements |
|-------|-------|----------|
| dropdown | 100,100 | ol.f.i.x.e.d. .t.o.p.-.0. .z.-.[.1.0.0.]. .f.l.e.x. .m.a.x.-.h.-.s.c.r.e.e.n. .w.-.f.u.l.l. .f.l.e.x.-.c.o.l.-.r.e.v.e.r.s.e. .p.-.4. .s.m.:.b.o.t.t.o.m.-.0. .s.m.:.r.i.g.h.t.-.0. .s.m.:.t.o.p.-.a.u.t.o. .s.m.:.f.l.e.x.-.c.o.l. .m.d.:.m.a.x.-.w.-.[.4.2.0.p.x.] |
| sticky | 10,50 | div.r.e.l.a.t.i.v.e. .z.-.1.0. .p.-.6. .b.g.-.c.a.r.d./.5.0. .b.a.c.k.d.r.o.p.-.b.l.u.r.-.x.l. .b.o.r.d.e.r. .b.o.r.d.e.r.-.b.o.r.d.e.r./.3.0. .r.o.u.n.d.e.d.-.3.x.l. .s.h.a.d.o.w.-.2.x.l. .r.o.t.a.t.e.-.2. .h.o.v.e.r.:.r.o.t.a.t.e.-.0. .t.r.a.n.s.i.t.i.o.n.-.t.r.a.n.s.f.o.r.m. .d.u.r.a.t.i.o.n.-.5.0.0. .m.a.x.-.w.-.m.d. .m.x.-.a.u.t.o. .x.l.:.m.l.-.a.u.t.o. .x.l.:.m.r.-.0, header.s.t.i.c.k.y. .t.o.p.-.0. .z.-.5.0. .b.g.-.b.a.c.k.g.r.o.u.n.d./.8.0. .b.a.c.k.d.r.o.p.-.b.l.u.r.-.x.l. .b.o.r.d.e.r.-.b. .b.o.r.d.e.r.-.b.o.r.d.e.r./.4.0 |
| base | -10,-10 | div.a.b.s.o.l.u.t.e. .t.o.p.-.1./.2. .l.e.f.t.-.1./.2. .-.t.r.a.n.s.l.a.t.e.-.x.-.1./.2. .-.t.r.a.n.s.l.a.t.e.-.y.-.1./.2. .w.-.f.u.l.l. .h.-.f.u.l.l. .b.g.-.p.r.i.m.a.r.y./.2.0. .b.l.u.r.-.[.1.2.0.p.x.]. .r.o.u.n.d.e.d.-.f.u.l.l. .-.z.-.1.0 |

## SVG Icons

**19 unique SVG icons** detected. Dominant style: **outlined**.

| Size Class | Count |
|------------|-------|
| xs | 1 |
| sm | 6 |
| md | 12 |

**Icon colors:** `currentColor`

## Font Files

| Family | Source | Weights | Styles |
|--------|--------|---------|--------|
| Inter | google-fonts | 300, 400, 500, 600, 700, 800, 900 | normal |
| Space Grotesk | google-fonts | 400, 500, 600, 700 | normal |

**Google Fonts URL:** `https://fonts.googleapis.com/`

## Image Style Patterns

| Pattern | Count | Key Styles |
|---------|-------|------------|
| general | 10 | objectFit: cover, borderRadius: 0px, shape: square |
| thumbnail | 2 | objectFit: fill, borderRadius: 0px, shape: square |
| hero | 1 | objectFit: cover, borderRadius: 0px, shape: square |
| gallery | 1 | objectFit: cover, borderRadius: 0px, shape: square |

**Aspect ratios:** 16:9 (10x), 3:2 (3x), 3:4 (1x)

## Motion Language

**Feel:** mixed · **Scroll-linked:** yes

### Duration Tokens

| name | value | ms |
|---|---|---|
| `xs` | `100ms` | 100 |
| `sm` | `200ms` | 200 |
| `md` | `300ms` | 300 |
| `lg` | `500ms` | 500 |

### Easing Families

- **custom** (57 uses) — `cubic-bezier(0.4, 0, 0.2, 1)`
- **ease-in-out** (32 uses) — `ease`

### Keyframes In Use

| name | kind | properties | uses |
|---|---|---|---|
| `fade-in` | slide-y | opacity, transform | 2 |
| `fade-up` | slide-y | opacity, transform | 3 |
| `pulse-lime` | fade | opacity | 1 |

## Component Anatomy

### card — 15 instances

**Slots:** description, media
**Variants:** primary
**Sizes:** xl · sm

| variant | count | sample label |
|---|---|---|
| primary | 9 | Gestão de Campanhas

Organize campanhas, |
| default | 6 | CAMPANHAS ILIMITADAS
DIÁRIO DO MESTRE |

### button — 7 instances

**Slots:** label, icon
**Variants:** outline
**Sizes:** medium · sm

### link — 6 instances

**Variants:** primary
**Sizes:** xl

## Brand Voice

**Tone:** neutral · **Pronoun:** third-person · **Headings:** Title Case (balanced)

### Top CTA Verbs

- **comece** (2)
- **para** (2)
- **lovecraft** (2)
- **entrar** (1)
- **criar** (1)
- **veja** (1)
- **ver** (1)
- **chamado** (1)

### Button Copy Patterns

- "comece grátis agora" (2×)
- "entrar" (1×)
- "criar conta grátis" (1×)
- "veja como funciona" (1×)
- "ver todas" (1×)
- "para mestres
o roteiro que derreteu

descubra como lidar com o improviso no rpg quando os jogadores ignoram seu roteiro e como a técnica de preparar situações p" (1×)
- "chamado de cthulhu
usando sorte em chamado de cthulhu

aprenda como funciona a sorte em chamado de cthulhu

22 abr 2026
6 min de leitura" (1×)
- "mulheres no rpg
o amadurecimento do mestre: neurodivergência, carga mental e o desafio da campanha contínua

uma análise autocrítica de uma jogadora passando po" (1×)
- "lovecraft
quando a previsibilidade arruína o horror

entenda como a previsibilidade pode quebrar a imersão em campanhas de rpg de terror e aprenda a usar a expe" (1×)
- "para mestres
usar clichês não é falta de criatividade

descubra por que usar clichês no rpg é uma estratégia inteligente de narrativa. aprenda a subverter expec" (1×)

### Sample Headings

> Pare de
Improvisar
a preparação.
> Se você é mestre, já passou por isso
> 9 ferramentas. Zero caos.
> Gestão de Campanhas
> Jogadores & Personagens
> Diário do Mestre
> Agenda de Sessões
> Seu QG. Tudo num relance.
> Dezenas de sessões. Zero bagunça.
> Agenda inteligente para mestres ocupados

## Page Intent

**Type:** `landing` (confidence 0.45)
**Description:** O QG definitivo do mestre de RPG. Organize campanhas, sessões, notas e ideias de D&D, Pathfinder e qualquer sistema de RPG de mesa. Gratuito.

## Section Roles

Reading order (top→bottom): content → hero → content → testimonial → testimonial → content → content → nav → nav → hero → footer

| # | Role | Heading | Confidence |
|---|------|---------|------------|
| 0 | content | — | 0.3 |
| 1 | nav | — | 0.4 |
| 2 | nav | — | 0.9 |
| 3 | hero | Pare de
Improvisar
a preparação. | 0.85 |
| 4 | content | Se você é mestre, já passou por isso | 0.3 |
| 5 | testimonial | 9 ferramentas. Zero caos. | 0.8 |
| 6 | testimonial | Seu QG. Tudo num relance. | 0.8 |
| 7 | content | Por que o QG do Mestre é diferente | 0.3 |
| 8 | content | Direto do QG | 0.3 |
| 9 | hero | Sua próxima sessão merece preparação épica | 0.4 |
| 10 | footer | — | 0.95 |

## Material Language

**Label:** `flat` (confidence 0)

| Metric | Value |
|--------|-------|
| Avg saturation | 0.254 |
| Shadow profile | soft |
| Avg shadow blur | 0px |
| Max radius | 9999px |
| backdrop-filter in use | no |
| Gradients | 4 |

## Imagery Style

**Label:** `photography` (confidence 0.5)
**Counts:** total 14, svg 0, icon 2, screenshot-like 4, photo-like 12
**Dominant aspect:** landscape
**Radius profile on images:** square

## Component Library

**Detected:** `shadcn/ui` (confidence 0.65)

Evidence:
- shadcn css tokens

Also considered: tailwind-ui (0.54), tailwindcss (0.3)

## Component Screenshots

11 retina crops written to `screenshots/`. Index: `*-screenshots.json`.

| Cluster | Variant | Size (px) | File |
|---------|---------|-----------|------|
| button--outline--medium | 0 | 81 × 36 | `screenshots/button-outline-medium-0.png` |
| button--outline--medium | 1 | 139 × 36 | `screenshots/button-outline-medium-1.png` |
| button--outline--medium | 2 | 261 × 56 | `screenshots/button-outline-medium-2.png` |
| button--outline--sm | 0 | 274 × 56 | `screenshots/button-outline-sm-0.png` |
| button--outline--sm | 1 | 245 × 44 | `screenshots/button-outline-sm-1.png` |
| card--default--xl | 0 | 467 × 563 | `screenshots/card-default-xl-0.png` |
| card--default | 0 | 413 × 509 | `screenshots/card-default-0.png` |
| card--default | 1 | 1280 × 426 | `screenshots/card-default-1.png` |
| card--default--sm | 0 | 1280 × 986 | `screenshots/card-default-sm-0.png` |
| card--default--sm | 1 | 1280 × 396 | `screenshots/card-default-sm-1.png` |
| card--default--sm | 2 | 1280 × 445 | `screenshots/card-default-sm-2.png` |

Full-page: `screenshots/full-page.png`

## Quick Start

To recreate this design in a new project:

1. **Install fonts:** Add `Inter` from Google Fonts or your font provider
2. **Import CSS variables:** Copy `variables.css` into your project
3. **Tailwind users:** Use the generated `tailwind.config.js` to extend your theme
4. **Design tokens:** Import `design-tokens.json` for tooling integration
