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
        date: '2026-07-13',
        changes: [
            {
                kind: 'fixed',
                text: 'Fixed damage type conversions across Aemeath, Hiyuki, Sigrika, Galbrena, and Changli'
            }
        ]
    },
    {
        date: '2026-07-12',
        changes: [
            {
                kind: 'improved',
                text: 'Imports no longer wait behind a slow screenshot backup after OCR finishes'
            },
            {
                kind: 'improved',
                text: 'Imports now reject unsupported or visibly invalid build-card layouts before OCR and leaderboard submission'
            },
            {
                kind: 'improved',
                text: 'Build and profile cards now use a cleaner echo roll layout, while profile RV selections highlight the matching rolls on profile cards'
            },
            {
                kind: 'fixed',
                text: "Fixed Rebecca damage being inflated from parsing bug"
            }
        ]
    },
    {
        date: '2026-07-11',
        changes: [
            {
                kind: 'new',
                text: 'Yangyang Xuanling and Danjin leaderboards out'
            },
            {
                kind: 'improved',
                text: 'Move breakdowns now show score bonuses and the ER penalty in the Total Score summary and as a ring around the pie chart, instead of distorting the pie itself, so move percentages reflect actual damage dealt'
            },
            {
                kind: 'improved',
                text: 'Build and Profile Cards now use WebP for smaller file sizes'
            }
        ]
    },
    {
        date: '2026-07-10',
        changes: [
            {
                kind: 'new',
                text: 'Added Chisa and Lynae skin options to the build editor'
            },
            {
                kind: 'fixed',
                text: 'Imports for characters without a leaderboard now open the uploaded build on its profile instead of leading to an empty leaderboard'
            },
            {
                kind: 'fixed',
                text: 'Long character variant names now wrap into evenly spaced compact leaderboard rows'
            },
            {
                kind: 'fixed',
                text: 'Echo artwork on build and profile cards now shows echo skill and Sonata details on hover'
            },
            {
                kind: 'fixed',
                text: 'Fixed some old builds (last year) having strange main stat numbers visually'
            },
            {
                kind: 'fixed',
                text: 'Fixed Mornye and Canterella innates not giving respective stats'
            },
            {
                kind: 'fixed',
                text: 'Unreadable image files now show a clear import error instead of silently stopping the upload flow'
            }
        ]
    },
    {
        date: '2026-07-09',
        patch: '3.5',
        changes: [
            {
                kind: 'new',
                text: 'New patch content out'
            },
            {
                kind: 'improved',
                text: 'Profile echo details have a cleaner layout and first-seen date'
            },
            {
                kind: 'improved',
                text: 'Expanded profile build cards now show their original upload date'
            },
            {
                kind: 'improved',
                text: 'Raw Damage leaderboard mode is now shareable in the URL, and expanded build tools clarify which projections still use Score'
            },
            {
                kind: 'improved',
                text: 'Weapon rankings on the leaderboard overview now show how long each build has been rank one'
            }
        ]
    },
    {
        date: '2026-07-08',
        changes: [
            {
                kind: 'improved',
                text: 'Player lookup opens inline in the navbar as a single panel, with a keyboard shortcut to open (Ctrl or ⌘ + K) and arrow-key navigation'
            },
            {
                kind: 'fixed',
                text: 'Profile build cards now show the original forte grid instead of a not-ranked module when a build has no competitive rank'
            },
            {
                kind: 'improved',
                text: 'Character leaderboards now split ER-adjusted score vs raw damage'
            },
            {
                kind: 'new',
                text: 'Added search-dropdown filters for arbitrary sequence picks and stat breakpoint thresholds on builds, leaderboards, and profiles'
            }
        ]
    },
    {
        date: '2026-07-07',
        changes: [
            {
                kind: 'new',
                text: 'Rank now considers ER breakpoints for all leaderboards, and says score not damage'
            },
            {
                kind: 'improved',
                text: 'Hiyuki fixed Glacio Bite and 4 Iai on S6'
            },
            {
                kind: 'fixed',
                text: 'Rover card better import on element detection and gender labels in builds'
            },
            {
                kind: 'fixed',
                text: 'Adjusted Crit median values to be 7.5 and 15 based on official probabilities from devs, including substat upgrade projections'
            },
            {
                kind: 'improved',
                text: 'Echo substat roll colors now use the same roll-position scale for every stat, with red reserved for max rolls'
            }
        ]
    },
    {
        date: '2026-07-01',
        changes: [
            {
                kind: 'improved',
                text: 'Profile page shows all the echoes you have with filters, sorting, substats-only CV, and full-sheet RV'
            },
            {
                kind: 'new',
                text: 'Detailed echo breakdown and links to builds using it'
            },
            {
                kind: 'improved',
                text: 'Leaderboard CV colors now grade echo substat quality consistently whether or not the build uses a crit 4-cost main stat'
            }
        ]
    },
    {
        date: '2026-06-30',
        changes: [
            {
                kind: 'fixed',
                text: 'Mornye and Shorekeeper build stat highlights now prioritize Resonance Liberation for their nuke damage'
            },
            {
                kind: 'fixed',
                text: 'Luuk board out and Rite of Gilded Revelation triggers more accurately'
            }
        ]
    },
    {
        date: '2026-06-21',
        changes: [
            {
                kind: 'new',
                text: 'Click a player name on any leaderboard to jump straight to their profile'
            },
            {
                kind: 'improved',
                text: 'Build cards can switch splash art between normal and skin variants when a skin splash exists (and added a bunch of missing splashes)'
            },
            {
                kind: 'improved',
                text: 'Build card background colors now adapt to the current splash or custom art'
            },
            {
                kind: 'fixed',
                text: 'Fixed import sometimes sliding echo substat values onto the wrong row when Resonance Skill or Liberation DMG Bonus wrapped weirdly'
            },
            {
                kind: 'fixed',
                text: 'Hecate echoes now show actual chosen element (from box) not just Empyrean'
            }
        ]
    },
    {
        date: '2026-06-17',
        changes: [
            {
                kind: 'new',
                text: 'Show full buffs when you hover over character faces in the leaderbaord headers'
            },
            {
                kind: 'fixed',
                text: 'S2 supports for all S6 leaderboards'
            },
            {
                kind: 'improved',
                text: 'Import can directly lead to leaderboard now'
            },
            {
                kind: 'fixed',
                text: 'Import leaderboard upload warnings now stay visible after you continue to edit, saves, or leaderboards'
            }
        ]
    },
    {
        date: '2026-06-16',
        changes: [
            {
                kind: 'fixed',
                text: 'Fixed leaderboard deep-links flip-flopping and jumping when you open one build then click another on the same board'
            },
            {
                kind: 'improved',
                text: 'Import now tells you when a screenshot is not English instead of silently importing a non-English build'
            }
        ]
    },
    {
        date: '2026-06-15',
        changes: [
            {
                kind: 'fixed',
                text: 'Lucy S3 no longer adds 100% Crit DMG to her build stats, that bonus only applies to her Override move',
            },
            {
                kind: 'fixed',
                text: 'Swapped Hiyuki back to Lynae cos Lucilla team is more chafe damage which does not care about substats',
            },
            {
                kind: 'fixed',
                text: 'Fixed OCR bug where it would sometimes misread the set because it icon matched before color matching'
            }
        ]
    },
    {
        date: '2026-06-14',
        changes: [
            {
                kind: 'improved',
                text: 'Rank simulation now opens into a clearer panel with a best-placement summary, top-percent readout, weapon context, and full per-board standings'
            },
            {
                kind: 'fixed',
                text: 'Fixed Dream of the Lost echo set bonus sometimes incorrectly applying to characters with non-zero max Resonance Energy'
            },
            {
                kind: 'fixed',
                text: 'Leaderboard standings now show ranks against all submitted builds while keeping per-player deduped rank positions'
            },
            {
                kind: 'fixed',
                text: 'S6 on a bunch of other characters I forgot about like Jinhsi, Changli, Camellya etc'
            }
        ]
    },
    {
        date: '2026-06-13',
        changes: [
            {
                kind: 'improved',
                text: 'Import scanning should be faster but as accurate'
            }
        ]
    },
    {
        date: '2026-06-12',
        changes: [
            {
                kind: 'fixed',
                text: 'Profile tabs switching positions if you click one fixed'
            },
            {
                kind: 'fixed',
                text: 'Calcharo leaderboards and s2 supports on all leaderboards at s6'
            },
            {
                kind: 'new',
                text: 'Lucilla is out with her leaderboard too'
            },
            {
                kind: 'improved',
                text: 'Hiyuki leaderboard now uses Lucilla, lower damage but more accurate'
            },
            {
                kind: 'improved',
                text: 'Imports for new characters whose weapon cannot be read now fall back to the signature weapon'
            }
        ]
    },
    {
        date: '2026-06-11',
        changes: [
            {
                kind: 'new',
                text: '3.4 char splash arts'
            },
            {
                kind: 'fixed',
                text: 'Fix shattered dream showing as 2p, and crowding sets'
            },
            {
                kind: 'improved',
                text: 'Recalculated lupa boards to be more accurate'
            },
            {
                kind: 'fixed',
                text: 'Home page and profile search should look better on mobile'
            },
            {
                kind: 'fixed',
                text: 'Fixed leaderboard standings inconsistency where rank shows a worse number because of deduped better builds'
            },
            {
                kind: 'new',
                text: 'S6 zani lol i forgot why i did not have it before',
            },
            {
                kind: 'improved',
                text: 'Forte in profile cards have hover cards to show skill information'
            }
        ]
    },
    {
        date: '2026-06-10',
        changes: [
            {
                kind: 'new',
                text: 'New home page. Search any player by UID or username right from the landing, aggregated by uid for now'
            },
            {
                kind: 'improved',
                text: 'Profile cards now use the character splash art by default'
            },
            {
                kind: 'improved',
                text: 'The wuwa.build watermark moved onto the splash corner'
            },
            {
                kind: 'new',
                text: 'Profile build rows now have the full breakdown bench from the leaderboards, controlled by the rank selector'
            },
            {
                kind: 'new',
                text: 'Player lookup cleaner and shows past accounts'
            },
            {
                kind: 'improved',
                text: 'Faster standings and leaderboard queries'
            }
        ]
    },
    {
        date: '2026-06-09',
        patch: '3.4',
        changes: [
            {
                kind: 'new',
                text: 'Cyberpunk collab and scanner up, back-scanned appropriately for all submitted images'
            },
            {
                kind: 'new',
                text: 'Lucy and Rebecca leaderboards too, though wuwabot currently has no weapon image for them'
            }
        ]
    },
    {
        date: '2026-06-08',
        changes: [
            {
                kind: 'new',
                text: 'Leaderboard preview in the editor to see where any build would rank on any resonator'
            },
            {
                kind: 'fixed',
                text: 'Hecate imports from weekly challenge set boxes now keep their scanned Sonata set on leaderboard submissions'
            },
            {
                kind: 'fixed',
                text: 'Fixed weapon rounding to use actual decimal (16.05 instead of 16.1) for more accurate numbers'
            }
        ]
    },
    {
        date: '2026-06-07',
        changes: [
            {
                kind: 'improved',
                text: 'Opening a shared leaderboard build link now scrolls the expanded build into view automatically'
            },
            {
                kind: 'fixed',
                text: 'Fixed tooltip detection cos sometimes the image on it went out of the screen'
            }
        ]
    },
    {
        date: '2026-06-04',
        changes: [
            {
                kind: 'fixed',
                text: 'Rover imports and leaderboard filters now distinguish Aero, Spectro, and Havoc by element instead of showing gender variants'
            },
            {
                kind: 'fixed',
                text: 'Migrated old Rover leaderboard builds which might have weird elements based on equipped echoes and main stats'
            },
            {
                kind: 'improved',
                text: 'Better nightmare and regular distinction as it sometimes over-considered Nightmares instead of regular'
            }
        ]
    },
    {
        date: '2026-06-03',
        changes: [
            {
                kind: 'improved',
                text: 'Echo set badges in expanded leaderboard rows now show the full sonata tooltip on hover'
            },
            {
                kind: 'improved',
                text: 'Certain characters (just cartethyia) now show all useful stats which in her case was also liberation not just basic'
            },
            {
                kind: 'new',
                text: 'New logo and Discord embeds if you care lol'
            },
            {
                kind: 'improved',
                text: 'Tooltip explaining substat upgrades and pin first two columns'
            },
            {
                kind: 'improved',
                text: 'Searching exactly 9 digits treats it as a UID and brings that player to the top'
            }
        ]
    },
    {
        date: '2026-06-02',
        changes: [
            {
                kind: 'new',
                text: 'Sigrika leaderboards'
            },
            {
                kind: 'fixed',
                text: 'Opening a leaderboard deep link no longer locks you to that build. You can freely change filters, sorting, and pages, and the linked build re-appears if you return to the view it was opened on'
            },
            {
                kind: 'fixed',
                text: 'Migrated all old Sigrika builds who had Drunken Hero equipped because wuwa-bot returned blank images for Solsworn Cipher'
            },
            {
                kind: 'fixed',
                text: 'No ER bracekts or automatic ER substat selection for Phrolova'
            },
            {
                kind: 'improved',
                text: 'Removed forte levels in leaderboard row expansion because it was misleading and they were all calculated at max anyways'
            },
            {
                kind: 'fixed',
                text: 'Build card CV correctly deducts again when more than one 4-cost echo has a crit main stat'
            }
        ]
    },
    {
        date: '2026-06-01',
        changes: [
            {
                kind: 'fixed',
                text: 'Leaderboard deep links from standings now open the target build immediately, including ghost rows that were deduped out of the ranked list',
            },
            {
                kind: 'fixed',
                text: 'Better distinction for Nightmare vs regular echoes based on the element badge',
            },
            {
                kind: 'fixed',
                text: 'Fix for sometimes dropping HP from the substat OCR which invalidated results',
            },
            {
                kind: 'new',
                text: 'Leaderboard #1 rows now show how long the current build has held the top spot',
            },
            {
                kind: 'new',
                text: 'Denia Fusion Burst leaderboards',
            }
        ],
    },
    {
        date: '2026-05-30',
        changes: [
            {
                kind: 'fixed',
                text: 'Fixed leaderboard character names briefly showing as ID numbers while the page loaded',
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
                text: 'Added a Discord community link in the site navigation and footer',
            },
            {
                kind: 'improved',
                text: 'Character leaderboard links now keep playstyle context in page titles and sharing previews',
            },
            {
                kind: 'improved',
                text: 'Character and weapon reference pages load faster',
            },
            {
                kind: 'fixed',
                text: 'Fixed build-card set and crit-value badges being clipped when hovering stat details',
            },
        ],
    },
    {
        date: '2026-05-27',
        changes: [
            { kind: 'improved', text: 'Import detects echo elements more reliably, so fewer echoes come back with the wrong element' },
        ],
    },
    {
        date: '2026-05-25',
        changes: [
            { kind: 'improved', text: 'Character and weapon reference pages now have cleaner stat sections with level-scaling controls' },
        ],
    },
    {
        date: '2026-05-21',
        changes: [
            { kind: 'improved', text: 'Echo set tooltips now show set bonuses in your selected language' },
            { kind: 'improved', text: 'Hover any stat on the builds board to see its roll-value bars and a clearer crit-value breakdown' },
            { kind: 'improved', text: 'Leaderboard pages load faster because query results are now cached' },
            { kind: 'new', text: 'Denia is now available in the editor and on the leaderboards' },
        ],
    },
    {
        date: '2026-05-18',
        changes: [
            { kind: 'improved', text: 'Import reads echo stat lines more reliably, so fewer screenshots come back wrong' },
            { kind: 'fixed', text: 'Leaderboard filters now survive being opened from a shared link' },
            { kind: 'fixed', text: 'Weapon dropdown on leaderboards no longer lands on the wrong selection' },
        ],
    },
    {
        date: '2026-05-15',
        changes: [
            { kind: 'improved', text: 'Profile build cards were redesigned with a compact rank module, team loadout, talent pills, and cleaner echo presentation' },
            { kind: 'improved', text: 'Cleaner, more consistent hover cards and tooltips throughout the site' },
            { kind: 'fixed', text: 'Import no longer stalls when OCR cannot read a screenshot. It reports the failure and moves on' },
        ],
    },
    {
        date: '2026-05-08',
        changes: [
            { kind: 'fixed', text: 'Fixed a leaderboard sorting bug where crit stats were not scoped to the selected weapon, ranking some builds incorrectly' },
        ],
    },
    {
        date: '2026-05-05',
        changes: [
            { kind: 'improved', text: 'Build optimality references rebuilt to better match the in-game optimizer, and now computed per energy regen bracket' },
        ],
    },
    {
        date: '2026-05-04',
        changes: [
            { kind: 'improved', text: 'Support characters now show sequence badges on the leaderboards' },
            { kind: 'fixed', text: 'Corrected several of Hiyuki’s sequence buffs, fixing her leaderboard damage' },
        ],
    },
    {
        date: '2026-05-03',
        changes: [
            { kind: 'improved', text: 'More accurate substat reading on import, with an automatic fallback when a stat is misread' },
            { kind: 'fixed', text: 'Fixed echo set counting when you own duplicate echoes with different elements' },
        ],
    },
    {
        date: '2026-05-02',
        changes: [
            { kind: 'new', text: 'Hiyuki added to the editor and leaderboards' },
            { kind: 'improved', text: 'Scroll to zoom when hovering build card images' },
        ],
    },
    {
        date: '2026-04-30',
        patch: '3.3',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support' },
        ],
    },
    {
        date: '2026-04-23',
        changes: [
            { kind: 'fixed', text: 'Build card now scales correctly on laptop screens narrower than 1440px' },
        ],
    },
    {
        date: '2026-04-17',
        changes: [
            { kind: 'improved', text: 'Redesigned the homepage' },
        ],
    },
    {
        date: '2026-04-12',
        changes: [
            { kind: 'new', text: 'Chisa added to the editor and leaderboards' },
        ],
    },
    {
        date: '2026-04-05',
        changes: [
            { kind: 'new', text: 'Galbrena added to the editor and leaderboards' },
        ],
    },
    {
        date: '2026-04-04',
        changes: [
            { kind: 'improved', text: 'Leaderboard move breakdowns now show each move type and element, making damage sources easier to read' },
        ],
    },
    {
        date: '2026-04-03',
        changes: [
            { kind: 'improved', text: 'More reliable echo element detection on import, especially for sets that are hard to tell apart by color' },
        ],
    },
    {
        date: '2026-03-29',
        changes: [
            { kind: 'fixed', text: 'Fixed Mornye buffs incorrectly adding 80% Crit Rate and 160% Crit DMG to affected leaderboard calculations' },
            { kind: 'fixed', text: 'Fixed a duplicate-row issue when a deep-linked leaderboard build also appeared in the normal results' },
        ],
    },
    {
        date: '2026-03-28',
        changes: [
            { kind: 'new', text: 'Energy regen brackets split builds by ER so support and healer builds rank fairly' },
            { kind: 'improved', text: 'Leaderboards can now be sorted by sequence level' },
        ],
    },
    {
        date: '2026-03-26',
        changes: [
            { kind: 'improved', text: 'Expanded leaderboard rows now use shared echo panels with clearer roll colors, clickable tier details, and derived stat views' },
        ],
    },
    {
        date: '2026-03-24',
        changes: [
            { kind: 'new', text: 'Build expansions show an optimality reference: how your build compares to an optimal-echo ceiling, and the rank that ceiling would reach' },
        ],
    },
    {
        date: '2026-03-21',
        changes: [
            { kind: 'new', text: 'More characters added to the damage leaderboards: Camellya, Changli, Jinhsi, Cartethyia, Zani, Jiyan, Phoebe, Lupa, Aemeath, Augusta, and Iuno' },
        ],
    },
    {
        date: '2026-03-19',
        patch: '3.2',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support' },
        ],
    },
    {
        date: '2026-03-17',
        changes: [
            { kind: 'improved', text: 'Homepage redesigned with clearer entry points for editing, importing, browsing builds, and viewing leaderboards' },
            { kind: 'improved', text: 'Builds are now deduplicated per player. Your best build holds the rank, and weaker duplicates become linkable ghost builds' },
        ],
    },
    {
        date: '2026-03-16',
        changes: [
            { kind: 'new', text: 'Healer leaderboards, with dedicated healing-based scoring' },
            { kind: 'improved', text: 'Shared leaderboard build links now open the exact row and page for that build' },
            { kind: 'improved', text: 'Leaderboard tracks now show playstyle notes, and ranking handles crit-fishing more accurately' },
        ],
    },
    {
        date: '2026-03-15',
        changes: [
            { kind: 'new', text: 'Substat upgrade suggestions show how each substat roll would move a leaderboard build' },
            { kind: 'new', text: 'Leaderboard standings, ranks, team buff details, and tooltips for sets, weapons, sequences, and forte' },
        ],
    },
    {
        date: '2026-03-12',
        title: 'WuWa Builds, rebuilt',
        changes: [
            { kind: 'new', text: 'The whole site has been rebuilt from scratch and relaunched at wuwa.build. Ideally faster, more accurate, and more reliable' },
            { kind: 'new', text: 'Damage leaderboards scoped per character, weapon, and playstyle, with team comps and breakdowns' },
            { kind: 'new', text: 'Rebuilt builds board with filtering by character, weapon, set, and stat' },
            { kind: 'new', text: 'Redesigned build editor and build cards, with full language support' },
            { kind: 'improved', text: 'Import rebuilt with a faster streaming pipeline, and you can report a bad scan in one click' },
        ],
    },
    {
        date: '2026-02-06',
        patch: '3.1',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support' },
        ],
    },
    {
        date: '2025-12-29',
        patch: '3.0',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support' },
            { kind: 'new', text: 'Echoes can now be added directly in the stat calculator' },
        ],
    },
    {
        date: '2025-11-20',
        patch: '2.8',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, including Kumokiri, with import support' },
        ],
    },
    {
        date: '2025-10-23',
        changes: [
            { kind: 'improved', text: 'More reliable echo detection on import, using element as a tiebreaker' },
        ],
    },
    {
        date: '2025-10-12',
        patch: '2.7',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support' },
        ],
    },
    {
        date: '2025-09-07',
        changes: [
            { kind: 'improved', text: 'Fewer wrong echo matches on import. Color is used as a tiebreaker, and you are warned when a screenshot is cropped too tightly' },
        ],
    },
    {
        date: '2025-08-27',
        patch: '2.6',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, including Phantom echoes, with import support' },
        ],
    },
    {
        date: '2025-08-09',
        patch: '2.5',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support' },
        ],
    },
    {
        date: '2025-07-04',
        changes: [
            { kind: 'improved', text: 'Builds page rewritten with a cleaner layout' },
        ],
    },
    {
        date: '2025-06-26',
        changes: [
            { kind: 'new', text: 'Added a Zani damage leaderboard' },
        ],
    },
    {
        date: '2025-06-12',
        patch: '2.4',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support' },
            { kind: 'new', text: 'Added a stat calculator page' },
        ],
    },
    {
        date: '2025-06-02',
        changes: [
            { kind: 'new', text: 'Substat upgrade suggestions, showing the projected damage gain from each roll' },
        ],
    },
    {
        date: '2025-06-01',
        changes: [
            { kind: 'new', text: 'Added a Phoebe damage leaderboard' },
        ],
    },
    {
        date: '2025-05-30',
        changes: [
            { kind: 'new', text: 'Added a Changli damage leaderboard, with a toggle to switch between playstyles' },
        ],
    },
    {
        date: '2025-05-23',
        changes: [
            { kind: 'new', text: 'Added Jiyan and Camellya damage leaderboards' },
        ],
    },
    {
        date: '2025-04-28',
        changes: [
            { kind: 'new', text: 'Zani, Ciaccona, and Cantarella added to the editor and import' },
        ],
    },
    {
        date: '2025-03-26',
        patch: '2.2',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, with screenshot import support' },
        ],
    },
    {
        date: '2025-03-09',
        changes: [
            { kind: 'improved', text: 'Added username and UID filters to the leaderboards' },
        ],
    },
    {
        date: '2025-02-28',
        changes: [
            { kind: 'new', text: 'Added a Jinhsi damage leaderboard' },
        ],
    },
    {
        date: '2025-02-20',
        changes: [
            { kind: 'new', text: 'Added character, weapon, and main-stat filters to the builds page' },
            { kind: 'improved', text: 'Added region filtering and keyboard support to leaderboard filters' },
        ],
    },
    {
        date: '2025-02-12',
        patch: '2.1',
        changes: [
            { kind: 'new', text: 'New characters, weapons, and echoes, including Brant, with import support' },
        ],
    },
    {
        date: '2025-02-09',
        changes: [
            { kind: 'new', text: 'The builds page now shows damage rankings, with sticky headers on mobile' },
            { kind: 'new', text: 'Builds gained an expandable rotation and notes section' },
        ],
    },
    {
        date: '2025-01-28',
        changes: [
            { kind: 'new', text: 'Added the Leaderboard page, ranking community builds, with sorting and stat highlighting' },
        ],
    },
    {
        date: '2025-01-21',
        changes: [
            { kind: 'new', text: 'Added the Import page. Scan a screenshot to auto-fill an entire build' },
        ],
    },
    {
        date: '2025-01-12',
        changes: [
            { kind: 'new', text: 'Added an expandable build preview with a stats tab and echo hover details' },
        ],
    },
    {
        date: '2025-01-11',
        changes: [
            { kind: 'new', text: 'Added a home page, plus saving and exporting your builds' },
        ],
    },
    {
        date: '2025-01-05',
        changes: [
            { kind: 'new', text: 'Added skins, so you can display alternate character outfits on your build card' },
        ],
    },
    {
        date: '2025-01-02',
        patch: '2.0',
        changes: [
            { kind: 'new', text: 'Rinascita region content added: characters, weapons, and echoes' },
        ],
    },
    {
        date: '2024-12-31',
        changes: [
            { kind: 'improved', text: 'Echo display redesigned with visual set connectors' },
        ],
    },
    {
        date: '2024-12-23',
        changes: [
            { kind: 'new', text: 'Added mobile support' },
        ],
    },
    {
        date: '2024-12-22',
        changes: [
            { kind: 'improved', text: 'More accurate echo scanning on import, including flat-vs-percent detection and name matching' },
        ],
    },
    {
        date: '2024-12-11',
        changes: [
            { kind: 'new', text: 'Build cards now show a Crit Value (CV) counter, a watermark, and support custom background images' },
        ],
    },
    {
        date: '2024-11-28',
        title: 'Where it started',
        changes: [
            { kind: 'new', text: 'WuWa Builds launched as a build editor for Wuthering Waves' },
            { kind: 'new', text: 'Builds and echoes save to your browser, so your work persists between visits' },
        ],
    },
];
