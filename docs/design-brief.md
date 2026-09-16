# Design Brief

Visual identity and the rules a change has to hold to. Open defects are in `design-debt.md`.

## What it is

wuwa.build is a community tool for Wuthering Waves players to build, share and rank character loadouts.
Players upload screenshots of their in-game stats, the site OCRs them into a structured build, calculates
derived stats (crit value, damage potential) and ranks them on per-character leaderboards.

## Audience and tone

Wuthering Waves players who min-max. They care about crit ratios, echo substats, and where their DPS sits
against the community. Mostly desktop users on a second monitor beside the game, with mobile secondary but
real.

Game-adjacent, not gamified. Minimal, data-dense, functional. The game itself is flashy anime gacha and the
tool is the quiet, serious counterpart, closer to Blizzard armory pages or PoE tools than to Genshin
fan-site maximalism.

## Palette

From `globals.css`:

- Background near-black `#121212`, secondary `#1E1E1E`
- Accent warm gold `#a69662`, hover `#bfad7d`, used sparingly for CTAs, live counters and highlights
- Text soft white `#E0E0E0`, with `/40` to `/75` opacity steps for hierarchy
- Borders `#333333`, often `accent/20` for a gold-tinted edge

Element colours are reserved for in-game element tagging and never repurposed as UI chrome:
Glacio `#41AEFB`, Fusion `#F0744E`, Electro `#B46BFF`, Aero `#55FFB5`, Spectro `#F8E56C`,
Havoc `#E649A6`, Rover `#7892A1`.

## Typography

- `Ropa Sans` for default UI
- `Gowun Dodum` for numbers and stat emphasis (live counters, leaderboard values)
- `Plus Jakarta Sans` for occasional display
- `Spline Sans Mono` (`font-mono`) for timestamps, counts, tags and colophon meta, the patch-notes register

Ropa Sans and Gowun Dodum load at 400 only (`app/layout.tsx`), so `font-semibold` and `font-bold` on either
are browser-synthesised and smear. Real weight exists only on Plus Jakarta. Emphasise Ropa and Gowun text
with another channel instead: alpha, casing plus tracking, size, or the face itself.

## Hover cards

`components/ui/HoverTooltip.tsx` and `HoverCard.tsx`. The anatomy is Enka's tooltip widget, the one Akasha
embeds: icon hanging off the top-left, eyebrow, title, tag chips, body.

- Ground is opaque `#161616` at 97% with one subject-tint fade from the top-left corner (the `tint` prop
  takes the element colour for character content, rarity for items), no blur, so long game text sits on a
  calm surface
- Body is Ropa 13px/1.5, title Plus Jakarta 16px, values Gowun tabular in two-column `HoverCardTable` rows
- One emphasis channel per role. Title and in-text section headings are Plus Jakarta semibold, the only
  face with real weight. Parameter values lift to full white against the 82% body and nothing else does.
  Chips and eyebrows are regular Ropa carried by casing, tracking and alpha. Glossary headwords are gold
  only. Table and bonus values are regular Gowun, tabular.
- The only coloured text in a description is the game's own markup: gold Highlight for named mechanics,
  element colours for element damage, and a dotted underline marking the subset of gold terms that have a
  footnote below
- Move values fold repeated hits into the game's compact `×` notation (`compactMoveValue`), and a long
  value wraps at its operators rather than crushing the label
- A `<color=Title>` run starting a line renders as a block sub-heading, which is how WuWa skill text
  sections itself
- Enter is a 120ms ease-out fade plus a scale from 0.98 anchored to the trigger side, with no exit. The
  first open waits 80ms, a card opened within 250ms of any card closing is instant with no motion, keyboard
  focus is always instant, and reduced motion keeps the fade only.
- Placement is trigger-anchored with viewport and sticky-nav clamping, deliberately not Enka's cursor-follow
- Talent and forte hovers keep their level chip, because it labels the value rows, which are read at that
  level
- The scroll container hides its bar with the unlayered `.scrollbar-hidden` class in `globals.css`, pads its
  bottom only while overflowing, and the bottom fade is solid for its lower third so the arrow sits on
  ground rather than on fading text. The arrow never animates, since it is seen on every long card.

Tailwind utilities cannot override the site's unlayered `* { scrollbar-width: thin }`, and Chromium ignores
`::-webkit-scrollbar` once `scrollbar-width` is set, so an arbitrary-class approach to hiding that bar never
works.

## Rules

Colour and tokens:

- One gold. `accent` and `accent-hover` are the only brand golds, so `amber-*` and `yellow-*` are not brand
  colours. If a hotter active gold is wanted, mint a token rather than reaching for a Tailwind shade.
- A utility that names a token must correspond to a token in `@theme`. `rgba(var(--token), a)` is invalid
  when the token is a hex, so use `color-mix`.
- Never spell a token value as a literal, no `#333` for `border` and no `rgba(224,224,224,x)` for
  `text-primary/x`
- Secondary text stays on a small sanctioned opacity ladder. A one-off step is a defect.
- One definition per design decision. A colour ramp, a grid, a panel frame or an error banner is defined
  once and imported, and the loser gets deleted rather than left as dead CSS.

Legibility:

- Nothing below `/45`, and nothing under 10px carries opacity below `/55`
- `transition-all` is banned, list the properties

Interaction:

- Every interactive element has a visible focus state. A bare `outline-none` with no replacement is never
  acceptable, and the global `:focus-visible` rule in `globals.css` is the floor, not the ceiling.
- A widget that implements a role declares it. Arrow-key listbox behavior needs `role="combobox"`,
  `role="listbox"`, `role="option"`, `aria-expanded` and `aria-activedescendant`. `aria-modal` needs a real
  focus trap. A `<div onClick>` needs role, tabIndex, keydown and `aria-expanded`.
- Touch is a first-class pointer. No explanation may be reachable by hover alone, and touch targets are at
  least 40px below `md:`.
- A horizontally scrolling data table makes the scroll discoverable (edge fade), keeps identity columns in
  view, and puts the page's headline figure in the first viewport. Adding `overflow-x-auto` to a wrapper is
  not a responsive design, and `body { overflow-x: hidden }` is a band-aid rather than a fix.

Copy:

- Personality lives in the news log and changelog, not in page headers
- No em dashes in rendered copy
- Headlines take no terminal punctuation
