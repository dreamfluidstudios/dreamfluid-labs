---
name: Dreamfluid Labs
description: An engine for vision — Dreamfluid's central R&D and incubation hub
colors:
  deep-space-black: "#0D0D0D"
  midnight-veil: "#0F1013"
  obsidian-black: "#151515"
  phantom-black: "#1A1A1A"
  carbon-gray: "#222222"
  graphite-gray: "#303030"
  silver-veil: "#6C6E71"
  clarity-white: "#FAFAFA"
  canvas-white: "#F5F5F5"
  dreamfluid-blue: "#1A3FBC"
  dreamfluid-violet: "#6B23B1"
  starlight-blue: "#0A6CFF"
  nebula-violet: "#9C28F1"
  aqua-cyan: "#00BEFF"
  electric-violet: "#AF28FF"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, Times New Roman, serif"
    fontWeight: 600
    fontStyle: "normal"
    letterSpacing: "-0.045em"
    lineHeight: 0.98
  expression:
    fontFamily: "Cormorant Garamond, Georgia, Times New Roman, serif"
    fontWeight: 500
    fontStyle: "italic"
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter, Helvetica Neue, Arial, sans-serif"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Space Mono, Courier New, monospace"
    fontWeight: 700
    letterSpacing: "0.12em"
    fontSize: "0.75rem"
rounded:
  pill: "999px"
  sm: "14px"
  md: "20px"
  lg: "28px"
spacing:
  section: "clamp(2rem, 7vw, 5rem)"
  card: "1.25rem"
components:
  button-primary:
    backgroundColor: "{colors.starlight-blue}"
    textColor: "{colors.clarity-white}"
    rounded: "{rounded.pill}"
  button-primary-active:
    backgroundColor: "{colors.dreamfluid-blue}"
    textColor: "{colors.clarity-white}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.nebula-violet}"
    textColor: "{colors.clarity-white}"
    rounded: "{rounded.pill}"
  button-secondary-active:
    backgroundColor: "{colors.dreamfluid-violet}"
    textColor: "{colors.clarity-white}"
    rounded: "{rounded.pill}"
  eyebrow-chip:
    backgroundColor: "{colors.starlight-blue}"
    textColor: "{colors.aqua-cyan}"
    rounded: "{rounded.pill}"
    typography: "{typography.label}"
  card-base:
    backgroundColor: "{colors.obsidian-black}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card}"
---

# Design System: Dreamfluid Labs

## Overview

**Creative North Star: "The Dream Engine's Workshop"**

Dreamfluid's brand thesis splits into two halves: "the substance of dreams" (Dreamfluid Studios and Dreamfluid Music — the narrative, cinematic, felt output) and "the fuel for creativity" (Dreamfluid Technology and, centrally, Dreamfluid Labs — the engine itself). Labs is not backstage support for Studios' public output; it *is* the literal engine for vision — Dreamfluid's central R&D, experimentation, and incubation hub, building the internal and public-facing creative tools that power creation across every division. Where Studios and Music carry the poetic, narrative half of the brand voice, Labs carries the fuel half: experimental, systematic, future-facing, and squarely about working tools rather than finished stories. The system stays recognizably Dreamfluid (the same deep-space palette, the same starlight-blue/nebula-violet glow, the same restraint) but leans its type and texture toward the mechanism rather than the myth — Inter and Space Mono do the daily work, and Cormorant Garamond is held in reserve for the rare moment a piece of Labs work earns a vision-level statement.

The overall Dreamfluid voice is cosmic, poetic, and cinematic — never clinical — and Labs inherits that atmosphere rather than opting out of it. Depth comes from ambient gradient glow and layered dark tones, not from literal texture gimmicks; the studio's own guidance explicitly favors a soft grain/noise field or a faint structural grid-line overlay (see Elevation & Depth) over decorative background patterns. Public tone across all Dreamfluid surfaces favors mystique through restraint and curation over exhaustive explanation — Labs should read as evidence of real, ongoing work, not a marketing pitch for it.

**Key Characteristics:**
- Dark-first, deep-space palette with two ambient brand glows (starlight blue, nebula violet) as the only saturated color, used sparingly against near-black neutrals.
- Inter carries structure and every functional surface; Space Mono exposes the "engine beneath the work" (labels, metadata, status); Cormorant Garamond is rare and reserved for genuine vision-level statements, not decoration.
- Depth reads as atmosphere (glow, gradient, soft grain or a faint grid field), not as literal shadow-heavy elevation or borrowed dot-grid textures.
- Restraint over embellishment: one accent color family does the work; components stay flat and quiet until a state (hover, focus, active) calls for glow.

## Colors

A near-black neutral stack (twelve steps from pure black to near-white) carries structure; two brand hues — Dreamfluid Blue/Violet and their brighter Starlight/Nebula glow variants — are the only saturated color in the system, and they're deliberately rare.

### Primary
- **Starlight Blue** (`#0A6CFF`): the active, "clear and actionable" accent. Primary CTAs, active/default button states, blue glow effects, hyperlink accents.
- **Dreamfluid Blue** (`#1A3FBC`): the deeper, pressed/active state of Starlight Blue. Also the primary brand hue used for iconography accents and tab highlights at rest.

### Secondary
- **Nebula Violet** (`#9C28F1`): the "expressive, dreamlike" accent. Secondary CTAs, mood-driven elements, complements Starlight Blue in the ambient glow pairing.
- **Dreamfluid Violet** (`#6B23B1`): the pressed/active state of Nebula Violet, and the brand hue for section dividers and accent highlights at rest.

### Tertiary (rare — edge/glow accents only)
- **Aqua Cyan** (`#00BEFF`) and **Electric Violet** (`#AF28FF`): edge-glow variants, used only for hairline accents (e.g. an eyebrow label's color) — not for fills or large surfaces.

### Neutral (dark-mode stack, darkest to lightest)
- **Pure Black** (`#000000`) — surface-layer containers, the deepest layer.
- **Deep Space Black** (`#0D0D0D`) — the page background. This is the site's ground truth; everything else sits on top of it.
- **Midnight Veil** (`#0F1013`) — "poetic content" background, a hair lighter than the page for sections that need to separate without a hard edge.
- **Obsidian Black** (`#151515`) — card and panel base.
- **Phantom Black** (`#1A1A1A`) — midground container for elements sitting above the base surface.
- **Carbon Gray** (`#222222`) — input fields, search boxes, scrollable containers.
- **Graphite Gray** (`#303030`) — buttons floating on top of surfaces; also the disabled-state fill.
- **Silver Veil** (`#6C6E71`) — borders, dividers, edge-glow, placeholder/disabled text.
- **Canvas White** (`#F5F5F5`) — standard body text on dark.
- **Clarity White** (`#FAFAFA`) — headline text and primary-button fill/text on dark; the brightest neutral in regular use.

### Named Rules
**The One Accent Family Rule.** Starlight Blue and Nebula Violet (plus their pressed-state siblings) are the *only* saturated color in the system. Aqua Cyan and Electric Violet exist solely as rare edge-glow hairlines. Do not introduce a third hue family.

**The Rarity Rule.** Cormorant Garamond's italic emotional accent and the brand's saturated colors both work the same way: their power depends on staying rare. If either appears in more than a small fraction of a screen, it has stopped signaling and started decorating.

**The Text-Contrast Rule.** Dreamfluid Blue (`#1A3FBC`) and Dreamfluid Violet (`#6B23B1`) read as ~2.3:1 against Deep Space Black — well under the 4.5:1 floor for text. They work as fills, icon accents, and dividers, never as small text or link color directly on the dark neutral stack. For link/interactive text on dark, use a lightened tint from the accent's tonal ramp instead (e.g. `#78aeff`, a lightened step of Starlight Blue, at ~8.6:1) — brighter, still reads as brand-blue, and passes contrast.

## Typography

**Display Font:** Cormorant Garamond Roman (with Georgia, Times New Roman, serif fallback)
**Expression Font:** Cormorant Garamond Italic (same family, italic style)
**Body Font:** Inter (with Helvetica Neue, Arial, sans-serif fallback)
**Label/Mono Font:** Space Mono (with Courier New, monospace fallback); JetBrains Mono is reserved for actual code/terminal output only, outside this expressive hierarchy.

**Character:** Inter gives the vision structure and tangible form; Cormorant Roman carries narrative authority; Cormorant Italic introduces emotion and fluid movement in short, rare bursts; Space Mono exposes the system beneath the work. For Labs specifically, Inter + Space Mono do essentially all of the talking — Cormorant is held for the rare moment a piece of Labs work earns a genuine vision-level statement, not for routine headings.

### Hierarchy
- **Hero** (Inter + Cormorant Italic mixed, or a complete Cormorant Roman line; `clamp(2.5rem, 7vw, 6.8rem)`, line-height ~0.86–0.98): one focal phrase, optically balanced (see Named Rules), optional Space Mono metadata line beneath it.
- **Section heading** (Inter 600, ~1.5–2rem): default for Labs; reach for Cormorant only when a section is deliberately editorial/vision-level.
- **Subheading** (Inter 500–600): functional, concise, sentence case.
- **Body** (Inter 400, line-height 1.6): comfortable measure, never set in Cormorant or Space Mono.
- **Label/eyebrow/metadata** (Space Mono 400–700, uppercase, letter-spacing ~0.12–0.18em): short phrases only — status, timecodes, identifiers, build metadata.
- **Emotional accent** (Cormorant Italic 500–600): usually one word or a short phrase; never filler, never routine emphasis.

### Named Rules
**The Optical Balance Rule.** Never assign Inter and Cormorant the same numeric font size and assume visual equality — they have different x-heights and stroke contrast. When mixing inline (Inter phrase + Cormorant Italic word), size the italic ~7–14% larger than the sans with a small baseline shift (~0.015–0.02em); tune per-phrase rather than relying on one universal mixed-type class.

**The Complete-Line Rule.** Cormorant Roman reads as a complete line or headline, not mixed inline with Inter by default. If a headline needs both structure and narrative, either commit the whole line to Roman serif, or use the Inter + Cormorant Italic mixed pattern — don't blend Roman serif fragments into a sans sentence.

**The Expressive Italic Rule.** Cormorant Italic signals emotion, a fluid shift in voice, or a manifesto/vision-card moment — never navigation, buttons, labels, form controls, long paragraphs, or routine emphasis.

## Layout

Content sits in a centered column, typically `max-width: 1080–1120px`, with generous outer padding (`clamp(1.15rem, 4vw, 3rem)`-scale, tightening on mobile). Multi-item layouts use a 12-column grid with ~16px gaps; cards span 6 columns on desktop and collapse to full-width (1 column) under ~760–820px. Section rhythm is generous — large vertical spacing between major blocks (`clamp(2rem, 7vw, 5rem)`-scale) — favoring negative space and pacing over density. Hero content is typically vertically centered within a tall block rather than pinned to the top of the viewport.

## Elevation & Depth

Depth is atmospheric, not shadow-heavy: the system is built from layered near-black tones plus soft ambient gradient glow rather than hard drop shadows implying literal stacking. Two textures are canonical and interchangeable depending on context — a faint structural grid-line overlay (hairline horizontal/vertical lines, low opacity, radially masked so it fades toward the edges) or a low-opacity grain/noise field (~5–8% opacity, soft-light blend, fixed layer) — both used to suggest a "liminal dreamspace" rather than a literal surface pattern. A generic dot-grid texture is not part of this system; it should not be treated as Dreamfluid's signature background.

### Shadow Vocabulary
- **Ambient elevation, dark** (`box-shadow: 0px 2px 8px rgba(108, 110, 113, 0.2)` — Silver Veil @ 20%): lifts cards/panels/modals gently off the dark background.
- **Ambient elevation, light** (`box-shadow: 0px 2px 8px rgba(13, 13, 13, 0.2)` — Deep Space Black @ 20%): the light-mode equivalent, not currently used on this dark-only site but part of the shared system.
- **Gradient glow** (`box-shadow: 0 0 12px rgba(10, 108, 255, 0.3), 0 0 24px rgba(156, 40, 241, 0.3)`): the signature Dreamfluid glow — Starlight Blue inner ring + Nebula Violet outer ring — used around key interactive elements, buttons, inputs, and hover transitions.
- **Ambient background gradient** (`radial-gradient(circle at 60% 40%, rgba(26,63,188,0.2), transparent 60%), radial-gradient(circle at 30% 80%, rgba(107,35,177,0.15), transparent 70%)` over a `#0D0D0D → #0F1013` base): the large-scale version of the same glow, used behind hero sections and major dividers.

### Named Rules
**The Atmosphere-Not-Depth Rule.** Separation between surfaces comes from soft ambient glow and tonal layering ("light and space"), not from implying physical stacking with heavy shadow. Keep shadows soft and diffuse; reserve the gradient glow for genuine interactive/hero moments, not routine cards.

## Shapes

Corners are consistently soft and generous, never sharp: pill/full-round (`999px`) for chips, eyebrows, and nav links; `~14px` for small controls; `~20px` for cards and panels; `~28px` for large sections/containers. Borders, where present, are hairline (`1px solid`) and low-contrast (Silver Veil at partial opacity), used to define edges without competing with the glow system. No hard-edged or heavily bordered components; the form language stays soft-cornered throughout.

## Components

### Buttons
- **Shape:** pill (`border-radius: 999px`), consistent across all variants.
- **Primary:** Starlight Blue (`#0A6CFF`) fill, Clarity White (`#FAFAFA`) text. Hover keeps the same fill (the glow effect carries the hover signal, not a color change). Pressed/active shifts to Dreamfluid Blue (`#1A3FBC`).
- **Secondary:** Nebula Violet (`#9C28F1`) fill, Clarity White text; same hover/pressed pattern shifting to Dreamfluid Violet (`#6B23B1`) on press.
- **Active glow:** on hover/focus, primary and secondary buttons gain the gradient glow (Starlight Blue or Nebula Violet edge glow + shadow) with no border — this is the primary hover signal, not a fill change.
- **Disabled:** Graphite Gray (`#303030`) fill with Silver Veil (`#6C6E71`) text, no glow.
- **Floating/icon buttons:** transparent background, icon-only (white icon on dark contexts), no default border; hover adds a soft light-edge treatment.

### Chips / Eyebrows
- **Style:** pill shape, hairline border in a brand-tinted low-opacity color (e.g. Starlight Blue at ~30% border, ~8% background fill), Space Mono or Inter label text depending on context, uppercase with wide tracking for true eyebrows.

### Cards / Containers
- **Corner style:** `~20px` (card) to `~28px` (section-level container).
- **Background:** Obsidian Black (`#151515`) base, sometimes a subtle vertical gradient toward Midnight Veil for depth; occasionally semi-transparent with backdrop blur over the ambient background glow.
- **Shadow strategy:** ambient elevation shadow (see Elevation & Depth) at rest; gradient glow only appears on interactive cards' hover/focus state.
- **Border:** hairline, Silver Veil at low opacity (~20–25%).
- **Internal padding:** generous, roughly `1.25–1.5rem` at card scale, more on full-width sections.

### Navigation
- Pill-shaped nav links/chips on a translucent, blurred dark bar; hairline Silver Veil border at rest, shifting to a Starlight Blue-tinted border and background on hover with a slight upward lift (`translateY(-1px)`). Mobile treatment collapses to full-width stacked items rather than shrinking the pill pattern.

### Signature: Ambient Field
The recurring, distinctly-Dreamfluid background treatment: a `#0D0D0D → #0F1013` gradient base, two soft radial glows (Starlight Blue and Nebula Violet, low opacity, offset positions), and an optional faint grid-line or grain overlay masked to fade toward the edges. This is the system's signature "liminal dreamspace" backdrop — used behind hero sections and major dividers, and the correct replacement for the current site's generic dot-grid texture.

## Do's and Don'ts

### Do:
- **Do** keep Inter as the dependable, load-bearing foundation for all body copy, UI, and navigation.
- **Do** use Space Mono for metadata, status, timecodes, and eyebrow labels — it's how Labs "exposes the engine beneath the work."
- **Do** reserve Cormorant Garamond (Roman or Italic) for genuine vision-level statements — rare, not routine.
- **Do** use the Starlight Blue / Nebula Violet gradient glow as the primary hover/active signal on interactive elements, in place of hard borders or heavy shadows.
- **Do** use the Ambient Field (gradient + soft glow + optional grain/grid texture) as the site's signature background treatment.

### Don't:
- **Don't** use the generic dot-grid background pattern currently on the homepage/tools page — it isn't part of the Dreamfluid system and reads as generic AI-template texture; replace it with the Ambient Field treatment.
- **Don't** mix Roman serif inline with sans by default, or set long paragraphs in Cormorant or Space Mono.
- **Don't** use Cormorant Italic for navigation, buttons, labels, or routine emphasis — it's an emotional accent, not a styling option.
- **Don't** introduce a third saturated hue family beyond the Blue/Violet pairing; Aqua Cyan and Electric Violet stay rare edge accents, not fills.
- **Don't** drift toward generic SaaS, bridal, luxury-fashion, or ornamental aesthetics — the tone is cosmic, poetic, cinematic, and restrained, never decorative for its own sake.
