export type ChangeKind = 'new' | 'improved' | 'fixed';

interface Change {
    kind: ChangeKind;
    text: string;
}

export interface ChangelogEntry {
    date: string;
    patch?: string;
    title?: string;
    changes: Change[];
}

export const CHANGELOG: ChangelogEntry[] = [
    {
        date: '2026-06-01',
        changes: [
            {
                kind: 'fixed',
                text: 'Better distinction for Nightmare vs regular echoes based on the element badge.',
            },
        ],
    },
    {
        date: '2026-05-30',
        changes: [
            {
                kind: 'fixed',
                text: 'Fixed leaderboard character names briefly showing as ID numbers while the page loaded.',
            },
        ],
    },
    {
        date: '2026-05-29',
        changes: [
            {
                kind: 'new',
                text: 'Phrolova leaderboards',
            },
            {
                kind: 'new',
                text: 'Added a Discord community link in the site navigation and footer.',
            },
            {
                kind: 'improved',
                text: 'Character leaderboard links now keep playstyle context in page titles and sharing previews.',
            },
            {
                kind: 'improved',
                text: 'Character and weapon reference pages load faster',
            },
            {
                kind: 'fixed',
                text: 'Fixed build-card set and crit-value badges being clipped when hovering stat details.',
            },
        ],
    },
    {
        date: '2026-05-27',
        changes: [
            { kind: 'improved', text: 'Import detects echo elements more reliably, so fewer echoes come back with the wrong element.' },
        ],
    },
    {
        date: '2026-05-21',
        changes: [
            { kind: 'improved', text: 'Echo set tooltips now show set bonuses in your selected language.' },
            { kind: 'improved', text: 'Hover any stat on the builds board to see its roll-value bars and a clearer crit-value breakdown.' },
            { kind: 'improved', text: 'Leaderboard pages load faster because query results are now cached.' },
            { kind: 'new', text: 'Denia is now available in the editor and on the leaderboards.' },
        ],
    },
    {
        date: '2026-05-18',
        changes: [
            { kind: 'improved', text: 'Import reads echo stat lines more reliably, so fewer screenshots come back wrong.' },
            { kind: 'fixed', text: 'Leaderboard filters now survive being opened from a shared link.' },
            { kind: 'fixed', text: 'Weapon dropdown on leaderboards no longer lands on the wrong selection.' },
        ],
    },
    {
        date: '2026-05-15',
        changes: [
            { kind: 'improved', text: 'Cleaner, more consistent hover cards and tooltips throughout the site.' },
            { kind: 'fixed', text: 'Import no longer stalls when OCR cannot read a screenshot. It reports the failure and moves on.' },
        ],
    },
    {
        date: '2026-05-08',
        changes: [
            { kind: 'fixed', text: 'Fixed a leaderboard sorting bug where crit stats were not scoped to the selected weapon, ranking some builds incorrectly.' },
        ],
    },
    {
        date: '2026-05-05',
        changes: [
            { kind: 'improved', text: 'Build optimality references rebuilt to better match the in-game optimizer, and now computed per energy regen bracket.' },
        ],
    },
    {
        date: '2026-05-04',
        changes: [
            { kind: 'improved', text: 'Support characters now show sequence badges on the leaderboards.' },
            { kind: 'fixed', text: 'Corrected several of Hiyuki’s sequence buffs, fixing her leaderboard damage.' },
        ],
    },
    {
        date: '2026-05-03',
        changes: [
            { kind: 'improved', text: 'More accurate substat reading on import, with an automatic fallback when a stat is misread.' },
            { kind: 'fixed', text: 'Fixed echo set counting when you own duplicate echoes with different elements.' },
        ],
    },
    {
        date: '2026-05-02',
        changes: [
            { kind: 'new', text: 'Hiyuki added to the editor and leaderboards.' },
            { kind: 'improved', text: 'Scroll to zoom when hovering build card images.' },
        ],
    },
    {
        date: '2026-04-30',
        patch: '3.3',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support.' },
        ],
    },
    {
        date: '2026-04-23',
        changes: [
            { kind: 'fixed', text: 'Build card now scales correctly on laptop screens narrower than 1440px.' },
        ],
    },
    {
        date: '2026-04-17',
        changes: [
            { kind: 'improved', text: 'Redesigned the homepage.' },
        ],
    },
    {
        date: '2026-04-12',
        changes: [
            { kind: 'new', text: 'Chisa added to the editor and leaderboards.' },
        ],
    },
    {
        date: '2026-04-05',
        changes: [
            { kind: 'new', text: 'Galbrena added to the editor and leaderboards.' },
        ],
    },
    {
        date: '2026-04-03',
        changes: [
            { kind: 'improved', text: 'More reliable echo element detection on import, especially for sets that are hard to tell apart by color.' },
        ],
    },
    {
        date: '2026-03-28',
        changes: [
            { kind: 'new', text: 'Energy regen brackets split builds by ER so support and healer builds rank fairly.' },
            { kind: 'improved', text: 'Leaderboards can now be sorted by sequence level.' },
        ],
    },
    {
        date: '2026-03-24',
        changes: [
            { kind: 'new', text: 'Build expansions show an optimality reference: how your build compares to an optimal-echo ceiling, and the rank that ceiling would reach.' },
        ],
    },
    {
        date: '2026-03-21',
        changes: [
            { kind: 'new', text: 'More characters added to the damage leaderboards: Camellya, Changli, Jinhsi, Cartethyia, Zani, Jiyan, Phoebe, Lupa, Aemeath, Augusta, and Iuno.' },
        ],
    },
    {
        date: '2026-03-19',
        patch: '3.2',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support.' },
        ],
    },
    {
        date: '2026-03-17',
        changes: [
            { kind: 'improved', text: 'Builds are now deduplicated per player. Your best build holds the rank, and weaker duplicates become linkable ghost builds.' },
        ],
    },
    {
        date: '2026-03-16',
        changes: [
            { kind: 'new', text: 'Healer leaderboards, with dedicated healing-based scoring.' },
            { kind: 'improved', text: 'Leaderboard tracks now show playstyle notes, and ranking handles crit-fishing more accurately.' },
        ],
    },
    {
        date: '2026-03-15',
        changes: [
            { kind: 'new', text: 'Substat upgrade suggestions show how each substat roll would move a leaderboard build.' },
            { kind: 'new', text: 'Leaderboard standings, ranks, team buff details, and tooltips for sets, weapons, sequences, and forte.' },
        ],
    },
    {
        date: '2026-03-12',
        title: 'WuWa Builds, rebuilt.',
        changes: [
            { kind: 'new', text: 'The whole site has been rebuilt from scratch and relaunched at wuwa.build. Ideally faster, more accurate, and more reliable.' },
            { kind: 'new', text: 'Damage leaderboards scoped per character, weapon, and playstyle, with team comps and breakdowns.' },
            { kind: 'new', text: 'Rebuilt builds board with filtering by character, weapon, set, and stat.' },
            { kind: 'new', text: 'Redesigned build editor and build cards, with full language support.' },
            { kind: 'improved', text: 'Import rebuilt with a faster streaming pipeline, and you can report a bad scan in one click.' },
        ],
    },
    {
        date: '2026-02-06',
        patch: '3.1',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support.' },
        ],
    },
    {
        date: '2025-12-29',
        patch: '3.0',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support.' },
            { kind: 'new', text: 'Echoes can now be added directly in the stat calculator.' },
        ],
    },
    {
        date: '2025-11-20',
        patch: '2.8',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, including Kumokiri, with import support.' },
        ],
    },
    {
        date: '2025-10-23',
        changes: [
            { kind: 'improved', text: 'More reliable echo detection on import, using element as a tiebreaker.' },
        ],
    },
    {
        date: '2025-10-12',
        patch: '2.7',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support.' },
        ],
    },
    {
        date: '2025-09-07',
        changes: [
            { kind: 'improved', text: 'Fewer wrong echo matches on import. Color is used as a tiebreaker, and you are warned when a screenshot is cropped too tightly.' },
        ],
    },
    {
        date: '2025-08-27',
        patch: '2.6',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, including Phantom echoes, with import support.' },
        ],
    },
    {
        date: '2025-08-09',
        patch: '2.5',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support.' },
        ],
    },
    {
        date: '2025-07-04',
        changes: [
            { kind: 'improved', text: 'Builds page rewritten with a cleaner layout.' },
        ],
    },
    {
        date: '2025-06-26',
        changes: [
            { kind: 'new', text: 'Added a Zani damage leaderboard.' },
        ],
    },
    {
        date: '2025-06-12',
        patch: '2.4',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support.' },
            { kind: 'new', text: 'Added a stat calculator page.' },
        ],
    },
    {
        date: '2025-06-02',
        changes: [
            { kind: 'new', text: 'Substat upgrade suggestions, showing the projected damage gain from each roll.' },
        ],
    },
    {
        date: '2025-06-01',
        changes: [
            { kind: 'new', text: 'Added a Phoebe damage leaderboard.' },
        ],
    },
    {
        date: '2025-05-30',
        changes: [
            { kind: 'new', text: 'Added a Changli damage leaderboard, with a toggle to switch between playstyles.' },
        ],
    },
    {
        date: '2025-05-23',
        changes: [
            { kind: 'new', text: 'Added Jiyan and Camellya damage leaderboards.' },
        ],
    },
    {
        date: '2025-04-28',
        changes: [
            { kind: 'new', text: 'Zani, Ciaccona, and Cantarella added to the editor and import.' },
        ],
    },
    {
        date: '2025-03-26',
        patch: '2.2',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support.' },
        ],
    },
    {
        date: '2025-03-09',
        changes: [
            { kind: 'improved', text: 'Added username and UID filters to the leaderboards.' },
        ],
    },
    {
        date: '2025-02-28',
        changes: [
            { kind: 'new', text: 'Added a Jinhsi damage leaderboard.' },
        ],
    },
    {
        date: '2025-02-20',
        changes: [
            { kind: 'new', text: 'Added character, weapon, and main-stat filters to the builds page.' },
            { kind: 'improved', text: 'Added region filtering and keyboard support to leaderboard filters.' },
        ],
    },
    {
        date: '2025-02-12',
        patch: '2.1',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, including Brant, with import support.' },
        ],
    },
    {
        date: '2025-02-09',
        changes: [
            { kind: 'new', text: 'The builds page now shows damage rankings, with sticky headers on mobile.' },
            { kind: 'new', text: 'Builds gained an expandable rotation and notes section.' },
        ],
    },
    {
        date: '2025-01-28',
        changes: [
            { kind: 'new', text: 'Added the Leaderboard page, ranking community builds, with sorting and stat highlighting.' },
        ],
    },
    {
        date: '2025-01-21',
        changes: [
            { kind: 'new', text: 'Added the Import page. Scan a screenshot to auto-fill an entire build.' },
        ],
    },
    {
        date: '2025-01-12',
        changes: [
            { kind: 'new', text: 'Added an expandable build preview with a stats tab and echo hover details.' },
        ],
    },
    {
        date: '2025-01-11',
        changes: [
            { kind: 'new', text: 'Added a home page, plus saving and exporting your builds.' },
        ],
    },
    {
        date: '2025-01-05',
        changes: [
            { kind: 'new', text: 'Added skins, so you can display alternate character outfits on your build card.' },
        ],
    },
    {
        date: '2025-01-02',
        patch: '2.0',
        changes: [
            { kind: 'new', text: 'Rinascita region content added: characters, weapons, and echoes.' },
        ],
    },
    {
        date: '2024-12-31',
        changes: [
            { kind: 'improved', text: 'Echo display redesigned with visual set connectors.' },
        ],
    },
    {
        date: '2024-12-23',
        changes: [
            { kind: 'new', text: 'Added mobile support.' },
        ],
    },
    {
        date: '2024-12-22',
        changes: [
            { kind: 'improved', text: 'More accurate echo scanning on import, including flat-vs-percent detection and name matching.' },
        ],
    },
    {
        date: '2024-12-11',
        changes: [
            { kind: 'new', text: 'Build cards now show a Crit Value (CV) counter, a watermark, and support custom background images.' },
        ],
    },
    {
        date: '2024-11-28',
        title: 'Where it started.',
        changes: [
            { kind: 'new', text: 'WuWa Builds launched as a build editor for Wuthering Waves.' },
            { kind: 'new', text: 'Builds and echoes save to your browser, so your work persists between visits.' },
        ],
    },
];
