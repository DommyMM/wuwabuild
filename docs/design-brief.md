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

**Motion**: uses the `motion` library. Subtle fades and slides, no bouncy/spring-heavy animation. Gold glow shadows on hover (`rgba(166,150,98,0.35)`) are a signature.

## Pages

- **Home (`/`)** — landing surface. Hero with live stats (builds submitted, active leaderboards), tagline, four CTAs (Import / Editor / Browse / Leaderboards), carousel of recent builds, "How it works" explainer, FAQ, footer. Currently a single centered 5xl column.
- **Editor (`/edit`, `/characters/[id]`, `/weapons/[id]`)** — dense form-based build editor. Not a redesign target.
- **Import (`/import`)** — drag-drop screenshot OCR flow.
- **Builds (`/builds`)** — global leaderboard table across all characters.
- **Leaderboards (`/leaderboards`, `/leaderboards/[id]`)** — per-character ranked lists.
- **Profile (`/profile/[uid]`)** — public player page showing their submitted builds.

## Constraints for redesigns

- Must stay dark-themed. This is non-negotiable — the site sits next to a dark game client.
- Gold accent is the only "hot" color. Don't introduce additional brand colors; use opacity steps instead.
- Element colors belong to gameplay data, not interface decoration.
- Desktop-first but must work down to ~375px mobile.
- No heavy imagery the site has to host — carousel pulls user build screenshots, that's enough visual weight.

## What I'm asking for

Rework of the **home page** (`/`). The current version is functional but visually flat — one centered column, four similar-weight CTAs, stats tucked above the fold. I want something with stronger hierarchy and personality while respecting the palette and tone above.
