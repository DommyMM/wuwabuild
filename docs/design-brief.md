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

**Motion**: uses the `motion` library. Subtle fades and slides, no bouncy/spring-heavy animation. Gold glow shadows on hover (`rgba(166,150,98,0.35)`) are a signature.

## Pages

- **Home (`/`)** — landing surface, rebuilt 2026-06 on the Enka/Akasha model (tool-first, art-backed, personality contained in the updates log). Hero: a rotating showcase (6.5s crossfade, reduced-motion aware) of each character's record run, splash art dimmed into the dark with an element-tinted glow plus a "Board record" panel (character + track as one `char-sig` title matching `LeaderboardCharacterHeader`, sequence pill trailing, weapon, damage, owner, reign); the tagline (canonical SEO h1, see `seo-audit-findings.md` Phase 3), an Enka-style UID/username search pill (hits `GET /profile?q=` on the `api.wuwa.build` gateway), and quick links. Body: "Top leaderboards." (9 boards, ordered by entry count, deduped to one board per character) beside "# updates" (latest changelog entries verbatim, header links to `/changelog`, same kind chips). Then "How to use." + the FAQ printed flat. No home-specific footer; the global `Footer.tsx` carries the colophon info. Community contact is always the Discord server invite, never DM handles. Headlines are sentence-case-with-period. No em dashes anywhere in site copy (owner preference).

  Home invariants worth keeping (2026-07-18):
  - The record card is the **engine showcase**: it lazily fetches that record's move breakdown and renders the type-profile bar from `lib/moveBreakdown.ts`, the same palette and the same `processMoves` aggregation the full breakdown panel uses. Never duplicate the palette or fake the profile; a failed fetch simply omits the bar.
  - The card deep-links to the record itself (`weaponId` + `buildId`), not just its board, so the row arrives expanded. This depends on `buildId` on the overview's weapon tops.
  - Rotation stops permanently on first touch (`stopped`) and pauses on hover/focus. The card is a link, so a swap timed under a thumb would navigate somewhere unchosen.
  - Search is the primary action and owns the only solid accent fill; import is an outline so it does not outrank it.
  - `char-sig` animates in the hero only. List names use `char-sig-static` (gradient without the perpetual animation), since a dozen infinitely animating gradients is continuous compositing for decoration.
  - The board list is ordered by entry count, so the entry count is the legible figure. The gold damage is unsorted per-board context and must not be presented as the ranking.
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

Rework of the **home page** (`/`). The previous version was functional but visually flat — one centered column, four similar-weight CTAs, stats tucked above the fold. I wanted something with stronger hierarchy and personality while respecting the palette and tone above.

**Status: shipped 2026-06-09 after three passes.** Pass one ("The Record Office": ticker, showcase cards, corner ticks) read like a template. Pass two (all prose, full board index, submissions wire) overcorrected into quirky, the board list was too long and the wire had no purpose. Pass three landed on the Enka/Akasha model: show the site instead of describing it. Game art and a working search carry the wow, the boards and news log carry the data and voice, the guide explains the rest. Lessons recorded for future surfaces: distinctiveness here comes from the game's art, the live data, and the maintainer's voice in the news log, not from decor or from explaining everything in words. Also: no em dashes in anything written for the site.
