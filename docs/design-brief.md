# WuwaBuilds — Design Brief

## What it is

**wuwa.build** is a community tool for *Wuthering Waves* players to build, share, and rank character loadouts. Players upload screenshots of their in-game character stats, the site OCRs them into a structured build, calculates derived stats (crit value, damage potential), and ranks them on per-character leaderboards.

## Audience

Wuthering Waves players who min-max — they care about crit ratios, echo substats, and where their DPS sits versus the community. Mostly desktop users on a second monitor next to the game; mobile access exists but is secondary.

## Tone

Game-adjacent but not gamified. Minimal, data-dense, functional. The game itself is flashy anime gacha; the tool is the quiet, serious counterpart. Think Blizzard armory pages or PoE tools — not Genshin fan-site maximalism.

## Visual Identity

**Palette** (from `globals.css`):
- Background: near-black `#121212`, secondary `#1E1E1E`
- Primary accent: warm gold `#a69662` (hover `#bfad7d`) — used sparingly for CTAs, live counters, highlights
- Text: soft white `#E0E0E0`, with `/40` – `/75` opacity steps for hierarchy
- Borders: `#333333`, often `accent/20` for subtle gold-tinted edges

**Element colors** (reserved for in-game element tagging, don't repurpose for UI chrome):
Glacio `#41AEFB` · Fusion `#F0744E` · Electro `#B46BFF` · Aero `#55FFB5` · Spectro `#F8E56C` · Havoc `#E649A6` · Rover `#7892A1`

**Typography**:
- `Ropa Sans` — default UI
- `Gowun Dodum` — numbers and stat emphasis (live counters, leaderboard values)
- `Plus Jakarta Sans` — occasional display
- `Spline Sans Mono` (`font-mono`) — timestamps, counts, tags, colophon meta; the "patch notes" register
- Weights: Ropa Sans and Gowun Dodum load at 400 only (`app/layout.tsx`), so `font-semibold` / `font-bold` on either is browser-synthesised and smears. Real weight exists only on Plus Jakarta. Emphasise Ropa and Gowun text with one other channel instead: alpha, casing plus tracking, size, or the face itself

**Hover cards** (`components/ui/HoverTooltip.tsx` + `HoverCard.tsx`, revised 2026-09-08): the anatomy is Enka's tooltip widget, the one Akasha embeds: icon hanging off the top-left, eyebrow, title, tag chips, body. Ground is opaque `#161616` at 97% with one subject-tint fade from the top-left corner (`tint` prop: element colour for character content, rarity for items), no blur, so long game text sits on a calm surface. Body is Ropa 13px/1.5, title Plus Jakarta 16px, values Gowun tabular in two-column `HoverCardTable` rows. One emphasis channel per role: the title and in-text section headings are Plus Jakarta semibold (the only face with a real weight); parameter values lift to full white against the 82% body and nothing else; chips and eyebrows are regular Ropa carried by their casing, tracking and alpha; glossary headwords are gold only; table and bonus values are regular Gowun, tabular. The only coloured text in a description is the game's own markup: gold Highlight for named mechanics, element colours for element damage, and a dotted underline marks the subset of gold terms that have a footnote below. Move values fold repeated hits into the game's compact notation with × (`compactMoveValue`), and the table lets a long value wrap at its operators rather than crushing the label. A `<color=Title>` run that starts a line renders as a block sub-heading, which is how WuWa skill text sections itself. Enter is 120ms ease-out fade plus a scale from 0.98 anchored to the trigger side, no exit; the first open waits 80ms, a card opened within 250ms of any card closing is instant with no motion, keyboard focus is always instant, reduced motion keeps the fade only. Trigger-anchored placement with viewport and sticky-nav clamping is ours and deliberately not Enka's cursor-follow. Talent and forte hovers keep their level chip: it labels the value rows, which are read at that level. The scroll container hides its bar with the unlayered `.scrollbar-hidden` class in `globals.css` (Tailwind utilities cannot override the site's unlayered `* { scrollbar-width: thin }`, and Chromium ignores `::-webkit-scrollbar` once `scrollbar-width` is set, so the arbitrary-class approach never worked), pads its bottom only while overflowing, and the bottom fade is solid for its lower third so the arrow sits on ground rather than on fading text; the arrow does not animate, it is seen on every long card.