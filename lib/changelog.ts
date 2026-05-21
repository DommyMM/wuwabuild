// Public changelog — source of truth for the /changelog page.
//
// Add user-visible changes here when they ship. The newest entry goes at the
// TOP of the array. Either extend the most recent entry (same day / same batch
// of work) or add a new one above it.
//
// Group related work into a single line — this is a changelog, not a commit
// log. See AGENTS.md › Changelog for what belongs here and what does not.

export type ChangeKind = 'new' | 'improved' | 'fixed';

export interface Change {
    kind: ChangeKind;
    text: string;
}

export interface ChangelogEntry {
    /** Date the change shipped, ISO 'YYYY-MM-DD'. */
    date: string;
    /** Game patch live at the time (e.g. '3.3'). Omit for pre-relaunch history. */
    patch?: string;
    /** Optional headline — use it for milestones, skip it for routine entries. */
    title?: string;
    changes: Change[];
}

export const CHANGELOG: ChangelogEntry[] = [
    {
        date: '2026-05-21',
        patch: '3.3',
        changes: [
            { kind: 'improved', text: 'Echo set tooltips now show set bonuses in your selected language.' },
            { kind: 'improved', text: 'Hover any stat on the builds board to see its roll-value bars and crit-value breakdown.' },
            { kind: 'improved', text: 'Leaderboard pages load faster — query results are now cached.' },
            { kind: 'new', text: 'Denia is now available in the editor and on the leaderboards.' },
        ],
    },
    {
        date: '2026-05-18',
        patch: '3.3',
        changes: [
            { kind: 'improved', text: 'OCR import reads more echo stat formats, so fewer screenshots come back wrong.' },
            { kind: 'fixed', text: 'Leaderboard filters now survive being opened from a shared link.' },
            { kind: 'fixed', text: 'Weapon dropdown on leaderboards no longer lands on the wrong selection.' },
        ],
    },
    {
        date: '2026-05-15',
        patch: '3.3',
        changes: [
            { kind: 'improved', text: 'Cleaner, more consistent hover cards and tooltips throughout the site.' },
            { kind: 'fixed', text: 'Import no longer stalls when OCR cannot read a screenshot — it reports the failure and moves on.' },
        ],
    },
    {
        date: '2026-05-08',
        patch: '3.3',
        changes: [
            { kind: 'fixed', text: 'Fixed a leaderboard sorting bug where crit-scaled stats ranked incorrectly against weapon-scoped stats.' },
        ],
    },
    {
        date: '2026-05-02',
        patch: '3.3',
        changes: [
            { kind: 'new', text: 'Hiyuki added to the editor and leaderboards.' },
        ],
    },
    {
        date: '2026-04-30',
        patch: '3.3',
        title: 'Patch 3.3',
        changes: [
            { kind: 'new', text: 'Characters, weapons, and echoes updated for Wuthering Waves 3.3.' },
            { kind: 'improved', text: 'OCR reads echo cost from the in-game icon instead of text, and substat values are more accurate.' },
        ],
    },
    {
        date: '2026-04-17',
        patch: '3.2',
        changes: [
            { kind: 'improved', text: 'Redesigned the homepage.' },
        ],
    },
    {
        date: '2026-04-12',
        patch: '3.2',
        changes: [
            { kind: 'new', text: 'Chisa added to the editor and leaderboards.' },
        ],
    },
    {
        date: '2026-04-05',
        patch: '3.2',
        changes: [
            { kind: 'new', text: 'Galbrena added to the editor and leaderboards.' },
        ],
    },
    {
        date: '2026-04-03',
        patch: '3.2',
        changes: [
            { kind: 'improved', text: 'More reliable echo element detection on import, especially for sets that are hard to tell apart by color.' },
        ],
    },
    {
        date: '2026-03-28',
        patch: '3.2',
        changes: [
            { kind: 'new', text: 'Energy regen brackets — leaderboards split builds by ER so support and healer builds rank fairly.' },
        ],
    },
    {
        date: '2026-03-19',
        patch: '3.2',
        title: 'Patch 3.2',
        changes: [
            { kind: 'new', text: 'Characters, weapons, and echoes updated for Wuthering Waves 3.2.' },
        ],
    },
    {
        date: '2026-03-15',
        patch: '3.1',
        changes: [
            { kind: 'new', text: 'Substat upgrade suggestions — expand a leaderboard build to see how each substat roll would move its rank.' },
            { kind: 'new', text: 'Standings and detailed tooltips on leaderboards, covering sets, weapons, sequences, and forte.' },
        ],
    },
    {
        date: '2026-03-12',
        patch: '3.1',
        title: 'WuWa Builds, rebuilt.',
        changes: [
            { kind: 'new', text: 'The whole site has been rebuilt from scratch and relaunched at wuwa.build. Ideally faster, more accurate, and more reliable.' },
            { kind: 'new', text: 'Damage leaderboards scoped per character, weapon, and playstyle, with team comps and full move breakdowns.' },
            { kind: 'new', text: 'Rebuilt builds board with filtering by character, weapon, set, and stat.' },
            { kind: 'new', text: 'Redesigned build editor and build cards, with full language support.' },
            { kind: 'improved', text: 'OCR import is more accurate, and you can report a bad scan in one click.' },
        ],
    },
    {
        date: '2024-11-28',
        title: 'Where it started.',
        changes: [
            { kind: 'new', text: 'WuWa Builds began as a Wuthering Waves build tool — a build editor, screenshot import, shareable build cards, leaderboards, and local saves.' },
        ],
    },
];
